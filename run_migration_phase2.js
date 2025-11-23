/**
 * Phase 2 Database Migration Runner
 * Adds WhatsApp provider fields to tenants table
 */

const { supabase } = require('./services/config');
const fs = require('fs');

async function runMigration() {
    console.log('🚀 Starting Phase 2 database migration...\n');

    try {
        // Read the migration SQL file
        const sqlFile = fs.readFileSync('./migrations/phase2_add_provider_fields.sql', 'utf8');
        
        // Split into individual statements (excluding comments and SELECT)
        const statements = sqlFile
            .split(';')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('--') && !s.startsWith('SELECT'));

        console.log(`Found ${statements.length} migration statements to execute\n`);

        // Execute each statement
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            if (!statement) continue;

            console.log(`[${i + 1}/${statements.length}] Executing: ${statement.substring(0, 60)}...`);
            
            try {
                const { data, error } = await supabase.rpc('exec_sql', {
                    query: statement
                });

                if (error) {
                    console.error(`❌ Error:`, error.message);
                } else {
                    console.log(`✅ Success`);
                }
            } catch (err) {
                console.error(`❌ Exception:`, err.message);
            }
        }

        console.log('\n📊 Checking current tenant configuration...\n');

        // Check current state
        const { data: tenants, error: selectError } = await supabase
            .from('tenants')
            .select('id, business_name, whatsapp_provider, plan, waha_status');

        if (selectError) {
            console.error('❌ Error fetching tenants:', selectError);
        } else {
            console.table(tenants);
            console.log(`\n✅ Migration complete! Found ${tenants.length} tenant(s)`);
        }

    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        console.error(error);
        process.exit(1);
    }
}

// Run migration
runMigration().then(() => {
    console.log('\n✨ All done!');
    process.exit(0);
});
