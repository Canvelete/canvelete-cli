/**
 * Output formatting utilities for Canvelete CLI
 */

import chalk from 'chalk';
import Table from 'cli-table3';

export function formatJson(data) {
    return JSON.stringify(data, null, 2);
}

export function formatTable(headers, rows, options = {}) {
    const table = new Table({
        head: headers.map(h => chalk.cyan(h)),
        style: { head: [], border: [] },
        ...options
    });
    
    rows.forEach(row => table.push(row));
    return table.toString();
}

export function formatDesign(design) {
    return {
        ID: design.id,
        Name: design.name,
        Size: `${design.width}x${design.height}`,
        Status: design.status,
        Visibility: design.visibility,
        Template: design.isTemplate ? 'Yes' : 'No',
        Created: formatDate(design.createdAt),
        Updated: formatDate(design.updatedAt),
    };
}

export function formatDesignsTable(designs) {
    const headers = ['ID', 'Name', 'Size', 'Status', 'Created'];
    const rows = designs.map(d => [
        d.id.substring(0, 12) + '...',
        truncate(d.name, 30),
        `${d.width}x${d.height}`,
        formatStatus(d.status),
        formatDate(d.createdAt)
    ]);
    return formatTable(headers, rows);
}

export function formatTemplatesTable(templates) {
    const headers = ['ID', 'Name', 'Size', 'Category'];
    const rows = templates.map(t => [
        t.id.substring(0, 12) + '...',
        truncate(t.name, 30),
        `${t.width}x${t.height}`,
        t.category || '-'
    ]);
    return formatTable(headers, rows);
}

export function formatAssetsTable(assets) {
    const headers = ['ID', 'Name', 'Type', 'Size', 'Created'];
    const rows = assets.map(a => [
        a.id.substring(0, 12) + '...',
        truncate(a.name, 25),
        a.type,
        formatBytes(a.size),
        formatDate(a.createdAt)
    ]);
    return formatTable(headers, rows);
}

export function formatApiKeysTable(keys) {
    const headers = ['ID', 'Name', 'Prefix', 'Status', 'Created', 'Last Used'];
    const rows = keys.map(k => [
        k.id.substring(0, 12) + '...',
        truncate(k.name, 20),
        k.keyPrefix,
        formatKeyStatus(k.status),
        formatDate(k.createdAt),
        k.lastUsedAt ? formatDate(k.lastUsedAt) : 'Never'
    ]);
    return formatTable(headers, rows);
}

export function formatRendersTable(renders) {
    const headers = ['ID', 'Design', 'Format', 'Status', 'Size', 'Created'];
    const rows = renders.map(r => [
        r.id.substring(0, 12) + '...',
        r.designId.substring(0, 12) + '...',
        r.format.toUpperCase(),
        formatRenderStatus(r.status),
        formatBytes(r.fileSize),
        formatDate(r.createdAt)
    ]);
    return formatTable(headers, rows);
}

export function formatUsageStats(stats) {
    const data = stats.data || stats;
    return `
${chalk.bold('Usage Statistics')}
${'─'.repeat(40)}
Credits Used:      ${chalk.yellow(data.creditsUsed)} / ${data.creditLimit}
Credits Remaining: ${chalk.green(data.creditsRemaining)}
API Calls:         ${data.apiCalls} / ${data.apiCallLimit}
Renders:           ${data.renders}
Storage Used:      ${formatBytes(data.storageUsed)}
`;
}

export function formatBillingInfo(info) {
    const data = info.data || info;
    return `
${chalk.bold('Billing Information')}
${'─'.repeat(40)}
Plan:              ${chalk.cyan(data.plan)}
Status:            ${formatBillingStatus(data.status)}
Credit Balance:    ${chalk.yellow(data.creditBalance)}
Next Billing:      ${formatDate(data.nextBillingDate)}
Period:            ${formatDate(data.currentPeriodStart)} - ${formatDate(data.currentPeriodEnd)}
`;
}

export function formatInvoicesTable(invoices) {
    const headers = ['ID', 'Date', 'Amount', 'Status'];
    const rows = invoices.map(i => [
        i.id.substring(0, 12) + '...',
        formatDate(i.date),
        `${i.currency} ${i.amount.toFixed(2)}`,
        formatInvoiceStatus(i.status)
    ]);
    return formatTable(headers, rows);
}

// Helper functions
function truncate(str, length) {
    if (!str) return '-';
    return str.length > length ? str.substring(0, length - 3) + '...' : str;
}

function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}

function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatStatus(status) {
    const colors = {
        'DRAFT': chalk.yellow,
        'PUBLISHED': chalk.green,
        'ARCHIVED': chalk.gray,
    };
    return (colors[status] || chalk.white)(status);
}

function formatKeyStatus(status) {
    return status === 'ACTIVE' ? chalk.green(status) : chalk.red(status);
}

function formatRenderStatus(status) {
    const colors = {
        'pending': chalk.yellow,
        'processing': chalk.blue,
        'completed': chalk.green,
        'failed': chalk.red,
    };
    return (colors[status] || chalk.white)(status);
}

function formatBillingStatus(status) {
    const colors = {
        'active': chalk.green,
        'trialing': chalk.blue,
        'past_due': chalk.red,
        'cancelled': chalk.gray,
    };
    return (colors[status] || chalk.white)(status);
}

function formatInvoiceStatus(status) {
    const colors = {
        'paid': chalk.green,
        'pending': chalk.yellow,
        'failed': chalk.red,
    };
    return (colors[status] || chalk.white)(status);
}

export function success(message) {
    console.log(chalk.green('✓'), message);
}

export function error(message) {
    console.error(chalk.red('✗'), message);
}

export function warn(message) {
    console.log(chalk.yellow('⚠'), message);
}

export function info(message) {
    console.log(chalk.blue('ℹ'), message);
}
