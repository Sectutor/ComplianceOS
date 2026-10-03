import { useEffect, useState } from "react";
import { Loader2, Shield, Users, FileText, AlertTriangle, CheckCircle, Building2, Database, Lock, LogIn, UserPlus } from "lucide-react";

type AuthMode = "signup" | "login";

export default function DemoPage() {
  const [mode, setMode] = useState<AuthMode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [clientCount, setClientCount] = useState<number | null>(null);
  const [vendorCount, setVendorCount] = useState<number | null>(null);

  useEffect(() => {
    // Returning visitor with an active session? Offer to jump straight in.
    const existingToken = localStorage.getItem("localAuthToken");
    if (existingToken) setToken(existingToken);
  }, []);

  useEffect(() => {
    if (token) fetchCounts();
  }, [token]);

  const persistSession = (authToken: string, user: unknown) => {
    localStorage.setItem("localAuthToken", authToken);
    localStorage.setItem("localAuthUser", JSON.stringify(user));
  };

  const fetchCounts = async () => {
    try {
      const clientsRes = await fetch("/api/trpc/clients.list?input=%7B%7D", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const clientsData = await clientsRes.json();
      if (clientsData?.result?.data?.json) {
        setClientCount(clientsData.result.data.json.length);
      }
    } catch {}

    try {
      const vendorsRes = await fetch("/api/trpc/vendors.list?input=%7B%22clientId%22%3A7%7D", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const vendorsData = await vendorsRes.json();
      if (vendorsData?.result?.data?.json) {
        setVendorCount(vendorsData.result.data.json.length);
      }
    } catch {}
  };

  const enterDashboard = () => {
    window.location.href = "/dashboard";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/local-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        persistSession(data.token, data.user);
        setToken(data.token);
        setLoading(false);
      } else {
        setError(data.error || "Registration failed");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Registration failed");
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/local-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        persistSession(data.token, data.user);
        setToken(data.token);
        setLoading(false);
      } else {
        setError(data.error || "Invalid credentials");
        setLoading(false);
      }
    } catch (err: any) {
      setError(err.message || "Login failed");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-4">
            <Shield className="w-4 h-4 text-blue-400" />
            <span className="text-sm text-blue-300">ComplianceOS Demo</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            LaTorre LTD Demo Workspace
          </h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Experience ComplianceOS with a pre-populated demo workspace featuring real compliance data across multiple frameworks.
          </p>
        </div>

        {!token ? (
          <div className="max-w-md mx-auto">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              {/* Mode toggle */}
              <div className="grid grid-cols-2 gap-2 mb-6 bg-slate-900/50 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => { setMode("signup"); setError(""); }}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === "signup" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  <UserPlus className="w-4 h-4" />
                  Sign Up
                </button>
                <button
                  type="button"
                  onClick={() => { setMode("login"); setError(""); }}
                  className={`flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${mode === "login" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-white"}`}
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>
              </div>

              <form onSubmit={mode === "signup" ? handleRegister : handleLogin} className="space-y-4">
                {mode === "signup" && (
                  <div>
                    <label className="block text-sm text-slate-400 mb-1.5">Name</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                      placeholder="Your name"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-400 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                    placeholder={mode === "signup" ? "Min 8 characters" : "Your password"}
                    required
                    minLength={mode === "signup" ? 8 : undefined}
                  />
                </div>
                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-2.5 text-red-300 text-sm">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg px-4 py-2.5 transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading
                    ? mode === "signup" ? "Creating Account..." : "Signing In..."
                    : mode === "signup" ? "Sign Up & Explore Demo" : "Sign In to Demo"}
                </button>
              </form>

              <p className="text-center text-slate-500 text-xs mt-4">
                {mode === "signup"
                  ? "New accounts get instant access to the shared LaTorre LTD demo workspace."
                  : "Already signed up before? Sign in to return to the demo workspace."}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-green-500/10 border border-green-500/20 rounded-2xl p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <CheckCircle className="w-8 h-8 text-green-400 shrink-0" />
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-green-300">You're in!</h3>
                <p className="text-green-400/80 text-sm">You have access to the LaTorre LTD workspace with full demo data.</p>
              </div>
              <button
                onClick={enterDashboard}
                className="bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg px-5 py-2.5 transition-colors"
              >
                Enter Dashboard →
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <Building2 className="w-8 h-8 text-blue-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">Clients</h3>
                <p className="text-3xl font-bold text-blue-300">{clientCount ?? "..."}</p>
                <p className="text-slate-400 text-sm mt-1">LaTorre LTD workspace</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <Database className="w-8 h-8 text-cyan-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">Vendors</h3>
                <p className="text-3xl font-bold text-cyan-300">{vendorCount ?? "..."}</p>
                <p className="text-slate-400 text-sm mt-1">With assessments</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <Shield className="w-8 h-8 text-emerald-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">Controls</h3>
                <p className="text-3xl font-bold text-emerald-300">64+</p>
                <p className="text-slate-400 text-sm mt-1">Across ISO 27001, SOC 2, GDPR, NIS2</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <FileText className="w-8 h-8 text-purple-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">Evidence</h3>
                <p className="text-3xl font-bold text-purple-300">30+</p>
                <p className="text-slate-400 text-sm mt-1">Linked to controls</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <AlertTriangle className="w-8 h-8 text-amber-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">Incidents</h3>
                <p className="text-3xl font-bold text-amber-300">6</p>
                <p className="text-slate-400 text-sm mt-1">With risk treatments</p>
              </div>
              <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-6">
                <Users className="w-8 h-8 text-rose-400 mb-3" />
                <h3 className="text-lg font-semibold mb-1">Frameworks</h3>
                <p className="text-3xl font-bold text-rose-300">4</p>
                <p className="text-slate-400 text-sm mt-1">ISO 27001, SOC 2, GDPR, NIS2</p>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 text-center">
              <h3 className="text-xl font-semibold mb-2">Ready to explore?</h3>
              <p className="text-slate-400 mb-6">Jump into the full dashboard — you're already signed in.</p>
              <button
                onClick={enterDashboard}
                className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg px-6 py-3 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
