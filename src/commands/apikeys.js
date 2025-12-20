/**
 * API Key commands
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { 
    formatJson, formatApiKeysTable,
    success, error, info, warn 
} from '../output.js';

export function registerApiKeyCommands(program) {
    const apikeys = program
        .command('apikeys')
        .alias('keys')
        .description('Manage API keys');

    // List API keys
    apikeys
        .command('list')
        .alias('ls')
        .description('List your API keys')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching API keys...').start();

            try {
                const client = createClient();
                const result = await client.listApiKeys({
                    limit: parseInt(options.limit),
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const keys = result.data || [];
                if (keys.length === 0) {
                    info('No API keys found.');
                    return;
                }

                console.log(formatApiKeysTable(keys));
            } catch (err) {
                spinner.fail('Failed to fetch API keys');
                error(err.message);
                process.exit(1);
            }
        });

    // Create API key
    apikeys
        .command('create')
        .description('Create a new API key')
        .option('-n, --name <name>', 'Key name')
        .option('-e, --expires <date>', 'Expiration date (ISO format)')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();

            let name = options.name;
            if (!name) {
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'API key name:',
                        validate: (input) => input.length > 0 || 'Name is required'
                    }
                ]);
                name = answers.name;
            }

            const spinner = ora('Creating API key...').start();

            try {
                const client = createClient();
                const result = await client.createApiKey(name, options.expires);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const key = result.data || result;
                success('API key created!');
                
                console.log(chalk.bold.yellow('\n⚠️  IMPORTANT: Save this key now. It will not be shown again!\n'));
                console.log(chalk.bold(`API Key: ${key.key}`));
                console.log(chalk.gray(`\nName: ${key.name}`));
                console.log(chalk.gray(`ID: ${key.id}`));
            } catch (err) {
                spinner.fail('Failed to create API key');
                error(err.message);
                process.exit(1);
            }
        });

    // Revoke API key
    apikeys
        .command('revoke <id>')
        .alias('delete')
        .description('Revoke an API key')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, options) => {
            requireAuth();

            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to revoke API key ${id}? This cannot be undone.`,
                        default: false
                    }
                ]);

                if (!confirm) {
                    info('Cancelled.');
                    return;
                }
            }

            const spinner = ora('Revoking API key...').start();

            try {
                const client = createClient();
                await client.revokeApiKey(id);
                spinner.stop();
                success('API key revoked successfully');
            } catch (err) {
                spinner.fail('Failed to revoke API key');
                error(err.message);
                process.exit(1);
            }
        });
}
