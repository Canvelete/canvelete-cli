/**
 * Profile management commands - manage multiple API key profiles
 */

import chalk from 'chalk';
import inquirer from 'inquirer';
import Conf from 'conf';
import { setApiKey, getApiKey, getConfigPath } from '../config.js';
import { success, error, info, warn } from '../output.js';

// Separate config for profiles
const profilesConfig = new Conf({
    projectName: 'canvelete-cli',
    configName: 'profiles',
    schema: {
        profiles: {
            type: 'object',
            default: {}
        },
        activeProfile: {
            type: 'string',
            default: 'default'
        }
    }
});

export function registerProfileCommands(program) {
    const profiles = program
        .command('profiles')
        .alias('profile')
        .description('Manage multiple API key profiles');

    // List profiles
    profiles
        .command('list')
        .alias('ls')
        .description('List all profiles')
        .action(() => {
            const allProfiles = profilesConfig.get('profiles') || {};
            const activeProfile = profilesConfig.get('activeProfile');

            console.log(chalk.bold('\nProfiles'));
            console.log('─'.repeat(40));

            const profileNames = Object.keys(allProfiles);
            
            if (profileNames.length === 0) {
                info('No profiles configured.');
                console.log(chalk.gray('Create one with: canvelete profiles add <name>'));
                return;
            }

            profileNames.forEach(name => {
                const profile = allProfiles[name];
                const isActive = name === activeProfile;
                const marker = isActive ? chalk.green('● ') : '  ';
                const keyPreview = profile.apiKey 
                    ? `${profile.apiKey.substring(0, 8)}...` 
                    : chalk.gray('(no key)');
                
                console.log(`${marker}${chalk.cyan(name.padEnd(15))} ${keyPreview}`);
                if (profile.description) {
                    console.log(`  ${chalk.gray(profile.description)}`);
                }
            });

            console.log(chalk.gray(`\nActive: ${activeProfile}`));
        });

    // Add profile
    profiles
        .command('add <name>')
        .description('Add a new profile')
        .option('-k, --key <apiKey>', 'API key for this profile')
        .option('-d, --description <text>', 'Profile description')
        .option('--base-url <url>', 'Custom base URL')
        .action(async (name, options) => {
            const allProfiles = profilesConfig.get('profiles') || {};

            if (allProfiles[name]) {
                const { overwrite } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'overwrite',
                        message: `Profile "${name}" already exists. Overwrite?`,
                        default: false
                    }
                ]);

                if (!overwrite) {
                    info('Cancelled.');
                    return;
                }
            }

            let apiKey = options.key;
            if (!apiKey) {
                const answers = await inquirer.prompt([
                    {
                        type: 'password',
                        name: 'apiKey',
                        message: 'API key:',
                        mask: '*'
                    }
                ]);
                apiKey = answers.apiKey;
            }

            allProfiles[name] = {
                apiKey,
                description: options.description || '',
                baseUrl: options.baseUrl || 'https://www.canvelete.com',
                createdAt: new Date().toISOString()
            };

            profilesConfig.set('profiles', allProfiles);
            success(`Profile "${name}" created`);

            // Ask to switch
            const { switchTo } = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'switchTo',
                    message: `Switch to "${name}" profile now?`,
                    default: true
                }
            ]);

            if (switchTo) {
                profilesConfig.set('activeProfile', name);
                setApiKey(apiKey);
                success(`Switched to "${name}"`);
            }
        });

    // Remove profile
    profiles
        .command('remove <name>')
        .alias('rm')
        .description('Remove a profile')
        .option('-f, --force', 'Skip confirmation')
        .action(async (name, options) => {
            const allProfiles = profilesConfig.get('profiles') || {};

            if (!allProfiles[name]) {
                error(`Profile "${name}" not found`);
                process.exit(1);
            }

            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Delete profile "${name}"?`,
                        default: false
                    }
                ]);

                if (!confirm) {
                    info('Cancelled.');
                    return;
                }
            }

            delete allProfiles[name];
            profilesConfig.set('profiles', allProfiles);

            // If this was the active profile, clear it
            if (profilesConfig.get('activeProfile') === name) {
                profilesConfig.set('activeProfile', 'default');
                warn('Active profile was removed. Switched to "default".');
            }

            success(`Profile "${name}" removed`);
        });

    // Switch profile
    profiles
        .command('use <name>')
        .alias('switch')
        .description('Switch to a profile')
        .action((name) => {
            const allProfiles = profilesConfig.get('profiles') || {};

            if (!allProfiles[name]) {
                error(`Profile "${name}" not found`);
                console.log(chalk.gray('Available profiles: ' + Object.keys(allProfiles).join(', ')));
                process.exit(1);
            }

            profilesConfig.set('activeProfile', name);
            setApiKey(allProfiles[name].apiKey);
            success(`Switched to "${name}"`);
        });

    // Show current profile
    profiles
        .command('current')
        .description('Show current active profile')
        .action(() => {
            const activeProfile = profilesConfig.get('activeProfile');
            const allProfiles = profilesConfig.get('profiles') || {};
            const profile = allProfiles[activeProfile];

            console.log(chalk.bold('\nCurrent Profile'));
            console.log('─'.repeat(40));
            console.log(`Name:        ${chalk.cyan(activeProfile)}`);
            
            if (profile) {
                console.log(`API Key:     ${profile.apiKey?.substring(0, 8)}...`);
                console.log(`Base URL:    ${profile.baseUrl}`);
                if (profile.description) {
                    console.log(`Description: ${profile.description}`);
                }
            } else {
                console.log(chalk.gray('(using default configuration)'));
            }
        });

    // Export profiles
    profiles
        .command('export')
        .description('Export profiles to JSON (keys are masked)')
        .option('--include-keys', 'Include full API keys (use with caution)')
        .action((options) => {
            const allProfiles = profilesConfig.get('profiles') || {};
            const exported = {};

            Object.entries(allProfiles).forEach(([name, profile]) => {
                exported[name] = {
                    ...profile,
                    apiKey: options.includeKeys 
                        ? profile.apiKey 
                        : `${profile.apiKey?.substring(0, 8)}...`
                };
            });

            console.log(JSON.stringify(exported, null, 2));
        });

    // Import profiles
    profiles
        .command('import <file>')
        .description('Import profiles from JSON file')
        .option('--merge', 'Merge with existing profiles')
        .action(async (file, options) => {
            const fs = await import('fs');
            
            let imported;
            try {
                const content = fs.readFileSync(file, 'utf8');
                imported = JSON.parse(content);
            } catch (err) {
                error(`Failed to read file: ${err.message}`);
                process.exit(1);
            }

            const allProfiles = options.merge 
                ? (profilesConfig.get('profiles') || {})
                : {};

            let count = 0;
            Object.entries(imported).forEach(([name, profile]) => {
                if (profile.apiKey && !profile.apiKey.includes('...')) {
                    allProfiles[name] = profile;
                    count++;
                }
            });

            profilesConfig.set('profiles', allProfiles);
            success(`Imported ${count} profiles`);
        });
}

// Helper to get current profile's API key
export function getProfileApiKey() {
    const activeProfile = profilesConfig.get('activeProfile');
    const allProfiles = profilesConfig.get('profiles') || {};
    const profile = allProfiles[activeProfile];
    
    return profile?.apiKey || getApiKey();
}
