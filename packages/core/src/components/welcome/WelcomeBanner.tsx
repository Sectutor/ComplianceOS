// WelcomeBanner — Shown on dashboard when the compliance journey is incomplete
import { useState, useEffect } from "react";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Progress } from "@complianceos/ui/ui/progress";
import { X, ArrowRight, Compass } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface WelcomeBannerProps {
  clientId: number;
  onDismiss?: () => void;
}

const DISMISS_SESSION_KEY = `compliance-journey-banner-dismissed`;

export function WelcomeBanner({ clientId, onDismiss }: WelcomeBannerProps) {
  const [, setLocation] = useLocation();
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(DISMISS_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  const { data: isComplete, isLoading: checking } =
    trpc.complianceJourney.isComplete.useQuery(
      { clientId },
      { enabled: !!clientId }
    );
  const { data: progress } = trpc.complianceJourney.getProgress.useQuery(
    { clientId },
    { enabled: !!clientId && !isComplete }
  );

  // Don't show if dismissed in this session, or if journey is complete, or still loading
  if (dismissed || checking || isComplete === undefined || isComplete) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(DISMISS_SESSION_KEY, "true");
    } catch {
      // sessionStorage may be unavailable
    }
    if (onDismiss) onDismiss();
  };

  const handleContinue = () => {
    setLocation(`/clients/${clientId}/journey`);
  };

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10 overflow-hidden">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="rounded-full bg-primary/10 p-2 sm:p-3 shrink-0">
              <Compass className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm sm:text-base">
                You're {progress?.percent || 0}% through setup
              </h3>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                Continue where you left off? Your compliance journey is waiting.
              </p>
              {progress && (
                <div className="mt-2 max-w-xs">
                  <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                    <span>
                      Step: {progress.step?.replace(/_/g, " ") || "Welcome"}
                    </span>
                    <span>{progress.percent}%</span>
                  </div>
                  <Progress value={progress.percent} className="h-1.5" />
                </div>
              )}
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" onClick={handleContinue}>
                  Continue Setup <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleDismiss}
                  className="text-muted-foreground"
                >
                  Dismiss
                </Button>
              </div>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="shrink-0 p-1 rounded-md hover:bg-muted transition-colors"
            aria-label="Dismiss banner"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
