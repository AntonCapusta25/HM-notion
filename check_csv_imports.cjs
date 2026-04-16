
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkData() {
  console.log('--- CSV Imports ---');
  const { data: imports, error: importError } = await supabase
    .from('csv_imports')
    .select('*');
  
  if (importError) console.error(importError);
  else console.log(JSON.stringify(imports, null, 2));
}

checkData();
