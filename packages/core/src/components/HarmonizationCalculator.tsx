import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@complianceos/ui/ui/select';
import { Badge } from '@complianceos/ui/ui/badge';
import { Progress } from '@complianceos/ui/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@complianceos/ui/ui/table';
import { Skeleton } from '@complianceos/ui/ui/skeleton';
import {
  GitCompare,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { trpc } from '@/lib/trpc';

interface HarmonizationCalculatorProps {
  clientId: number;
}

type FrameworkOption = {
  id: number;
  name: string;
  shortCode: string;
  version: string | null;
};

export const HarmonizationCalculator = ({
  clientId,
}: HarmonizationCalculatorProps) => {
  const [sourceFrameworkCode, setSourceFrameworkCode] = useState<string>('');
  const [targetFrameworkCode, setTargetFrameworkCode] = useState<string>('');
  const [showUncovered, setShowUncovered] = useState(false);
  const [showEquivalent, setShowEquivalent] = useState(false);

  // Fetch available frameworks
  const { data: frameworks, isLoading: frameworksLoading } =
    trpc.frameworkHarmonization.listFrameworks.useQuery({ clientId });

  // Harmonization calculation
  const {
    data: result,
    isLoading: calculating,
    error: calcError,
    refetch: calculate,
  } = trpc.frameworkHarmonization.calculate.useQuery(
    {
      clientId,
      sourceFrameworkCode,
      targetFrameworkCode,
    },
    {
      enabled: false, // Don't run on mount, only when button clicked
      retry: false,
    }
  );

  const handleCalculate = () => {
    if (!sourceFrameworkCode || !targetFrameworkCode) return;
    if (sourceFrameworkCode === targetFrameworkCode) return;
    calculate();
  };

  const canCalculate =
    sourceFrameworkCode &&
    targetFrameworkCode &&
    sourceFrameworkCode !== targetFrameworkCode;

  // Get progress bar color based on coverage percent
  const getProgressColor = (percent: number) => {
    if (percent >= 70) return 'bg-green-500';
    if (percent >= 40) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get badge variant based on coverage percent
  const getCoverageBadgeVariant = (percent: number) => {
    if (percent >= 70) return 'default' as const;
    if (percent >= 40) return 'secondary' as const;
    return 'destructive' as const;
  };

  // Filter out the selected source from target options
  const targetOptions = (frameworks ?? []).filter(
    (fw) => fw.shortCode !== sourceFrameworkCode
  );

  return (
    <Card className="border-blue-200">
      <CardHeader>
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-100 rounded-lg">
            <GitCompare className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Cross-Framework Harmonization Calculator</CardTitle>
            <p className="text-sm text-slate-500 mt-1">
              See how much of one framework is already covered by another you have implemented.
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Framework Selection */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Source Framework (Implemented)
            </label>
            {frameworksLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={sourceFrameworkCode}
                onValueChange={setSourceFrameworkCode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select source framework..." />
                </SelectTrigger>
                <SelectContent>
                  {(frameworks ?? []).map((fw) => (
                    <SelectItem key={fw.shortCode} value={fw.shortCode}>
                      {fw.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Target Framework (Needed)
            </label>
            {frameworksLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={targetFrameworkCode}
                onValueChange={setTargetFrameworkCode}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select target framework..." />
                </SelectTrigger>
                <SelectContent>
                  {targetOptions.map((fw) => (
                    <SelectItem key={fw.shortCode} value={fw.shortCode}>
                      {fw.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        {/* Calculate Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleCalculate}
            disabled={!canCalculate || calculating}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 min-w-[200px]"
          >
            {calculating ? (
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
                Calculating...
              </>
            ) : (
              <>
                <GitCompare className="mr-2 h-4 w-4" />
                Calculate Coverage
              </>
            )}
          </Button>
        </div>

        {/* Empty State */}
        {!result && !calculating && !calcError && (
          <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg">
            <GitCompare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">
              Select source and target frameworks, then click Calculate Coverage to see cross-framework harmonization.
            </p>
          </div>
        )}

        {/* Error State */}
        {calcError && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800">Calculation Error</p>
              <p className="text-sm text-red-600 mt-1">
                {calcError.message || 'Failed to compute harmonization. Please ensure both frameworks are set up for this client.'}
              </p>
            </div>
          </div>
        )}

        {/* Results */}
        {result && !calculating && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
            {/* Summary Card */}
            <Card className="border-blue-100 bg-blue-50/30">
              <CardContent className="pt-6">
                <div className="text-center">
                  <div className="text-5xl font-bold mb-2">
                    <span className={result.coveragePercent >= 70 ? 'text-green-600' : result.coveragePercent >= 40 ? 'text-yellow-600' : 'text-red-600'}>
                      {result.coveragePercent}%
                    </span>
                    <span className="text-2xl text-slate-500 ml-2">covered</span>
                  </div>
                  <p className="text-slate-600 text-sm mb-4">
                    of <strong>{result.targetFramework.name}</strong> controls are already satisfied by
                    your implemented <strong>{result.sourceFramework.name}</strong> controls.
                  </p>

                  {/* Progress Bar */}
                  <div className="max-w-md mx-auto mb-4">
                    <Progress
                      value={result.coveragePercent}
                      className="h-3 bg-slate-200"
                      indicatorClassName={getProgressColor(result.coveragePercent)}
                    />
                  </div>

                  {/* Stats Row */}
                  <div className="flex items-center justify-center gap-6 flex-wrap">
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-slate-900">
                        {result.totalTargetControls}
                      </p>
                      <p className="text-xs text-slate-500">Total Target Controls</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-green-600">
                        {result.coveredBySource}
                      </p>
                      <p className="text-xs text-slate-500">Covered by Source</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-semibold text-amber-600">
                        {result.neededAdditional}
                      </p>
                      <p className="text-xs text-slate-500">Additional Needed</p>
                    </div>
                  </div>
                </div>

                {/* Action Message */}
                <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-center">
                  <p className="text-sm font-medium text-slate-800">
                    {result.neededAdditional === 0 ? (
                      <span className="text-green-700 flex items-center justify-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        Fully covered! No additional controls needed.
                      </span>
                    ) : (
                      <>
                        You need{' '}
                        <span className="text-amber-700 font-bold">
                          {result.neededAdditional}
                        </span>{' '}
                        additional controls for{' '}
                        <strong>{result.targetFramework.name}</strong>
                      </>
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Equivalent Controls Section */}
            {result.equivalentControls.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowEquivalent(!showEquivalent)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-sm text-slate-900">
                      Equivalent Controls ({result.equivalentControls.length})
                    </span>
                    <Badge variant="outline" className="text-xs">
                      {result.sourceFramework.shortCode} &rarr; {result.targetFramework.shortCode}
                    </Badge>
                  </div>
                  {showEquivalent ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {showEquivalent && (
                  <div className="border-t border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Source Code</TableHead>
                          <TableHead className="text-xs">Source Name</TableHead>
                          <TableHead className="text-xs">Target Code</TableHead>
                          <TableHead className="text-xs">Target Name</TableHead>
                          <TableHead className="text-xs">Mapping Type</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.equivalentControls.map((eq, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{eq.sourceCode}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate" title={eq.sourceName}>
                              {eq.sourceName}
                            </TableCell>
                            <TableCell className="font-mono text-xs">{eq.targetCode}</TableCell>
                            <TableCell className="text-xs max-w-[200px] truncate" title={eq.targetName}>
                              {eq.targetName}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant="outline"
                                className={`text-xs ${
                                  eq.mappingType === 'equivalent'
                                    ? 'border-green-200 text-green-700 bg-green-50'
                                    : eq.mappingType === 'partial'
                                    ? 'border-yellow-200 text-yellow-700 bg-yellow-50'
                                    : 'border-slate-200 text-slate-700 bg-slate-50'
                                }`}
                              >
                                {eq.mappingType}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}

            {/* Uncovered Controls Section */}
            {result.uncoveredControls.length > 0 && (
              <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                <button
                  onClick={() => setShowUncovered(!showUncovered)}
                  className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-sm text-slate-900">
                      Uncovered Controls ({result.uncoveredControls.length})
                    </span>
                    <Badge variant="outline" className="text-xs">
                      Need Implementation
                    </Badge>
                  </div>
                  {showUncovered ? (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  )}
                </button>
                {showUncovered && (
                  <div className="border-t border-slate-200">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Code</TableHead>
                          <TableHead className="text-xs">Title</TableHead>
                          <TableHead className="text-xs">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {result.uncoveredControls.map((uc, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-mono text-xs">{uc.code}</TableCell>
                            <TableCell className="text-xs font-medium max-w-[200px] truncate" title={uc.title}>
                              {uc.title}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 max-w-[300px] truncate" title={uc.description ?? ''}>
                              {uc.description || 'No description'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default HarmonizationCalculator;
