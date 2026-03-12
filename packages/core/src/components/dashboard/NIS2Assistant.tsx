/**
 * NIS2 AI Compliance Assistant
 * 
 * An AI-powered chat interface that helps users understand and implement
 * NIS2 compliance requirements. Uses existing mappings and compliance data
 * to provide personalized guidance.
 * 
 * Features:
 * - Natural language queries about NIS2 requirements
 * - Context-aware responses based on client's current compliance status
 * - Evidence suggestions based on controls
 * - Remediation recommendations
 */

import React, { useState, useRef, useEffect } from "react";
import {
    MessageSquare,
    Send,
    Bot,
    User,
    Sparkles,
    X,
    ChevronDown,
    ChevronUp,
    BookOpen,
    Shield,
    AlertCircle,
    CheckCircle2,
    Lightbulb,
    ArrowRight,
    Copy,
    RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Badge } from "@complianceos/ui/ui/badge";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter
} from "@complianceos/ui/ui/dialog";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger
} from "@complianceos/ui/ui/collapsible";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useClientContext } from "@/contexts/ClientContext";
import { useLocation } from "wouter";

// NIS2 Article 21 categories for context
const NIS2_ARTICLES = [
    { article: "21(2)(a)", title: "Policies on security", description: "Information security policies" },
    { article: "21(2)(b)", title: "Risk management", description: "Cybersecurity risk management" },
    { article: "21(2)(c)", title: "Incident handling", description: "Incident response and handling" },
    { article: "21(2)(d)", title: "Business continuity", description: "BCP and disaster recovery" },
    { article: "21(2)(e)", title: "Supply chain security", description: "Third-party risk management" },
    { article: "21(2)(f)", title: "Security in acquisition", description: "Secure development lifecycle" },
    { article: "21(2)(g)", title: "Effectiveness assessment", description: "Security control testing" },
    { article: "21(2)(h)", title: "Cyber hygiene", description: "Training and awareness" },
    { article: "21(2)(i)", title: "Cryptography", description: "Encryption and key management" },
    { article: "21(2)(j)", title: "Human resources", description: "Personnel security" },
    { article: "21(2)(k)", title: "Access control", description: "Identity and access management" },
    { article: "21(2)(l)", title: "Asset management", description: "Asset inventory and classification" },
];

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
    sources?: string[];
    suggestions?: string[];
}

interface NIS2AssistantProps {
    clientId?: number;
    compact?: boolean;
}

export function NIS2Assistant({ clientId, compact = false }: NIS2AssistantProps) {
    const [, setLocation] = useLocation();
    const { selectedClientId } = useClientContext();
    const effectiveClientId = clientId || selectedClientId;

    const [isOpen, setIsOpen] = useState(false);
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            role: "assistant",
            content: `Hello! I'm your NIS2 Compliance Assistant. I can help you understand the EU NIS2 Directive requirements and how to achieve compliance. 

I can answer questions about:
• NIS2 Article 21 security measures
• Incident reporting requirements (24h/72h/1-month)
• Mapping to ISO 27001, NIST CSF, SOC 2
• Evidence requirements and recommendations
• Gap analysis and remediation guidance

What would you like to know about your NIS2 compliance?`,
            timestamp: new Date(),
            suggestions: [
                "What does Article 21 require?",
                "How do I report a significant incident?",
                "Show my compliance status",
                "What evidence do I need?"
            ]
        }
    ]);
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [isExpanded, setIsExpanded] = useState(!compact);

    // Get client compliance data for context
    const { data: nis2Data } = trpc.cyber.getMappings.useQuery(
        { clientId: effectiveClientId || 0, framework: 'NIS2' },
        { enabled: !!effectiveClientId }
    );

    // Get incidents for context
    const { data: incidentsData } = trpc.cyber.getIncidents.useQuery(
        { clientId: effectiveClientId || 0 },
        { enabled: !!effectiveClientId }
    );

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Build context for AI prompts
    const buildContext = () => {
        let context = "You are a NIS2 compliance expert assistant. ";

        if (nis2Data && nis2Data.length > 0) {
            const complianceRate = Math.round(
                nis2Data.reduce((acc: number, m: any) => {
                    const implemented = m.implementedCount || 0;
                    const total = m.mappedControlIds?.length || 0;
                    return acc + (total > 0 ? (implemented / total) * 100 : 0);
                }, 0) / nis2Data.length
            );
            context += `The client has ${nis2Data.length} NIS2 measures mapped with approximately ${complianceRate}% implementation rate. `;
        }

        if (incidentsData) {
            const significantCount = incidentsData.filter((i: any) => i.isSignificant).length;
            if (significantCount > 0) {
                context += `The client has ${significantCount} significant incident(s) on record. `;
            }
        }

        context += "Provide accurate, actionable guidance based on EU NIS2 Directive (2022/2555) requirements.";
        return context;
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage: Message = {
            id: Date.now().toString(),
            role: "user",
            content: input.trim(),
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setIsLoading(true);

        try {
            // For now, we'll generate responses based on keywords since we need to integrate with LLM
            // In production, this would call the AI service
            const response = generateResponse(input.trim(), nis2Data, incidentsData);

            const assistantMessage: Message = {
                id: (Date.now() + 1).toString(),
                role: "assistant",
                content: response.content,
                timestamp: new Date(),
                sources: response.sources,
                suggestions: response.suggestions
            };

            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast.error("Failed to get response. Please try again.");
            console.error("AI Assistant error:", error);
        } finally {
            setIsLoading(false);
        }
    };

    // Generate contextual responses based on keywords
    const generateResponse = (query: string, nis2Data: any[], incidentsData: any[]): { content: string; sources?: string[]; suggestions?: string[] } => {
        const lowerQuery = query.toLowerCase();

        // Article 21 overview
        if (lowerQuery.includes("article 21") || lowerQuery.includes("what does") || lowerQuery.includes("requirements")) {
            return {
                content: `NIS2 Article 21 requires essential and important entities to implement appropriate and proportionate technical and organizational measures to manage cyber risks. The directive specifies 10 key areas:

**1. Policies (Art. 21(2)(a))** - Information security policies and procedures
**2. Risk Management (Art. 21(2)(b))** - Cybersecurity risk management frameworks
**3. Incident Handling (Art. 21(2)(c))** - Detection, response, and recovery capabilities
**4. Business Continuity (Art. 21(2)(d))** - BCP and disaster recovery plans
**5. Supply Chain (Art. 21(2)(e))** - Third-party security management
**6. Acquisition (Art. 21(2)(f))** - Secure development practices
**7. Effectiveness (Art. 21(2)(g))** - Security testing and assessment
**8. Cyber Hygiene (Art. 21(2)(h))** - Training and awareness programs
**9. Cryptography (Art. 21(2)(i))** - Encryption and key management
**10. Access Control (Art. 21(2)(k)(l))** - IAM and asset management

Would you like detailed information on any specific area?`,
                sources: ["EU NIS2 Directive 2022/2555", "ENISA Guidelines"],
                suggestions: ["Tell me about incident reporting", "Show my current compliance", "What is supply chain security?"]
            };
        }

        // Incident reporting
        if (lowerQuery.includes("incident") || lowerQuery.includes("report") || lowerQuery.includes("24 hour") || lowerQuery.includes("72 hour")) {
            return {
                content: `NIS2 Article 23 mandates incident reporting with strict timelines:

**24-hour Early Warning** - Notify competent authority within 24 hours of becoming aware of a significant incident. Initial assessment and immediate mitigation actions should be communicated.

**72-hour Incident Notification** - Within 72 hours, provide: 
- Incident status updates
- Preliminary assessment of severity
- Cross-border impact (if applicable)
- Ongoing mitigation measures

**1-month Final Report** - Within 1 month, submit:
- Detailed incident description
- Root cause analysis
- Impact assessment
- Remediation measures taken
- Proposed preventive measures

⚠️ Failure to report can result in fines up to €10M or 2% of global annual turnover.`,
                sources: ["NIS2 Article 23", "ENISA Incident Handling Guidelines"],
                suggestions: ["How do I classify a significant incident?", "Show my incident reporting status", "What is cross-border impact?"]
            };
        }

        // Compliance status
        if (lowerQuery.includes("status") || lowerQuery.includes("compliance") || lowerQuery.includes("score") || lowerQuery.includes("how am i")) {
            if (nis2Data && nis2Data.length > 0) {
                const complianceRate = Math.round(
                    nis2Data.reduce((acc: number, m: any) => {
                        const implemented = m.implementedCount || 0;
                        const total = m.mappedControlIds?.length || 0;
                        return acc + (total > 0 ? (implemented / total) * 100 : 0);
                    }, 0) / nis2Data.length
                );

                return {
                    content: `Based on your current data, your NIS2 compliance is approximately **${complianceRate}%** complete.

You have ${nis2Data.length} NIS2 measures mapped to your controls. To improve your compliance score:

1. **Review controls** - Ensure all mapped controls have evidence attached
2. **Address gaps** - Focus on measures marked as "not implemented"
3. **Complete assessments** - Run through the NIS2 compliance checklist
4. **Map frameworks** - Leverage existing ISO 27001/SOC 2 mappings

Would you like me to show you which specific areas need attention?`,
                    sources: ["Your compliance data"],
                    suggestions: ["Show me the gaps", "How do I add evidence?", "What is the NIS2 workbook?"]
                };
            }

            return {
                content: `I don't have enough compliance data for your organization yet. To get started with NIS2 compliance:

1. Go to the **NIS2 Workbook** and assign controls to your organization
2. Complete the **NIS2 Assessment** to identify gaps
3. Map your existing **ISO 27001** or **SOC 2** controls
4. Start implementing and documenting evidence

Would you like me to guide you through the NIS2 Workbook?`,
                sources: [],
                suggestions: ["Open NIS2 Workbook", "Start NIS2 Assessment", "How do I map controls?"]
            };
        }

        // Evidence
        if (lowerQuery.includes("evidence") || lowerQuery.includes("documentation") || lowerQuery.includes("proof")) {
            return {
                content: `For NIS2 compliance, you'll need evidence demonstrating implementation of each security measure. Common evidence types include:

**Policies & Procedures** - Written security policies, approved by management
**Risk Assessments** - Documented risk analysis and treatment plans
**Incident Logs** - Records of incident detection and response
**Training Records** - Completion certificates and attendance logs
**Audit Reports** - Internal/external audit findings
**Configuration Screenshots** - System and network configurations
**Access Logs** - User access reviews and privileged access records

**Tip**: Use the Evidence module in ComplianceOS to attach documents directly to controls. This creates an audit trail and makes certification audits much easier.`,
                sources: ["ENISA Evidence Guidelines", "ISO 27001 Documentation"],
                suggestions: ["How do I upload evidence?", "What evidence is needed for ISO 27001?", "Show me the evidence module"]
            };
        }

        // Supply chain
        if (lowerQuery.includes("supply chain") || lowerQuery.includes("vendor") || lowerQuery.includes("third party")) {
            return {
                content: `NIS2 Article 21(2)(e) requires you to manage cybersecurity risks arising from third-party suppliers. Key requirements include:

**Vendor Inventory** - Maintain a list of all critical suppliers
**Risk Assessments** - Evaluate each supplier's security posture
**Contractual Requirements** - Include security clauses in contracts
**Monitoring** - Regular supplier audits and reviews
**Incident Notification** - Require suppliers to notify you of breaches

**Your obligations**:
- Assess supplier criticality based on service impact
- Document security requirements for each tier
- Maintain evidence of supplier compliance
- Have exit strategies for critical suppliers

Would you like me to show your current vendor risk status?`,
                sources: ["NIS2 Article 21(2)(e)", "ENISA Supply Chain Guidelines"],
                suggestions: ["Show vendor list", "How do I assess vendor risk?", "What are critical suppliers?"]
            };
        }

        // Default response
        return {
            content: `I understand you're asking about "${query}". Let me help you find the right information.

Based on NIS2 requirements, I can assist with:
- Understanding Article 21 security measures
- Incident reporting timelines and procedures
- Evidence and documentation requirements
- Framework mappings (ISO 27001, NIST CSF, SOC 2)
- Gap analysis and remediation guidance

Could you rephrase your question or select one of the suggested topics above?`,
            sources: [],
            suggestions: ["What does Article 21 require?", "How do I report an incident?", "Show my compliance status"]
        };
    };

    const handleSuggestionClick = (suggestion: string) => {
        setInput(suggestion);
    };

    const copyMessage = (content: string) => {
        navigator.clipboard.writeText(content);
        toast.success("Copied to clipboard");
    };

    // Compact mode - floating button
    if (compact) {
        return (
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogTrigger asChild>
                    <Button
                        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 border-0"
                        size="icon"
                    >
                        <Sparkles className="h-6 w-6 text-white" />
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col p-0">
                    <DialogHeader className="p-4 border-b">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-gradient-to-r from-sky-500 to-indigo-600">
                                <Bot className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <DialogTitle className="text-lg">NIS2 Compliance Assistant</DialogTitle>
                                <DialogDescription className="text-sm">
                                    AI-powered guidance on NIS2 requirements
                                </DialogDescription>
                            </div>
                        </div>
                    </DialogHeader>

                    <ScrollArea className="flex-1 p-4">
                        <div className="space-y-4">
                            {messages.map((message) => (
                                <ChatMessage
                                    key={message.id}
                                    message={message}
                                    onCopy={copyMessage}
                                    onSuggestionClick={handleSuggestionClick}
                                />
                            ))}
                            {isLoading && (
                                <div className="flex items-center gap-2 text-slate-500 p-4">
                                    <RefreshCw className="h-4 w-4 animate-spin" />
                                    <span className="text-sm">Thinking...</span>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </ScrollArea>

                    <div className="p-4 border-t">
                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about NIS2 compliance..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Full mode - inline component
    return (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
            <Card className="border-slate-200/60 shadow-lg shadow-slate-100/50">
                <CollapsibleTrigger asChild>
                    <CardHeader className="cursor-pointer hover:bg-slate-50/50 transition-colors">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 shadow-lg shadow-sky-200">
                                    <Sparkles className="h-5 w-5 text-white" />
                                </div>
                                <div>
                                    <CardTitle className="text-lg font-bold text-slate-900">
                                        NIS2 Compliance Assistant
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        AI-powered guidance on NIS2 requirements
                                    </CardDescription>
                                </div>
                            </div>
                            {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-slate-400" />
                            ) : (
                                <ChevronDown className="h-5 w-5 text-slate-400" />
                            )}
                        </div>
                    </CardHeader>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <CardContent className="space-y-4">
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-4">
                                {messages.map((message) => (
                                    <ChatMessage
                                        key={message.id}
                                        message={message}
                                        onCopy={copyMessage}
                                        onSuggestionClick={handleSuggestionClick}
                                    />
                                ))}
                                {isLoading && (
                                    <div className="flex items-center gap-2 text-slate-500 p-4">
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                        <span className="text-sm">Thinking...</span>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        </ScrollArea>

                        <form
                            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                            className="flex gap-2"
                        >
                            <Input
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask about NIS2 compliance..."
                                disabled={isLoading}
                                className="flex-1"
                            />
                            <Button type="submit" disabled={isLoading || !input.trim()}>
                                <Send className="h-4 w-4 mr-2" />
                                Ask
                            </Button>
                        </form>
                    </CardContent>
                </CollapsibleContent>
            </Card>
        </Collapsible>
    );
}

// Chat message component
function ChatMessage({
    message,
    onCopy,
    onSuggestionClick
}: {
    message: Message;
    onCopy: (content: string) => void;
    onSuggestionClick: (suggestion: string) => void;
}) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${isUser ? 'bg-slate-200' : 'bg-gradient-to-r from-sky-500 to-indigo-600'
                }`}>
                {isUser ? (
                    <User className="h-4 w-4 text-slate-600" />
                ) : (
                    <Bot className="h-4 w-4 text-white" />
                )}
            </div>
            <div className={`flex-1 space-y-2 ${isUser ? 'text-right' : ''}`}>
                <div className={`inline-block max-w-[85%] p-3 rounded-xl ${isUser
                        ? 'bg-slate-100 text-slate-900'
                        : 'bg-white border border-slate-200 shadow-sm'
                    }`}>
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                </div>

                {message.sources && message.sources.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                        <BookOpen className="h-3 w-3 text-slate-400" />
                        {message.sources.map((source, idx) => (
                            <Badge key={idx} variant="outline" className="text-[10px]">
                                {source}
                            </Badge>
                        ))}
                    </div>
                )}

                {message.suggestions && message.suggestions.length > 0 && !isUser && (
                    <div className="flex flex-wrap gap-2 pt-2">
                        {message.suggestions.map((suggestion, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                size="sm"
                                className="text-xs h-7"
                                onClick={() => onSuggestionClick(suggestion)}
                            >
                                {suggestion}
                            </Button>
                        ))}
                    </div>
                )}

                <div className={`flex items-center gap-2 ${isUser ? 'justify-end' : ''}`}>
                    <button
                        onClick={() => onCopy(message.content)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                        title="Copy"
                    >
                        <Copy className="h-3 w-3" />
                    </button>
                    <span className="text-[10px] text-slate-400">
                        {message.timestamp.toLocaleTimeString()}
                    </span>
                </div>
            </div>
        </div>
    );
}

export default NIS2Assistant;
