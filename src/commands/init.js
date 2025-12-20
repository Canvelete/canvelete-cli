/**
 * Project initialization commands
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import inquirer from 'inquirer';
import { success, error, info } from '../output.js';

export function registerInitCommands(program) {
    program
        .command('init')
        .description('Initialize a Canvelete project in current directory')
        .option('-y, --yes', 'Skip prompts and use defaults')
        .option('--template <type>', 'Project template (basic, batch, ci)')
        .action(async (options) => {
            const configFile = 'canvelete.config.json';
            
            if (fs.existsSync(configFile)) {
                const { overwrite } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'overwrite',
                        message: `${configFile} already exists. Overwrite?`,
                        default: false
                    }
                ]);
                
                if (!overwrite) {
                    info('Cancelled.');
                    return;
                }
            }

            let config;

            if (options.yes) {
                config = getDefaultConfig();
            } else {
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'projectName',
                        message: 'Project name:',
                        default: path.basename(process.cwd())
                    },
                    {
                        type: 'list',
                        name: 'defaultFormat',
                        message: 'Default output format:',
                        choices: ['png', 'jpg', 'pdf', 'svg'],
                        default: 'png'
                    },
                    {
                        type: 'number',
                        name: 'defaultQuality',
                        message: 'Default quality (1-100):',
                        default: 90
                    },
                    {
                        type: 'input',
                        name: 'outputDir',
                        message: 'Default output directory:',
                        default: './output'
                    },
                    {
                        type: 'confirm',
                        name: 'createDirs',
                        message: 'Create directory structure?',
                        default: true
                    }
                ]);

                config = {
                    name: answers.projectName,
                    version: '1.0.0',
                    canvelete: {
                        defaultFormat: answers.defaultFormat,
                        defaultQuality: answers.defaultQuality,
                        outputDir: answers.outputDir,
                    },
                    designs: {},
                    templates: [],
                    batch: {
                        parallel: 3,
                        retryAttempts: 2,
                    }
                };

                if (answers.createDirs) {
                    createProjectStructure(answers.outputDir);
                }
            }

            // Apply template if specified
            if (options.template) {
                config = applyTemplate(config, options.template);
            }

            fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
            success(`Created ${configFile}`);

            // Create .gitignore entries
            const gitignorePath = '.gitignore';
            const gitignoreEntries = [
                '',
                '# Canvelete',
                'output/',
                '*.png',
                '*.jpg',
                '*.pdf',
                '.canvelete-cache/',
            ].join('\n');

            if (fs.existsSync(gitignorePath)) {
                const existing = fs.readFileSync(gitignorePath, 'utf8');
                if (!existing.includes('# Canvelete')) {
                    fs.appendFileSync(gitignorePath, gitignoreEntries);
                    info('Updated .gitignore');
                }
            } else {
                fs.writeFileSync(gitignorePath, gitignoreEntries.trim());
                info('Created .gitignore');
            }

            console.log(chalk.bold('\n✨ Project initialized!\n'));
            console.log('Next steps:');
            console.log(chalk.gray('  1. Run `canvelete auth login` to authenticate'));
            console.log(chalk.gray('  2. Add design IDs to canvelete.config.json'));
            console.log(chalk.gray('  3. Run `canvelete render` to generate images'));
        });

    // Validate config
    program
        .command('validate')
        .description('Validate project configuration and data files')
        .option('-c, --config <file>', 'Config file to validate', 'canvelete.config.json')
        .option('-d, --data <file>', 'Data file to validate')
        .action(async (options) => {
            let hasErrors = false;

            // Validate config file
            if (options.config) {
                console.log(chalk.bold(`\nValidating ${options.config}...`));
                
                if (!fs.existsSync(options.config)) {
                    error(`Config file not found: ${options.config}`);
                    hasErrors = true;
                } else {
                    try {
                        const content = fs.readFileSync(options.config, 'utf8');
                        const config = JSON.parse(content);
                        
                        // Validate structure
                        const issues = validateConfig(config);
                        
                        if (issues.length === 0) {
                            success('Config file is valid');
                        } else {
                            issues.forEach(issue => {
                                console.log(chalk.yellow(`  ⚠ ${issue}`));
                            });
                            hasErrors = true;
                        }
                    } catch (err) {
                        error(`Invalid JSON: ${err.message}`);
                        hasErrors = true;
                    }
                }
            }

            // Validate data file
            if (options.data) {
                console.log(chalk.bold(`\nValidating ${options.data}...`));
                
                if (!fs.existsSync(options.data)) {
                    error(`Data file not found: ${options.data}`);
                    hasErrors = true;
                } else {
                    try {
                        const content = fs.readFileSync(options.data, 'utf8');
                        const data = JSON.parse(content);
                        
                        if (Array.isArray(data)) {
                            success(`Valid JSON array with ${data.length} items`);
                            
                            // Check for common issues
                            data.forEach((item, i) => {
                                if (!item.designId && !item.templateId) {
                                    console.log(chalk.yellow(`  ⚠ Item ${i}: Missing designId or templateId`));
                                }
                            });
                        } else if (typeof data === 'object') {
                            success('Valid JSON object');
                        } else {
                            error('Data should be an object or array');
                            hasErrors = true;
                        }
                    } catch (err) {
                        error(`Invalid JSON: ${err.message}`);
                        hasErrors = true;
                    }
                }
            }

            if (hasErrors) {
                process.exit(1);
            }
        });
}

function getDefaultConfig() {
    return {
        name: path.basename(process.cwd()),
        version: '1.0.0',
        canvelete: {
            defaultFormat: 'png',
            defaultQuality: 90,
            outputDir: './output',
        },
        designs: {},
        templates: [],
        batch: {
            parallel: 3,
            retryAttempts: 2,
        }
    };
}

function createProjectStructure(outputDir) {
    const dirs = [
        outputDir,
        'data',
        'templates',
    ];

    dirs.forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            console.log(chalk.gray(`  Created ${dir}/`));
        }
    });

    // Create example data file
    const exampleData = [
        { designId: 'your-design-id', output: 'example.png', data: { name: 'Example' } }
    ];
    
    const dataFile = 'data/example-batch.json';
    if (!fs.existsSync(dataFile)) {
        fs.writeFileSync(dataFile, JSON.stringify(exampleData, null, 2));
        console.log(chalk.gray(`  Created ${dataFile}`));
    }
}

function applyTemplate(config, template) {
    switch (template) {
        case 'batch':
            config.batch = {
                parallel: 5,
                retryAttempts: 3,
                outputPattern: '{{designId}}_{{timestamp}}.{{format}}',
            };
            break;
        case 'ci':
            config.ci = {
                failOnError: true,
                timeout: 300,
                artifacts: ['output/*.png', 'output/*.pdf'],
            };
            break;
    }
    return config;
}

function validateConfig(config) {
    const issues = [];

    if (!config.canvelete) {
        issues.push('Missing "canvelete" section');
    } else {
        if (config.canvelete.defaultQuality) {
            const q = config.canvelete.defaultQuality;
            if (q < 1 || q > 100) {
                issues.push('defaultQuality must be between 1 and 100');
            }
        }
        
        const validFormats = ['png', 'jpg', 'jpeg', 'pdf', 'svg'];
        if (config.canvelete.defaultFormat && !validFormats.includes(config.canvelete.defaultFormat)) {
            issues.push(`Invalid defaultFormat. Use: ${validFormats.join(', ')}`);
        }
    }

    return issues;
}
