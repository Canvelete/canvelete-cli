/**
 * Configuration management for Canvelete CLI
 */

import Conf from 'conf';
import chalk from 'chalk';

const config = new Conf({
    projectName: 'canvelete-cli',
    schema: {
        apiKey: {
            type: 'string',
            default: ''
        },
        baseUrl: {
            type: 'string',
            default: 'https://www.canvelete.com'
        },
        defaultFormat: {
            type: 'string',
            default: 'png'
        },
        defaultQuality: {
            type: 'number',
            default: 90
        }
    }
});

export function getApiKey() {
    // Check environment variable first
    const envKey = process.env.CANVELETE_API_KEY;
    if (envKey) {
        return envKey;
    }
    return config.get('apiKey');
}

export function setApiKey(key) {
    config.set('apiKey', key);
}

export function clearApiKey() {
    config.delete('apiKey');
}

export function getBaseUrl() {
    return process.env.CANVELETE_BASE_URL || config.get('baseUrl');
}

export function setBaseUrl(url) {
    config.set('baseUrl', url);
}

export function getConfig(key) {
    return config.get(key);
}

export function setConfig(key, value) {
    config.set(key, value);
}

export function getAllConfig() {
    return config.store;
}

export function getConfigPath() {
    return config.path;
}

export function requireAuth() {
    const apiKey = getApiKey();
    if (!apiKey) {
        console.error(chalk.red('Error: Not authenticated.'));
        console.error(chalk.yellow('Run: canvelete auth login'));
        console.error(chalk.yellow('Or set CANVELETE_API_KEY environment variable'));
        process.exit(1);
    }
    return apiKey;
}

export default config;
