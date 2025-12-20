#!/usr/bin/env node

/**
 * Canvelete CLI v2.0.0
 * Official command-line interface for the Canvelete API
 * 
 * https://docs.canvelete.com/cli
 */

import { Command } from 'commander';
import chalk from 'chalk';
import { registerAuthCommands } from '../src/commands/auth.js';
import { registerDesignCommands } from '../src/commands/designs.js';
import { registerTemplateCommands } from '../src/commands/templates.js';
import { registerRenderCommands } from '../src/commands/render.js';
import { registerAssetCommands } from '../src/commands/assets.js';
import { registerApiKeyCommands } from '../src/commands/apikeys.js';
import { registerUsageCommands } from '../src/commands/usage.js';
import { registerConfigCommands } from '../src/commands/config.js';
import { registerCanvasCommands } from '../src/commands/canvas.js';
import { registerExportCommands } from '../src/commands/export.js';
import { registerInitCommands } from '../src/commands/init.js';
import { registerProfileCommands } from '../src/commands/profiles.js';
import { registerWatchCommands } from '../src/commands/watch.js';
import { registerDiffCommands } from '../src/commands/diff.js';

const program = new Command();

// CLI metadata
program
    .name('canvelete')
    .description('Official CLI for Canvelete - Design automation and image generation')
    .version('2.0.0', '-v, --version')
    .configureHelp({
        sortSubcommands: true,
        sortOptions: true,
    });

// Global options
program
    .option('--no-color', 'Disable colored output')
    .option('--debug', 'Enable debug output');

// Register all command groups
registerAuthCommands(program);
registerDesignCommands(program);
registerTemplateCommands(program);
registerRenderCommands(program);
registerAssetCommands(program);
registerApiKeyCommands(program);
registerUsageCommands(program);
registerConfigCommands(program);
registerCanvasCommands(program);
registerExportCommands(program);
registerInitCommands(program);
registerProfileCommands(program);
registerWatchCommands(program);
registerDiffCommands(program);

// Whoami command
program
    .command('whoami')
    .description('Show current authenticated user info')
    .action(async () => {
        const { getApiKey } = await import('../src/config.js');
        const apiKey = getApiKey();
        
        if (!apiKey) {
            console.log(chalk.yellow('Not authenticated.'));
            console.log(chalk.gray('Run: canvelete auth login'));
            return;
        }

        console.log(chalk.green('Authenticated'));
        console.log(chalk.gray(`API Key: ${apiKey.substring(0, 8)}...${apiKey.substring(apiKey.length - 4)}`));
    });

// Open dashboard
program
    .command('open')
    .description('Open Canvelete dashboard in browser')
    .option('-d, --design <id>', 'Open specific design')
    .action(async (options) => {
        const open = (await import('open')).default;
        let url = 'https://www.canvelete.com/dashboard';
        
        if (options.design) {
            url = `https://www.canvelete.com/editor/${options.design}`;
        }
        
        console.log(chalk.gray(`Opening ${url}...`));
        await open(url);
    });

// Quick render shortcut
program
    .command('quick-render <designId>')
    .description('Quickly render a design to PNG')
    .option('-o, --output <file>', 'Output file')
    .action(async (designId, options) => {
        const { requireAuth } = await import('../src/config.js');
        const { createClient } = await import('../src/client.js');
        const fs = await import('fs');
        const ora = (await import('ora')).default;
        
        requireAuth();
        const spinner = ora('Rendering...').start();

        try {
            const client = createClient();
            const imageData = await client.render({
                designId,
                format: 'png',
                quality: 90,
            });

            const buffer = Buffer.from(imageData);
            const outputPath = options.output || `${designId.substring(0, 8)}.png`;
            fs.writeFileSync(outputPath, buffer);
            
            spinner.succeed(`Saved to ${outputPath}`);
        } catch (err) {
            spinner.fail(err.message);
            process.exit(1);
        }
    });

// Completion command
program
    .command('completion')
    .description('Generate shell completion script')
    .option('-s, --shell <shell>', 'Shell type (bash, zsh, fish)', 'bash')
    .action((options) => {
        const shell = options.shell;
        
        if (shell === 'bash') {
            console.log(`
# Canvelete CLI bash completion
# Add to ~/.bashrc or ~/.bash_profile:
# eval "$(canvelete completion --shell bash)"

_canvelete_completions() {
    local cur="\${COMP_WORDS[COMP_CWORD]}"
    local commands="auth designs templates render renders assets apikeys usage billing config whoami open quick-render completion"
    
    if [ "\${COMP_CWORD}" -eq 1 ]; then
        COMPREPLY=($(compgen -W "\${commands}" -- "\${cur}"))
    fi
}

complete -F _canvelete_completions canvelete
`);
        } else if (shell === 'zsh') {
            console.log(`
# Canvelete CLI zsh completion
# Add to ~/.zshrc:
# eval "$(canvelete completion --shell zsh)"

_canvelete() {
    local -a commands
    commands=(
        'auth:Manage authentication'
        'designs:Manage designs'
        'templates:Browse and use templates'
        'render:Render a design'
        'renders:Manage render jobs'
        'assets:Manage assets'
        'apikeys:Manage API keys'
        'usage:View usage statistics'
        'billing:View billing information'
        'config:Manage CLI configuration'
        'whoami:Show current user'
        'open:Open dashboard'
        'quick-render:Quick render a design'
    )
    
    _describe 'command' commands
}

compdef _canvelete canvelete
`);
        } else if (shell === 'fish') {
            console.log(`
# Canvelete CLI fish completion
# Save to ~/.config/fish/completions/canvelete.fish

complete -c canvelete -n "__fish_use_subcommand" -a auth -d "Manage authentication"
complete -c canvelete -n "__fish_use_subcommand" -a designs -d "Manage designs"
complete -c canvelete -n "__fish_use_subcommand" -a templates -d "Browse templates"
complete -c canvelete -n "__fish_use_subcommand" -a render -d "Render a design"
complete -c canvelete -n "__fish_use_subcommand" -a assets -d "Manage assets"
complete -c canvelete -n "__fish_use_subcommand" -a apikeys -d "Manage API keys"
complete -c canvelete -n "__fish_use_subcommand" -a usage -d "View usage"
complete -c canvelete -n "__fish_use_subcommand" -a billing -d "View billing"
complete -c canvelete -n "__fish_use_subcommand" -a config -d "CLI configuration"
`);
        } else {
            console.error(`Unknown shell: ${shell}`);
            process.exit(1);
        }
    });

// Error handling
program.exitOverride();

try {
    await program.parseAsync(process.argv);
} catch (err) {
    if (err.code === 'commander.help' || err.code === 'commander.version') {
        process.exit(0);
    }
    
    if (err.code === 'commander.unknownCommand') {
        console.error(chalk.red(`Unknown command. Run 'canvelete --help' for usage.`));
        process.exit(1);
    }
    
    if (program.opts().debug) {
        console.error(err);
    }
    
    process.exit(1);
}
