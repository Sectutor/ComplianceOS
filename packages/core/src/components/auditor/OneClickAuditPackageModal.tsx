import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@complianceos/ui";
import { Button } from "@complianceos/ui";
import { FileArchive, FileText, Download, CheckCircle2, Loader2, ShieldCheck } from "lucide-react";
import { trpc } from "../../utils/trpc";
import { toast } from "sonner";

interface OneClickAuditPackageModalProps {
  clientId: number;
  isOpen: boolean;
  onClose: () => void;
}

export const OneClickAuditPackageModal: React.FC<OneClickAuditPackageModalProps> = ({
  clientId,
  isOpen,
  onClose,
}) => {
  const [framework, setFramework] = useState<string>("SOC2");
  const [auditorNotes, setAuditorNotes] = useState<string>("");
  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const generateZipMutation = trpc.auditPackage.generatePackage.useMutation();
  const generatePdfMutation = trpc.auditPackage.generatePdfReport.useMutation();

  const handleDownloadZip = async () => {
    setIsGeneratingZip(true);
    try {
      const res = await generateZipMutation.mutateAsync({
        clientId,
        framework,
        auditorNotes,
      });

      // Trigger browser download
      const binaryString = atob(res.base64Zip);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/zip" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Audit Package ZIP generated & downloaded successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate Audit Package ZIP");
    } finally {
      setIsGeneratingZip(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    try {
      const res = await generatePdfMutation.mutateAsync({
        clientId,
        framework,
        auditorNotes,
      });

      // Trigger browser download
      const binaryString = atob(res.base64Pdf);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = res.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("PDF Executive Audit Report downloaded successfully!");
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to generate PDF Report");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg bg-slate-900 border-slate-800 text-slate-100">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-6 h-6 text-indigo-400" />
            <DialogTitle className="text-xl font-bold text-white">
              One-Click Automated Audit Package
            </DialogTitle>
          </div>
          <DialogDescription className="text-slate-400 text-sm">
            Generate publication-ready PDF reports, CSV Statement of Applicability manifests, and complete ZIP evidence archives for formal compliance audits.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          {/* Framework Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Target Compliance Framework
            </label>
            <select
              value={framework}
              onChange={(e) => setFramework(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="SOC2">SOC 2 Type II</option>
              <option value="PCI_DSS">PCI DSS v4.0</option>
              <option value="HIPAA">HIPAA Security Rule</option>
              <option value="ISO27001">ISO/IEC 27001:2022</option>
              <option value="NIS2">EU NIS2 Directive</option>
            </select>
          </div>

          {/* Auditor Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
              Auditor Scope & Notes (Optional)
            </label>
            <textarea
              value={auditorNotes}
              onChange={(e) => setAuditorNotes(e.target.value)}
              placeholder="e.g. Audit evaluation period: Q1-Q3 2026. Prepared for external SOC 2 auditor assessment..."
              rows={3}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Package Features List */}
          <div className="bg-slate-800/60 rounded-lg p-3 border border-slate-700/50 space-y-2 text-xs text-slate-300">
            <div className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Package Contents Included:
            </div>
            <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
              <li>PDF Executive Summary Report with Health & Pass Rate Matrix</li>
              <li>Statement of Applicability & Control Implementation Manifest (CSV)</li>
              <li>Machine-Readable Machine Audit Payload (JSON)</li>
              <li>README Auditor Guide & Signature Instructions</li>
            </ul>
          </div>
        </div>

        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleDownloadPdf}
            disabled={isGeneratingPdf || isGeneratingZip}
            className="w-full sm:w-auto border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center gap-2"
          >
            {isGeneratingPdf ? (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
            ) : (
              <FileText className="w-4 h-4 text-sky-400" />
            )}
            Download PDF Report
          </Button>

          <Button
            onClick={handleDownloadZip}
            disabled={isGeneratingPdf || isGeneratingZip}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-500 text-white font-medium flex items-center justify-center gap-2"
          >
            {isGeneratingZip ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <FileArchive className="w-4 h-4" />
            )}
            Download Complete ZIP Package
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
