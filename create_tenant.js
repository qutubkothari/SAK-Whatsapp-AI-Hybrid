const { supabase } = require('./services/config');

async function createTenant() {
    const tenantData = {
        id: '45bebb5d-cbab-4338-a3eb-a5b0c4aeea4e',
        business_name: 'SAK Solutions',
        phone_number: '971507055253',
        plan: 'premium'
    };
    
    console.log('Creating tenant:', tenantData);
    
    const { data, error } = await supabase
        .from('tenants')
        .insert(tenantData)
        .select();
    
    if (error) {
        console.error('Error creating tenant:', error);
        process.exit(1);
    }
    
    console.log('✅ Tenant created successfully:', data);
    process.exit(0);
}

createTenant();
