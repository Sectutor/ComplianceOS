import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@complianceos/ui/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { Copy, Key, Loader2, Trash2, AlertCircle, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export function PATManagement() {
  const [showGenerate, setShowGenerate] = useState(false);
  const [newTokenName, setNewTokenName] = useState("");
  const [generatedToken, setGeneratedToken] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const utils = trpc.useUtils();
  const tokensQuery = trpc.tokens.list.useQuery();
  const generateMutation = trpc.tokens.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedToken(data.token);
      utils.tokens.list.invalidate();
      toast.success("Token generated successfully");
    },
    onError: (err) => {
      toast.error(`Generation failed: ${err.message}`);
    }
  });

  const revokeMutation = trpc.tokens.revoke.useMutation({
    onSuccess: () => {
      utils.tokens.list.invalidate();
      toast.success("Token revoked");
    },
    onError: (err) => {
      toast.error(`Revocation failed: ${err.message}`);
    }
  });

  const handleGenerate = () => {
    if (!newTokenName.trim()) return;
    generateMutation.mutate({ name: newTokenName });
  };

  const copyToClipboard = () => {
    if (generatedToken) {
      navigator.clipboard.writeText(generatedToken);
      setIsCopied(true);
      toast.success("Token copied to clipboard");
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleCloseGenerate = () => {
    setShowGenerate(false);
    setNewTokenName("");
    setGeneratedToken(null);
  };

  return (
    <Card className="border-slate-800 bg-slate-900/50 backdrop-blur-xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Key className="h-5 w-5 text-blue-400" />
            Personal Access Tokens
          </CardTitle>
          <CardDescription className="text-slate-400">
            Generate tokens for API and MCP access. Treat tokens as secrets.
          </CardDescription>
        </div>
        <Button onClick={() => setShowGenerate(true)} variant="default" className="bg-blue-600 hover:bg-blue-700">
          Generate New Token
        </Button>
      </CardHeader>
      <CardContent>
        {tokensQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
          </div>
        ) : tokensQuery.data?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
            <AlertCircle className="h-10 w-10 text-slate-600 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No personal access tokens found.</p>
            <p className="text-slate-600 text-sm">Create one to get started with API integrations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokensQuery.data?.map((token) => (
              <div 
                key={token.id} 
                className="flex items-center justify-between p-4 border border-slate-800 rounded-xl bg-slate-950/50 hover:border-blue-500/30 transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100">{token.name}</span>
                    <code className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-300">
                      {token.prefix}...
                    </code>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span>Created: {format(new Date(token.createdAt), "PPP")}</span>
                    {token.lastUsedAt && (
                      <span className="text-blue-400/70">
                        Last used: {format(new Date(token.lastUsedAt), "PPP")}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 hover:bg-red-950/30"
                  onClick={() => {
                    if (confirm(`Are you sure you want to revoke "${token.name}"? Any applications using this token will stop working.`)) {
                      revokeMutation.mutate({ id: token.id });
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={showGenerate} onOpenChange={(o) => !o && handleCloseGenerate()}>
        <DialogContent className="sm:max-w-[500px] border-slate-800 bg-slate-900 text-slate-100">
          <DialogHeader>
            <DialogTitle>Generate Personal Access Token</DialogTitle>
            <DialogDescription className="text-slate-400">
              {generatedToken 
                ? "Copy this token now. It will not be shown again for security reasons." 
                : "Give your token a descriptive name to help you remember what it's for."}
            </DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Your New Token</span>
                  <div className="flex items-center gap-1 text-[10px] text-blue-300">
                    <AlertCircle className="h-3 w-3" />
                    Sensitive Information
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-950 px-3 py-2 rounded border border-slate-800 font-mono text-sm break-all text-blue-100">
                    {generatedToken}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="shrink-0 border-slate-700 hover:bg-slate-800"
                    onClick={copyToClipboard}
                  >
                    {isCopied ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-400/80 bg-amber-950/20 p-2 rounded border border-amber-900/30">
                Warning: ComplianceOS cannot recover this token if lost. You will need to regenerate it.
              </p>
            </div>
          ) : (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="tokenName">Token Name</Label>
                <Input 
                  id="tokenName" 
                  placeholder="e.g. MCP-Agent-Claude" 
                  value={newTokenName} 
                  onChange={(e) => setNewTokenName(e.target.value)}
                  className="bg-slate-950 border-slate-800"
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedToken ? (
              <Button onClick={handleCloseGenerate} className="w-full bg-blue-600 hover:bg-blue-700">
                I've copied the token
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={!newTokenName || generateMutation.isLoading}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {generateMutation.isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
