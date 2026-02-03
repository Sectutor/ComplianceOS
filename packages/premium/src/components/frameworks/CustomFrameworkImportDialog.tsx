import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { Button } from "@complianceos/ui/ui/button";
import { Label } from "@complianceos/ui/ui/label";
import { Input } from "@complianceos/ui/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Alert, AlertDescription } from "@complianceos/ui/ui/alert";
import { Loader2, Upload, FileSpreadsheet, ChevronRight, ChevronLeft, Check, AlertTriangle, Settings, ArrowRight } from "lucide-react";
import * as XLSX from "xlsx";

// Available database fields for mapping
const DB_FIELDS = [
    { key: "__SKIP__", label: "-- Skip (don't import) --", required: false },
    { key: "controlCode", label: "Control Code *", required: true },
    { key: "title", label: "Title *", required: true },
    { key: "description", label: "Description", required: false },
    { key: "grouping", label: "Grouping/Domain", required: false },
    { key: "owner", label: "Owner", required: false },
    { key: "status", label: "Status", required: false },
    { key: "implementationNotes", label: "Implementation Notes", required: false },
    { key: "evidenceLocation", label: "Evidence Location", required: false },
    { key: "justification", label: "Justification", required: false },
];

interface CustomFrameworkImportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    clientId: number;
    onImport: (data: {
        frameworkName: string;
        frameworkVersion: string;
        columnMappings: Record<string, string>; // Excel column -> DB field
        fileContent: string;
        sheetName: string;
        headerRow: number;
    }) => Promise<{ success: boolean; count: number }>;
}

type Step = "upload" | "configure" | "mapping" | "preview";

export function CustomFrameworkImportDialog({
    open,
    onOpenChange,
    clientId,
    onImport
}: CustomFrameworkImportDialogProps) {
    const [step, setStep] = useState<Step>("upload");
    const [file, setFile] = useState<File | null>(null);
    const [fileContent, setFileContent] = useState<string>("");

    // Workbook state
    const [workbook, setWorkbook] = useState<XLSX.WorkBook | null>(null);
    const [sheetNames, setSheetNames] = useState<string[]>([]);
    const [selectedSheet, setSelectedSheet] = useState<string>("");
    const [headerRow, setHeaderRow] = useState<number>(1);

    // Parsed data
    const [columns, setColumns] = useState<string[]>([]);
    const [previewData, setPreviewData] = useState<any[]>([]);
    const [allData, setAllData] = useState<any[]>([]);

    // Framework info
    const [frameworkName, setFrameworkName] = useState("");
    const [frameworkVersion, setFrameworkVersion] = useState("");

    // Column mappings: Excel column name -> DB field key
    const [columnMappings, setColumnMappings] = useState<Record<string, string>>({});

    const [isImporting, setIsImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Reset state when dialog closes
    useEffect(() => {
        if (!open) {
            setStep("upload");
            setFile(null);
            setFileContent("");
            setWorkbook(null);
            setSheetNames([]);
            setSelectedSheet("");
            setHeaderRow(1);
            setColumns([]);
            setPreviewData([]);
            setAllData([]);
            setFrameworkName("");
            setFrameworkVersion("");
            setColumnMappings({});
            setError(null);
        }
    }, [open]);

    // Parse sheet when sheet or header row changes
    useEffect(() => {
        if (workbook && selectedSheet && headerRow > 0) {
            parseSheet();
        }
    }, [workbook, selectedSheet, headerRow]);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setError(null);

            try {
                const buffer = await selectedFile.arrayBuffer();
                const wb = XLSX.read(buffer, { type: "array" });

                console.log("[CustomFrameworkImport] Sheet names:", wb.SheetNames);

                setWorkbook(wb);
                setSheetNames(wb.SheetNames);
                setSelectedSheet(wb.SheetNames[0]);
                setHeaderRow(1);

                // Store base64 for later
                const reader = new FileReader();
                reader.onload = () => {
                    const base64 = (reader.result as string).split(",")[1];
                    setFileContent(base64);
                };
                reader.readAsDataURL(selectedFile);

            } catch (err: any) {
                setError("Failed to parse file: " + err.message);
            }
        }
    };

    const parseSheet = () => {
        if (!workbook || !selectedSheet) return;

        try {
            const sheet = workbook.Sheets[selectedSheet];
            const sheetRef = sheet['!ref'];

            if (!sheetRef) {
                setError("Sheet appears to be empty");
                return;
            }

            const range = XLSX.utils.decode_range(sheetRef);
            const headerRowIndex = headerRow - 1; // Convert to 0-indexed

            // Get headers from the specified row
            const headers: string[] = [];
            for (let col = range.s.c; col <= range.e.c; col++) {
                const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: col });
                const cell = sheet[cellAddress];
                if (cell && cell.v !== undefined && cell.v !== null && cell.v !== "") {
                    headers.push(String(cell.v));
                } else {
                    headers.push(`Column ${col + 1}`);
                }
            }

            console.log("[CustomFrameworkImport] Headers from row", headerRow, ":", headers);

            // Parse data starting from row after headers
            const jsonData = XLSX.utils.sheet_to_json(sheet, {
                header: headers,
                range: headerRowIndex // Start from header row
            }) as any[];

            // Skip the first row (it's the headers themselves)
            const dataRows = jsonData.slice(1);

            console.log("[CustomFrameworkImport] Data rows:", dataRows.length);

            if (dataRows.length === 0) {
                setError("No data found after header row");
                return;
            }

            setColumns(headers);
            setPreviewData(dataRows.slice(0, 5));
            setAllData(dataRows);
            setError(null);

            // Auto-detect column mappings
            autoDetectMappings(headers);

        } catch (err: any) {
            setError("Failed to parse sheet: " + err.message);
        }
    };

    const autoDetectMappings = (cols: string[]) => {
        const newMappings: Record<string, string> = {};
        const lowerCols = cols.map(c => c.toLowerCase());

        cols.forEach((col, i) => {
            const lower = lowerCols[i];

            if (["id", "code", "control id", "control_id", "ref", "reference", "safeguard", "control"].some(k => lower.includes(k))) {
                newMappings[col] = "controlCode";
            } else if (["title", "name", "control name", "control_name"].some(k => lower.includes(k))) {
                newMappings[col] = "title";
            } else if (["description", "desc", "specification", "detail"].some(k => lower.includes(k))) {
                newMappings[col] = "description";
            } else if (["domain", "category", "group", "family", "section"].some(k => lower.includes(k))) {
                newMappings[col] = "grouping";
            } else if (["owner", "responsible", "assignee"].some(k => lower.includes(k))) {
                newMappings[col] = "owner";
            } else if (["status", "state"].some(k => lower.includes(k))) {
                newMappings[col] = "status";
            } else if (["notes", "implementation", "how"].some(k => lower.includes(k))) {
                newMappings[col] = "implementationNotes";
            } else if (["evidence", "proof", "location"].some(k => lower.includes(k))) {
                newMappings[col] = "evidenceLocation";
            } else {
                newMappings[col] = "__SKIP__";
            }
        });

        setColumnMappings(newMappings);
    };

    const updateMapping = (excelCol: string, dbField: string) => {
        setColumnMappings(prev => ({
            ...prev,
            [excelCol]: dbField
        }));
    };

    const validateMappings = () => {
        const mappedFields = Object.values(columnMappings);
        const hasControlCode = mappedFields.includes("controlCode");
        const hasTitle = mappedFields.includes("title");
        return hasControlCode && hasTitle && frameworkName.trim() !== "";
    };

    const handleImport = async () => {
        if (!validateMappings()) {
            setError("Please map at least Control Code and Title, and provide a Framework Name");
            return;
        }

        setIsImporting(true);
        setError(null);

        try {
            const result = await onImport({
                frameworkName,
                frameworkVersion,
                columnMappings,
                fileContent,
                sheetName: selectedSheet,
                headerRow
            });

            if (result.success) {
                onOpenChange(false);
            }
        } catch (err: any) {
            setError(err.message || "Import failed");
        } finally {
            setIsImporting(false);
        }
    };

    const canProceedToConfigure = file && sheetNames.length > 0;
    const canProceedToMapping = columns.length > 0 && allData.length > 0;
    const canProceedToPreview = validateMappings();

    const steps: Step[] = ["upload", "configure", "mapping", "preview"];
    const stepLabels = ["Upload", "Configure", "Map", "Preview"];

    // Get mapped field label for a column
    const getMappedLabel = (excelCol: string) => {
        const dbKey = columnMappings[excelCol];
        if (!dbKey || dbKey === "__SKIP__") return null;
        return DB_FIELDS.find(f => f.key === dbKey)?.label;
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[900px] w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Import Custom Framework</DialogTitle>
                    <DialogDescription>
                        Upload an Excel file and map columns to import your custom framework.
                    </DialogDescription>
                </DialogHeader>

                {/* Step Indicator */}
                <div className="flex items-center justify-center gap-2 py-4">
                    {steps.map((s, i) => (
                        <div key={s} className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step === s ? "bg-primary text-primary-foreground" :
                                steps.indexOf(step) > i ? "bg-green-500 text-white" : "bg-muted text-muted-foreground"
                                }`}>
                                {steps.indexOf(step) > i ? <Check className="h-4 w-4" /> : i + 1}
                            </div>
                            {i < steps.length - 1 && <div className="w-8 h-0.5 bg-muted mx-1" />}
                        </div>
                    ))}
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                {/* Step 1: Upload */}
                {step === "upload" && (
                    <div className="space-y-4 py-4">
                        <div
                            className="border-2 border-dashed rounded-lg p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {file ? (
                                <div className="text-center">
                                    <FileSpreadsheet className="h-12 w-12 text-green-600 mx-auto mb-3" />
                                    <p className="font-medium">{file.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(file.size / 1024).toFixed(1)} KB • {sheetNames.length} sheet(s) detected
                                    </p>
                                </div>
                            ) : (
                                <div className="text-center">
                                    <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                                    <p className="font-medium">Click to upload Excel file</p>
                                    <p className="text-sm text-muted-foreground">Supported format: .xlsx, .xls</p>
                                </div>
                            )}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".xlsx,.xls"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    </div>
                )}

                {/* Step 2: Configure (Sheet & Header Row) */}
                {step === "configure" && (
                    <div className="space-y-4 py-4">
                        <div className="bg-muted/50 rounded-lg p-4 flex items-center gap-3">
                            <Settings className="h-5 w-5 text-muted-foreground" />
                            <div>
                                <p className="font-medium">Configure Import Settings</p>
                                <p className="text-sm text-muted-foreground">Select which sheet to import and where the column headers are located.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Select Sheet *</Label>
                                <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                                    <SelectTrigger><SelectValue placeholder="Select sheet" /></SelectTrigger>
                                    <SelectContent>
                                        {sheetNames.map((name, i) => (
                                            <SelectItem key={name} value={name}>
                                                {name} (Tab {i + 1})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Header Row Number *</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    value={headerRow}
                                    onChange={(e) => setHeaderRow(parseInt(e.target.value) || 1)}
                                    placeholder="e.g., 1"
                                />
                                <p className="text-xs text-muted-foreground">Row containing column titles (1 = first row)</p>
                            </div>
                        </div>

                        {columns.length > 0 && (
                            <div className="border rounded-lg p-3 mt-4">
                                <p className="text-sm font-medium mb-2">Detected Columns ({columns.length}):</p>
                                <div className="flex flex-wrap gap-1">
                                    {columns.map(col => (
                                        <span key={col} className="text-xs bg-muted px-2 py-1 rounded">{col}</span>
                                    ))}
                                </div>
                                <p className="text-xs text-muted-foreground mt-2">
                                    {allData.length} data row(s) found after header row
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {/* Step 3: Mapping - Show ALL Excel columns with mapping dropdown */}
                {step === "mapping" && (
                    <div className="space-y-4 py-4">
                        <div className="grid grid-cols-2 gap-4 mb-4">
                            <div className="space-y-2">
                                <Label>Framework Name *</Label>
                                <Input
                                    value={frameworkName}
                                    onChange={(e) => setFrameworkName(e.target.value)}
                                    placeholder="e.g., NIST CSF 2.0"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Version</Label>
                                <Input
                                    value={frameworkVersion}
                                    onChange={(e) => setFrameworkVersion(e.target.value)}
                                    placeholder="e.g., 2.0"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-4">
                            <h4 className="font-medium mb-2">Map Excel Columns to Database Fields</h4>
                            <p className="text-sm text-muted-foreground mb-4">
                                For each Excel column, select which database field it should map to.
                                <span className="text-destructive"> * Control Code and Title are required.</span>
                            </p>

                            <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                                {columns.map((col) => (
                                    <div key={col} className="grid grid-cols-[1fr_24px_220px] items-center gap-2 p-3 hover:bg-muted/30">
                                        <div className="flex-1 min-w-0">
                                            <p className="font-mono text-sm truncate">{col}</p>
                                            {previewData[0] && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    e.g., "{previewData[0][col]}"
                                                </p>
                                            )}
                                        </div>
                                        <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <div className="min-w-[220px]">
                                            <Select
                                                value={columnMappings[col] || "__SKIP__"}
                                                onValueChange={(val) => updateMapping(col, val)}
                                            >
                                                <SelectTrigger className="text-sm">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {DB_FIELDS.map(field => (
                                                        <SelectItem key={field.key} value={field.key}>
                                                            {field.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Validation summary */}
                            <div className="mt-3 text-sm">
                                {Object.values(columnMappings).includes("controlCode") ? (
                                    <span className="text-green-600">✓ Control Code mapped</span>
                                ) : (
                                    <span className="text-destructive">✗ Control Code not mapped</span>
                                )}
                                <span className="mx-2">|</span>
                                {Object.values(columnMappings).includes("title") ? (
                                    <span className="text-green-600">✓ Title mapped</span>
                                ) : (
                                    <span className="text-destructive">✗ Title not mapped</span>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 4: Preview */}
                {step === "preview" && (
                    <div className="space-y-4 py-4">
                        <div className="text-sm text-muted-foreground">
                            Importing <strong>{allData.length}</strong> controls into <strong>{frameworkName}</strong>
                        </div>

                        {/* Column mapping summary */}
                        <div className="bg-muted/50 rounded-lg p-3 text-sm">
                            <div className="font-medium mb-2">Mapping Summary:</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                                {columns.filter(c => columnMappings[c] && columnMappings[c] !== "__SKIP__").map(col => (
                                    <div key={col} className="flex items-center gap-1">
                                        <span className="font-mono text-muted-foreground">{col}</span>
                                        <ArrowRight className="h-3 w-3" />
                                        <span className="font-medium">{getMappedLabel(col)}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Full data preview with mapped columns only */}
                        <div className="border rounded-lg overflow-x-auto max-h-[200px] overflow-y-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-muted sticky top-0">
                                    <tr>
                                        {columns.filter(c => columnMappings[c] && columnMappings[c] !== "__SKIP__").map(col => (
                                            <th key={col} className="px-3 py-2 text-left font-medium whitespace-nowrap border-r last:border-r-0">
                                                {getMappedLabel(col)}
                                                <span className="block text-xs font-normal text-muted-foreground">{col}</span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewData.map((row, i) => (
                                        <tr key={i} className="border-t hover:bg-muted/30">
                                            {columns.filter(c => columnMappings[c] && columnMappings[c] !== "__SKIP__").map(col => (
                                                <td key={col} className="px-3 py-2 whitespace-nowrap border-r last:border-r-0 max-w-[200px] truncate">
                                                    {row[col] !== undefined ? String(row[col]) : ""}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Showing first {previewData.length} rows.
                            {allData.length - previewData.length > 0 && ` ${allData.length - previewData.length} more rows will be imported.`}
                        </p>
                    </div>
                )}

                <DialogFooter className="gap-2">
                    {step !== "upload" && (
                        <Button variant="outline" onClick={() => {
                            const currentIndex = steps.indexOf(step);
                            if (currentIndex > 0) setStep(steps[currentIndex - 1]);
                        }}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Back
                        </Button>
                    )}
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>

                    {step === "upload" && (
                        <Button onClick={() => setStep("configure")} disabled={!canProceedToConfigure}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                    {step === "configure" && (
                        <Button onClick={() => setStep("mapping")} disabled={!canProceedToMapping}>
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                    {step === "mapping" && (
                        <Button onClick={() => setStep("preview")} disabled={!canProceedToPreview}>
                            Preview <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    )}
                    {step === "preview" && (
                        <Button onClick={handleImport} disabled={isImporting}>
                            {isImporting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Import {allData.length} Controls
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
