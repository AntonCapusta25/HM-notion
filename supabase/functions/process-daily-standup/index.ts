// Supabase Edge Function: process-daily-standup
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";
import { google } from "npm:googleapis@126.0.1";
// using manual CSV parser defined below

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    const debugLogs: string[] = [];
    const log = (msg: string) => { console.log(msg); debugLogs.push(msg); };

    log("Function started");

    try {
        // 1. Validation & Setup
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        // Get Google Credentials from secrets (assuming JSON string)
        const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
        if (!googleServiceAccount) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT");

        const credentials = JSON.parse(googleServiceAccount);

        // Fix private_key line breaks if they are escaped
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }

        const auth = new GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/drive.readonly", "https://www.googleapis.com/auth/documents.readonly"],
        });

        const drive = google.drive({ version: "v3", auth });
        const docs = google.docs({ version: "v1", auth });

        // 2. Search for "Daily Standup" files
        // Modified to search for files created/modified recently or just list them.
        // Ideally, we filter by name and trashed=false.
        // For simplicity, let's look for "Daily Standup" in name.
        log("Searching for files...");
        const driveRes = await drive.files.list({
            q: "name contains 'Daily Standup' and mimeType = 'application/vnd.google-apps.document' and trashed = false",
            fields: "files(id, name, createdTime)",
            orderBy: "createdTime desc",
            pageSize: 10,
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
        });

        const files = driveRes.data.files || [];
        log(`Found ${files.length} potential files.`);

        const processedFiles = [];

        for (const file of files) {
            if (!file.id || !file.name) continue;

            // 3. Check if already processed
            log(`Processing file: ${file.name} (${file.id})`);
            const existing = null;
            /*
            const { data: existing } = await supabaseClient
                .from("processed_documents")
                .select("id")
                .eq("file_id", file.id)
                .single();
            */

            if (existing) {
                log(`Skipping already processed file: ${file.name} (${file.id})`);
                continue;
            }

            // 4. Get File Content & "Transcript" Tab
            log("Fetching document content...");
            const doc = await docs.documents.get({ documentId: file.id });
            const document = doc.data;

            let transcriptText = "";

            // Check Tabs
            // Note: Google Docs API v1 might not fully expose tabs in the same way sheets do yet in all client versions, 
            // but 'tabs' field should be present if it's a multi-tab doc.
            // If not, we fall back to body.
            let targetBody = document.body;

            if (document.tabs) {
                log(`Document has tabs: ${JSON.stringify(document.tabs.map(t => t.tabProperties?.title))}`);
                const transcriptTab = document.tabs.find(t => t.tabProperties?.title?.trim().toLowerCase() === "transcript");
                if (transcriptTab && transcriptTab.documentTab && transcriptTab.documentTab.body) {
                    log("Found 'Transcript' tab.");
                    targetBody = transcriptTab.documentTab.body;
                } else {
                    log("'Transcript' tab not found, falling back to body (which might be empty if content is in other tabs).");
                }
            } else {
                log("Document has no tabs property.");
            }

            // Extract Text
            transcriptText = extractText(targetBody);
            log(`Extracted text length: ${transcriptText.length}`);
            log(`Extracted text preview: ${transcriptText.substring(0, 100)}`);

            if (!transcriptText.trim()) {
                log("No text found in document.");
                continue;
            }

            // 5. Call OpenAI
            const openAiKey = Deno.env.get("OPENAI_API_KEY");
            if (!openAiKey) throw new Error("Missing OPENAI_API_KEY");

            const systemPrompt = `You are **Task Formatter (Homemade)**.
Your sole job is to convert **any meeting notes, call transcripts, chats, voice summaries, or bullet points** into a **precise, execution ready task list** for Homemade B.V.

You **must extract every possible task**, including implicit, follow up, coordination, review, verification, handoff, and reporting tasks.
Assume the team wants **zero ambiguity and zero missed work**.

If something sounds vague, **turn it into a concrete, shippable action** with a clear definition of done.

---

## OUTPUT RULES (CRITICAL)

### Output format

* **Output ONLY a CSV**
* **No explanations, no markdown, no comments**
* If no tasks exist, output **only the CSV header**

### CSV columns (exact order and spelling)

\`\`\`
Title,Description,Status,Priority,Due Date,Assignees (emails),Tags,Project
\`\`\`

---

## FIELD RULES

### Title

* Verb first, imperative
* 4 to 9 words
* One action only
* No filler language
* **Never use commas**
* If needed, use \`;\` instead of commas

Good
\`Launch TikTok campaigns TR;ES;EN\`
Bad
\`Quick update on TikTok stuff\`

---

### Description

* Exactly **one sentence**
* Define what “done” means
* Include tool, channel, or file if relevant
* **Use \`;\` instead of commas**
* Be explicit and technical if needed

---

### Status (normalize strictly)

Map based on context:

* done; ready; finished; published → \`done\`
* in progress; working on; fixing; testing → \`in progress\`
* scheduled; booked; planned at; before <time> → \`scheduled\`
* blocked by; waiting for; need access → \`blocked\`
* everything else → \`todo\`

---

### Priority (normalize)

* \`high\`
  Investor; finance; payments; ads go live; deadlines today or tomorrow; events; legal; anything that blocks others
* \`medium\`
  Important but not urgent
* \`low\`
  Cleanup; admin; internal polish; non blocking

When unsure; default to \`medium\`.

---

### Due Date

* Format: \`YYYY-MM-DD\`
* Ignore times; keep date only
* Resolve relative dates:

  * today → today
  * tomorrow → today +1
  * before <time> → today
  * next week → next Monday
  * by Friday → closest upcoming Friday
* If no date exists; leave blank

---

### Assignees (emails only)

Use **ONLY these canonical emails**:

\`\`\`
aisha@abdel-wahab.com
aureymballa@gmail.com
bangalexf@gmail.com
fino2892002@gmail.com (Abdelrahman)
hamedzadjali65@gmail.com
info@homemademeals.net
khaylanlalla35@gmail.com
mahmoudelwakil22@gmail.com
mennatyehiaz@gmail.com
rajayogi2000@gmail.com
tiayahyaa@gmail.com
walid_sabihi@outlook.com
\`\`\`

#### Name to email mapping

* Tia Yahya → [tiayahyaa@gmail.com](mailto:tiayahyaa@gmail.com)
* Mennat Yehia → [mennatyehiaz@gmail.com](mailto:mennatyehiaz@gmail.com)
* Alexander;Alexandr Filippov → [bangalexf@gmail.com](mailto:bangalexf@gmail.com)
* Mahmoud Elwakil → [mahmoudelwakil22@gmail.com](mailto:mahmoudelwakil22@gmail.com)
* Khaylan Lalla → [khaylanlalla35@gmail.com](mailto:khaylanlalla35@gmail.com)
* Homemade;Owner;HM;Info → [info@homemademeals.net](mailto:info@homemademeals.net)

Multiple assignees → separate with \`;\`
Unknown owner → leave empty

---

### Tags

* Lowercase
* 3 to 4 max
* Use \`;\` separator
* Prefer operational domains

Examples
\`ads;tiktok;launch\`
\`finance;invoices;vat\`
\`product;platform;bug\`
\`social;instagram;content\`

---

### Project

* Default ALWAYS to:

\`\`\`
915c4b92-8406-4714-93a1-6077e465c954
\`\`\`

* Only change if another project ID is explicitly mentioned in input

---

## TASK EXTRACTION LOGIC (VERY IMPORTANT)

You must:

1. **Split compound work into microtasks**

   * Example
     “Launch TikTok and add creatives and set retargeting”
     → 3 separate rows

2. **Create implicit tasks**

   * Reviews
   * Notifications
   * Follow ups
   * Confirmations
   * Reporting
   * Hand offs
   * QA checks

3. **Convert vague language**

   * “look into” → investigate and report findings
   * “make sure” → verify and confirm
   * “discuss” → schedule and prepare agenda
   * “send me when done” → notify owner

4. **Promote critical items automatically**

   * Finance
   * Invoices
   * Payments
   * Investor material
   * Ads going live
   * Event preparation

5. **Never duplicate tasks**

   * Merge identical actions into one row

6. **CSV safety**

   * Never use commas inside Title or Description
   * Always replace commas with \`;\`

---

## QUALITY RULES

* Neutral professional tone
* No slang or profanity
* No assumptions beyond text
* No missing tasks if action is implied
* Precision over brevity`;

            const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${openAiKey}`
                },
                body: JSON.stringify({
                    model: "gpt-4-turbo", // or gpt-4o if available
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: transcriptText }
                    ],
                    temperature: 0.2 // Lower for extraction
                })
            });

            const aiData = await aiResponse.json();
            const content = aiData.choices?.[0]?.message?.content;

            if (!content) {
                console.error("No content from OpenAI");
                continue;
            }

            // 6. Parse CSV & Insert
            const rows = parseCSV(content); // Custom simple parser
            if (rows.length === 0) continue;

            const tasksToInsert = rows.map(row => ({
                title: row.Title,
                description: row.Description,
                status: row.Status || 'todo',
                priority: row.Priority || 'medium',
                due_date: row['Due Date'] ? row['Due Date'] : null,
                assignees: row['Assignees (emails)'] ? row['Assignees (emails)'].split(';').map(e => e.trim()) : [], // Logic to map emails to IDs might be needed if your DB uses UUIDs for assignees. Assuming text array for now or we map it.
                tags: row.Tags ? row.Tags.split(';').map(t => t.trim()) : [],
                // project_id: row.Project // Add if you have project_id column
                created_by: 'system_automation' // Or specific user ID
            }));

            // NOTE: Your `tasks` table might require UUIDs for assignees if it's a relation. 
            // This part assumes your tasks table stores emails or we need to lookup UUIDs. 
            // If `assignees` is text array of emails, good. 
            // If `task_assignees` is a junction table, we need complex insert.
            // Based on types.ts: `assignees` in interface is `string[]` (UUIDs).
            // So we need to map emails to User IDs.

            // Fetch all users to map emails
            const { data: users } = await supabaseClient.from('users').select('id, email');
            const emailToIdMap = new Map((users || []).map(u => [u.email.toLowerCase(), u.id]));

            // 7. Insert Loop
            let insertedCount = 0;
            for (const task of tasksToInsert) {
                // Prepare DB object
                const dbTask = {
                    title: task.title,
                    description: task.description,
                    status: task.status,
                    priority: task.priority,
                    due_date: task.due_date,
                    created_by: 'bd490710-ac37-4648-a006-258169134a65', // Using a default system/admin user ID if possible, or fetch one.
                    // workspace_id: ... // Retrieve if needed
                };

                const { data: insertedTask, error: insertError } = await supabaseClient
                    .from('tasks')
                    .insert(dbTask)
                    .select()
                    .single();

                if (insertError) {
                    console.error("Error inserting task:", insertError);
                    continue; // or throw
                }

                if (insertedTask && task.assignees.length > 0) {
                    // Insert assignees
                    const assigneeRecords = task.assignees
                        .map(email => emailToIdMap.get(email.toLowerCase()))
                        .filter(id => id) // Only valid IDs
                        .map(userId => ({
                            task_id: insertedTask.id,
                            user_id: userId
                        }));

                    if (assigneeRecords.length > 0) {
                        await supabaseClient.from('task_assignees').insert(assigneeRecords);
                    }
                }

                if (insertedTask && task.tags.length > 0) {
                    // Insert tags
                    const tagRecords = task.tags.map(tag => ({
                        task_id: insertedTask.id,
                        tag: tag
                    }));
                    await supabaseClient.from('task_tags').insert(tagRecords);
                }

                insertedCount++;
            }

            // 8. Mark as Processed
            await supabaseClient.from('processed_documents').insert({
                file_id: file.id,
                file_name: file.name,
                task_count: insertedCount
            });

            processedFiles.push({ name: file.name, tasks: insertedCount });
        }

        return new Response(JSON.stringify({ success: true, processed: processedFiles, debugLogs }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

    } catch (error) {
        console.error(error);
        return new Response(JSON.stringify({ error: error.message, debugLogs: debugLogs || [] }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
});

// Helper: Extract text from Google Doc Body
function extractText(body: any): string {
    if (!body || !body.content) return "";
    let text = "";
    for (const element of body.content) {
        if (element.paragraph) {
            for (const run of element.paragraph.elements) {
                if (run.textRun && run.textRun.content) {
                    text += run.textRun.content;
                }
            }
        } else if (element.table) {
            for (const row of element.table.tableRows) {
                for (const cell of row.tableCells) {
                    text += extractText(cell) + " | "; // add separator for table cells
                }
                text += "\n";
            }
        }
    }
    return text;
}

// Helper: Simple CSV Parser (Assumes no commas in fields as per prompt rules, but handles quotes if standard CSV)
// The prompt enforces ; instead of commas, so simple split might work if OpenAI obeys.
function parseCSV(content: string): any[] {
    const lines = content.trim().split('\n');
    if (lines.length < 2) return [];

    // Assuming first line is header
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple regex to handle quoted CSV if needed, or simple split if trusted.
        // Given the prompt "Never use commas... if needed use ;", simple split by comma should be safe-ish.
        // But let's be robust enough for standard CSV just in case.
        const values = [];
        let current = '';
        let inQuote = false;

        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());

        if (values.length === headers.length) {
            const obj: any = {};
            headers.forEach((h, index) => {
                obj[h] = values[index];
            });
            result.push(obj);
        }
    }
    return result;
}
