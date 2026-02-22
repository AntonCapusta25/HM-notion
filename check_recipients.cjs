require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase URL or Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkRecipients() {
    console.log('Fetching unified_email_log recipients...')
    const { data, error } = await supabase
        .from('unified_email_log')
        .select('recipient_email, recipient_name, source, subject')
        .limit(20)

    if (error) {
        console.error('Error fetching logs:', error)
        return
    }

    console.log('Sample data:')
    data.forEach(e => {
        console.log(`To: "${e.recipient_email}" Name: "${e.recipient_name}" Subject: "${e.subject}"`)
    })
}

checkRecipients()
