import React, { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Wifi, WifiOff } from "lucide-react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  isOnline: boolean;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, isOnline: typeof navigator !== "undefined" ? navigator.onLine : true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[GlobalErrorBoundary] Uncaught error caught by boundary:", error, errorInfo);
  }

  public componentDidMount() {
    window.addEventListener("online", this.handleOnline);
    window.addEventListener("offline", this.handleOffline);
  }

  public componentWillUnmount() {
    window.removeEventListener("online", this.handleOnline);
    window.removeEventListener("offline", this.handleOffline);
  }

  private handleOnline = () => {
    this.setState({ isOnline: true });
  };

  private handleOffline = () => {
    this.setState({ isOnline: false });
  };

  private handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  public render() {
    if (!this.state.isOnline) {
      return (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold shadow-2xl backdrop-blur-md animate-bounce">
          <WifiOff className="w-4 h-4 text-amber-400" />
          <span>Network Offline — Waiting for Connection Recovery...</span>
        </div>
      );
    }

    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-slate-950 text-slate-100 font-sans">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl space-y-6 text-center">
            <div className="mx-auto w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-2xl font-extrabold text-white">Something went wrong</h2>
              <p className="text-sm text-slate-400">
                ComplianceOS encountered a temporary application state issue. The system automatically saved your progress.
              </p>
            </div>

            {this.state.error && (
              <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl text-xs font-mono text-slate-400 text-left overflow-x-auto max-h-32">
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-all shadow-lg shadow-indigo-600/20 w-full"
            >
              <RefreshCw className="w-4 h-4 animate-spin-hover" /> Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
