/**
 * Local Plugins Loader
 * 
 * This module loads custom plugins from the local-plugins directory
 * for self-hosted ComplianceOS instances.
 * 
 * Usage:
 * import { loadLocalPlugins, getLocalWidget } from '@/lib/local-plugins';
 * 
 * const plugins = loadLocalPlugins();
 * const widget = getLocalWidget('custom-executive-dashboard');
 */

import { getSelfHostedConfig, isSelfHosted } from './selfhosted-config';

/**
 * Plugin manifest interface
 */
export interface LocalPluginManifest {
    name: string;
    slug: string;
    version: string;
    description: string;
    author: string;
    entryPoints: {
        component?: string;
        server?: string;
    };
    permissions: string[];
    hooks: string[];
    enabled: boolean;
}

/**
 * Dashboard widget interface
 */
export interface DashboardWidget {
    id: string;
    name: string;
    description: string;
    component: React.ComponentType<any>;
    defaultPosition: string;
    configurable: boolean;
}

/**
 * Menu item interface
 */
export interface MenuItem {
    label: string;
    path: string;
    icon?: string;
    permission?: string;
}

/**
 * Loaded plugin data
 */
interface LoadedPlugin {
    manifest: LocalPluginManifest;
    component?: React.ComponentType<any>;
    server?: any;
}

/**
 * Cache for loaded plugins
 */
let pluginCache: Map<string, LoadedPlugin> = new Map();

/**
 * Get the local plugins path from config
 */
function getPluginsPath(): string | null {
    const config = getSelfHostedConfig();

    if (!config.selfHostedMode) {
        return null;
    }

    return config.customPluginsPath;
}

/**
 * Check if local plugins are enabled
 */
export function areLocalPluginsEnabled(): boolean {
    const path = getPluginsPath();
    return path !== null;
}

/**
 * Get list of enabled local plugins
 * This would load from config.json in production
 * For now, returns known plugins
 */
export function getEnabledLocalPlugins(): string[] {
    if (!isSelfHosted()) {
        return [];
    }

    // In a real implementation, this would read from config.json
    // For now, we return an empty array until plugins are explicitly enabled
    return [];
}

/**
 * Load a specific plugin by slug
 * In self-hosted mode, this would dynamically import the plugin
 */
export function loadPlugin(slug: string): LoadedPlugin | null {
    // Check cache first
    if (pluginCache.has(slug)) {
        return pluginCache.get(slug)!;
    }

    // In self-hosted mode, try to load from local plugins
    if (!isSelfHosted()) {
        return null;
    }

    // For demonstration, return null - actual loading would use dynamic imports
    // In production, this would read the manifest and component files

    return null;
}

/**
 * Get all available dashboard widgets from local plugins
 */
export function getLocalWidgets(): DashboardWidget[] {
    if (!isSelfHosted()) {
        return [];
    }

    const widgets: DashboardWidget[] = [];

    // In production, this would scan the plugins directory
    // and load each plugin's widget

    return widgets;
}

/**
 * Get a specific widget by ID
 */
export function getLocalWidget(widgetId: string): DashboardWidget | null {
    const widgets = getLocalWidgets();
    return widgets.find(w => w.id === widgetId) || null;
}

/**
 * Get menu items from local plugins
 */
export function getLocalMenuItems(): MenuItem[] {
    if (!isSelfHosted()) {
        return [];
    }

    const items: MenuItem[] = [];

    // In production, this would load menu items from plugins

    return items;
}

/**
 * Check if a plugin has a specific permission
 */
export function pluginHasPermission(pluginSlug: string, permission: string): boolean {
    const plugin = loadPlugin(pluginSlug);

    if (!plugin) {
        return false;
    }

    return plugin.manifest.permissions.includes(permission) ||
        plugin.manifest.permissions.includes('*');
}

/**
 * Register a custom widget (for use in plugins)
 */
export function registerWidget(widget: DashboardWidget): void {
    // In production, this would add to the widget registry
    console.log(`[LocalPlugins] Registered widget: ${widget.id}`);
}

/**
 * Hook to use in React components
 */
export function useLocalPlugins() {
    const enabled = areLocalPluginsEnabled();
    const widgets = getLocalWidgets();
    const menuItems = getLocalMenuItems();

    return {
        enabled,
        widgets,
        menuItems,
        loadPlugin,
    };
}

export default {
    areLocalPluginsEnabled,
    getEnabledLocalPlugins,
    loadPlugin,
    getLocalWidgets,
    getLocalWidget,
    getLocalMenuItems,
    pluginHasPermission,
    registerWidget,
    useLocalPlugins,
};
