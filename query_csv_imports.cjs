const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function query() {
  console.log('--- Querying csv_imports table ---');
  const { data, error } = await supabase
    .from('csv_imports')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error querying csv_imports:', error);
    return;
  }

  if (!data || data.length === 0) {
    console.log('No CSV imports found in table.');
    return;
  }

  console.log(JSON.stringify(data, null, 2));
}

query();
