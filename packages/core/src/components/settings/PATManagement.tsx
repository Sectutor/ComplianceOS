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
    <Card className="border-border bg-card text-card-foreground shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div>
          <CardTitle className="text-xl font-bold flex items-center gap-2 text-foreground">
            <Key className="h-5 w-5 text-primary" />
            Personal Access Tokens
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Generate tokens for API and MCP access. Treat tokens as secrets.
          </CardDescription>
        </div>
        <Button onClick={() => setShowGenerate(true)}>
          Generate New Token
        </Button>
      </CardHeader>
      <CardContent>
        {tokensQuery.isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : tokensQuery.data?.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
            <AlertCircle className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
            <p className="text-foreground font-medium">No personal access tokens found.</p>
            <p className="text-muted-foreground text-sm">Create one to get started with API integrations.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tokensQuery.data?.map((token) => (
              <div 
                key={token.id} 
                className="flex items-center justify-between p-4 border border-border rounded-xl bg-card hover:bg-muted/30 hover:border-primary/30 transition-all group"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-foreground">{token.name}</span>
                    <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-mono">
                      {token.prefix}...
                    </code>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>Created: {format(new Date(token.createdAt), "PPP")}</span>
                    {token.lastUsedAt && (
                      <span className="text-primary/80">
                        Last used: {format(new Date(token.lastUsedAt), "PPP")}
                      </span>
                    )}
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Generate Personal Access Token</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {generatedToken 
                ? "Copy this token now. It will not be shown again for security reasons." 
                : "Give your token a descriptive name to help you remember what it's for."}
            </DialogDescription>
          </DialogHeader>

          {generatedToken ? (
            <div className="space-y-4 py-4">
              <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-primary uppercase tracking-wider">Your New Token</span>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Sensitive Information
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="flex-1 bg-muted px-3 py-2 rounded border border-border font-mono text-sm break-all text-foreground">
                    {generatedToken}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="shrink-0"
                    onClick={copyToClipboard}
                  >
                    {isCopied ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <p className="text-xs text-amber-600 dark:text-amber-400 bg-amber-500/10 p-2.5 rounded border border-amber-500/20">
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
                />
              </div>
            </div>
          )}

          <DialogFooter>
            {generatedToken ? (
              <Button onClick={handleCloseGenerate} className="w-full">
                I've copied the token
              </Button>
            ) : (
              <>
                <Button variant="ghost" onClick={() => setShowGenerate(false)}>Cancel</Button>
                <Button 
                  onClick={handleGenerate} 
                  disabled={!newTokenName || generateMutation.isLoading}
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
