import { Lead, CollabLead } from '@/types';

/**
 * Escapes CSV field values to handle commas, quotes, and newlines
 */
function escapeCSVField(value: any): string {
    if (value === null || value === undefined) return '';

    const stringValue = String(value);

    // If the value contains comma, quote, or newline, wrap it in quotes and escape internal quotes
    if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
        return `"${stringValue.replace(/"/g, '""')}"`;
    }

    return stringValue;
}

/**
 * Converts an array of leads to CSV format
 */
export function convertLeadsToCSV(leads: (Lead | CollabLead)[], outreachType: 'collab' | 'client'): string {
    if (leads.length === 0) {
        return '';
    }

    // Define headers based on outreach type
    const headers = outreachType === 'collab'
        ? ['Name', 'Email', 'Phone', 'Restaurant Name', 'City', 'Cuisine Type', 'Status', 'Last Contacted', 'Notes']
        : ['Name', 'Email', 'Phone', 'Company', 'Location', 'Status', 'Source', 'Lead Score', 'Last Contacted', 'Notes'];

    // Create CSV rows
    const rows = leads.map(lead => {
        if (outreachType === 'collab') {
            const collabLead = lead as CollabLead;
            return [
                escapeCSVField(collabLead.name),
                escapeCSVField(collabLead.email),
                escapeCSVField(collabLead.phone || ''),
                escapeCSVField(collabLead.restaurant_name || ''),
                escapeCSVField(collabLead.city || ''),
                escapeCSVField(collabLead.cuisine_type || ''),
                escapeCSVField(collabLead.status),
                escapeCSVField(collabLead.last_contacted_at ? new Date(collabLead.last_contacted_at).toLocaleDateString() : ''),
                escapeCSVField(collabLead.notes || '')
            ].join(',');
        } else {
            const clientLead = lead as Lead;
            return [
                escapeCSVField(clientLead.name),
                escapeCSVField(clientLead.email),
                escapeCSVField(clientLead.phone || ''),
                escapeCSVField(clientLead.company || ''),
                escapeCSVField(clientLead.location || ''),
                escapeCSVField(clientLead.status),
                escapeCSVField(clientLead.source || ''),
                escapeCSVField(clientLead.lead_score || ''),
                escapeCSVField(clientLead.last_contacted_at ? new Date(clientLead.last_contacted_at).toLocaleDateString() : ''),
                escapeCSVField(clientLead.notes || '')
            ].join(',');
        }
    });

    // Combine headers and rows
    return [headers.join(','), ...rows].join('\n');
}

/**
 * Triggers a browser download of CSV data
 */
export function downloadCSV(csvContent: string, filename: string = 'leads-export.csv'): void {
    // Create a Blob from the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });

    // Create a temporary download link
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    // Append to body, click, and remove
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    // Clean up the URL object
    URL.revokeObjectURL(url);
}

/**
 * Main export function - converts leads to CSV and triggers download
 */
export function exportLeadsToCSV(
    leads: (Lead | CollabLead)[],
    outreachType: 'collab' | 'client',
    filename?: string
): void {
    const csvContent = convertLeadsToCSV(leads, outreachType);

    if (!csvContent) {
        throw new Error('No leads to export');
    }

    // Generate filename with timestamp if not provided
    const defaultFilename = `${outreachType}-leads-${new Date().toISOString().split('T')[0]}.csv`;
    downloadCSV(csvContent, filename || defaultFilename);
}
