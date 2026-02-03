/**
 * Technology Suggestion Panel - Inline Widget for Controls
 */

import { useState } from 'react';
import { Sparkles, Loader2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { Button } from "@complianceos/ui/ui/button";
import { useSuggestTechnologies } from '@/hooks/useAdvisor';
import type { TechnologySuggestion } from '@/lib/advisor/types';

interface TechSuggestionPanelProps {
    clientId: number;
    controlId: number;
    controlName: string;
}

export default function TechSuggestionPanel({
    clientId,
    controlId,
    controlName,
}: TechSuggestionPanelProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { suggest, data, isLoading, error } = useSuggestTechnologies();

    const handleSuggest = () => {
        if (!isOpen) {
            setIsOpen(true);
            suggest({ clientId, controlId });
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Header Button */}
            <Button
                onClick={handleSuggest}
                variant="outline"
                className="w-full flex items-center justify-between p-3 hover:bg-gray-50"
            >
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">AI Technology Suggestions</span>
                </div>
                {isOpen ? (
                    <ChevronUp className="w-4 h-4" />
                ) : (
                    <ChevronDown className="w-4 h-4" />
                )}
            </Button>

            {/* Content */}
            {isOpen && (
                <div className="p-4 bg-gray-50 border-t border-gray-200">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span className="ml-2 text-gray-600">Analyzing {controlName}...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                Failed to generate suggestions. Please try again.
                            </p>
                        </div>
                    )}

                    {data && data.suggestions && (
                        <div className="space-y-4">
                            <p className="text-sm text-gray-600 mb-4">
                                {data.contextSummary}
                            </p>

                            {data.suggestions.map((suggestion, index) => (
                                <TechCard key={suggestion.techId} suggestion={suggestion} rank={index + 1} />
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function TechCard({ suggestion, rank }: { suggestion: TechnologySuggestion; rank: number }) {
    return (
        <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                    <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">
                            {rank}
                        </span>
                        <h4 className="font-semibold text-gray-900">{suggestion.vendor}</h4>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{suggestion.name}</p>
                </div>
                <div className="flex flex-col items-end gap-1">
                    <span
                        className={`px-2 py-1 rounded text-xs font-medium ${suggestion.effort === 'low'
                            ? 'bg-green-100 text-green-800'
                            : suggestion.effort === 'medium'
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                    >
                        {suggestion.effort} effort
                    </span>
                    <span className="text-xs text-gray-500">
                        {(suggestion.confidence * 100).toFixed(0)}% confidence
                    </span>
                </div>
            </div>

            {/* Description */}
            <p className="text-sm text-gray-700 mb-3">{suggestion.description}</p>

            {/* Pros/Cons */}
            <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                    <h5 className="text-xs font-semibold text-green-700 mb-1">Pros</h5>
                    <ul className="space-y-1">
                        {suggestion.pros.map((pro, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start">
                                <span className="text-green-600 mr-1">✓</span>
                                <span>{pro}</span>
                            </li>
                        ))}
                    </ul>
                </div>
                <div>
                    <h5 className="text-xs font-semibold text-red-700 mb-1">Cons</h5>
                    <ul className="space-y-1">
                        {suggestion.cons.map((con, i) => (
                            <li key={i} className="text-xs text-gray-600 flex items-start">
                                <span className="text-red-600 mr-1">✗</span>
                                <span>{con}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>

            {/* Sources */}
            {suggestion.sources && suggestion.sources.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>Sources:</span>
                    {suggestion.sources.map((source, i) => (
                        <a
                            key={i}
                            href={source.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:underline"
                        >
                            [{i + 1}] {source.title}
                            {source.url && <ExternalLink className="w-3 h-3" />}
                        </a>
                    ))}
                </div>
            )}
        </div>
    );
}
