/**
 * Usage and billing commands
 */

import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { 
    formatJson, formatUsageStats, formatBillingInfo, formatInvoicesTable,
    success, error, info 
} from '../output.js';

export function registerUsageCommands(program) {
    // Usage command
    program
        .command('usage')
        .description('View usage statistics')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching usage stats...').start();

            try {
                const client = createClient();
                const result = await client.getUsageStats();
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                console.log(formatUsageStats(result));
            } catch (err) {
                spinner.fail('Failed to fetch usage stats');
                error(err.message);
                process.exit(1);
            }
        });

    // Billing commands
    const billing = program
        .command('billing')
        .description('View billing information');

    billing
        .command('info')
        .description('View billing details')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching billing info...').start();

            try {
                const client = createClient();
                const result = await client.getBillingInfo();
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                console.log(formatBillingInfo(result));
            } catch (err) {
                spinner.fail('Failed to fetch billing info');
                error(err.message);
                process.exit(1);
            }
        });

    billing
        .command('invoices')
        .description('List invoices')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching invoices...').start();

            try {
                const client = createClient();
                const result = await client.getInvoices({
                    limit: parseInt(options.limit),
                });
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const invoices = result.data || [];
                if (invoices.length === 0) {
                    info('No invoices found.');
                    return;
                }

                console.log(formatInvoicesTable(invoices));
            } catch (err) {
                spinner.fail('Failed to fetch invoices');
                error(err.message);
                process.exit(1);
            }
        });
}
