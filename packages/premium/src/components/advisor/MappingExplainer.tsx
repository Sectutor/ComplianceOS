/**
 * Regulation Mapping Explainer - Shows compliance coverage
 */

import { useState } from 'react';
import { Sparkles, Loader2, AlertCircle, CheckCircle2, FileText, Link2 } from 'lucide-react';
import { Button } from "@complianceos/ui/ui/button";
import { useExplainMapping } from '@/hooks/useAdvisor';

interface MappingExplainerProps {
    clientId: number;
    regulationId: string;
    articleId: string;
    articleTitle: string;
}

export default function MappingExplainer({
    clientId,
    regulationId,
    articleId,
    articleTitle,
}: MappingExplainerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const { explain, data, isLoading, error } = useExplainMapping();

    const handleExplain = () => {
        if (!isOpen) {
            setIsOpen(true);
            explain({ clientId, regulationId, articleId });
        } else {
            setIsOpen(false);
        }
    };

    return (
        <div className="mt-4">
            <Button
                onClick={handleExplain}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
            >
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Explain Compliance Coverage</span>
            </Button>

            {isOpen && (
                <div className="mt-4 border border-gray-200 rounded-lg bg-white p-6">
                    {isLoading && (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                            <span className="ml-2 text-gray-600">Analyzing coverage...</span>
                        </div>
                    )}

                    {error && (
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <p className="text-sm text-red-800">
                                Failed to analyze coverage. Please try again.
                            </p>
                        </div>
                    )}

                    {data && (
                        <div className="space-y-6">
                            {/* Explanation */}
                            <div>
                                <h4 className="font-semibold text-gray-900 mb-2">AI Analysis</h4>
                                <div className="prose prose-sm max-w-none">
                                    <p className="text-gray-700 whitespace-pre-wrap">{data.explanation}</p>
                                </div>
                            </div>

                            {/* Mapped Controls */}
                            {data.mappedControls && data.mappedControls.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <Link2 className="w-4 h-4" />
                                        Mapped Controls ({data.mappedControls.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {data.mappedControls.map((control, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                                                    <div>
                                                        <p className="font-medium text-gray-900">{control.controlId}</p>
                                                        <p className="text-sm text-gray-600">{control.controlName}</p>
                                                    </div>
                                                </div>
                                                <span
                                                    className={`px-2 py-1 rounded text-xs font-medium ${control.status === 'implemented'
                                                        ? 'bg-green-100 text-green-800'
                                                        : control.status === 'in_progress'
                                                            ? 'bg-yellow-100 text-yellow-800'
                                                            : 'bg-gray-100 text-gray-800'
                                                        }`}
                                                >
                                                    {control.status}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Evidence Links */}
                            {data.evidenceLinks && data.evidenceLinks.length > 0 && (
                                <div>
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <FileText className="w-4 h-4" />
                                        Related Evidence ({data.evidenceLinks.length})
                                    </h4>
                                    <div className="space-y-2">
                                        {data.evidenceLinks.map((evidence, i) => (
                                            <div
                                                key={i}
                                                className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg p-3"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText className="w-4 h-4 text-blue-600" />
                                                    <p className="text-sm text-gray-700">{evidence.description}</p>
                                                </div>
                                                <span className="text-xs text-gray-500">{evidence.status}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Gaps */}
                            {data.gaps && data.gaps.length > 0 && (
                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-900 mb-2 flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4" />
                                        Coverage Gaps
                                    </h4>
                                    <ul className="space-y-1">
                                        {data.gaps.map((gap, i) => (
                                            <li key={i} className="text-sm text-yellow-800 flex items-start gap-2">
                                                <span className="mt-1">•</span>
                                                <span>{gap}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
