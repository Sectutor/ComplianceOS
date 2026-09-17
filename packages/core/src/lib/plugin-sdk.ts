/**
 * Plugin SDK - Provides full API access for plugins
 * 
 * This SDK gives installed plugins access to system data and functionality,
 * similar to how WordPress plugins access WP data.
 * 
 * Usage in plugins:
 * import { PluginSDK } from '@complianceos/plugin-sdk';
 * 
 * // Read data
 * const risks = await PluginSDK.risks.getAll();
 * 
 * // Write data
 * await PluginSDK.risks.create({ title: 'New Risk', ... });
 * 
 * // Access UI components
 * const Button = PluginSDK.ui.Button;
 */

import { getDb } from '../db';
import { eq, and } from 'drizzle-orm';

/**
 * Dynamic schema access
 * This allows plugins to access any table in the system
 */
async function getTable(tableName: string) {
    const schema = await import('../schema');
    return (schema as any)[tableName];
}

/**
 * Risk API - Access to risk data
 */
export const RiskAPI = {
    /**
     * Get all risks for current client
     */
    async getAll(clientId: number) {
        const db = await getDb();
        const risksTable = await getTable('risks');
        if (!risksTable) return [];
        return db.select().from(risksTable).where(eq(risksTable.clientId, clientId));
    },

    /**
     * Get risk by ID
     */
    async getById(clientId: number, riskId: number) {
        const db = await getDb();
        const risksTable = await getTable('risks');
        if (!risksTable) return null;
        const result = await db.select().from(risksTable)
            .where(and(eq(risksTable.clientId, clientId), eq(risksTable.id, riskId)))
            .limit(1);
        return result[0] || null;
    },

    /**
     * Create new risk
     */
    async create(clientId: number, data: {
        title: string;
        description?: string;
        category?: string;
        inherentRisk?: number;
        residualRisk?: number;
    }) {
        const db = await getDb();
        const risksTable = await getTable('risks');
        if (!risksTable) throw new Error('Risks table not found');

        const result = await db.insert(risksTable).values({
            clientId,
            title: data.title,
            description: data.description,
            category: data.category,
            inherentRisk: data.inherentRisk,
            residualRisk: data.residualRisk,
            status: 'identified',
            createdAt: new Date(),
            updatedAt: new Date(),
        }).returning();
        return result[0];
    },

    /**
     * Update risk
     */
    async update(clientId: number, riskId: number, data: Partial<{
        title: string;
        description: string;
        category: string;
        inherentRisk: number;
        residualRisk: number;
        status: string;
    }>) {
        const db = await getDb();
        const risksTable = await getTable('risks');
        if (!risksTable) throw new Error('Risks table not found');

        const result = await db.update(risksTable)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(risksTable.clientId, clientId), eq(risksTable.id, riskId)))
            .returning();
        return result[0];
    },

    /**
     * Delete risk
     */
    async delete(clientId: number, riskId: number) {
        const db = await getDb();
        const risksTable = await getTable('risks');
        if (!risksTable) throw new Error('Risks table not found');

        await db.delete(risksTable).where(and(eq(risksTable.clientId, clientId), eq(risksTable.id, riskId)));
        return { success: true };
    },
};

/**
 * Generic Table API - Access any table in the system
 */
export const TableAPI = {
    /**
     * Query any table
     */
    async query(tableName: string, clientId: number, filters?: any) {
        const db = await getDb();
        const table = await getTable(tableName);
        if (!table) throw new Error(`Table '${tableName}' not found`);

        let query = db.select().from(table).where(eq(table.clientId, clientId));

        if (filters?.where) {
            // Add custom where conditions
            query = query.where(and(eq(table.clientId, clientId), filters.where));
        }

        if (filters?.orderBy) {
            query = query.orderBy(filters.orderBy);
        }

        if (filters?.limit) {
            query = query.limit(filters.limit);
        }

        return query;
    },

    /**
     * Insert into any table
     */
    async insert(tableName: string, clientId: number, data: any) {
        const db = await getDb();
        const table = await getTable(tableName);
        if (!table) throw new Error(`Table '${tableName}' not found`);

        const result = await db.insert(table).values({
            ...data,
            clientId,
            createdAt: data.createdAt || new Date(),
            updatedAt: data.updatedAt || new Date(),
        }).returning();
        return result[0];
    },

    /**
     * Update any table
     */
    async update(tableName: string, clientId: number, id: number, data: any) {
        const db = await getDb();
        const table = await getTable(tableName);
        if (!table) throw new Error(`Table '${tableName}' not found`);

        const result = await db.update(table)
            .set({ ...data, updatedAt: new Date() })
            .where(and(eq(table.clientId, clientId), eq(table.id, id)))
            .returning();
        return result[0];
    },

    /**
     * Delete from any table
     */
    async delete(tableName: string, clientId: number, id: number) {
        const db = await getDb();
        const table = await getTable(tableName);
        if (!table) throw new Error(`Table '${tableName}' not found`);

        await db.delete(table).where(and(eq(table.clientId, clientId), eq(table.id, id)));
        return { success: true };
    },
};

/**
 * UI Components - Access to base UI components
 */
export const UI = {
    /**
     * Button component
     */
    Button: null,

    /**
     * Card component
     */
    Card: null,

    /**
     * Input component
     */
    Input: null,

    /**
     * Modal component
     */
    Modal: null,

    /**
     * Table component
     */
    Table: null,

    /**
     * Chart component
     */
    Chart: null,
};

/**
 * Events - Plugin event system
 */
export const Events = {
    listeners: new Map<string, Function[]>(),

    /**
     * Listen to an event
     */
    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    },

    /**
     * Emit an event
     */
    emit(event: string, data: any) {
        const callbacks = this.listeners.get(event) || [];
        callbacks.forEach(cb => cb(data));
    },

    /**
     * Remove listener
     */
    off(event: string, callback: Function) {
        const callbacks = this.listeners.get(event) || [];
        const index = callbacks.indexOf(callback);
        if (index > -1) {
            callbacks.splice(index, 1);
        }
    },
};

/**
 * Logger - Plugin logging utility
 */
export const Logger = {
    log: (message: string, ...args: any[]) => console.log(`[Plugin] ${message}`, ...args),
    warn: (message: string, ...args: any[]) => console.warn(`[Plugin] ${message}`, ...args),
    error: (message: string, ...args: any[]) => console.error(`[Plugin] ${message}`, ...args),
    debug: (message: string, ...args: any[]) => console.debug(`[Plugin] ${message}`, ...args),
};

/**
 * HTTP Client - Make external API calls
 */
export const HTTP = {
    async get(url: string, headers?: Record<string, string>) {
        const response = await fetch(url, { headers });
        return response.json();
    },

    async post(url: string, data: any, headers?: Record<string, string>) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async put(url: string, data: any, headers?: Record<string, string>) {
        const response = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(data),
        });
        return response.json();
    },

    async delete(url: string, headers?: Record<string, string>) {
        const response = await fetch(url, { method: 'DELETE', headers });
        return response.json();
    },
};

/**
 * Plugin SDK main export
 */
export const PluginSDK = {
    risks: RiskAPI,
    table: TableAPI,
    ui: UI,
    events: Events,
    logger: Logger,
    http: HTTP,

    /**
     * Get current client ID (injected by system)
     */
    getClientId: () => {
        return (global as any).__PLUGIN_CLIENT_ID__ || 0;
    },

    /**
     * Get current user ID (injected by system)
     */
    getUserId: () => {
        return (global as any).__PLUGIN_USER_ID__ || 0;
    },
};

export default PluginSDK;
