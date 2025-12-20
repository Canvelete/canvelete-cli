/**
 * Design commands
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { 
    formatJson, formatDesignsTable, formatDesign,
    success, error, info 
} from '../output.js';

export function registerDesignCommands(program) {
    const designs = program
        .command('designs')
        .description('Manage designs');

    // List designs
    designs
        .command('list')
        .alias('ls')
        .description('List all designs')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('-p, --page <number>', 'Page number', '1')
        .option('--templates', 'Show only templates')
        .option('--status <status>', 'Filter by status (DRAFT, PUBLISHED, ARCHIVED)')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching designs...').start();

            try {
                const client = createClient();
                const result = await client.listDesigns({
                    limit: parseInt(options.limit),
                    page: parseInt(options.page),
                    isTemplate: options.templates ? true : undefined,
                    status: options.status,
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const designs = result.data || [];
                if (designs.length === 0) {
                    info('No designs found.');
                    return;
                }

                console.log(formatDesignsTable(designs));
                console.log(chalk.gray(`\nShowing ${designs.length} of ${result.pagination?.total || designs.length} designs`));
            } catch (err) {
                spinner.fail('Failed to fetch designs');
                error(err.message);
                process.exit(1);
            }
        });

    // Get design
    designs
        .command('get <id>')
        .description('Get design details')
        .option('--json', 'Output as JSON')
        .action(async (id, options) => {
            requireAuth();
            const spinner = ora('Fetching design...').start();

            try {
                const client = createClient();
                const result = await client.getDesign(id);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const design = result.data || result;
                const formatted = formatDesign(design);
                
                console.log(chalk.bold('\nDesign Details'));
                console.log('─'.repeat(40));
                Object.entries(formatted).forEach(([key, value]) => {
                    console.log(`${chalk.cyan(key.padEnd(15))} ${value}`);
                });
            } catch (err) {
                spinner.fail('Failed to fetch design');
                error(err.message);
                process.exit(1);
            }
        });

    // Create design
    designs
        .command('create')
        .description('Create a new design')
        .option('-n, --name <name>', 'Design name')
        .option('-w, --width <pixels>', 'Width in pixels', '1920')
        .option('-h, --height <pixels>', 'Height in pixels', '1080')
        .option('-d, --description <text>', 'Description')
        .option('--template', 'Create as template')
        .option('--visibility <type>', 'Visibility (PRIVATE, PUBLIC, TEAM)', 'PRIVATE')
        .option('-i, --interactive', 'Interactive mode')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();

            let name = options.name;
            let width = parseInt(options.width);
            let height = parseInt(options.height);
            let description = options.description;

            if (options.interactive || !name) {
                const answers = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Design name:',
                        default: name,
                        validate: (input) => input.length > 0 || 'Name is required'
                    },
                    {
                        type: 'list',
                        name: 'preset',
                        message: 'Size preset:',
                        choices: [
                            { name: 'Custom', value: 'custom' },
                            { name: 'HD (1920x1080)', value: '1920x1080' },
                            { name: 'Instagram Post (1080x1080)', value: '1080x1080' },
                            { name: 'Instagram Story (1080x1920)', value: '1080x1920' },
                            { name: 'Facebook Post (1200x630)', value: '1200x630' },
                            { name: 'Twitter Post (1200x675)', value: '1200x675' },
                            { name: 'LinkedIn Post (1200x627)', value: '1200x627' },
                            { name: 'YouTube Thumbnail (1280x720)', value: '1280x720' },
                            { name: 'A4 Portrait (2480x3508)', value: '2480x3508' },
                            { name: 'A4 Landscape (3508x2480)', value: '3508x2480' },
                        ]
                    },
                    {
                        type: 'input',
                        name: 'width',
                        message: 'Width (pixels):',
                        default: String(width),
                        when: (answers) => answers.preset === 'custom',
                        validate: (input) => !isNaN(parseInt(input)) || 'Must be a number'
                    },
                    {
                        type: 'input',
                        name: 'height',
                        message: 'Height (pixels):',
                        default: String(height),
                        when: (answers) => answers.preset === 'custom',
                        validate: (input) => !isNaN(parseInt(input)) || 'Must be a number'
                    },
                    {
                        type: 'input',
                        name: 'description',
                        message: 'Description (optional):',
                    }
                ]);

                name = answers.name;
                description = answers.description;

                if (answers.preset !== 'custom') {
                    const [w, h] = answers.preset.split('x');
                    width = parseInt(w);
                    height = parseInt(h);
                } else {
                    width = parseInt(answers.width);
                    height = parseInt(answers.height);
                }
            }

            const spinner = ora('Creating design...').start();

            try {
                const client = createClient();
                const result = await client.createDesign({
                    name,
                    width,
                    height,
                    description,
                    isTemplate: options.template || false,
                    visibility: options.visibility,
                    canvasData: { elements: [] }
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const design = result.data || result;
                success(`Design created: ${design.name}`);
                console.log(chalk.gray(`ID: ${design.id}`));
                console.log(chalk.gray(`Size: ${design.width}x${design.height}`));
            } catch (err) {
                spinner.fail('Failed to create design');
                error(err.message);
                process.exit(1);
            }
        });

    // Update design
    designs
        .command('update <id>')
        .description('Update a design')
        .option('-n, --name <name>', 'New name')
        .option('-d, --description <text>', 'New description')
        .option('--status <status>', 'Status (DRAFT, PUBLISHED, ARCHIVED)')
        .option('--visibility <type>', 'Visibility (PRIVATE, PUBLIC, TEAM)')
        .option('--json', 'Output as JSON')
        .action(async (id, options) => {
            requireAuth();

            const updates = {};
            if (options.name) updates.name = options.name;
            if (options.description) updates.description = options.description;
            if (options.status) updates.status = options.status;
            if (options.visibility) updates.visibility = options.visibility;

            if (Object.keys(updates).length === 0) {
                error('No updates specified. Use --name, --description, --status, or --visibility');
                process.exit(1);
            }

            const spinner = ora('Updating design...').start();

            try {
                const client = createClient();
                const result = await client.updateDesign(id, updates);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                success('Design updated successfully');
            } catch (err) {
                spinner.fail('Failed to update design');
                error(err.message);
                process.exit(1);
            }
        });

    // Delete design
    designs
        .command('delete <id>')
        .alias('rm')
        .description('Delete a design')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, options) => {
            requireAuth();

            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete design ${id}?`,
                        default: false
                    }
                ]);

                if (!confirm) {
                    info('Cancelled.');
                    return;
                }
            }

            const spinner = ora('Deleting design...').start();

            try {
                const client = createClient();
                await client.deleteDesign(id);
                spinner.stop();
                success('Design deleted successfully');
            } catch (err) {
                spinner.fail('Failed to delete design');
                error(err.message);
                process.exit(1);
            }
        });

    // Duplicate design
    designs
        .command('duplicate <id>')
        .alias('copy')
        .description('Duplicate a design')
        .option('-n, --name <name>', 'Name for the copy')
        .option('--json', 'Output as JSON')
        .action(async (id, options) => {
            requireAuth();

            let newName = options.name;
            if (!newName) {
                const { name } = await inquirer.prompt([
                    {
                        type: 'input',
                        name: 'name',
                        message: 'Name for the copy:',
                        default: 'Copy of design'
                    }
                ]);
                newName = name;
            }

            const spinner = ora('Duplicating design...').start();

            try {
                const client = createClient();
                const result = await client.duplicateDesign(id, newName);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const design = result.data || result;
                success(`Design duplicated: ${design.name}`);
                console.log(chalk.gray(`New ID: ${design.id}`));
            } catch (err) {
                spinner.fail('Failed to duplicate design');
                error(err.message);
                process.exit(1);
            }
        });
}
