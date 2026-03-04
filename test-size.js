import { createClient } from "@supabase/supabase-js";

// Try to generate a 162-byte JSON string exactly
const errStr = "Failed to create video project: invalid input syntax for type uuid: \"test-id\"";
const out1 = JSON.stringify({ success: false, error: errStr });
console.log(out1.length, out1);

const err2 = "Failed to create video project: null value in column \"workspace_id\" violates not-null constraint";
const out2 = JSON.stringify({ success: false, error: err2 });
console.log(out2.length, out2);

const err3 = "Server configuration error";
const out3 = JSON.stringify({ success: false, error: err3 });
console.log(out3.length, out3);

// Let's test the Edge Function's exact catch block structure:
function buildErr(msg) {
    return JSON.stringify({ success: false, error: msg });
}

console.log(buildErr("Failed to create video project: new row for relation \"video_projects\" violates check constraint \"video_projects_status_check\"").length);
