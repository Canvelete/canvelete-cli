/**
 * Authentication commands
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import open from 'open';
import { setApiKey, getApiKey, clearApiKey, getConfigPath } from '../config.js';
import { success, error, info } from '../output.js';

export function registerAuthCommands(program) {
    const auth = program
        .command('auth')
        .description('Manage authentication');

    auth
        .command('login')
        .description('Authenticate with Canvelete')
        .option('-k, --key <apiKey>', 'API key (or use interactive prompt)')
        .option('--browser', 'Open browser to get API key')
        .action(async (options) => {
            try {
                let apiKey = options.key;

                if (options.browser) {
                    info('Opening browser to get your API key...');
                    await open('https://www.canvelete.com/dashboard/api-keys');
                    console.log(chalk.gray('Create or copy an API key from the dashboard.\n'));
                }

                if (!apiKey) {
                    const answers = await inquirer.prompt([
                        {
                            type: 'password',
                            name: 'apiKey',
                            message: 'Enter your API key:',
                            mask: '*',
                            validate: (input) => {
                                if (!input || input.trim().length === 0) {
                                    return 'API key is required';
                                }
                                return true;
                            }
                        }
                    ]);
                    apiKey = answers.apiKey;
                }

                // Validate the API key by making a test request
                const response = await fetch('https://www.canvelete.com/api/automation/designs?limit=1', {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'canvelete-cli/2.0.0'
                    }
                });

                if (!response.ok) {
                    if (response.status === 401) {
                        error('Invalid API key. Please check and try again.');
                        process.exit(1);
                    }
                    throw new Error(`Validation failed: ${response.status}`);
                }

                setApiKey(apiKey);
                success('Successfully authenticated!');
                console.log(chalk.gray(`Config saved to: ${getConfigPath()}`));
            } catch (err) {
                error(`Authentication failed: ${err.message}`);
                process.exit(1);
            }
        });

    auth
        .command('logout')
        .description('Remove stored credentials')
        .action(() => {
            clearApiKey();
            success('Logged out successfully.');
        });

    auth
        .command('status')
        .description('Check authentication status')
        .action(async () => {
            const apiKey = getApiKey();
            
            if (!apiKey) {
                console.log(chalk.yellow('Not authenticated.'));
                console.log(chalk.gray('Run: canvelete auth login'));
                return;
            }

            console.log(chalk.green('✓ Authenticated'));
            console.log(chalk.gray(`  Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`));
            console.log(chalk.gray(`  Config: ${getConfigPath()}`));

            // Test the connection
            try {
                const response = await fetch('https://www.canvelete.com/api/automation/designs?limit=1', {
                    headers: {
                        'Authorization': `Bearer ${apiKey}`,
                        'User-Agent': 'canvelete-cli/2.0.0'
                    }
                });

                if (response.ok) {
                    console.log(chalk.green('✓ API connection verified'));
                } else {
                    console.log(chalk.red('✗ API key may be invalid or expired'));
                }
            } catch (err) {
                console.log(chalk.yellow('⚠ Could not verify API connection'));
            }
        });

    auth
        .command('token')
        .description('Display current API key')
        .option('--show', 'Show full token (use with caution)')
        .action((options) => {
            const apiKey = getApiKey();
            
            if (!apiKey) {
                error('Not authenticated.');
                process.exit(1);
            }

            if (options.show) {
                console.log(apiKey);
            } else {
                console.log(`${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`);
            }
        });
}
