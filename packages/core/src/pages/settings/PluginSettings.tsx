/**
 * Plugin Settings Page
 * 
 * Allows users to:
 * - Browse available plugins in the marketplace
 * - Install/uninstall plugins
 * - Configure installed plugins
 * - Enable/disable plugins
 */

import React, { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { useClientContext } from '@/contexts/ClientContext';
import { toast } from 'sonner';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@complianceos/ui/ui/alert-dialog";

interface Plugin {
    id: string;
    name: string;
    slug: string;
    version: string;
    description: string;
    author: string;
    category: string;
    tags: string[];
    permissions: string[];
    settings: any[];
    installed?: boolean;
    enabled?: boolean;
}

export function PluginSettings() {
    const { selectedClientId } = useClientContext();
    const [activeTab, setActiveTab] = useState<'marketplace' | 'installed'>('marketplace');
    const [searchQuery, setSearchQuery] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('');
    const [uninstallDialogOpen, setUninstallDialogOpen] = useState(false);
    const [pluginToUninstall, setPluginToUninstall] = useState<Plugin | null>(null);

    // Fetch marketplace plugins
    const { data: marketplaceData, isLoading: loadingMarketplace } = trpc.plugins.listMarketplace.useQuery({
        search: searchQuery || undefined,
        category: categoryFilter || undefined,
    });

    // Fetch installed plugins
    const { data: installedData, isLoading: loadingInstalled, refetch: refetchInstalled } = trpc.plugins.listInstalled.useQuery();

    const installMutation = trpc.plugins.install.useMutation({
        onSuccess: (data) => {
            refetchInstalled();
            toast.success(data.message || 'Plugin installed successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to install plugin');
        }
    });

    const uninstallMutation = trpc.plugins.uninstall.useMutation({
        onSuccess: (data) => {
            refetchInstalled();
            toast.success(data.message || 'Plugin uninstalled successfully');
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to uninstall plugin');
        }
    });

    const toggleMutation = trpc.plugins.toggle.useMutation({
        onSuccess: (data) => {
            refetchInstalled();
            toast.success(`Plugin ${data.enabled ? 'enabled' : 'disabled'} successfully`);
        },
        onError: (error) => {
            toast.error(error.message || 'Failed to update plugin status');
        }
    });

    const handleInstall = async (pluginId: string) => {
        try {
            await installMutation.mutateAsync({ pluginId });
        } catch (error) {
            // Already handled by onError
        }
    };

    const handleUninstall = (plugin: Plugin) => {
        setPluginToUninstall(plugin);
        setUninstallDialogOpen(true);
    };

    const confirmUninstall = async () => {
        if (!pluginToUninstall) return;
        try {
            await uninstallMutation.mutateAsync({ pluginId: pluginToUninstall.id });
        } catch (error) {
            // Already handled by onError
        } finally {
            setUninstallDialogOpen(false);
            setPluginToUninstall(null);
        }
    };

    const handleToggle = async (pluginId: string, enabled: boolean) => {
        const loadingToast = toast.loading(`${enabled ? 'Enabling' : 'Disabling'} plugin...`);
        try {
            await toggleMutation.mutateAsync({ pluginId, enabled });
        } catch (error) {
            // Error handled by toggleMutation.onError
        } finally {
            toast.dismiss(loadingToast);
        }
    };

    const categories = ['dashboard', 'risk', 'compliance', 'policy', 'evidence', 'training', 'reporting', 'integration', 'utility'];

    const marketplacePlugins: Plugin[] = marketplaceData?.plugins || [];
    const installedPlugins: Plugin[] = installedData || [];

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            dashboard: 'bg-blue-100 text-blue-800',
            risk: 'bg-red-100 text-red-800',
            compliance: 'bg-green-100 text-green-800',
            policy: 'bg-purple-100 text-purple-800',
            evidence: 'bg-yellow-100 text-yellow-800',
            training: 'bg-indigo-100 text-indigo-800',
            reporting: 'bg-pink-100 text-pink-800',
            integration: 'bg-gray-100 text-gray-800',
            utility: 'bg-orange-100 text-orange-800',
        };
        return colors[category] || 'bg-gray-100 text-gray-800';
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900">Plugin Marketplace</h1>
                <p className="text-gray-600 mt-2">
                    Browse and install plugins to extend your ComplianceOS functionality
                </p>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 mb-6">
                <nav className="-mb-px flex space-x-8">
                    <button
                        onClick={() => setActiveTab('marketplace')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'marketplace'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Browse Plugins
                        <span className="ml-2 bg-blue-100 text-blue-600 py-0.5 px-2 rounded-full text-xs">
                            {marketplacePlugins.length}
                        </span>
                    </button>
                    <button
                        onClick={() => setActiveTab('installed')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'installed'
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        Installed
                        <span className="ml-2 bg-green-100 text-green-600 py-0.5 px-2 rounded-full text-xs">
                            {installedPlugins.filter(p => p.installed).length}
                        </span>
                    </button>
                </nav>
            </div>

            {/* Search and Filters */}
            {activeTab === 'marketplace' && (
                <div className="flex flex-col sm:flex-row gap-4 mb-6">
                    <div className="flex-1">
                        <input
                            type="text"
                            placeholder="Search plugins..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="">All Categories</option>
                        {categories.map(cat => (
                            <option key={cat} value={cat}>
                                {cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </option>
                        ))}
                    </select>
                </div>
            )}

            {/* Loading State */}
            {loadingMarketplace && activeTab === 'marketplace' && (
                <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading plugins...</p>
                </div>
            )}

            {/* Plugin Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeTab === 'marketplace' && marketplacePlugins.map((plugin) => (
                    <div key={plugin.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
                                <p className="text-sm text-gray-500">v{plugin.version} by {plugin.author}</p>
                            </div>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(plugin.category)}`}>
                                {plugin.category}
                            </span>
                        </div>

                        <p className="text-gray-600 text-sm mb-4">{plugin.description}</p>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-2 mb-4">
                            {plugin.tags.slice(0, 4).map((tag: string) => (
                                <span key={tag} className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        {/* Permissions */}
                        <div className="mb-4">
                            <p className="text-xs text-gray-500 mb-1">Permissions:</p>
                            <div className="flex flex-wrap gap-1">
                                {plugin.permissions.slice(0, 3).map((perm: string) => (
                                    <span key={perm} className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded">
                                        {perm}
                                    </span>
                                ))}
                                {plugin.permissions.length > 3 && (
                                    <span className="px-1.5 py-0.5 bg-yellow-50 text-yellow-700 text-xs rounded">
                                        +{plugin.permissions.length - 3}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Install Button */}
                        {plugin.installed ? (
                            <button
                                disabled
                                className="w-full px-4 py-2 bg-green-100 text-green-700 font-medium rounded-lg cursor-not-allowed"
                            >
                                ✓ Installed
                            </button>
                        ) : (
                            <button
                                onClick={() => handleInstall(plugin.id)}
                                disabled={installMutation.isPending}
                                className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {installMutation.isPending && installMutation.variables?.pluginId === plugin.id ? 'Installing...' : 'Install'}
                            </button>
                        )}
                    </div>
                ))}

                {activeTab === 'installed' && installedPlugins.filter(p => p.installed).map((plugin) => (
                    <div key={plugin.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900">{plugin.name}</h3>
                                <p className="text-sm text-gray-500">v{plugin.version}</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={plugin.enabled}
                                    onChange={(e) => handleToggle(plugin.id, e.target.checked)}
                                    className="sr-only peer"
                                />
                                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            </label>
                        </div>

                        <p className="text-gray-600 text-sm mb-4">{plugin.description}</p>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2 mb-4">
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${plugin.enabled
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                                }`}>
                                {plugin.enabled ? 'Active' : 'Disabled'}
                            </span>
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(plugin.category)}`}>
                                {plugin.category}
                            </span>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                            {plugin.settings && plugin.settings.length > 0 && (
                                <button
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
                                >
                                    Configure
                                </button>
                            )}
                            <button
                                onClick={() => handleUninstall(plugin)}
                                disabled={uninstallMutation.isPending}
                                className="flex-1 px-4 py-2 bg-red-100 text-red-700 font-medium rounded-lg hover:bg-red-200 disabled:opacity-50"
                            >
                                {uninstallMutation.isPending && uninstallMutation.variables?.pluginId === plugin.id ? 'Uninstalling...' : 'Uninstall'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Empty State */}
            {activeTab === 'installed' && installedPlugins.filter(p => p.installed).length === 0 && (
                <div className="text-center py-12">
                    <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No plugins installed</h3>
                    <p className="mt-1 text-sm text-gray-500">Get started by browsing the marketplace.</p>
                    <button
                        onClick={() => setActiveTab('marketplace')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                    >
                        Browse Marketplace
                    </button>
                </div>
            )}
            {/* Uninstallation Confirmation Dialog */}
            <AlertDialog open={uninstallDialogOpen} onOpenChange={setUninstallDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Uninstall {pluginToUninstall?.name}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to uninstall this plugin? This will remove all associated settings and may affect other plugins that depend on it.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={uninstallMutation.isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                confirmUninstall();
                            }}
                            className="bg-red-600 hover:bg-red-700 text-white"
                            disabled={uninstallMutation.isPending}
                        >
                            {uninstallMutation.isPending ? 'Uninstalling...' : 'Uninstall'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default PluginSettings;
