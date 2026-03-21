import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { useClientContext } from '@/contexts/ClientContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { RadioGroup, RadioGroupItem } from '@complianceos/ui/ui/radio-group';
import { Label } from '@complianceos/ui/ui/label';
import { Progress } from '@complianceos/ui/ui/progress';
import { Trophy, Target, Shield, AlertTriangle, CheckCircle, XCircle, ArrowRight, RefreshCw } from 'lucide-react';

interface RiskScenario {
    id: string;
    title: string;
    description: string;
    category: 'financial' | 'operational' | 'compliance' | 'reputation' | 'security';
    difficulty: 'easy' | 'medium' | 'hard';
    options: RiskOption[];
}

interface RiskOption {
    id: string;
    text: string;
    impact: number;
    probability: number;
}

export default function RiskGame() {
    const { selectedClientId } = useClientContext();
    const clientId = selectedClientId || 3; // Default to client 3 for demo

    const [currentScenarioIndex, setCurrentScenarioIndex] = useState(0);
    const [selectedOption, setSelectedOption] = useState<string | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [totalScore, setTotalScore] = useState(0);

    // Fetch scenarios
    const { data: scenarios, isLoading: scenariosLoading } = trpc.riskGame.getScenarios.useQuery();

    // Fetch progress
    const { data: progress } = trpc.riskGame.getProgress.useQuery({ clientId });

    // Submit answer mutation
    const submitMutation = trpc.riskGame.submitAnswer.useMutation({
        onSuccess: (data) => {
            setResult(data);
            setShowResult(true);
            setTotalScore(prev => prev + data.score);
        }
    });

    // Save progress mutation
    const saveProgressMutation = trpc.riskGame.saveProgress.useMutation();

    const currentScenario = scenarios?.[currentScenarioIndex];

    const handleSubmit = () => {
        if (!selectedOption || !currentScenario) return;

        submitMutation.mutate({
            scenarioId: currentScenario.id,
            selectedOptionId: selectedOption,
            clientId,
        });
    };

    const handleNext = () => {
        // Save progress
        if (currentScenario) {
            saveProgressMutation.mutate({
                clientId,
                scenarioId: currentScenario.id,
                score: totalScore + (result?.score || 0),
            });
        }

        if (currentScenarioIndex < (scenarios?.length || 0) - 1) {
            setCurrentScenarioIndex(prev => prev + 1);
            setSelectedOption(null);
            setShowResult(false);
            setResult(null);
        }
    };

    const handleRestart = () => {
        setCurrentScenarioIndex(0);
        setSelectedOption(null);
        setShowResult(false);
        setResult(null);
        setTotalScore(0);
    };

    const getCategoryColor = (category: string) => {
        switch (category) {
            case 'financial': return 'text-yellow-500';
            case 'operational': return 'text-blue-500';
            case 'compliance': return 'text-green-500';
            case 'reputation': return 'text-purple-500';
            case 'security': return 'text-red-500';
            default: return 'text-gray-500';
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'easy': return 'bg-green-100 text-green-800';
            case 'medium': return 'bg-yellow-100 text-yellow-800';
            case 'hard': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    if (scenariosLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!currentScenario) {
        return <div>No scenarios available</div>;
    }

    const progressPercent = ((currentScenarioIndex) / (scenarios?.length || 1)) * 100;

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold flex items-center gap-2">
                        <Shield className="h-6 w-6 text-blue-500" />
                        Risk Simulation Game
                    </h2>
                    <p className="text-muted-foreground">Test your risk management decision-making skills</p>
                </div>
                <div className="text-right">
                    <div className="text-2xl font-bold text-yellow-500 flex items-center gap-1">
                        <Trophy className="h-5 w-5" />
                        {totalScore}
                    </div>
                    <p className="text-xs text-muted-foreground">Total Score</p>
                </div>
            </div>

            {/* Progress */}
            <div className="space-y-2">
                <div className="flex justify-between text-sm">
                    <span>Scenario {currentScenarioIndex + 1} of {scenarios?.length}</span>
                    <span className="text-muted-foreground">{Math.round(progressPercent)}% Complete</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
            </div>

            {/* Scenario Card */}
            <Card className="border-2 border-slate-200">
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Target className={`h-5 w-5 ${getCategoryColor(currentScenario.category)}`} />
                            <span className={`text-sm font-medium capitalize ${getCategoryColor(currentScenario.category)}`}>
                                {currentScenario.category}
                            </span>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(currentScenario.difficulty)}`}>
                            {currentScenario.difficulty}
                        </span>
                    </div>
                    <CardTitle className="text-xl mt-2">{currentScenario.title}</CardTitle>
                    <CardDescription className="text-base">{currentScenario.description}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {!showResult ? (
                        <>
                            <RadioGroup
                                value={selectedOption || ''}
                                onValueChange={setSelectedOption}
                                className="space-y-3"
                            >
                                {currentScenario.options.map((option) => (
                                    <div
                                        key={option.id}
                                        className={`flex items-start space-x-3 p-4 rounded-lg border-2 transition-all cursor-pointer ${selectedOption === option.id
                                                ? 'border-blue-500 bg-blue-50'
                                                : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                        onClick={() => setSelectedOption(option.id)}
                                    >
                                        <RadioGroupItem value={option.id} id={option.id} className="mt-1" />
                                        <Label htmlFor={option.id} className="flex-1 cursor-pointer">
                                            {option.text}
                                        </Label>
                                    </div>
                                ))}
                            </RadioGroup>

                            <Button
                                onClick={handleSubmit}
                                disabled={!selectedOption || submitMutation.isPending}
                                className="w-full"
                                size="lg"
                            >
                                {submitMutation.isPending ? (
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Shield className="mr-2 h-4 w-4" />
                                )}
                                Submit Decision
                            </Button>
                        </>
                    ) : (
                        <div className="space-y-4">
                            {/* Result */}
                            <div className={`p-4 rounded-lg border-2 ${result?.isCorrect ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'
                                }`}>
                                <div className="flex items-center gap-2 mb-2">
                                    {result?.isCorrect ? (
                                        <CheckCircle className="h-6 w-6 text-green-500" />
                                    ) : (
                                        <XCircle className="h-6 w-6 text-red-500" />
                                    )}
                                    <span className={`font-bold text-lg ${result?.isCorrect ? 'text-green-700' : 'text-red-700'}`}>
                                        {result?.isCorrect ? 'Correct!' : 'Not quite right'}
                                    </span>
                                </div>

                                <p className="text-sm mb-3">{result?.explanation}</p>

                                <div className="flex gap-4 text-sm">
                                    <div>
                                        <span className="text-muted-foreground">Impact: </span>
                                        <span className={result?.impact > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {result?.impact > 0 ? '+' : ''}{result?.impact}
                                        </span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Probability: </span>
                                        <span>{result?.probability}%</span>
                                    </div>
                                    <div>
                                        <span className="text-muted-foreground">Score: </span>
                                        <span className="font-bold text-yellow-600">+{result?.score}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Next Button */}
                            {currentScenarioIndex < (scenarios?.length || 0) - 1 ? (
                                <Button onClick={handleNext} className="w-full" size="lg">
                                    Next Scenario
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            ) : (
                                <div className="text-center space-y-4">
                                    <div className="p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                                        <Trophy className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
                                        <h3 className="font-bold text-lg">Game Complete!</h3>
                                        <p className="text-2xl font-bold text-yellow-600">Final Score: {totalScore}</p>
                                    </div>
                                    <Button onClick={handleRestart} variant="outline" className="w-full">
                                        <RefreshCw className="mr-2 h-4 w-4" />
                                        Play Again
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
