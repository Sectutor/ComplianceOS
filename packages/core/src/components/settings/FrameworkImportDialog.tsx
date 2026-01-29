import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Label } from "@complianceos/ui/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, AlertTriangle, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@complianceos/ui/ui/alert";

interface FrameworkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    onSuccess?: () => void;
}

export function FrameworkImportDialog({ open, onOpenChange, clientId, onSuccess }: FrameworkImportDialogProps) {
    const [frameworkType, setFrameworkType] = useState<"pci_dss_v4" | "cis_v8" | "ccm_v4">("pci_dss_v4");
    const [file, setFile] = useState<File | null>(null);
    const [isConfirmed, setIsConfirmed] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const importMutation = trpc.frameworks.importCustom.useMutation({
        onSuccess: (data: any) => {
            toast.success(`Successfully imported ${data.count} controls!`);
            onOpenChange(false);
            onSuccess?.();
            setFile(null);
            setIsConfirmed(false);
        },
        onError: (err) => {
            toast.error(`Import failed: ${err.message}`);
        }
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleImport = async () => {
        if (!file) {
            toast.error("Please select a file");
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            const base64String = (reader.result as string).split(',')[1];
            importMutation.mutate({
                clientId,
                type: frameworkType,
                fileContent: base64String
            });
        };
        reader.readAsDataURL(file);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Import Control Framework</DialogTitle>
                    <DialogDescription>
                        Upload the official Excel file to import specific control frameworks.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label>Framework Type</Label>
                        <Select value={frameworkType} onValueChange={(val: any) => setFrameworkType(val)}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="pci_dss_v4">PCI DSS v4.0</SelectItem>
                                <SelectItem value="cis_v8">CIS Critical Security Controls v8.1</SelectItem>
                                <SelectItem value="ccm_v4">CSA Cloud Controls Matrix v4</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Official Source File (.xlsx)</Label>
                        <Alert className="bg-amber-50 border-amber-200 mb-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600" />
                            <AlertTitle className="text-amber-800">License Source Requirement</AlertTitle>
                            <AlertDescription className="text-amber-700 text-xs">
                                You must download the official file directly from the provider (CIS or CSA) using your own license/account. Do not upload modified files.
                            </AlertDescription>
                        </Alert>

                        <div
                            className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {file ? (
                                <div className="text-center">
                                    <FileSpreadsheet className="h-10 w-10 text-green-600 mx-auto mb-2" />
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
                                    <p className="font-medium">Click to upload spreadsheet</p>
                                    <p className="text-sm text-muted-foreground">Supported format: .xlsx</p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>

                    <div className="flex items-start gap-2">
                        <input
                            type="checkbox"
                            id="confirm-license"
                            checked={isConfirmed}
                            onChange={(e) => setIsConfirmed(e.target.checked)}
                            className="mt-1"
                        />
                        <Label htmlFor="confirm-license" className="text-sm font-normal cursor-pointer">
                            I certify that I have obtained this file legally from the official source and I have the right to use it for internal compliance purposes.
                        </Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button
                        onClick={handleImport}
                        disabled={!file || !isConfirmed || importMutation.isPending}
                    >
                        {importMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Importing...
                            </>
                        ) : (
                            "Import Framework"
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
