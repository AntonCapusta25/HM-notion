import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleAuth } from "npm:google-auth-library@9.0.0";
import { google } from "npm:googleapis@126.0.1";

serve(async (req) => {
    try {
        const googleServiceAccount = Deno.env.get("GOOGLE_SERVICE_ACCOUNT");
        if (!googleServiceAccount) throw new Error("Missing GOOGLE_SERVICE_ACCOUNT");

        const credentials = JSON.parse(googleServiceAccount);
        if (credentials.private_key) {
            credentials.private_key = credentials.private_key.replace(/\\n/g, '\n');
        }

        const auth = new GoogleAuth({
            credentials,
            scopes: ["https://www.googleapis.com/auth/drive", "https://www.googleapis.com/auth/documents"],
        });

        const drive = google.drive({ version: "v3", auth });
        const docs = google.docs({ version: "v1", auth });

        // List ALL files visible to the service account (including Shared Drives)
        const driveRes = await drive.files.list({
            pageSize: 20,
            fields: 'files(id, name, createdTime, webViewLink, owners, driveId)',
            orderBy: "createdTime desc",
            includeItemsFromAllDrives: true,
            supportsAllDrives: true,
            q: "trashed = false" // Optional filter
        });

        const files = driveRes.data.files || [];
        console.log("Visible Files:", JSON.stringify(files, null, 2));

        return new Response(JSON.stringify({
            success: true,
            count: files.length,
            files: files,
            serviceAccountEmail: credentials.client_email
        }), {
            headers: { "Content-Type": "application/json" },
        });

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
});
