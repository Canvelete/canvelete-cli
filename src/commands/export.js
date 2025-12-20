/**
 * Export commands
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { success, error, info } from '../output.js';

export function registerExportCommands(program) {
    program
        .command('export <designId>')
        .description('Export a design to file')
        .option('-f, --format <format>', 'Output format (png, jpg, pdf, svg)', 'png')
        .option('-o, --output <file>', 'Output file path')
        .option('-q, --quality <number>', 'Quality (1-100)', '100')
        .option('--scale <number>', 'Scale factor (e.g., 2 for 2x)', '1')
        .option('--open', 'Open file after export')
        .action(async (designId, options) => {
            requireAuth();

            const format = options.format.toLowerCase();
            const validFormats = ['png', 'jpg', 'jpeg', 'pdf', 'svg'];
            
            if (!validFormats.includes(format)) {
                error(`Invalid format: ${format}`);
                console.log(chalk.gray(`Valid formats: ${validFormats.join(', ')}`));
                process.exit(1);
            }

            const spinner = ora(`Exporting to ${format.toUpperCase()}...`).start();

            try {
                const client = createClient();
                const imageData = await client.exportDesign(
                    designId,
                    format,
                    parseInt(options.quality)
                );

                const buffer = Buffer.from(imageData);

                // Determine output path
                let outputPath = options.output;
                if (!outputPath) {
                    outputPath = `${designId.substring(0, 8)}_export.${format}`;
                }

                // Ensure directory exists
                const dir = path.dirname(outputPath);
                if (dir && dir !== '.') {
                    fs.mkdirSync(dir, { recursive: true });
                }

                fs.writeFileSync(outputPath, buffer);
                spinner.stop();

                success(`Exported successfully!`);
                console.log(chalk.gray(`Output: ${outputPath}`));
                console.log(chalk.gray(`Size: ${(buffer.length / 1024).toFixed(1)} KB`));
                console.log(chalk.gray(`Format: ${format.toUpperCase()}`));

                if (options.open) {
                    const open = (await import('open')).default;
                    await open(outputPath);
                }
            } catch (err) {
                spinner.fail('Export failed');
                error(err.message);
                process.exit(1);
            }
        });

    // Multi-format export
    program
        .command('export-all <designId>')
        .description('Export design to multiple formats')
        .option('-o, --output-dir <dir>', 'Output directory', '.')
        .option('--formats <formats>', 'Comma-separated formats', 'png,pdf')
        .action(async (designId, options) => {
            requireAuth();

            const formats = options.formats.split(',').map(f => f.trim().toLowerCase());
            const outputDir = options.outputDir;

            if (outputDir !== '.') {
                fs.mkdirSync(outputDir, { recursive: true });
            }

            console.log(chalk.bold(`\nExporting to ${formats.length} formats...\n`));

            const client = createClient();
            let succeeded = 0;
            let failed = 0;

            for (const format of formats) {
                const spinner = ora(`Exporting ${format.toUpperCase()}...`).start();

                try {
                    const imageData = await client.exportDesign(designId, format, 100);
                    const buffer = Buffer.from(imageData);
                    const outputPath = path.join(outputDir, `${designId.substring(0, 8)}.${format}`);
                    fs.writeFileSync(outputPath, buffer);
                    
                    spinner.succeed(`${format.toUpperCase()} → ${outputPath}`);
                    succeeded++;
                } catch (err) {
                    spinner.fail(`${format.toUpperCase()}: ${err.message}`);
                    failed++;
                }
            }

            console.log(chalk.bold(`\nExport complete: ${chalk.green(succeeded)} succeeded, ${chalk.red(failed)} failed`));
        });
}
