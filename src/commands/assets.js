/**
 * Asset commands
 */

import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { 
    formatJson, formatAssetsTable,
    success, error, info 
} from '../output.js';

export function registerAssetCommands(program) {
    const assets = program
        .command('assets')
        .description('Manage assets and search stock content');

    // List assets
    assets
        .command('list')
        .alias('ls')
        .description('List your uploaded assets')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('-p, --page <number>', 'Page number', '1')
        .option('-t, --type <type>', 'Filter by type (IMAGE, FONT, VIDEO, AUDIO)')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching assets...').start();

            try {
                const client = createClient();
                const result = await client.listAssets({
                    limit: parseInt(options.limit),
                    page: parseInt(options.page),
                    type: options.type,
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const assets = result.data || [];
                if (assets.length === 0) {
                    info('No assets found.');
                    return;
                }

                console.log(formatAssetsTable(assets));
            } catch (err) {
                spinner.fail('Failed to fetch assets');
                error(err.message);
                process.exit(1);
            }
        });

    // Delete asset
    assets
        .command('delete <id>')
        .alias('rm')
        .description('Delete an asset')
        .option('-f, --force', 'Skip confirmation')
        .action(async (id, options) => {
            requireAuth();

            if (!options.force) {
                const inquirer = (await import('inquirer')).default;
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: `Are you sure you want to delete asset ${id}?`,
                        default: false
                    }
                ]);

                if (!confirm) {
                    info('Cancelled.');
                    return;
                }
            }

            const spinner = ora('Deleting asset...').start();

            try {
                const client = createClient();
                await client.deleteAsset(id);
                spinner.stop();
                success('Asset deleted successfully');
            } catch (err) {
                spinner.fail('Failed to delete asset');
                error(err.message);
                process.exit(1);
            }
        });

    // Search stock images
    assets
        .command('stock <query>')
        .description('Search stock images from Pixabay')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('-p, --page <number>', 'Page number', '1')
        .option('--json', 'Output as JSON')
        .action(async (query, options) => {
            requireAuth();
            const spinner = ora(`Searching stock images for "${query}"...`).start();

            try {
                const client = createClient();
                const result = await client.searchStockImages(query, {
                    perPage: parseInt(options.limit),
                    page: parseInt(options.page),
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const images = result.data || [];
                if (images.length === 0) {
                    info(`No stock images found for "${query}".`);
                    return;
                }

                console.log(chalk.bold(`\nStock Images for "${query}"\n`));
                images.forEach((img, i) => {
                    console.log(`${chalk.cyan((i + 1).toString().padStart(2))}. ${img.tags}`);
                    console.log(`    ${chalk.gray(`${img.imageWidth}x${img.imageHeight}`)} | ${chalk.blue(img.previewURL)}`);
                });
            } catch (err) {
                spinner.fail('Search failed');
                error(err.message);
                process.exit(1);
            }
        });

    // Search icons
    assets
        .command('icons <query>')
        .description('Search icons')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('--json', 'Output as JSON')
        .action(async (query, options) => {
            requireAuth();
            const spinner = ora(`Searching icons for "${query}"...`).start();

            try {
                const client = createClient();
                const result = await client.searchIcons(query, {
                    perPage: parseInt(options.limit),
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const icons = result.data || [];
                if (icons.length === 0) {
                    info(`No icons found for "${query}".`);
                    return;
                }

                console.log(chalk.bold(`\nIcons for "${query}"\n`));
                icons.forEach((icon, i) => {
                    console.log(`${chalk.cyan((i + 1).toString().padStart(2))}. ${icon.name}`);
                    console.log(`    ${chalk.blue(icon.url)}`);
                });
            } catch (err) {
                spinner.fail('Search failed');
                error(err.message);
                process.exit(1);
            }
        });

    // List fonts
    assets
        .command('fonts')
        .description('List available fonts')
        .option('-c, --category <category>', 'Filter by category (serif, sans-serif, monospace)')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching fonts...').start();

            try {
                const client = createClient();
                const result = await client.listFonts(options.category);

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const fonts = result.data || [];
                if (fonts.length === 0) {
                    info('No fonts found.');
                    return;
                }

                console.log(chalk.bold('\nAvailable Fonts\n'));
                fonts.forEach(font => {
                    console.log(`${chalk.cyan(font.family)}`);
                    console.log(`  ${chalk.gray(`Variants: ${font.variants.join(', ')}`)}`);
                });
            } catch (err) {
                spinner.fail('Failed to fetch fonts');
                error(err.message);
                process.exit(1);
            }
        });
}
