
import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Bot } from 'lucide-react';
import { Button } from "@complianceos/ui/ui/button";
import { useAdvisor } from '@/contexts/AdvisorContext';

export function CopilotPanel() {
    const { isOpen, closeChat, messages, sendMessage, isLoading } = useAdvisor();
    const [input, setInput] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        sendMessage(input);
        setInput('');
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed bottom-0 right-0 w-96 h-[600px] bg-white shadow-2xl rounded-tl-lg border-l border-t border-gray-200 z-50 flex flex-col animate-in slide-in-from-bottom duration-300">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-sm">
                        <Sparkles className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-gray-900">Compliance Advisor</h3>
                        <p className="text-xs text-blue-600 font-medium">AI Powered</p>
                    </div>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={closeChat}
                    className="h-8 w-8 p-0 hover:bg-slate-100 rounded-full"
                >
                    <X className="w-4 h-4 text-gray-500" />
                </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-500 mt-12 px-6">
                        <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto mb-4 shadow-sm flex items-center justify-center">
                            <Bot className="w-8 h-8 text-blue-500" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-1">How can I help?</h4>
                        <p className="text-sm">Ask me about controls, policies, or import strategies.</p>

                        <div className="mt-6 space-y-2">
                            <button onClick={() => sendMessage("How do I implement Access Control?")} className="block w-full text-xs bg-white border border-gray-200 p-2 rounded-md hover:border-blue-300 hover:text-blue-600 transition-colors text-left">
                                "How do I implement Access Control?"
                            </button>
                            <button onClick={() => sendMessage("What evidence is needed for AC-2?")} className="block w-full text-xs bg-white border border-gray-200 p-2 rounded-md hover:border-blue-300 hover:text-blue-600 transition-colors text-left">
                                "What evidence is needed for AC-2?"
                            </button>
                        </div>
                    </div>
                ) : (
                    messages.map(message => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div
                                className={`max-w-[85%] rounded-2xl p-3.5 shadow-sm text-sm ${message.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-sm'
                                    : 'bg-white text-gray-800 border border-gray-100 rounded-bl-sm'
                                    }`}
                            >
                                <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white rounded-2xl rounded-bl-sm p-3 border border-gray-100 shadow-sm">
                            <div className="flex gap-1">
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"></span>
                            </div>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-gray-200 bg-white">
                <div className="flex gap-2 relative">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Ask a question..."
                        className="flex-1 resize-none rounded-xl border border-gray-200 pl-4 pr-12 py-3 text-sm text-gray-900 placeholder:text-gray-400 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 focus:bg-white transition-all shadow-sm"
                        rows={1}
                        style={{ minHeight: '44px', maxHeight: '120px' }}
                        disabled={isLoading}
                    />
                    <Button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        size="icon"
                        className={`absolute right-1.5 top-1.5 h-8 w-8 rounded-lg transition-all ${input.trim() ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-200 text-gray-400 hover:bg-gray-200'}`}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
