/**
 * Diff and comparison commands
 */

import chalk from 'chalk';
import ora from 'ora';
import { createClient } from '../client.js';
import { requireAuth } from '../config.js';
import { formatJson, success, error, info } from '../output.js';

export function registerDiffCommands(program) {
    program
        .command('diff <designId1> <designId2>')
        .description('Compare two designs')
        .option('--json', 'Output as JSON')
        .option('--elements', 'Compare elements only')
        .action(async (designId1, designId2, options) => {
            requireAuth();
            const spinner = ora('Fetching designs...').start();

            try {
                const client = createClient();
                const [result1, result2] = await Promise.all([
                    client.getDesign(designId1),
                    client.getDesign(designId2)
                ]);

                spinner.stop();

                const design1 = result1.data || result1;
                const design2 = result2.data || result2;

                if (options.json) {
                    console.log(formatJson({
                        design1: { id: designId1, ...design1 },
                        design2: { id: designId2, ...design2 },
                        differences: findDifferences(design1, design2)
                    }));
                    return;
                }

                console.log(chalk.bold('\nDesign Comparison'));
                console.log('═'.repeat(60));

                // Basic properties
                const props = ['name', 'width', 'height', 'status', 'visibility'];
                
                console.log(chalk.bold('\nProperties:'));
                console.log('─'.repeat(60));
                console.log(`${'Property'.padEnd(15)} ${'Design 1'.padEnd(20)} ${'Design 2'.padEnd(20)}`);
                console.log('─'.repeat(60));

                props.forEach(prop => {
                    const val1 = design1[prop] || '-';
                    const val2 = design2[prop] || '-';
                    const isDiff = val1 !== val2;
                    const color = isDiff ? chalk.yellow : chalk.gray;
                    console.log(color(`${prop.padEnd(15)} ${String(val1).padEnd(20)} ${String(val2).padEnd(20)}`));
                });

                // Element comparison
                const elements1 = design1.canvasData?.elements || [];
                const elements2 = design2.canvasData?.elements || [];

                console.log(chalk.bold('\nElements:'));
                console.log('─'.repeat(60));
                console.log(`Design 1: ${elements1.length} elements`);
                console.log(`Design 2: ${elements2.length} elements`);

                if (options.elements && elements1.length > 0 && elements2.length > 0) {
                    // Count by type
                    const types1 = countByType(elements1);
                    const types2 = countByType(elements2);
                    const allTypes = new Set([...Object.keys(types1), ...Object.keys(types2)]);

                    console.log(chalk.bold('\nElement Types:'));
                    allTypes.forEach(type => {
                        const count1 = types1[type] || 0;
                        const count2 = types2[type] || 0;
                        const diff = count2 - count1;
                        const diffStr = diff > 0 ? chalk.green(`+${diff}`) : diff < 0 ? chalk.red(diff) : '';
                        console.log(`  ${type.padEnd(12)} ${count1} → ${count2} ${diffStr}`);
                    });
                }

                console.log('');
            } catch (err) {
                spinner.fail('Failed to compare designs');
                error(err.message);
                process.exit(1);
            }
        });

    // Clone command
    program
        .command('clone <designId>')
        .description('Clone a design with modifications')
        .option('-n, --name <name>', 'New name')
        .option('--width <pixels>', 'New width')
        .option('--height <pixels>', 'New height')
        .option('--scale <factor>', 'Scale factor for dimensions')
        .option('--json', 'Output as JSON')
        .action(async (designId, options) => {
            requireAuth();
            const spinner = ora('Cloning design...').start();

            try {
                const client = createClient();
                
                // Get original design
                const original = await client.getDesign(designId);
                const design = original.data || original;

                // Calculate new dimensions
                let width = design.width;
                let height = design.height;

                if (options.scale) {
                    const scale = parseFloat(options.scale);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }

                if (options.width) width = parseInt(options.width);
                if (options.height) height = parseInt(options.height);

                // Create new design
                const result = await client.createDesign({
                    name: options.name || `Clone of ${design.name}`,
                    width,
                    height,
                    canvasData: design.canvasData,
                    description: `Cloned from ${designId}`,
                });

                spinner.stop();

                if (options.json) {
                    console.log(formatJson(result));
                    return;
                }

                const newDesign = result.data || result;
                success('Design cloned!');
                console.log(chalk.gray(`Original: ${designId}`));
                console.log(chalk.gray(`New ID:   ${newDesign.id}`));
                console.log(chalk.gray(`Size:     ${width}x${height}`));
            } catch (err) {
                spinner.fail('Failed to clone design');
                error(err.message);
                process.exit(1);
            }
        });
}

function findDifferences(obj1, obj2, path = '') {
    const diffs = [];
    const keys = new Set([...Object.keys(obj1 || {}), ...Object.keys(obj2 || {})]);

    keys.forEach(key => {
        if (key === 'canvasData' || key === 'id' || key === 'createdAt' || key === 'updatedAt') return;
        
        const val1 = obj1?.[key];
        const val2 = obj2?.[key];
        const currentPath = path ? `${path}.${key}` : key;

        if (typeof val1 === 'object' && typeof val2 === 'object') {
            diffs.push(...findDifferences(val1, val2, currentPath));
        } else if (val1 !== val2) {
            diffs.push({ path: currentPath, value1: val1, value2: val2 });
        }
    });

    return diffs;
}

function countByType(elements) {
    return elements.reduce((acc, el) => {
        acc[el.type] = (acc[el.type] || 0) + 1;
        return acc;
    }, {});
}
