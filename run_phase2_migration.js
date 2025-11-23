/**
 * Phase 2 Database Migration - Simple Version
 * Adds WhatsApp provider fields to tenants table using direct client
 */

const { supabase } = require('./services/config');

async function runMigration() {
    console.log('🚀 Starting Phase 2 database migration...\n');

    try {
        // Step 1: Check current columns
        console.log('📋 Step 1: Checking current tenant table structure...');
        const { data: currentTenants, error: checkError } = await supabase
            .from('tenants')
            .select('*')
            .limit(1);

        if (checkError) {
            console.error('❌ Error checking table:', checkError.message);
            throw checkError;
        }

        const existingColumns = currentTenants && currentTenants[0] ? Object.keys(currentTenants[0]) : [];
        console.log('   Current columns:', existingColumns.join(', '));

        const newColumns = ['whatsapp_provider', 'plan', 'waha_session_name', 'waha_status'];
        const missingColumns = newColumns.filter(col => !existingColumns.includes(col));

        if (missingColumns.length === 0) {
            console.log('✅ All columns already exist!');
        } else {
            console.log(`⚠️  Missing columns: ${missingColumns.join(', ')}`);
            console.log('\n❗ IMPORTANT: You need to manually add these columns in Supabase SQL Editor:');
            console.log('\nCopy and paste this SQL in Supabase Dashboard:\n');
            console.log('-------------------------------------------');
            console.log(`ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS whatsapp_provider VARCHAR(20) DEFAULT 'maytapi',
ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'basic',
ADD COLUMN IF NOT EXISTS waha_session_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS waha_status VARCHAR(50) DEFAULT 'disconnected';

CREATE INDEX IF NOT EXISTS idx_tenants_provider ON tenants(whatsapp_provider);
CREATE INDEX IF NOT EXISTS idx_tenants_plan ON tenants(plan);`);
            console.log('-------------------------------------------\n');
            console.log('Then run this script again to verify.\n');
            return;
        }

        // Step 2: Update tenant configurations
        console.log('\n📊 Step 2: Checking tenant configurations...');
        const { data: allTenants, error: selectError } = await supabase
            .from('tenants')
            .select('id, business_name, whatsapp_provider, plan, waha_status');

        if (selectError) {
            console.error('❌ Error fetching tenants:', selectError.message);
            throw selectError;
        }

        console.log('\nCurrent tenant configurations:');
        console.table(allTenants);

        // Step 3: Update SAK tenant to premium if needed
        const sakTenant = allTenants.find(t => t.business_name === 'SAK');
        if (sakTenant && sakTenant.plan !== 'premium') {
            console.log('\n🔄 Step 3: Updating SAK tenant to premium plan...');
            const { error: updateError } = await supabase
                .from('tenants')
                .update({
                    plan: 'premium',
                    whatsapp_provider: 'waha'
                })
                .eq('id', sakTenant.id);

            if (updateError) {
                console.error('❌ Error updating SAK tenant:', updateError.message);
            } else {
                console.log('✅ SAK tenant updated to premium/waha');
            }
        } else if (sakTenant) {
            console.log('\n✅ SAK tenant already configured as premium');
        }

        // Step 4: Final verification
        console.log('\n📊 Step 4: Final verification...');
        const { data: finalTenants } = await supabase
            .from('tenants')
            .select('id, business_name, whatsapp_provider, plan, waha_status');

        console.log('\nFinal tenant configurations:');
        console.table(finalTenants);

        console.log('\n✅ Migration complete!');
        console.log('\n📝 Summary:');
        console.log(`   - Total tenants: ${finalTenants.length}`);
        console.log(`   - Premium tenants: ${finalTenants.filter(t => t.plan === 'premium').length}`);
        console.log(`   - Basic tenants: ${finalTenants.filter(t => t.plan === 'basic').length}`);
        console.log(`   - Using Waha: ${finalTenants.filter(t => t.whatsapp_provider === 'waha').length}`);
        console.log(`   - Using Maytapi: ${finalTenants.filter(t => t.whatsapp_provider === 'maytapi').length}`);

    } catch (error) {
        console.error('\n❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run migration
runMigration().then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
