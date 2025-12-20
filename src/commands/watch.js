/**
 * Watch command - watch for file changes and auto-render
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { success, error, info, warn } from '../output.js';

export function registerWatchCommands(program) {
    program
        .command('watch <dataFile>')
        .description('Watch a data file and auto-render on changes')
        .option('-d, --design <id>', 'Design ID to render')
        .option('-t, --template <id>', 'Template ID to render')
        .option('-o, --output <file>', 'Output file (supports {{timestamp}} placeholder)')
        .option('-f, --format <format>', 'Output format', 'png')
        .option('--debounce <ms>', 'Debounce time in milliseconds', '500')
        .option('--on-change <command>', 'Command to run after successful render')
        .action(async (dataFile, options) => {
            requireAuth();

            if (!options.design && !options.template) {
                error('Either --design or --template is required');
                process.exit(1);
            }

            if (!fs.existsSync(dataFile)) {
                error(`File not found: ${dataFile}`);
                process.exit(1);
            }

            const client = createClient();
            const debounceMs = parseInt(options.debounce);
            let debounceTimer = null;
            let renderCount = 0;

            console.log(chalk.bold('\n👁  Watch Mode'));
            console.log('─'.repeat(40));
            console.log(`Watching: ${chalk.cyan(dataFile)}`);
            console.log(`Design:   ${options.design || options.template}`);
            console.log(`Output:   ${options.output || 'auto'}`);
            console.log(`Format:   ${options.format}`);
            console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

            async function render() {
                try {
                    // Read and parse data file
                    const content = fs.readFileSync(dataFile, 'utf8');
                    const dynamicData = JSON.parse(content);

                    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] Rendering...`));

                    const imageData = await client.render({
                        designId: options.design,
                        templateId: options.template,
                        format: options.format,
                        quality: 90,
                        dynamicData,
                    });

                    const buffer = Buffer.from(imageData);

                    // Determine output path
                    let outputPath = options.output || `output_${Date.now()}.${options.format}`;
                    outputPath = outputPath.replace('{{timestamp}}', Date.now());
                    outputPath = outputPath.replace('{{count}}', ++renderCount);

                    // Ensure directory exists
                    const dir = path.dirname(outputPath);
                    if (dir && dir !== '.') {
                        fs.mkdirSync(dir, { recursive: true });
                    }

                    fs.writeFileSync(outputPath, buffer);
                    console.log(chalk.green(`✓ Saved to ${outputPath} (${(buffer.length / 1024).toFixed(1)} KB)`));

                    // Run post-render command if specified
                    if (options.onChange) {
                        const { exec } = await import('child_process');
                        exec(options.onChange, (err, stdout, stderr) => {
                            if (err) {
                                console.log(chalk.yellow(`  Post-render command failed: ${err.message}`));
                            } else if (stdout) {
                                console.log(chalk.gray(`  ${stdout.trim()}`));
                            }
                        });
                    }
                } catch (err) {
                    console.log(chalk.red(`✗ Render failed: ${err.message}`));
                }
            }

            // Initial render
            await render();

            // Watch for changes
            fs.watch(dataFile, (eventType) => {
                if (eventType === 'change') {
                    // Debounce
                    if (debounceTimer) {
                        clearTimeout(debounceTimer);
                    }
                    debounceTimer = setTimeout(render, debounceMs);
                }
            });

            // Keep process alive
            process.on('SIGINT', () => {
                console.log(chalk.gray('\n\nStopping watch mode...'));
                process.exit(0);
            });
        });

    // Watch directory for batch processing
    program
        .command('watch-dir <directory>')
        .description('Watch a directory for new JSON files and render them')
        .option('-d, --design <id>', 'Design ID to render')
        .option('-t, --template <id>', 'Template ID to render')
        .option('-o, --output-dir <dir>', 'Output directory', './output')
        .option('-f, --format <format>', 'Output format', 'png')
        .option('--delete-after', 'Delete input file after successful render')
        .action(async (directory, options) => {
            requireAuth();

            if (!options.design && !options.template) {
                error('Either --design or --template is required');
                process.exit(1);
            }

            if (!fs.existsSync(directory)) {
                error(`Directory not found: ${directory}`);
                process.exit(1);
            }

            // Create output directory
            fs.mkdirSync(options.outputDir, { recursive: true });

            const client = createClient();
            const processedFiles = new Set();

            console.log(chalk.bold('\n📁 Directory Watch Mode'));
            console.log('─'.repeat(40));
            console.log(`Watching:  ${chalk.cyan(directory)}`);
            console.log(`Output to: ${options.outputDir}`);
            console.log(chalk.gray('\nPress Ctrl+C to stop\n'));

            async function processFile(filePath) {
                const fileName = path.basename(filePath);
                
                if (processedFiles.has(filePath)) return;
                if (!fileName.endsWith('.json')) return;

                processedFiles.add(filePath);

                try {
                    const content = fs.readFileSync(filePath, 'utf8');
                    const dynamicData = JSON.parse(content);

                    console.log(chalk.gray(`[${new Date().toLocaleTimeString()}] Processing ${fileName}...`));

                    const imageData = await client.render({
                        designId: options.design,
                        templateId: options.template,
                        format: options.format,
                        quality: 90,
                        dynamicData,
                    });

                    const buffer = Buffer.from(imageData);
                    const outputName = fileName.replace('.json', `.${options.format}`);
                    const outputPath = path.join(options.outputDir, outputName);

                    fs.writeFileSync(outputPath, buffer);
                    console.log(chalk.green(`✓ ${fileName} → ${outputName}`));

                    if (options.deleteAfter) {
                        fs.unlinkSync(filePath);
                        console.log(chalk.gray(`  Deleted ${fileName}`));
                    }
                } catch (err) {
                    console.log(chalk.red(`✗ ${fileName}: ${err.message}`));
                }
            }

            // Process existing files
            const existingFiles = fs.readdirSync(directory)
                .filter(f => f.endsWith('.json'))
                .map(f => path.join(directory, f));

            for (const file of existingFiles) {
                await processFile(file);
            }

            // Watch for new files
            fs.watch(directory, async (eventType, filename) => {
                if (filename && filename.endsWith('.json')) {
                    const filePath = path.join(directory, filename);
                    if (fs.existsSync(filePath)) {
                        // Small delay to ensure file is fully written
                        setTimeout(() => processFile(filePath), 100);
                    }
                }
            });

            // Keep process alive
            process.on('SIGINT', () => {
                console.log(chalk.gray('\n\nStopping watch mode...'));
                process.exit(0);
            });
        });
}
