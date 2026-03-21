/**
 * Custom Executive Dashboard Widget
 * 
 * This is an example of a custom dashboard widget that self-hosted
 * clients can add to their ComplianceOS instance.
 * 
 * To enable: Set SELFHOSTED_FEATURES_ENABLED=1 in your environment
 */

import React from 'react';

interface ComplianceMetric {
    label: string;
    value: number;
    target: number;
    status: 'good' | 'warning' | 'critical';
}

interface CustomDashboardProps {
    metrics?: ComplianceMetric[];
    title?: string;
}

/**
 * Example custom dashboard widget
 * 
 * This widget can be added to the main dashboard for executive reporting.
 * It shows key compliance metrics with visual indicators.
 */
export function CustomExecutiveDashboard({ 
    metrics = [],
    title = "Executive Summary"
}: CustomDashboardProps) {
    // Default metrics if none provided
    const defaultMetrics: ComplianceMetric[] = [
        { label: 'Policies Approved', value: 85, target: 100, status: 'good' },
        { label: 'Controls Implemented', value: 72, target: 90, status: 'warning' },
        { label: 'Training Completion', value: 95, target: 100, status: 'good' },
        { label: 'Open Risks', value: 12, target: 5, status: 'critical' },
    ];

    const displayMetrics = metrics.length > 0 ? metrics : defaultMetrics;

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'good': return 'text-green-600 bg-green-50';
            case 'warning': return 'text-yellow-600 bg-yellow-50';
            case 'critical': return 'text-red-600 bg-red-50';
            default: return 'text-gray-600 bg-gray-50';
        }
    };

    const getProgressWidth = (value: number, target: number) => {
        const percentage = Math.min((value / target) * 100, 100);
        return `${percentage}%`;
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
                {title}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {displayMetrics.map((metric, index) => (
                    <div 
                        key={index} 
                        className={`p-4 rounded-lg ${getStatusColor(metric.status)}`}
                    >
                        <div className="flex justify-between items-center mb-2">
                            <span className="font-medium">{metric.label}</span>
                            <span className="text-2xl font-bold">
                                {metric.value}
                                <span className="text-sm font-normal">/{metric.target}</span>
                            </span>
                        </div>
                        
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                                className={`h-2 rounded-full ${
                                    metric.status === 'good' ? 'bg-green-500' :
                                    metric.status === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
                                }`}
                                style={{ width: getProgressWidth(metric.value, metric.target) }}
                            />
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-4 text-sm text-gray-500">
                <p>Custom Dashboard - Self-Hosted Edition</p>
                <p>Last updated: {new Date().toLocaleString()}</p>
            </div>
        </div>
    );
}

/**
 * Hook to register this widget with the dashboard system
 * This is how ComplianceOS knows about your custom component
 */
export const customDashboardWidget = {
    id: 'custom-executive-dashboard',
    name: 'Executive Summary',
    description: 'Custom executive compliance dashboard',
    component: CustomExecutiveDashboard,
    defaultPosition: 'main',
    configurable: true,
};

export default CustomExecutiveDashboard;
