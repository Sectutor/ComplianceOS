
import { Button } from "@complianceos/ui/ui/button";
import { trpc } from "@/lib/trpc";
import { Loader2, Search } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@complianceos/ui/ui/dialog";
import { Input } from "@complianceos/ui/ui/input";
import { ScrollArea } from "@complianceos/ui/ui/scroll-area";
import { useState } from "react";
import { toast } from "sonner";

interface EvidenceLibraryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    evidenceId: number;
    onSuccess?: () => void;
}

export function EvidenceLibraryDialog({ open, onOpenChange, clientId, evidenceId, onSuccess }: EvidenceLibraryDialogProps) {
    const [searchQuery, setSearchQuery] = useState("");
    const [linkingFileId, setLinkingFileId] = useState<number | null>(null);

    // Library query
    const { data: libraryFiles } = trpc.evidenceFiles.listAll.useQuery(
        { clientId, search: searchQuery },
        { enabled: open }
    );

    const linkMutation = trpc.evidenceFiles.linkExisting.useMutation({
        onSuccess: () => {
            toast.success("File linked successfully");
            setLinkingFileId(null);
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (error) => {
            toast.error(error.message);
            setLinkingFileId(null);
        }
    });

    const handleLinkFile = (file: any) => {
        setLinkingFileId(file.id);
        linkMutation.mutate({
            targetEvidenceId: evidenceId,
            sourceFileId: file.id
        });
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getFileIcon = (mimeType: string) => {
        if (mimeType.startsWith('image/')) return '🖼️';
        if (mimeType === 'application/pdf') return '📄';
        if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) return '📊';
        if (mimeType.includes('word') || mimeType.includes('document')) return '📝';
        return '📎';
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Select from Evidence Library</DialogTitle>
                    <DialogDescription>
                        Choose an existing file to link to this request.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-2">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search files..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8"
                        />
                    </div>
                </div>

                <ScrollArea className="flex-1 min-h-[300px] border rounded-md p-2">
                    <div className="space-y-2">
                        {libraryFiles?.map((file: any) => (
                            <div
                                key={file.id}
                                className="flex items-center justify-between p-2 hover:bg-muted rounded-lg cursor-pointer border border-transparent hover:border-border transition-colors group"
                                onClick={() => handleLinkFile(file)}
                            >
                                <div className="flex items-center gap-3 min-w-0">
                                    <span className="text-xl">{getFileIcon(file.contentType || 'application/octet-stream')}</span>
                                    <div className="min-w-0 text-left">
                                        <p className="text-sm font-medium truncate">{file.filename}</p>
                                        <p className="text-xs text-muted-foreground truncate">
                                            {formatFileSize(file.size || 0)} • {file.evidenceTitle || 'Uncategorized'} • {new Date(file.createdAt).toLocaleDateString()}
                                        </p>
                                    </div>
                                </div>
                                {linkMutation.isLoading && linkingFileId === file.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                                ) : (
                                    <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100">
                                        Select
                                    </Button>
                                )}
                            </div>
                        ))}
                        {libraryFiles?.length === 0 && (
                            <div className="text-center py-8 text-muted-foreground text-sm">
                                No files found matching your search.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
