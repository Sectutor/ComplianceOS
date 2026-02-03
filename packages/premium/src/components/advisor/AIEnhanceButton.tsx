
import React, { useState } from 'react';
import { Button } from "@complianceos/ui/ui/button";
import { Sparkles, Loader2, RefreshCw, Wand2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@complianceos/ui/ui/dialog";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Textarea } from "@complianceos/ui/ui/textarea";

interface AIEnhanceButtonProps {
    clientId: number;
    planId: number;
    sectionKey: 'intro' | 'scope' | 'assumptions' | 'activation' | 'roles' | 'strategies' | 'scenarios' | 'exercises';
    currentContent: string;
    onApply: (newContent: string) => void;
    label?: string;
    variant?: "default" | "outline" | "ghost" | "secondary";
    size?: "default" | "sm" | "lg" | "icon";
}

export function AIEnhanceButton({
    clientId,
    planId,
    sectionKey,
    currentContent,
    onApply,
    label = "AI Assist",
    variant = "outline",
    size = "sm"
}: AIEnhanceButtonProps) {
    const [open, setOpen] = useState(false);
    const [generatedContent, setGeneratedContent] = useState("");

    // Mutations
    const generate = trpc.advisor.generateBcpContent.useMutation({
        onSuccess: (data) => {
            setGeneratedContent(data.content);
        },
        onError: (err) => {
            toast.error(`AI Generation Failed: ${err.message}`);
        }
    });

    const handleGenerate = (mode: 'draft' | 'improve') => {
        generate.mutate({
            clientId,
            planId,
            sectionKey,
            context: currentContent,
            mode
        });
    };

    const handleApply = () => {
        onApply(generatedContent);
        setOpen(false);
        setGeneratedContent("");
        toast.success("Content applied!");
    };

    return (
        <>
            <Button variant={variant} size={size} onClick={() => setOpen(true)} className="gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" />
                {label}
            </Button>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-purple-600" />
                            AI Assistant
                        </DialogTitle>
                        <DialogDescription>
                            Generate new content or improve your existing text using specific BCP best practices.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-6 py-4">
                        {!generatedContent && (
                            <div className="flex flex-col gap-4 items-center justify-center p-8 border-2 border-dashed rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => handleGenerate('draft')}
                                        disabled={generate.isLoading}
                                        className={`gap-2 relative overflow-hidden transition-all duration-300 ${generate.isLoading
                                                ? "bg-purple-100 text-purple-700 border-purple-200"
                                                : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-md hover:shadow-lg hover:-translate-y-0.5"
                                            }`}
                                    >
                                        {generate.isLoading ? (
                                            <>
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                                Drafting...
                                                <span className="absolute inset-0 bg-white/20 animate-pulse" />
                                            </>
                                        ) : (
                                            <>
                                                <Wand2 className="w-4 h-4" />
                                                Draft New Content
                                            </>
                                        )}
                                    </Button>

                                    <Button
                                        variant="outline"
                                        onClick={() => handleGenerate('improve')}
                                        disabled={generate.isLoading || !currentContent}
                                        className={`gap-2 transition-all duration-300 ${!currentContent ? "opacity-50 cursor-not-allowed" :
                                                generate.isLoading
                                                    ? "bg-slate-100"
                                                    : "border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
                                            }`}
                                    >
                                        {generate.isLoading ? (
                                            <>
                                                <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                                                Improving...
                                            </>
                                        ) : (
                                            <>
                                                <Sparkles className="w-4 h-4" />
                                                Improve Existing
                                            </>
                                        )}
                                    </Button>
                                </div>
                                {!currentContent && (
                                    <p className="text-xs text-muted-foreground animate-pulse">
                                        Select "Draft New" to start from scratch.
                                    </p>
                                )}
                            </div>
                        )}

                        {generate.isLoading && (
                            <div className="flex flex-col items-center justify-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-2" />
                                <p className="text-sm text-muted-foreground">Consulting expert knowledge base...</p>
                            </div>
                        )}

                        {generatedContent && !generate.isLoading && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">Generated Suggestion:</label>
                                    <Textarea
                                        value={generatedContent}
                                        onChange={(e) => setGeneratedContent(e.target.value)}
                                        className="min-h-[200px]"
                                    />
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        {generatedContent && (
                            <>
                                <Button variant="ghost" onClick={() => setGeneratedContent("")}>Discard</Button>
                                <Button onClick={handleApply}>Apply to Plan</Button>
                            </>
                        )}
                        {!generatedContent && (
                            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
