import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  "https://wqpmhnsxqcsplfdyxrih.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndxcG1obnN4cWNzcGxmZHl4cmloIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjQyMTA3MywiZXhwIjoyMDcxOTk3MDczfQ.LcIhW37JDQU61dnjdOk5P2MRau8TfUqIwo3HXJHOnb8"
);

async function run() {
  const insertPayload = {
    chef_id: "test",
    chef_name: "Test Chef",
    shoot_date: "2026-03-15",
    status: "scheduled",
    triggered_from: "lovable",
  };

  const { data, error } = await supabase.from("video_projects").insert(insertPayload).select();
  console.log("Error:", error);
  console.log("Data:", data);
}
run();
