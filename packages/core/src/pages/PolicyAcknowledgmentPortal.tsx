import React, { useState } from "react";
import { trpc } from "../lib/trpc";
import { CheckCircle2, ShieldCheck, FileText, AlertCircle, Send, CheckSquare } from "lucide-react";

export default function PolicyAcknowledgmentPortal() {
  const [selectedPolicyId, setSelectedPolicyId] = useState<number | null>(null);
  const [employeeName, setEmployeeName] = useState("");
  const [employeeEmail, setEmployeeEmail] = useState("");
  const [hasRead, setHasRead] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const clientId = 1; // Default client context or route param

  // Fetch policies list
  const { data: policies, isLoading: loadingPolicies } = trpc.clientPolicies.list.useQuery({
    clientId,
  });

  // Acknowledge mutation
  const acknowledgeMutation = trpc.clientPolicies.acknowledgePolicy.useMutation({
    onSuccess: () => {
      setSubmitted(true);
      setErrorMsg("");
    },
    onError: (err) => {
      setErrorMsg(err.message || "Failed to record acknowledgment.");
    },
  });

  const selectedPolicy = policies?.find((p: any) => p.id === selectedPolicyId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPolicyId) {
      setErrorMsg("Please select a policy to acknowledge.");
      return;
    }
    if (!employeeName.trim() || !employeeEmail.trim()) {
      setErrorMsg("Please enter your full name and email address.");
      return;
    }
    if (!hasRead) {
      setErrorMsg("You must confirm that you have read and agreed to the policy.");
      return;
    }

    acknowledgeMutation.mutate({
      clientId,
      policyId: selectedPolicyId,
      employeeName,
      employeeEmail,
      version: selectedPolicy?.version || "1.0",
    });
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6 md:p-12 font-sans">
      <div className="space-y-6 w-full max-w-full">
        {/* Header */}
        <div className="flex items-center space-x-4 border-b border-slate-800 pb-6">
          <div className="p-3 bg-indigo-600/20 text-indigo-400 rounded-xl border border-indigo-500/30">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Workforce Policy Sign-off Portal</h1>
            <p className="text-slate-400 text-sm">Review, acknowledge, and certify organizational compliance policies</p>
          </div>
        </div>

        {submitted ? (
          <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-2xl p-8 text-center space-y-4">
            <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            <h2 className="text-2xl font-semibold text-emerald-300">Policy Acknowledged Successfully!</h2>
            <p className="text-slate-300 max-w-md mx-auto">
              Thank you, <span className="font-medium text-white">{employeeName}</span>. Your digital sign-off for{" "}
              <span className="font-medium text-white">{selectedPolicy?.title || "Policy"}</span> has been recorded for compliance audit tracking.
            </p>
            <div className="pt-4">
              <button
                onClick={() => {
                  setSubmitted(false);
                  setHasRead(false);
                  setSelectedPolicyId(null);
                }}
                className="px-6 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition font-medium text-sm"
              >
                Acknowledge Another Policy
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Policy Selection Panel */}
            <div className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400">Available Policies</h2>
              {loadingPolicies ? (
                <div className="p-4 bg-slate-800/50 rounded-xl text-slate-400 text-sm animate-pulse">Loading policies...</div>
              ) : policies && policies.length > 0 ? (
                <div className="space-y-2">
                  {policies.map((p: any) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setSelectedPolicyId(p.id);
                        setErrorMsg("");
                      }}
                      className={`w-full text-left p-4 rounded-xl border transition flex items-start space-x-3 ${
                        selectedPolicyId === p.id
                          ? "bg-indigo-950/50 border-indigo-500 text-white"
                          : "bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80"
                      }`}
                    >
                      <FileText className="w-5 h-5 text-indigo-400 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-sm leading-snug">{p.title}</p>
                        <span className="text-xs text-slate-400">v{p.version || "1.0"} • {p.status || "Approved"}</span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-slate-800/50 rounded-xl text-slate-400 text-sm">No policies published yet.</div>
              )}
            </div>

            {/* Policy Content & Form */}
            <div className="md:col-span-2 space-y-6">
              {selectedPolicy ? (
                <form onSubmit={handleSubmit} className="space-y-6 bg-slate-800/40 border border-slate-700/60 p-6 rounded-2xl">
                  <div>
                    <h3 className="text-lg font-semibold text-white">{selectedPolicy.title}</h3>
                    <p className="text-xs text-slate-400">Policy Version {selectedPolicy.version || "1.0"}</p>
                  </div>

                  {/* Policy Body */}
                  <div className="max-h-64 overflow-y-auto p-4 bg-slate-950/60 rounded-xl border border-slate-800 text-slate-300 text-sm leading-relaxed space-y-3">
                    {selectedPolicy.content || selectedPolicy.description ? (
                      <p>{selectedPolicy.content || selectedPolicy.description}</p>
                    ) : (
                      <p className="italic text-slate-500">Standard organizational compliance guidelines apply. Workforce members must adhere to access controls, password security, and data protection protocols.</p>
                    )}
                  </div>

                  {errorMsg && (
                    <div className="flex items-center space-x-2 text-rose-400 bg-rose-950/40 border border-rose-800/50 p-3 rounded-xl text-sm">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  {/* Signature Form */}
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                        <input
                          type="text"
                          value={employeeName}
                          onChange={(e) => setEmployeeName(e.target.value)}
                          placeholder="e.g. Jane Doe"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                        <input
                          type="email"
                          value={employeeEmail}
                          onChange={(e) => setEmployeeEmail(e.target.value)}
                          placeholder="e.g. jane.doe@company.com"
                          className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 text-sm focus:outline-none focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <label className="flex items-start space-x-3 cursor-pointer pt-2">
                      <input
                        type="checkbox"
                        checked={hasRead}
                        onChange={(e) => setHasRead(e.target.checked)}
                        className="mt-1 w-4 h-4 text-indigo-600 rounded bg-slate-900 border-slate-700 focus:ring-0"
                      />
                      <span className="text-xs text-slate-300 leading-normal">
                        I confirm that I have read, understood, and agree to comply with the terms of this policy. I understand that compliance is a condition of my employment/engagement.
                      </span>
                    </label>

                    <button
                      type="submit"
                      disabled={acknowledgeMutation.isLoading}
                      className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-xl transition flex items-center justify-center space-x-2 text-sm shadow-lg shadow-indigo-600/20 disabled:opacity-50"
                    >
                      <Send className="w-4 h-4" />
                      <span>{acknowledgeMutation.isLoading ? "Submitting..." : "Sign & Submit Acknowledgment"}</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="bg-slate-800/30 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 space-y-3">
                  <CheckSquare className="w-12 h-12 text-slate-600 mx-auto" />
                  <p className="font-medium text-slate-300">Select a policy from the list on the left to begin review.</p>
                  <p className="text-xs">Your digital sign-off will be recorded for organizational compliance records.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
