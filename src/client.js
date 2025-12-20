/**
 * API Client for Canvelete CLI
 */

import { getApiKey, getBaseUrl } from './config.js';
import chalk from 'chalk';

class CanveleteAPIClient {
    constructor() {
        this.apiKey = getApiKey();
        this.baseUrl = getBaseUrl();
    }

    async request(method, endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'User-Agent': 'canvelete-cli/2.0.0',
        };

        if (options.json) {
            headers['Content-Type'] = 'application/json';
        }

        const fetchOptions = {
            method,
            headers,
        };

        if (options.json) {
            fetchOptions.body = JSON.stringify(options.json);
        }

        if (options.params) {
            const searchParams = new URLSearchParams(options.params);
            const separator = url.includes('?') ? '&' : '?';
            const fullUrl = `${url}${separator}${searchParams}`;
            const response = await fetch(fullUrl, fetchOptions);
            return this.handleResponse(response, options.binary);
        }

        const response = await fetch(url, fetchOptions);
        return this.handleResponse(response, options.binary);
    }

    async handleResponse(response, binary = false) {
        if (!response.ok) {
            let errorMessage = `HTTP ${response.status}`;
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.message || errorMessage;
            } catch {}
            
            const error = new Error(errorMessage);
            error.status = response.status;
            throw error;
        }

        if (binary) {
            return response.arrayBuffer();
        }

        return response.json();
    }

    // Designs
    async listDesigns(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        if (options.isTemplate !== undefined) params.isTemplate = options.isTemplate;
        if (options.status) params.status = options.status;
        
        return this.request('GET', '/api/automation/designs', { params });
    }

    async getDesign(id) {
        return this.request('GET', `/api/automation/designs/${id}`);
    }

    async createDesign(data) {
        return this.request('POST', '/api/automation/designs', { json: data });
    }

    async updateDesign(id, data) {
        return this.request('PATCH', `/api/automation/designs/${id}`, { json: data });
    }

    async deleteDesign(id) {
        return this.request('DELETE', `/api/automation/designs/${id}`);
    }

    async duplicateDesign(id, newName) {
        return this.request('POST', `/api/automation/designs/${id}/duplicate`, { 
            json: { name: newName } 
        });
    }

    // Templates
    async listTemplates(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        if (options.search) params.search = options.search;
        if (options.category) params.category = options.category;
        
        return this.request('GET', '/api/automation/templates', { params });
    }

    async getTemplate(id) {
        return this.request('GET', `/api/automation/designs/${id}`);
    }

    // Render
    async render(options) {
        const data = {
            format: options.format || 'png',
            quality: options.quality || 90,
        };
        
        if (options.designId) data.designId = options.designId;
        if (options.templateId) data.templateId = options.templateId;
        if (options.dynamicData) data.dynamicData = options.dynamicData;
        if (options.width) data.width = options.width;
        if (options.height) data.height = options.height;

        return this.request('POST', '/api/automation/render', { json: data, binary: true });
    }

    async renderAsync(options) {
        const data = {
            format: options.format || 'png',
            quality: options.quality || 90,
            async: true,
        };
        
        if (options.designId) data.designId = options.designId;
        if (options.templateId) data.templateId = options.templateId;
        if (options.dynamicData) data.dynamicData = options.dynamicData;

        return this.request('POST', '/api/v1/render/async', { json: data });
    }

    async getRenderStatus(jobId) {
        return this.request('GET', `/api/v1/render/status/${jobId}`);
    }

    async listRenders(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        return this.request('GET', '/api/automation/render', { params });
    }

    // Assets
    async listAssets(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        if (options.type) params.type = options.type;
        
        return this.request('GET', '/api/assets/library', { params });
    }

    async deleteAsset(id) {
        return this.request('DELETE', `/api/assets/${id}`);
    }

    async searchStockImages(query, options = {}) {
        const params = {
            query,
            page: options.page || 1,
            perPage: options.perPage || 20,
        };
        return this.request('GET', '/api/assets/stock-images', { params });
    }

    async searchIcons(query, options = {}) {
        const params = {
            query,
            page: options.page || 1,
            perPage: options.perPage || 20,
        };
        return this.request('GET', '/api/assets/icons', { params });
    }

    async listFonts(category) {
        const params = {};
        if (category) params.category = category;
        return this.request('GET', '/api/assets/fonts', { params });
    }

    // API Keys
    async listApiKeys(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        return this.request('GET', '/api/automation/api-keys', { params });
    }

    async createApiKey(name, expiresAt) {
        const data = { name };
        if (expiresAt) data.expiresAt = expiresAt;
        return this.request('POST', '/api/automation/api-keys', { json: data });
    }

    async revokeApiKey(id) {
        return this.request('DELETE', `/api/automation/api-keys/${id}`);
    }

    // Usage
    async getUsageStats() {
        return this.request('GET', '/api/v1/usage/stats');
    }

    async getUsageHistory(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        return this.request('GET', '/api/v1/usage/history', { params });
    }

    // Billing
    async getBillingInfo() {
        return this.request('GET', '/api/v1/billing/info');
    }

    async getInvoices(options = {}) {
        const params = {
            page: options.page || 1,
            limit: options.limit || 20,
        };
        return this.request('GET', '/api/v1/billing/invoices', { params });
    }

    // Canvas operations
    async addElement(designId, element) {
        return this.request('POST', `/api/designs/${designId}/elements`, { 
            json: { element } 
        });
    }

    async getElements(designId) {
        return this.request('GET', `/api/designs/${designId}/canvas`);
    }

    async clearCanvas(designId) {
        return this.request('DELETE', `/api/designs/${designId}/canvas/elements`);
    }

    async resizeCanvas(designId, width, height) {
        return this.request('PATCH', `/api/designs/${designId}/canvas/resize`, {
            json: { width, height }
        });
    }

    // Export
    async exportDesign(designId, format = 'png', quality = 100) {
        return this.request('POST', `/api/automation/designs/${designId}/export`, {
            json: { format, quality },
            binary: true
        });
    }
}

export function createClient() {
    return new CanveleteAPIClient();
}

export default CanveleteAPIClient;
