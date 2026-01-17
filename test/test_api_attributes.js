/**
 * Test API Attributes Loading
 * Tests that loadAttributes() returns correct data structure with parameters
 */

const { HonAuth, HonAPI, HonDevice } = require('../index');

async function testAttributes() {
  console.log('🧪 API Attributes Loading Test');
  console.log('═'.repeat(80));

  try {
    // Get credentials from command line
    const email = process.argv[2];
    const password = process.argv[3];

    if (!email || !password) {
      console.error('❌ Usage: node test_api_attributes.js <email> <password>');
      process.exit(1);
    }

    console.log('📱 Creating device identity...');
    const device = new HonDevice('AttributesTest');
    console.log('✅ Device created:', device.mobileId);

    console.log('🔐 Authenticating...');
    const api = new HonAPI({
      email: email,
      password: password,
      mobileId: device.mobileId
    });
    
    await api.create();
    console.log('✅ Authentication successful');

    console.log('📥 Loading appliances...');
    const appliances = await api.loadAppliances();
    console.log(`✅ Loaded ${appliances.length} appliances`);

    // Find washing machine
    const wm = appliances.find(a => 
      a.applianceType === 'WM' || 
      a.applianceTypeName === 'WM'
    );

    if (!wm) {
      console.error('❌ No washing machine found');
      process.exit(1);
    }

    console.log('✅ Found washing machine:', wm.nickName);
    console.log('   MAC:', wm.macAddress);
    console.log('   Type:', wm.applianceTypeName || wm.applianceType);

    console.log('\n📡 Testing API call for attributes...');
    console.log('─'.repeat(80));

    // Test direct API call
    console.log('🔍 Direct API call to /commands/v1/context');
    const constants = require('../lib/config/constants');
    const params = {
      macAddress: wm.macAddress,
      applianceType: wm.applianceTypeName || wm.applianceType,
      category: 'CYCLE'
    };
    console.log('   Parameters:', JSON.stringify(params, null, 2));

    const url = `${constants.API_URL}/commands/v1/context`;
    console.log('   URL:', url);

    try {
      const response = await api._hon.get(url, { params });
      console.log('✅ API Response received');
      console.log('   Status:', response.status);
      console.log('   Headers:', JSON.stringify(response.headers, null, 2));
      
      const payload = response.data?.payload || {};
      console.log('\n📦 Payload structure:');
      console.log('   Keys:', Object.keys(payload).join(', '));
      
      if (payload.shadow) {
        console.log('\n🔍 Shadow structure:');
        console.log('   Keys:', Object.keys(payload.shadow).join(', '));
        
        if (payload.shadow.parameters) {
          const paramKeys = Object.keys(payload.shadow.parameters);
          console.log('\n✅ Parameters found:', paramKeys.length);
          console.log('   First 20 keys:', paramKeys.slice(0, 20).join(', '));
          
          // Show sample parameter
          const firstKey = paramKeys[0];
          if (firstKey) {
            console.log(`\n📋 Sample parameter (${firstKey}):`, 
              JSON.stringify(payload.shadow.parameters[firstKey], null, 2));
          }
        } else {
          console.log('❌ No parameters in shadow!');
        }
      } else {
        console.log('❌ No shadow in payload!');
      }

      // Test full structure
      console.log('\n📄 Full payload preview (first 500 chars):');
      console.log(JSON.stringify(payload, null, 2).substring(0, 500) + '...');

    } catch (apiError) {
      console.error('❌ Direct API call failed:', apiError.message);
      if (apiError.response) {
        console.error('   Status:', apiError.response.status);
        console.error('   Data:', JSON.stringify(apiError.response.data, null, 2));
      }
      throw apiError;
    }

    console.log('\n📡 Testing loadAttributes() method...');
    console.log('─'.repeat(80));

    console.log('🔍 Creating HonAppliance instance...');
    const { HonAppliance } = require('../index');
    const appliance = new HonAppliance(api, wm);
    
    console.log('   Appliance created:');
    console.log('      macAddress:', appliance.macAddress);
    console.log('      applianceType:', appliance.applianceType);
    console.log('      nickName:', appliance.nickName);

    const attributes = await api.loadAttributes(appliance);
    console.log('✅ loadAttributes() returned');
    console.log('   Type:', typeof attributes);
    console.log('   Keys:', Object.keys(attributes).join(', '));

    if (attributes.shadow) {
      console.log('\n🔍 Shadow in attributes:');
      console.log('   Keys:', Object.keys(attributes.shadow).join(', '));
      
      if (attributes.shadow.parameters) {
        const paramKeys = Object.keys(attributes.shadow.parameters);
        console.log('   Parameters:', paramKeys.length);
        console.log('   Sample keys:', paramKeys.slice(0, 10).join(', '));
      } else {
        console.log('   ❌ No parameters in shadow!');
      }
    } else {
      console.log('   ❌ No shadow in attributes!');
    }

    console.log('\n═'.repeat(80));
    console.log('✅ Test completed successfully!');

  } catch (error) {
    console.error('\n❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

testAttributes();
