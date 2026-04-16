
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function listAllFiles() {
  console.log('--- Listing All Storage Buckets ---');
  const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
  
  if (bucketError) {
    console.error(bucketError);
    return;
  }

  for (const bucket of buckets) {
    console.log(`\nBucket: ${bucket.name}`);
    const { data: files, error: fileError } = await supabase.storage.from(bucket.name).list('', {
      limit: 100,
      offset: 0,
      sortBy: { column: 'name', order: 'asc' }
    });

    if (fileError) {
      console.error(`Error listing files in ${bucket.name}:`, fileError);
      continue;
    }

    if (files.length === 0) {
      console.log('  (Empty)');
    } else {
      files.forEach(file => {
        console.log(`  - ${file.name} (${file.metadata?.size || 0} bytes)`);
      });
    }
  }
}

listAllFiles();
