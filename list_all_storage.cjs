const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function listAll() {
  console.log('--- Listing All Storage Buckets ---');
  const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
  
  if (bucketsError) {
    console.error('Error listing buckets:', bucketsError);
    return;
  }

  for (const bucket of buckets) {
    console.log(`\nBucket: ${bucket.id}`);
    await listFiles(bucket.id, '');
  }
}

async function listFiles(bucketId, path) {
  const { data: files, error } = await supabase.storage.from(bucketId).list(path);
  
  if (error) {
    console.error(`Error listing files in ${bucketId}/${path}:`, error);
    return;
  }

  if (!files || files.length === 0) {
    console.log(`  (empty)`);
    return;
  }

  for (const file of files) {
    const filePath = path ? `${path}/${file.name}` : file.name;
    if (file.id === null) {
      // It's a directory
      console.log(`  Directory: ${filePath}`);
      await listFiles(bucketId, filePath);
    } else {
      console.log(`  File: ${filePath} (${file.metadata.size} bytes)`);
    }
  }
}

listAll();
