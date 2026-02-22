require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.log('Missing Supabase URL or Key')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkStats() {
    const { data, error } = await supabase
        .from('unified_email_log')
        .select('sender_email, source')

    if (error) {
        console.error('Error fetching logs:', error)
        return
    }

    console.log(`Total emails: ${data.length}`)

    // Group by sender
    const bySender = {}
    data.forEach(e => {
        const key = e.sender_email || 'NULL'
        bySender[key] = (bySender[key] || 0) + 1
    })
    console.log('By Sender:', bySender)

    // Group by source
    const bySource = {}
    data.forEach(e => {
        const key = e.source || 'NULL'
        bySource[key] = (bySource[key] || 0) + 1
    })
    console.log('By Source:', bySource)
}

checkStats()
