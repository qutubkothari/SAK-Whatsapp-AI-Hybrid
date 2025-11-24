require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function updateZohoCredentials() {
  console.log('Updating Zoho credentials...');
  
  const tenantId = '45bebb5d-cbab-4338-a3eb-a5b0c4aeea4e';
  
  const { data, error } = await supabase
    .from('tenants')
    .update({
      zoho_client_id: '1000.YMW2IS2U240627TMONWVKKII7PXAUC',
      zoho_client_secret: 'd0d6022ecf1f7afcac4022fad835ac512b92d06c5f',
      zoho_organization_id: '60006942979'
    })
    .eq('id', tenantId)
    .select();

  if (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  console.log('✅ Zoho credentials updated successfully');
  console.log('Tenant:', data[0].business_name);
  console.log('Zoho Client ID:', data[0].zoho_client_id);
  console.log('Zoho Org ID:', data[0].zoho_organization_id);
  console.log('\nNow you need the Refresh Token:');
  console.log('1. Visit this URL (copy and open in browser):');
  console.log(`https://accounts.zoho.com/oauth/v2/auth?scope=ZohoBooks.fullaccess.all&client_id=1000.YMW2IS2U240627TMONWVKKII7PXAUC&response_type=code&redirect_uri=http://localhost&access_type=offline`);
  console.log('\n2. After approving, copy the CODE from the URL');
  console.log('3. Run this PowerShell command:');
  console.log(`curl -X POST "https://accounts.zoho.com/oauth/v2/token?code=YOUR_CODE_HERE&client_id=1000.YMW2IS2U240627TMONWVKKII7PXAUC&client_secret=d0d6022ecf1f7afcac4022fad835ac512b92d06c5f&redirect_uri=http://localhost&grant_type=authorization_code"`);
  
  process.exit(0);
}

updateZohoCredentials();
