/**
 * Template commands
 */

import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { 
    formatJson, formatTemplatesTable, formatDesign,
    success, error, info 
} from '../output.js';

export function registerTemplateCommands(program) {
    const templates = program
        .command('templates')
        .description('Browse and use templates');

    // List templates
    templates
        .command('list')
        .alias('ls')
        .description('List available templates')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-s, --search <query>', 'Search templates')
        .option('-c, --category <category>', 'Filter by category')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching templates...').start();

            try {
                const client = createClient();
                const result = await client.listTemplates({
                    limit: parseInt(options.limit),
                    page: parseInt(options.page),
                    search: options.search,
                    category: options.category,
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const templates = result.data || [];
                if (templates.length === 0) {
                    info('No templates found.');
                    return;
                }

                console.log(formatTemplatesTable(templates));
                console.log(chalk.gray(`\nShowing ${templates.length} of ${result.pagination?.total || templates.length} templates`));
            } catch (err) {
                spinner.fail('Failed to fetch templates');
                error(err.message);
                process.exit(1);
            }
        });

    // Get template
    templates
        .command('get <id>')
        .description('Get template details')
        .option('--json', 'Output as JSON')
        .action(async (id, options) => {
            requireAuth();
            const spinner = ora('Fetching template...').start();

            try {
                const client = createClient();
                const result = await client.getTemplate(id);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const template = result.data || result;
                const formatted = formatDesign(template);
                
                console.log(chalk.bold('\nTemplate Details'));
                console.log('─'.repeat(40));
                Object.entries(formatted).forEach(([key, value]) => {
                    console.log(`${chalk.cyan(key.padEnd(15))} ${value}`);
                });

                if (template.dynamicFields && template.dynamicFields.length > 0) {
                    console.log(chalk.cyan('\nDynamic Fields:'));
                    template.dynamicFields.forEach(field => {
                        console.log(`  • ${field}`);
                    });
                }
            } catch (err) {
                spinner.fail('Failed to fetch template');
                error(err.message);
                process.exit(1);
            }
        });

    // Search templates
    templates
        .command('search <query>')
        .description('Search templates')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('--json', 'Output as JSON')
        .action(async (query, options) => {
            requireAuth();
            const spinner = ora(`Searching for "${query}"...`).start();

            try {
                const client = createClient();
                const result = await client.listTemplates({
                    search: query,
                    limit: parseInt(options.limit),
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const templates = result.data || [];
                if (templates.length === 0) {
                    info(`No templates found for "${query}".`);
                    return;
                }

                console.log(formatTemplatesTable(templates));
            } catch (err) {
                spinner.fail('Search failed');
                error(err.message);
                process.exit(1);
            }
        });

    // Use template (create design from template)
    templates
        .command('use <id>')
        .description('Create a new design from a template')
        .option('-n, --name <name>', 'Name for the new design')
        .option('--json', 'Output as JSON')
        .action(async (id, options) => {
            requireAuth();
            const spinner = ora('Creating design from template...').start();

            try {
                const client = createClient();
                
                // First get the template
                const templateResult = await client.getTemplate(id);
                const template = templateResult.data || templateResult;

                // Create a new design based on the template
                const result = await client.createDesign({
                    name: options.name || `From ${template.name}`,
                    width: template.width,
                    height: template.height,
                    canvasData: template.canvasData,
                    isTemplate: false,
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const design = result.data || result;
                success(`Design created from template!`);
                console.log(chalk.gray(`ID: ${design.id}`));
                console.log(chalk.gray(`Name: ${design.name}`));
            } catch (err) {
                spinner.fail('Failed to create design from template');
                error(err.message);
                process.exit(1);
            }
        });
}
