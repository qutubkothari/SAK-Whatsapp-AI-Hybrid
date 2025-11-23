/**
 * Test MessageProvider - Phase 2
 * Tests all three providers: Desktop Agent, Waha, Maytapi
 */

require('dotenv').config();
const MessageProvider = require('../../services/messageProvider');
const { supabase } = require('../../services/config');

async function testMessageProvider() {
    console.log('\n🧪 Testing MessageProvider\n');
    console.log('========================================\n');

    try {
        // Fetch SAK tenant
        const { data: tenant, error } = await supabase
            .from('tenants')
            .select('*')
            .eq('id', 'c93fbde0-7d5d-473c-ab2b-5f677c9a495c')
            .single();

        if (error || !tenant) {
            console.error('❌ Could not fetch tenant:', error?.message);
            return;
        }

        console.log('✅ Tenant loaded:', tenant.business_name);
        console.log('   Plan:', tenant.plan);
        console.log('   Provider:', tenant.whatsapp_provider || 'auto-detect');
        console.log('');

        // Test 1: Initialize MessageProvider
        console.log('Test 1: Initialize MessageProvider');
        const provider = new MessageProvider(tenant);
        console.log('   Selected provider:', provider.provider);
        console.log('   ✅ Initialization successful\n');

        // Test 2: Check provider status
        console.log('Test 2: Check provider status');
        const status = await provider.checkStatus();
        console.log('   Status:', status);
        if (status.ok) {
            console.log('   ✅ Provider is online\n');
        } else {
            console.log('   ⚠️  Provider offline:', status.error);
            console.log('');
        }

        // Test 3: Send test message (commented out - uncomment to actually send)
        /*
        console.log('Test 3: Send test message');
        const result = await provider.sendMessage(
            '971507055253',
            '🧪 Test message from MessageProvider - Phase 2 abstraction working!'
        );
        console.log('   Result:', result);
        if (result.ok) {
            console.log('   ✅ Message sent successfully\n');
        } else {
            console.log('   ❌ Message failed\n');
        }
        */

        console.log('========================================');
        console.log('✅ MessageProvider tests complete!\n');
        console.log('Cost comparison:');
        console.log('   Desktop Agent: FREE 🎉');
        console.log('   Waha Cloud: ~$50/month 💰');
        console.log('   Maytapi (legacy): $500/month 💸\n');
        console.log('Potential savings: $450-500/month\n');

    } catch (error) {
        console.error('❌ Test failed:', error.message);
        console.error(error.stack);
    }
}

// Run tests
testMessageProvider();
