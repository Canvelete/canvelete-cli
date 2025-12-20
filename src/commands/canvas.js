/**
 * Canvas manipulation commands
 */

import fs from 'fs';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { formatJson, success, error, info, warn } from '../output.js';

export function registerCanvasCommands(program) {
    const canvas = program
        .command('canvas')
        .description('Manipulate design canvas and elements');

    // List elements
    canvas
        .command('elements <designId>')
        .alias('ls')
        .description('List all elements in a design')
        .option('--json', 'Output as JSON')
        .action(async (designId, options) => {
            requireAuth();
            const spinner = ora('Fetching canvas elements...').start();

            try {
                const client = createClient();
                const result = await client.getElements(designId);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const elements = result.elements || result.data?.elements || [];
                if (elements.length === 0) {
                    info('No elements found on canvas.');
                    return;
                }

                console.log(chalk.bold(`\nCanvas Elements (${elements.length})\n`));
                elements.forEach((el, i) => {
                    console.log(`${chalk.cyan((i + 1).toString().padStart(2))}. ${chalk.bold(el.type)} ${chalk.gray(`(${el.id?.substring(0, 8) || 'no-id'})`)}`);
                    console.log(`    Position: ${el.x}, ${el.y} | Size: ${el.width}x${el.height}`);
                    if (el.text) console.log(`    Text: "${el.text.substring(0, 40)}${el.text.length > 40 ? '...' : ''}"`);
                    if (el.fill) console.log(`    Fill: ${el.fill}`);
                });
            } catch (err) {
                spinner.fail('Failed to fetch elements');
                error(err.message);
                process.exit(1);
            }
        });

    // Add element
    canvas
        .command('add <designId>')
        .description('Add an element to the canvas')
        .option('-t, --type <type>', 'Element type (rectangle, circle, text, image)')
        .option('-x <number>', 'X position', '0')
        .option('-y <number>', 'Y position', '0')
        .option('-w, --width <number>', 'Width', '100')
        .option('-h, --height <number>', 'Height', '100')
        .option('--fill <color>', 'Fill color')
        .option('--stroke <color>', 'Stroke color')
        .option('--text <text>', 'Text content (for text elements)')
        .option('--src <url>', 'Image source URL (for image elements)')
        .option('--from-file <file>', 'Load element from JSON file')
        .option('-i, --interactive', 'Interactive mode')
        .option('--json', 'Output as JSON')
        .action(async (designId, options) => {
            requireAuth();

            let element;

            if (options.fromFile) {
                try {
                    const content = fs.readFileSync(options.fromFile, 'utf8');
                    element = JSON.parse(content);
                } catch (err) {
                    error(`Failed to read element file: ${err.message}`);
                    process.exit(1);
                }
            } else if (options.interactive) {
                const answers = await inquirer.prompt([
                    {
                        type: 'list',
                        name: 'type',
                        message: 'Element type:',
                        choices: ['rectangle', 'circle', 'text', 'image', 'line', 'polygon']
                    },
                    {
                        type: 'number',
                        name: 'x',
                        message: 'X position:',
                        default: 0
                    },
                    {
                        type: 'number',
                        name: 'y',
                        message: 'Y position:',
                        default: 0
                    },
                    {
                        type: 'number',
                        name: 'width',
                        message: 'Width:',
                        default: 100
                    },
                    {
                        type: 'number',
                        name: 'height',
                        message: 'Height:',
                        default: 100
                    },
                    {
                        type: 'input',
                        name: 'fill',
                        message: 'Fill color (hex or name):',
                        default: '#3b82f6'
                    },
                    {
                        type: 'input',
                        name: 'text',
                        message: 'Text content:',
                        when: (a) => a.type === 'text'
                    },
                    {
                        type: 'input',
                        name: 'src',
                        message: 'Image URL:',
                        when: (a) => a.type === 'image'
                    }
                ]);
                element = answers;
            } else {
                if (!options.type) {
                    error('--type is required (or use --interactive)');
                    process.exit(1);
                }

                element = {
                    type: options.type,
                    x: parseInt(options.x),
                    y: parseInt(options.y),
                    width: parseInt(options.width),
                    height: parseInt(options.height),
                };

                if (options.fill) element.fill = options.fill;
                if (options.stroke) element.stroke = options.stroke;
                if (options.text) element.text = options.text;
                if (options.src) element.src = options.src;
            }

            const spinner = ora('Adding element...').start();

            try {
                const client = createClient();
                const result = await client.addElement(designId, element);
                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                success('Element added successfully');
                if (result.id) {
                    console.log(chalk.gray(`Element ID: ${result.id}`));
                }
            } catch (err) {
                spinner.fail('Failed to add element');
                error(err.message);
                process.exit(1);
            }
        });

    // Clear canvas
    canvas
        .command('clear <designId>')
        .description('Remove all elements from canvas')
        .option('-f, --force', 'Skip confirmation')
        .action(async (designId, options) => {
            requireAuth();

            if (!options.force) {
                const { confirm } = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'confirm',
                        message: 'Are you sure you want to clear all elements? This cannot be undone.',
                        default: false
                    }
                ]);

                if (!confirm) {
                    info('Cancelled.');
                    return;
                }
            }

            const spinner = ora('Clearing canvas...').start();

            try {
                const client = createClient();
                await client.clearCanvas(designId);
                spinner.stop();
                success('Canvas cleared');
            } catch (err) {
                spinner.fail('Failed to clear canvas');
                error(err.message);
                process.exit(1);
            }
        });

    // Resize canvas
    canvas
        .command('resize <designId>')
        .description('Resize the canvas')
        .option('-w, --width <pixels>', 'New width')
        .option('-h, --height <pixels>', 'New height')
        .option('--preset <preset>', 'Use a preset size')
        .action(async (designId, options) => {
            requireAuth();

            let width, height;

            const presets = {
                'hd': [1920, 1080],
                'instagram-post': [1080, 1080],
                'instagram-story': [1080, 1920],
                'facebook-post': [1200, 630],
                'twitter-post': [1200, 675],
                'youtube-thumbnail': [1280, 720],
                'a4-portrait': [2480, 3508],
                'a4-landscape': [3508, 2480],
            };

            if (options.preset) {
                const preset = presets[options.preset.toLowerCase()];
                if (!preset) {
                    error(`Unknown preset: ${options.preset}`);
                    console.log(chalk.gray(`Available presets: ${Object.keys(presets).join(', ')}`));
                    process.exit(1);
                }
                [width, height] = preset;
            } else if (options.width && options.height) {
                width = parseInt(options.width);
                height = parseInt(options.height);
            } else {
                error('Specify --width and --height, or use --preset');
                process.exit(1);
            }

            const spinner = ora('Resizing canvas...').start();

            try {
                const client = createClient();
                await client.resizeCanvas(designId, width, height);
                spinner.stop();
                success(`Canvas resized to ${width}x${height}`);
            } catch (err) {
                spinner.fail('Failed to resize canvas');
                error(err.message);
                process.exit(1);
            }
        });

    // Export canvas data
    canvas
        .command('export <designId>')
        .description('Export canvas data to JSON file')
        .option('-o, --output <file>', 'Output file', 'canvas.json')
        .action(async (designId, options) => {
            requireAuth();
            const spinner = ora('Exporting canvas data...').start();

            try {
                const client = createClient();
                const result = await client.getDesign(designId);
                spinner.stop();

                const design = result.data || result;
                const canvasData = {
                    width: design.width,
                    height: design.height,
                    elements: design.canvasData?.elements || [],
                    exportedAt: new Date().toISOString(),
                    sourceDesignId: designId,
                };

                fs.writeFileSync(options.output, JSON.stringify(canvasData, null, 2));
                success(`Canvas exported to ${options.output}`);
            } catch (err) {
                spinner.fail('Failed to export canvas');
                error(err.message);
                process.exit(1);
            }
        });

    // Import canvas data
    canvas
        .command('import <designId> <file>')
        .description('Import canvas data from JSON file')
        .option('--merge', 'Merge with existing elements instead of replacing')
        .action(async (designId, file, options) => {
            requireAuth();

            let canvasData;
            try {
                const content = fs.readFileSync(file, 'utf8');
                canvasData = JSON.parse(content);
            } catch (err) {
                error(`Failed to read file: ${err.message}`);
                process.exit(1);
            }

            const spinner = ora('Importing canvas data...').start();

            try {
                const client = createClient();

                if (options.merge) {
                    // Get existing elements and merge
                    const existing = await client.getDesign(designId);
                    const existingElements = existing.data?.canvasData?.elements || [];
                    const newElements = canvasData.elements || [];
                    canvasData.elements = [...existingElements, ...newElements];
                }

                await client.updateDesign(designId, {
                    canvasData: { elements: canvasData.elements }
                });

                spinner.stop();
                success(`Canvas imported from ${file}`);
                console.log(chalk.gray(`Elements: ${canvasData.elements?.length || 0}`));
            } catch (err) {
                spinner.fail('Failed to import canvas');
                error(err.message);
                process.exit(1);
            }
        });
}
