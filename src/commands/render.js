/**
 * Render commands
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { 
    formatJson, formatRendersTable,
    success, error, info, warn 
} from '../output.js';

export function registerRenderCommands(program) {
    // Main render command
    program
        .command('render')
        .description('Render a design to image or PDF')
        .option('-d, --design <id>', 'Design ID to render')
        .option('-t, --template <id>', 'Template ID to render')
        .option('-f, --format <format>', 'Output format (png, jpg, pdf, svg)', 'png')
        .option('-o, --output <file>', 'Output file path')
        .option('-q, --quality <number>', 'Quality (1-100)', '90')
        .option('-w, --width <pixels>', 'Custom width')
        .option('-h, --height <pixels>', 'Custom height')
        .option('--data <json>', 'Dynamic data as JSON string')
        .option('--data-file <file>', 'Dynamic data from JSON file')
        .option('--async', 'Use async rendering (returns job ID)')
        .option('--stdout', 'Output binary to stdout (for piping)')
        .action(async (options) => {
            requireAuth();

            if (!options.design && !options.template) {
                error('Either --design or --template is required');
                process.exit(1);
            }

            // Parse dynamic data
            let dynamicData = null;
            if (options.dataFile) {
                try {
                    const fileContent = fs.readFileSync(options.dataFile, 'utf8');
                    dynamicData = JSON.parse(fileContent);
                } catch (err) {
                    error(`Failed to read data file: ${err.message}`);
                    process.exit(1);
                }
            } else if (options.data) {
                try {
                    dynamicData = JSON.parse(options.data);
                } catch (err) {
                    error(`Invalid JSON data: ${err.message}`);
                    process.exit(1);
                }
            }

            const renderOptions = {
                designId: options.design,
                templateId: options.template,
                format: options.format,
                quality: parseInt(options.quality),
                dynamicData,
            };

            if (options.width) renderOptions.width = parseInt(options.width);
            if (options.height) renderOptions.height = parseInt(options.height);

            const client = createClient();

            // Async rendering
            if (options.async) {
                const spinner = ora('Starting render job...').start();
                try {
                    const result = await client.renderAsync(renderOptions);
                    spinner.stop();
                    
                    success('Render job started');
                    console.log(chalk.gray(`Job ID: ${result.jobId}`));
                    console.log(chalk.gray(`Status: ${result.status}`));
                    if (result.estimatedTime) {
                        console.log(chalk.gray(`Estimated time: ${result.estimatedTime}s`));
                    }
                    console.log(chalk.gray('\nCheck status with: canvelete render status ' + result.jobId));
                } catch (err) {
                    spinner.fail('Failed to start render job');
                    error(err.message);
                    process.exit(1);
                }
                return;
            }

            // Sync rendering
            const spinner = ora('Rendering...').start();

            try {
                const imageData = await client.render(renderOptions);
                spinner.stop();

                const buffer = Buffer.from(imageData);

                if (options.stdout) {
                    process.stdout.write(buffer);
                    return;
                }

                // Determine output filename
                let outputPath = options.output;
                if (!outputPath) {
                    const id = options.design || options.template;
                    outputPath = `${id.substring(0, 8)}_${Date.now()}.${options.format}`;
                }

                // Ensure directory exists
                const dir = path.dirname(outputPath);
                if (dir && dir !== '.') {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(outputPath, buffer);
                
                success(`Rendered successfully!`);
                console.log(chalk.gray(`Output: ${outputPath}`));
                console.log(chalk.gray(`Size: ${(buffer.length / 1024).toFixed(1)} KB`));
            } catch (err) {
                spinner.fail('Render failed');
                error(err.message);
                process.exit(1);
            }
        });

    // Render subcommands
    const renderCmd = program
        .command('renders')
        .description('Manage render jobs');

    // List renders
    renderCmd
        .command('list')
        .alias('ls')
        .description('List render history')
        .option('-l, --limit <number>', 'Number of results', '20')
        .option('-p, --page <number>', 'Page number', '1')
        .option('--json', 'Output as JSON')
        .action(async (options) => {
            requireAuth();
            const spinner = ora('Fetching render history...').start();

            try {
                const client = createClient();
                const result = await client.listRenders({
                    limit: parseInt(options.limit),
                    page: parseInt(options.page),
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const renders = result.data || [];
                if (renders.length === 0) {
                    info('No render history found.');
                    return;
                }

                console.log(formatRendersTable(renders));
            } catch (err) {
                spinner.fail('Failed to fetch render history');
                error(err.message);
                process.exit(1);
            }
        });

    // Check render status
    renderCmd
        .command('status <jobId>')
        .description('Check async render job status')
        .option('--wait', 'Wait for completion')
        .option('--timeout <seconds>', 'Timeout for --wait', '300')
        .option('--json', 'Output as JSON')
        .action(async (jobId, options) => {
            requireAuth();
            const client = createClient();

            if (options.wait) {
                const spinner = ora('Waiting for render to complete...').start();
                const timeout = parseInt(options.timeout) * 1000;
                const startTime = Date.now();
                const pollInterval = 2000;

                try {
                    while (Date.now() - startTime < timeout) {
                        const status = await client.getRenderStatus(jobId);
                        
                        if (status.status === 'completed') {
                            spinner.stop();
                            success('Render completed!');
                            if (status.outputUrl) {
                                console.log(chalk.gray(`Output URL: ${status.outputUrl}`));
                            }
                            return;
                        }

                        if (status.status === 'failed') {
                            spinner.fail('Render failed');
                            error(status.error || 'Unknown error');
                            process.exit(1);
                        }

                        spinner.text = `Waiting for render... (${status.status})`;
                        await new Promise(r => setTimeout(r, pollInterval));
                    }

                    spinner.fail('Timeout waiting for render');
                    process.exit(1);
                } catch (err) {
                    spinner.fail('Failed to check status');
                    error(err.message);
                    process.exit(1);
                }
            } else {
                const spinner = ora('Checking status...').start();

                try {
                    const status = await client.getRenderStatus(jobId);
                    spinner.stop();

                    if (options.json) {
                        console.log(formatJson(status));
                        return;
                    }

                    console.log(chalk.bold('\nRender Job Status'));
                    console.log('─'.repeat(40));
                    console.log(`Job ID:    ${status.id}`);
                    console.log(`Status:    ${status.status}`);
                    console.log(`Format:    ${status.format}`);
                    if (status.outputUrl) {
                        console.log(`Output:    ${status.outputUrl}`);
                    }
                    if (status.error) {
                        console.log(`Error:     ${chalk.red(status.error)}`);
                    }
                } catch (err) {
                    spinner.fail('Failed to check status');
                    error(err.message);
                    process.exit(1);
                }
            }
        });

    // Batch render
    program
        .command('batch-render')
        .description('Render multiple designs')
        .option('-f, --file <file>', 'JSON file with render configurations')
        .option('--parallel <number>', 'Number of parallel renders', '3')
        .option('-o, --output-dir <dir>', 'Output directory', '.')
        .action(async (options) => {
            requireAuth();

            if (!options.file) {
                error('--file is required');
                console.log(chalk.gray('\nExample batch file:'));
                console.log(chalk.gray(JSON.stringify([
                    { designId: 'design-1', format: 'png', output: 'output1.png' },
                    { designId: 'design-2', format: 'pdf', output: 'output2.pdf', data: { name: 'John' } }
                ], null, 2)));
                process.exit(1);
            }

            let configs;
            try {
                const fileContent = fs.readFileSync(options.file, 'utf8');
                configs = JSON.parse(fileContent);
            } catch (err) {
                error(`Failed to read batch file: ${err.message}`);
                process.exit(1);
            }

            if (!Array.isArray(configs) || configs.length === 0) {
                error('Batch file must contain an array of render configurations');
                process.exit(1);
            }

            const client = createClient();
            const outputDir = options.outputDir;
            
            if (outputDir !== '.') {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            console.log(chalk.bold(`\nBatch rendering ${configs.length} designs...\n`));

            let completed = 0;
            let failed = 0;

            for (const config of configs) {
                const spinner = ora(`Rendering ${config.output || config.designId}...`).start();

                try {
                    const imageData = await client.render({
                        designId: config.designId,
                        templateId: config.templateId,
                        format: config.format || 'png',
                        quality: config.quality || 90,
                        dynamicData: config.data,
                        width: config.width,
                        height: config.height,
                    });

                    const buffer = Buffer.from(imageData);
                    const outputPath = path.join(outputDir, config.output || `${config.designId}.${config.format || 'png'}`);
                    fs.writeFileSync(outputPath, buffer);

                    spinner.succeed(`${config.output || config.designId}`);
                    completed++;
                } catch (err) {
                    spinner.fail(`${config.output || config.designId}: ${err.message}`);
                    failed++;
                }
            }

            console.log(chalk.bold(`\nBatch complete: ${chalk.green(completed)} succeeded, ${chalk.red(failed)} failed`));
        });
}
