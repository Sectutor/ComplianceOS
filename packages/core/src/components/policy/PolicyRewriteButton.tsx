import React from "react";
import { Button } from "@complianceos/ui/ui/button";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { marked } from "marked";
import { trpc } from "@/lib/trpc";

function decodeEntities(str: string) {
  const txt = document.createElement("textarea");
  txt.innerHTML = str;
  return txt.value;
}

function cleanGeneratedHtml(input: string) {
  let s = input || "";
  // Strip fenced code blocks
  s = s.replace(/```html([\s\S]*?)```/gi, "$1").replace(/```([\s\S]*?)```/gi, "$1");
  // Extract <pre><code>...</code></pre>
  s = s.replace(/<pre[\s\S]*?>[\s\S]*?<code[^>]*>([\s\S]*?)<\/code>[\s\S]*?<\/pre>/gi, "$1");
  // Decode entities if HTML was serialized as text
  if (s.includes("&lt;") || s.includes("&gt;")) s = decodeEntities(s);
  // Remove outer html/head/body wrappers
  const bodyMatch = s.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) s = bodyMatch[1];
  // Drop style/script tags
  s = s.replace(/<\/?(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "");
  // Convert <section> to <div>
  s = s.replace(/<section([^>]*)>/gi, "<div$1>").replace(/<\/section>/gi, "</div>");
  return s.trim();
}

export default function PolicyRewriteButton({
  content,
  name,
  clientId,
  policyId,
  onRewrite,
}: {
  content: string;
  name?: string;
  clientId?: number;
  policyId?: number;
  onRewrite: (html: string) => void;
}) {
  const rewrite = trpc.advisor.askQuestion.useMutation();

  const handleRewrite = async () => {
    try {
      toast.info("Asking AI to improve the policy...");
      const question =
        "Rewrite and improve this policy for clarity, completeness, and auditability. Preserve structure and produce HTML suitable for the editor. Avoid placeholders.";
      const res = await rewrite.mutateAsync({
        clientId: Number(clientId),
        question,
        context: {
          type: "policy",
          id: String(policyId ?? name ?? "policy"),
          data: {
            title: name || "Policy",
            content,
            mode: "rewrite",
          },
        },
      });
      const text = (res as any)?.answer || (res as any)?.text || "";
      const cleaned = cleanGeneratedHtml(text);
      const html = /<[a-z][\s\S]*>/i.test(cleaned) ? cleaned : (marked.parse(cleaned, { async: false }) as string);
      onRewrite(html);
      toast.success("Policy improved");
    } catch (err: any) {
      console.error("[PolicyRewriteButton] failed:", err);
      toast.error(err.message || "Failed to rewrite policy");
    }
  };

  return (
    <Button variant="outline" className="w-full justify-start" onClick={handleRewrite} disabled={rewrite.isPending}>
      <Wand2 className="mr-2 h-4 w-4" />
      {rewrite.isPending ? "Rewriting..." : "Rewrite with AI"}
    </Button>
  );
}
