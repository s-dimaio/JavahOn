/**
 * Hon Proxy - Usa http-proxy direttamente per controllo completo sui redirect
 */
const http = require('http');
const httpProxy = require('http-proxy');
const { EventEmitter } = require('events');
const url = require('url');
const zlib = require('zlib');

const HON_DOMAIN = 'account2.hon-smarthome.com';
const HON_TARGET = `https://${HON_DOMAIN}`;

class HonProxy extends EventEmitter {
    constructor(options = {}) {
        super();
        this.port = options.port || 8888;
        this.sessionData = null;
        this.server = null;
        
        // Crea il proxy
        this.proxy = httpProxy.createProxyServer({
            target: HON_TARGET,
            changeOrigin: true,
            secure: false,
            followRedirects: false,
            selfHandleResponse: true // IMPORTANTE: gestiamo noi la risposta
        });
        
        this.setupProxy();
    }

    setupProxy() {
        // Handler per la risposta del proxy
        this.proxy.on('proxyRes', (proxyRes, req, res) => {
            const contentEncoding = proxyRes.headers['content-encoding'];
            
            // Raccogli il body della risposta
            let body = [];
            proxyRes.on('data', chunk => body.push(chunk));
            proxyRes.on('end', () => {
                let rawBody = Buffer.concat(body);
                
                // Decomprimi se necessario
                let bodyString;
                try {
                    if (contentEncoding === 'gzip') {
                        bodyString = zlib.gunzipSync(rawBody).toString('utf8');
                    } else if (contentEncoding === 'deflate') {
                        bodyString = zlib.inflateSync(rawBody).toString('utf8');
                    } else if (contentEncoding === 'br') {
                        bodyString = zlib.brotliDecompressSync(rawBody).toString('utf8');
                    } else {
                        bodyString = rawBody.toString('utf8');
                    }
                } catch (e) {
                    bodyString = rawBody.toString('utf8');
                }
                
                // **NUOVO: Intercetta frontdoor.jsp per catturare il SID #2 (quello definitivo)**
                if (req.url.includes('/secur/frontdoor.jsp')) {
                    const setCookies = proxyRes.headers['set-cookie'];
                    if (setCookies) {
                        const sidCookie = setCookies.find(c => c.startsWith('sid='));
                        if (sidCookie) {
                            const sidMatch = sidCookie.match(/^sid=([^;]+)/);
                            if (sidMatch) {
                                const finalSessionId = sidMatch[1];
                                
                                // Estrai anche altri cookie utili
                                const sidClientCookie = setCookies.find(c => c.startsWith('sid_Client='));
                                const oidCookie = setCookies.find(c => c.startsWith('oid='));
                                const clientSrcCookie = setCookies.find(c => c.startsWith('clientSrc='));
                                const instCookie = setCookies.find(c => c.startsWith('inst='));
                                
                                const extractValue = (cookie) => {
                                    if (!cookie) return null;
                                    const match = cookie.match(/^[^=]+=([^;]+)/);
                                    return match ? match[1] : null;
                                };
                                
                                // Aggiorna sessionData con il SID definitivo
                                this.sessionData = {
                                    ...this.sessionData,
                                    sid1_temporary: this.sessionData?.sessionId, // SID #1 (quello nell'URL)
                                    sid2_final: finalSessionId,                  // SID #2 (definitivo)
                                    sessionId: finalSessionId,                   // Default: usa SID #2
                                    cookies: {
                                        sid: finalSessionId,
                                        sid_Client: extractValue(sidClientCookie),
                                        oid: extractValue(oidCookie),
                                        clientSrc: extractValue(clientSrcCookie),
                                        inst: extractValue(instCookie)
                                    },
                                    timestamp: new Date().toISOString()
                                };
                                
                                console.log('\n🎯 SID #2 (definitivo) catturato da frontdoor.jsp!');
                                console.log(`   SID #2: ${finalSessionId.substring(0, 50)}...`);
                                
                                // Emetti evento con le credenziali complete
                                this.emit('loginSuccess', this.sessionData);
                                
                                // CREA UN NUOVO HTML che reindirizza immediatamente a /auth/success
                                const modifiedBody = `<!DOCTYPE html>
<html>
<head>
    <meta http-equiv="refresh" content="0; url=/auth/success">
    <script>window.location.replace('/auth/success');</script>
</head>
<body>
    <p>Redirecting...</p>
</body>
</html>`;
                                
                                // Invia la response modificata
                                const headers = { ...proxyRes.headers };
                                delete headers['content-encoding'];
                                delete headers['transfer-encoding'];
                                headers['content-type'] = 'text/html;charset=UTF-8';
                                headers['content-length'] = Buffer.byteLength(modifiedBody);
                                if (headers['set-cookie']) {
                                    headers['set-cookie'] = this.rewriteCookies(headers['set-cookie']);
                                }
                                
                                res.writeHead(proxyRes.statusCode, headers);
                                res.end(modifiedBody);
                                return;
                            }
                        }
                    }
                    
                    // Se non c'è SID, continua normalmente
                }
                
                // Intercetta le risposte Aura POST per cercare il redirect nel JSON
                if (req.method === 'POST' && req.url.includes('/aura')) {
                    try {
                        const data = JSON.parse(bodyString);
                        
                        // Cerca l'evento clientRedirect che contiene frontdoor.jsp con sid
                        if (data.events && Array.isArray(data.events)) {
                            const redirectEvent = data.events.find(e => 
                                e.descriptor === 'markup://aura:clientRedirect'
                            );
                            
                            if (redirectEvent && redirectEvent.attributes?.values?.url) {
                                const redirectUrl = redirectEvent.attributes.values.url;
                                
                                // Estrai il session ID se presente (questo è il SID #1 temporaneo)
                                if (redirectUrl.includes('frontdoor.jsp')) {
                                    const sidMatch = redirectUrl.match(/[?&]sid=([^&]+)/);
                                    if (sidMatch) {
                                        // Estrai tutti i parametri dall'URL di redirect
                                        const urlParams = new URL(redirectUrl);
                                        
                                        // Decodifica il session ID temporaneo
                                        const temporarySessionId = decodeURIComponent(sidMatch[1]);
                                        
                                        // Costruisci l'oggetto con le credenziali iniziali (SID #1)
                                        this.sessionData = {
                                            sessionId: temporarySessionId, // Questo sarà sovrascritto dal SID #2
                                            // Estrai altri parametri utili dall'URL
                                            cshc: urlParams.searchParams.get('cshc'),
                                            retURL: urlParams.searchParams.get('retURL'),
                                            // Context dalla risposta Aura
                                            auraContext: {
                                                fwuid: data.context?.fwuid,
                                                app: data.context?.app,
                                                mode: data.context?.mode
                                            },
                                            // Metadata
                                            timestamp: new Date().toISOString(),
                                            expiresAt: null, // Salesforce sessions tipicamente durano 2 ore
                                            redirectUrl: redirectUrl
                                        };
                                        
                                        console.log('\n✅ Login POST successful! SID #1 (temporaneo) ottenuto');
                                        console.log('   Attendo frontdoor.jsp per SID #2...');
                                        
                                        // NON emettiamo ancora l'evento - aspettiamo frontdoor.jsp
                                        // NON modifichiamo il redirect - lasciamo che vada a frontdoor.jsp
                                        
                                        // Riscrivi il redirect per restare nel proxy
                                        if (redirectUrl.startsWith(`https://${HON_DOMAIN}`) || 
                                            redirectUrl.startsWith(`http://${HON_DOMAIN}`)) {
                                            const newUrl = redirectUrl.replace(/https?:\/\/[^\/]+/, '');
                                            redirectEvent.attributes.values.url = newUrl;
                                            
                                            const modifiedBody = JSON.stringify(data);
                                            const headers = { ...proxyRes.headers };
                                            delete headers['content-encoding'];
                                            delete headers['transfer-encoding'];
                                            headers['content-length'] = Buffer.byteLength(modifiedBody);
                                            if (headers['set-cookie']) {
                                                headers['set-cookie'] = this.rewriteCookies(headers['set-cookie']);
                                            }
                                            
                                            res.writeHead(proxyRes.statusCode, headers);
                                            res.end(modifiedBody);
                                            return;
                                        }
                                    }
                                }
                                
                                // Riscrivi altri redirect Aura per restare nel proxy
                                if (redirectUrl.startsWith(`https://${HON_DOMAIN}`) || 
                                    redirectUrl.startsWith(`http://${HON_DOMAIN}`)) {
                                    const newUrl = redirectUrl.replace(/https?:\/\/[^\/]+/, '');
                                    redirectEvent.attributes.values.url = newUrl;
                                    
                                    const modifiedBody = JSON.stringify(data);
                                    const headers = { ...proxyRes.headers };
                                    delete headers['content-encoding'];
                                    delete headers['transfer-encoding'];
                                    headers['content-length'] = Buffer.byteLength(modifiedBody);
                                    if (headers['set-cookie']) {
                                        headers['set-cookie'] = this.rewriteCookies(headers['set-cookie']);
                                    }
                                    
                                    res.writeHead(proxyRes.statusCode, headers);
                                    res.end(modifiedBody);
                                    return;
                                }
                            }
                        }
                    } catch (e) {
                        // Non è JSON valido, continua normalmente
                    }
                }
                
                // Gestisci i redirect HTTP
                if ([301, 302, 303, 307, 308].includes(proxyRes.statusCode)) {
                    let location = proxyRes.headers.location;
                    
                    if (location) {
                        // Controlla se contiene session ID
                        if (location.includes('frontdoor.jsp')) {
                            const sidMatch = location.match(/[?&]sid=([^&]+)/);
                            if (sidMatch) {
                                this.sessionData = {
                                    sessionId: decodeURIComponent(sidMatch[1]),
                                    timestamp: new Date().toISOString(),
                                    redirectUrl: location
                                };
                                
                                console.log('\n✅ Session ID catturato!');
                                
                                this.emit('loginSuccess', this.sessionData);
                                
                                // Redirect alla pagina di successo
                                res.writeHead(302, { 'Location': '/auth/success' });
                                res.end();
                                return;
                            }
                        }
                        
                        // Riscrivi redirect assoluti a Hon per restare nel proxy
                        if (location.startsWith(`https://${HON_DOMAIN}`)) {
                            location = location.replace(`https://${HON_DOMAIN}`, '');
                        } else if (location.startsWith(`http://${HON_DOMAIN}`)) {
                            location = location.replace(`http://${HON_DOMAIN}`, '');
                        }
                        
                        // Copia tutti gli headers
                        const headers = { ...proxyRes.headers };
                        headers.location = location;
                        
                        // Riscrivi i cookie
                        if (headers['set-cookie']) {
                            headers['set-cookie'] = this.rewriteCookies(headers['set-cookie']);
                        }
                        
                        res.writeHead(proxyRes.statusCode, headers);
                        res.end(rawBody);
                        return;
                    }
                }
                
                // Risposta normale - copia headers e body
                const headers = { ...proxyRes.headers };
                
                // Riscrivi i cookie
                if (headers['set-cookie']) {
                    headers['set-cookie'] = this.rewriteCookies(headers['set-cookie']);
                }
                
                res.writeHead(proxyRes.statusCode, headers);
                res.end(rawBody);
            });
        });

        this.proxy.on('error', (err, req, res) => {
            console.error('[Proxy Error]', err.message);
            res.writeHead(500);
            res.end('Proxy error: ' + err.message);
        });

        // Crea il server HTTP
        this.server = http.createServer((req, res) => {
            console.log(`[Request] ${req.method} ${req.url}`);
            
            // Pagina di successo
            if (req.url === '/auth/success') {
                res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(this.getSuccessPage());
                return;
            }
            
            // Modifica headers prima di inviare al proxy
            req.headers.host = HON_DOMAIN;
            
            // Riscrivi referer e origin
            if (req.headers.referer) {
                req.headers.referer = req.headers.referer.replace(
                    `http://localhost:${this.port}`,
                    `https://${HON_DOMAIN}`
                );
            }
            if (req.headers.origin) {
                req.headers.origin = `https://${HON_DOMAIN}`;
            }
            
            // Proxy la richiesta
            this.proxy.web(req, res);
        });
    }

    rewriteCookies(cookies) {
        if (!Array.isArray(cookies)) {
            cookies = [cookies];
        }
        return cookies.map(cookie => {
            let fixed = cookie.replace(/Domain=[^;]+;?\s*/gi, '');
            fixed = fixed.replace(/;\s*Secure/gi, '');
            fixed = fixed.replace(/;\s*SameSite=[^;]+/gi, '');
            return fixed;
        });
    }

    getSuccessPage() {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Autenticazione completata</title>
                <style>
                    body { font-family: Arial, sans-serif; text-align: center; padding: 50px; background: #f5f5f5; }
                    .container { background: white; padding: 40px; border-radius: 10px; max-width: 900px; margin: 0 auto; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                    .success { color: #28a745; font-size: 48px; margin-bottom: 20px; }
                    h1 { color: #333; }
                    .info-box { background: #f8f9fa; padding: 15px; border-radius: 5px; text-align: left; margin: 20px 0; border-left: 4px solid #007bff; }
                    .info-box.important { border-left-color: #28a745; background: #d4edda; }
                    .info-box h3 { margin-top: 0; color: #495057; font-size: 14px; font-weight: bold; }
                    .info-box code { color: #d63384; font-size: 10px; word-break: break-all; display: block; background: white; padding: 8px; border-radius: 3px; margin-top: 5px; }
                    .label { font-weight: bold; color: #666; margin-top: 10px; font-size: 12px; }
                    .note { color: #666; margin-top: 30px; font-size: 14px; }
                    .highlight { background: #fff3cd; padding: 3px 6px; border-radius: 3px; font-weight: bold; }
                    .badge { display: inline-block; padding: 3px 8px; border-radius: 3px; font-size: 11px; font-weight: bold; }
                    .badge-success { background: #28a745; color: white; }
                    .badge-info { background: #17a2b8; color: white; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="success">✅</div>
                    <h1>Autenticazione completata!</h1>
                    <p>Entrambi i Session ID catturati con successo.</p>
                    ${this.sessionData ? `
                        <div class="info-box important">
                            <h3>🎯 SID #2 - DEFINITIVO <span class="badge badge-success">USA QUESTO</span></h3>
                            <code>${this.sessionData.sid2_final || this.sessionData.sessionId}</code>
                        </div>
                        
                        <div class="info-box">
                            <h3>🔄 SID #1 - TEMPORANEO <span class="badge badge-info">Solo per info</span></h3>
                            <code>${this.sessionData.sid1_temporary || 'N/A'}</code>
                            <p style="margin: 10px 0 0 0; font-size: 11px; color: #666;">
                                Questo SID viene usato solo per la rotazione del token
                            </p>
                        </div>
                        
                        ${this.sessionData.cookies ? `
                            <div class="info-box">
                                <h3>🍪 Altri Cookies</h3>
                                <div class="label">sid_Client (User ID + Org ID):</div>
                                <code>${this.sessionData.cookies.sid_Client || 'N/A'}</code>
                                <div class="label">oid (Organization ID):</div>
                                <code>${this.sessionData.cookies.oid || 'N/A'}</code>
                                <div class="label">clientSrc (IP - Session binding):</div>
                                <code>${this.sessionData.cookies.clientSrc || 'N/A'}</code>
                                <div class="label">inst:</div>
                                <code>${this.sessionData.cookies.inst || 'N/A'}</code>
                            </div>
                        ` : ''}
                        <div class="info-box">
                            <h3>💾 File salvato</h3>
                            <code>hon_credentials.json</code>
                            <p style="margin: 10px 0 0 0; font-size: 13px; color: #666;">
                                Usa <span class="highlight">sessionId</span> (che corrisponde a SID #2) con JavahOn
                            </p>
                        </div>
                    ` : ''}
                    <p class="note">✅ Tutto completato! Puoi chiudere questa finestra.</p>
                </div>
            </body>
            </html>
        `;
    }

    async start() {
        return new Promise((resolve) => {
            this.server.listen(this.port, () => {
                console.log(`Proxy running on http://localhost:${this.port}`);
                console.log(`\n🌐 Apri questo URL nel browser:`);
                console.log(`   http://localhost:${this.port}/s/login/?ec=302&startURL=%2F%2Fs%2F`);
                console.log(`\n⏳ Waiting for login...\n`);
                resolve();
            });
        });
    }

    stop() {
        if (this.server) {
            this.server.close();
            console.log('Proxy stopped');
        }
    }

    getSessionData() {
        return this.sessionData;
    }
}

module.exports = HonProxy;
