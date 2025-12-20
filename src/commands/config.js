/**
 * Configuration commands
 */

import chalk from 'chalk';
import { getAllConfig, setConfig, getConfigPath } from '../config.js';
import { success, error, info } from '../output.js';

export function registerConfigCommands(program) {
    const config = program
        .command('config')
        .description('Manage CLI configuration');

    // Show all config
    config
        .command('list')
        .alias('ls')
        .description('Show all configuration')
        .action(() => {
            const allConfig = getAllConfig();
            
            console.log(chalk.bold('\nConfiguration'));
            console.log('─'.repeat(40));
            console.log(chalk.gray(`Path: ${getConfigPath()}\n`));

            Object.entries(allConfig).forEach(([key, value]) => {
                if (key === 'apiKey' && value) {
                    value = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
                }
                console.log(`${chalk.cyan(key.padEnd(20))} ${value || chalk.gray('(not set)')}`);
            });
        });

    // Get config value
    config
        .command('get <key>')
        .description('Get a configuration value')
        .action((key) => {
            const allConfig = getAllConfig();
            
            if (!(key in allConfig)) {
                error(`Unknown configuration key: ${key}`);
                console.log(chalk.gray(`Available keys: ${Object.keys(allConfig).join(', ')}`));
                process.exit(1);
            }

            let value = allConfig[key];
            if (key === 'apiKey' && value) {
                value = `${value.substring(0, 8)}...${value.substring(value.length - 4)}`;
            }
            
            console.log(value || '');
        });

    // Set config value
    config
        .command('set <key> <value>')
        .description('Set a configuration value')
        .action((key, value) => {
            const validKeys = ['baseUrl', 'defaultFormat', 'defaultQuality'];
            
            if (!validKeys.includes(key)) {
                error(`Cannot set "${key}". Use "canvelete auth login" for API key.`);
                console.log(chalk.gray(`Settable keys: ${validKeys.join(', ')}`));
                process.exit(1);
            }

            if (key === 'defaultQuality') {
                value = parseInt(value);
                if (isNaN(value) || value < 1 || value > 100) {
                    error('Quality must be a number between 1 and 100');
                    process.exit(1);
                }
            }

            setConfig(key, value);
            success(`Set ${key} = ${value}`);
        });

    // Show config path
    config
        .command('path')
        .description('Show configuration file path')
        .action(() => {
            console.log(getConfigPath());
        });
}
