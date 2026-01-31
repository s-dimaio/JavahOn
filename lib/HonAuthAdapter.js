const HonProxy = require('./HonProxy');
const fs = require('fs').promises;

/**
 * Adapter che integra HonProxy con JavahOn
 * Usa il login web tramite proxy invece di username/password diretto
 */
class HonAuthAdapter {
    constructor(options = {}) {
        this.proxy = null;
        this.credentialsFile = options.credentialsFile || './hon_credentials.json';
        this.port = options.port || 8888;
    }

    /**
     * Avvia il proxy per il login web
     * @returns {Promise<Object>} Credenziali catturate
     */
    async startWebLogin() {
        return new Promise((resolve, reject) => {
            console.log('\n' + '='.repeat(60));
            console.log('[*] Hon Web Authentication');
            console.log('='.repeat(60) + '\n');

            // Crea il proxy
            this.proxy = new HonProxy({ port: this.port });

            // Ascolta l'evento di cattura delle credenziali
            this.proxy.on('loginSuccess', async (data) => {
                console.log('\n[✓] Session captured via proxy!');
                console.log('[*] Saving credentials...');

                try {
                    // Salva le credenziali
                    await fs.writeFile(
                        this.credentialsFile,
                        JSON.stringify(data, null, 2)
                    );
                    console.log('[+] Credentials saved to:', this.credentialsFile);

                    // Ferma il proxy
                    if (this.proxy && this.proxy.server) {
                        this.proxy.stop();
                    }

                    resolve(data);

                } catch (error) {
                    reject(error);
                }
            });

            // Ascolta errori del proxy
            this.proxy.proxy.on('error', (error) => {
                console.error('[!] Proxy error:', error.message);
                reject(error);
            });

            // Avvia il server
            this.proxy.start().catch(reject);
        });
    }

    /**
     * Carica credenziali salvate
     */
    async loadCredentials() {
        try {
            const data = await fs.readFile(this.credentialsFile, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            throw new Error(`Credentials not found. Run webLogin() first.`);
        }
    }

    /**
     * Converte session ID Salesforce in formato compatibile con JavahOn
     */
    async convertToJavaHonSession(credentials) {
        console.log('[*] Converting Salesforce session to JavahOn format...');

        // Il session ID di Salesforce può essere usato come access_token
        // per autenticarsi alle API Hon
        return {
            sessionId: credentials.sessionId,
            accessToken: credentials.sessionId, // Salesforce session ID come access token
            refreshToken: null, // Da implementare se necessario
            idToken: null,
            expiresAt: credentials.expiresAt || null,
            timestamp: credentials.timestamp,
            // Metadata aggiuntivi da Salesforce
            cshc: credentials.cshc,
            retURL: credentials.retURL,
            auraContext: credentials.auraContext,
            redirectUrl: credentials.redirectUrl
        };
    }

    /**
     * Ottiene una sessione JavahOn usando il session ID del proxy
     */
    async getJavaHonSession() {
        const credentials = await this.loadCredentials();
        return this.convertToJavaHonSession(credentials);
    }

    /**
     * Verifica se esiste una sessione valida
     */
    async hasValidSession() {
        try {
            const credentials = await this.loadCredentials();
            
            // Controlla se ha un session ID
            if (!credentials.sessionId) {
                return false;
            }

            // Controlla scadenza se disponibile
            if (credentials.expiresAt) {
                const expiresAt = new Date(credentials.expiresAt);
                if (expiresAt < new Date()) {
                    console.log('[!] Session expired');
                    return false;
                }
            }

            // Salesforce session tipicamente dura 2 ore
            // Se non abbiamo expiresAt, controlliamo il timestamp
            if (!credentials.expiresAt && credentials.timestamp) {
                const created = new Date(credentials.timestamp);
                const now = new Date();
                const hoursSinceCreation = (now - created) / (1000 * 60 * 60);
                
                if (hoursSinceCreation > 2) {
                    console.log('[!] Session likely expired (>2 hours old)');
                    return false;
                }
            }

            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Workflow completo di autenticazione
     */
    async authenticate() {
        console.log('\n' + '='.repeat(60));
        console.log('[*] Hon Authentication Adapter');
        console.log('='.repeat(60) + '\n');

        // Verifica se esiste già una sessione valida
        const hasSession = await this.hasValidSession();
        
        if (hasSession) {
            console.log('[+] Valid session found');
            return this.getJavaHonSession();
        }

        console.log('[!] No valid session found');
        console.log('[*] Starting web login via proxy...\n');

        // Avvia il login web
        await this.startWebLogin();

        // Ottieni la sessione JavahOn
        return this.getJavaHonSession();
    }
}

module.exports = HonAuthAdapter;
