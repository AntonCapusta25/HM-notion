
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('--- Campaign Attachments ---');
  const { data: attachments, error: attachError } = await supabase
    .from('campaign_attachments')
    .select('*');
  
  if (attachError) console.error(attachError);
  else console.log(JSON.stringify(attachments, null, 2));

  console.log('\n--- Processed Documents ---');
  const { data: processed, error: procError } = await supabase
    .from('processed_documents')
    .select('*');
  
  if (procError) console.error(procError);
  else console.log(JSON.stringify(processed, null, 2));
}

checkData();
