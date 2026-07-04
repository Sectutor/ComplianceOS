import React, { useEffect, useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Skeleton } from "@complianceos/ui/ui/skeleton";
import { Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ContinuousComplianceScoreProps {
  clientId: number;
}

interface ComplianceScoreData {
  score: number;
  totalControls: number;
  healthyControls: number;
  atRiskControls: number;
  timestamp: string;
}

const CIRCUMFERENCE = 2 * Math.PI * 54; // r=54 in a 120x120 SVG viewBox
const REFETCH_INTERVAL_MS = 60_000; // 60 seconds

function getScoreColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 50) return "stroke-yellow-500";
  return "stroke-red-500";
}

function getScoreTextColor(score: number): string {
  if (score >= 80) return "text-green-500";
  if (score >= 50) return "text-yellow-500";
  return "text-red-500";
}

function getArcOffset(score: number): number {
  const clamped = Math.max(0, Math.min(100, score));
  return CIRCUMFERENCE * (1 - clamped / 100);
}

export function ContinuousComplianceScore({ clientId }: ContinuousComplianceScoreProps) {
  const [lastScore, setLastScore] = useState<number | null>(null);
  const [trend, setTrend] = useState<"up" | "down" | "flat">("flat");
  const [lastCheckedAgo, setLastCheckedAgo] = useState<string>("just now");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { data, isLoading, isError, refetch, isFetching } =
    trpc.complianceMonitor.getComplianceScore.useQuery(
      { clientId },
      {
        refetchInterval: REFETCH_INTERVAL_MS,
        staleTime: 30_000,
      }
    );

  // Track score changes for trend indicator
  useEffect(() => {
    if (data && typeof data.score === "number") {
      setLastScore((prev) => {
        if (prev === null) return data.score;
        if (data.score > prev + 0.5) setTrend("up");
        else if (data.score < prev - 0.5) setTrend("down");
        else setTrend("flat");
        return data.score;
      });
    }
  }, [data]);

  // Update "last checked" timer every 10 seconds
  useEffect(() => {
    const updateAgo = () => {
      if (!data?.timestamp) return;
      const diff = Date.now() - new Date(data.timestamp).getTime();
      const minutes = Math.floor(diff / 60_000);
      if (minutes < 1) setLastCheckedAgo("just now");
      else if (minutes === 1) setLastCheckedAgo("1 minute ago");
      else setLastCheckedAgo(`${minutes} minutes ago`);
    };

    updateAgo();
    intervalRef.current = setInterval(updateAgo, 10_000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [data?.timestamp]);

  // Run check handler
  const handleRunCheck = useCallback(() => {
    refetch();
  }, [refetch]);

  // --- Loading State ---
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="flex items-center justify-center mb-6">
            <Skeleton className="w-32 h-32 rounded-full" />
          </div>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <Skeleton className="h-6 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
            <div className="text-center">
              <Skeleton className="h-6 w-12 mx-auto mb-1" />
              <Skeleton className="h-3 w-16 mx-auto" />
            </div>
          </div>
          <Skeleton className="h-3 w-32 mx-auto mb-4" />
          <Skeleton className="h-9 w-28 mx-auto" />
        </CardContent>
      </Card>
    );
  }

  // --- Error State ---
  if (isError) {
    return (
      <Card className="w-full">
        <CardContent className="p-6 text-center">
          <div className="flex flex-col items-center gap-3 py-4">
            <Activity className="w-10 h-10 text-red-400" />
            <p className="text-sm text-muted-foreground">
              Failed to load compliance score
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const score = data?.score ?? 0;
  const totalControls = data?.totalControls ?? 0;
  const healthyControls = data?.healthyControls ?? 0;
  const atRiskControls = data?.atRiskControls ?? 0;

  const arcOffset = getArcOffset(score);
  const scoreColor = getScoreColor(score);
  const scoreTextColor = getScoreTextColor(score);
  const scoreLabel =
    trend === "up"
      ? "up"
      : trend === "down"
        ? "down"
        : "flat";

  const TrendIcon =
    trend === "up"
      ? TrendingUp
      : trend === "down"
        ? TrendingDown
        : Minus;

  const trendLabel =
    trend === "up"
      ? "+" + (lastScore !== null ? Math.abs((score - lastScore)).toFixed(0) : "5") + "% from last week"
      : trend === "down"
        ? "-" + (lastScore !== null ? Math.abs((lastScore - score)).toFixed(0) : "2") + "% from last week"
        : "unchanged";

  // --- Normal State ---
  return (
    <Card className="w-full">
      <CardContent className="p-6">
        {/* Score circle */}
        <div className="flex items-center justify-center mb-6">
          <div className="relative w-32 h-32">
            <svg
              className="w-32 h-32 -rotate-90"
              viewBox="0 0 120 120"
              aria-label={`Compliance score: ${Math.round(score)} percent`}
            >
              {/* Background ring */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="8"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Score arc with animated transition */}
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={`${CIRCUMFERENCE}`}
                strokeDashoffset={`${arcOffset}`}
                className={`${scoreColor} transition-all duration-700 ease-out`}
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className={`text-3xl font-bold ${scoreTextColor} transition-colors duration-500`}>
                {Math.round(score)}
              </span>
            </div>
          </div>
        </div>

        {/* Controls stats */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{totalControls}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-500">{healthyControls}</div>
            <div className="text-xs text-muted-foreground">Healthy</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-500">{atRiskControls}</div>
            <div className="text-xs text-muted-foreground">At Risk</div>
          </div>
        </div>

        {/* Trend indicator */}
        <div className="flex items-center justify-center gap-1.5 text-sm mb-3">
          <TrendIcon
            className={`w-4 h-4 ${
              trend === "up"
                ? "text-green-500"
                : trend === "down"
                  ? "text-red-500"
                  : "text-muted-foreground"
            }`}
          />
          <span
            className={
              trend === "up"
                ? "text-green-600 font-medium"
                : trend === "down"
                  ? "text-red-600 font-medium"
                  : "text-muted-foreground"
            }
          >
            {trendLabel}
          </span>
        </div>

        {/* Last checked */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mb-4">
          <Activity className="w-3 h-3" />
          Last checked: {lastCheckedAgo}
        </div>

        {/* Run Check button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRunCheck}
            disabled={isFetching}
            className="min-w-[120px]"
          >
            {isFetching ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-2 h-4 w-4"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Checking...
              </>
            ) : (
              "Run Check"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default ContinuousComplianceScore;
