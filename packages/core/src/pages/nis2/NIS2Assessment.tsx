/**
 * NIS2 Compliance Assessment Page
 * 
 * Interactive questionnaire to assess NIS2 compliance gaps
 * Covers key articles: 21 (Security Measures), 22 (Risk Management), 23 (Incident Reporting)
 * 
 * NIS2 Directive (EU) 2022/2555
 */

import React, { useState } from 'react';
import { useParams } from 'wouter';
import { useClientContext } from '@/contexts/ClientContext';
import { ClipboardCheck, ArrowLeft, CheckCircle, Circle, AlertCircle, Shield, FileText, Users, Activity, Truck, Database, Lock, Globe } from 'lucide-react';
import DashboardLayout from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Button } from "@complianceos/ui/ui/button";
import { Badge } from "@complianceos/ui/ui/badge";
import { Progress } from "@complianceos/ui/ui/progress";
import { RadioGroup, RadioGroupItem } from "@complianceos/ui/ui/radio-group";
import { Label } from "@complianceos/ui/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@complianceos/ui/ui/tabs";
import { toast } from 'sonner';

// NIS2 Assessment Categories based on Articles 21, 22, 23
const ASSESSMENT_CATEGORIES = [
    {
        id: 'policies',
        article: '21(2)(a)',
        title: 'Security Policies',
        description: 'Information security policies and procedures',
        icon: FileText,
        questions: [
            { id: 'policies_1', text: 'Does your organization have a documented information security policy?', required: true },
            { id: 'policies_2', text: 'Are security policies reviewed and approved by management at least annually?', required: true },
            { id: 'policies_3', text: 'Do you have documented procedures for incident response?', required: true },
        ]
    },
    {
        id: 'risk_management',
        article: '21(2)(b)',
        title: 'Risk Management',
        description: 'Cybersecurity risk management measures',
        icon: Shield,
        questions: [
            { id: 'risk_1', text: 'Has your organization conducted a cybersecurity risk assessment?', required: true },
            { id: 'risk_2', text: 'Do you have a process for identifying and assessing third-party risks?', required: true },
            { id: 'risk_3', text: 'Are risk treatment plans documented and monitored?', required: false },
        ]
    },
    {
        id: 'incident_handling',
        article: '21(2)(c)',
        title: 'Incident Handling',
        description: 'Detection, response, and recovery capabilities',
        icon: Activity,
        questions: [
            { id: 'incident_1', text: 'Do you have a documented incident response plan?', required: true },
            { id: 'incident_2', text: 'Is there a designated incident response team or point of contact?', required: true },
            { id: 'incident_3', text: 'Do you conduct regular incident response exercises?', required: false },
        ]
    },
    {
        id: 'business_continuity',
        article: '21(2)(d)',
        title: 'Business Continuity',
        description: 'Backup and disaster recovery',
        icon: Database,
        questions: [
            { id: 'bc_1', text: 'Do you have documented business continuity and disaster recovery plans?', required: true },
            { id: 'bc_2', text: 'Are backups tested regularly for restore capability?', required: true },
            { id: 'bc_3', text: 'Do you have off-site backup storage?', required: false },
        ]
    },
    {
        id: 'supply_chain',
        article: '21(2)(e)',
        title: 'Supply Chain Security',
        description: 'Security in supplier relationships',
        icon: Truck,
        questions: [
            { id: 'supply_1', text: 'Do you maintain an inventory of critical suppliers?', required: true },
            { id: 'supply_2', text: 'Do you assess cybersecurity risks from third-party suppliers?', required: true },
            { id: 'supply_3', text: 'Do supplier contracts include cybersecurity requirements?', required: false },
        ]
    },
    {
        id: 'access_control',
        article: '21(2)(h)',
        title: 'Access Control',
        description: 'Identity and access management',
        icon: Users,
        questions: [
            { id: 'access_1', text: 'Do you have a formal access control policy?', required: true },
            { id: 'access_2', text: 'Is access granted based on least privilege principle?', required: true },
            { id: 'access_3', text: 'Do you implement multi-factor authentication?', required: false },
        ]
    },
    {
        id: 'cryptography',
        article: '21(2)(g)',
        title: 'Cryptography',
        description: 'Encryption and key management',
        icon: Lock,
        questions: [
            { id: 'crypto_1', text: 'Is sensitive data encrypted at rest?', required: true },
            { id: 'crypto_2', text: 'Is data encrypted in transit (TLS/SSL)?', required: true },
            { id: 'crypto_3', text: 'Do you have a key management policy?', required: false },
        ]
    },
    {
        id: 'reporting',
        article: '23',
        title: 'Incident Reporting',
        description: 'NIS2 incident notification requirements',
        icon: Globe,
        questions: [
            { id: 'report_1', text: 'Are you aware of the 24-hour early warning requirement?', required: true },
            { id: 'report_2', text: 'Do you have processes to determine if an incident is "significant"?', required: true },
            { id: 'report_3', text: 'Do you know which competent authority to report to?', required: true },
        ]
    },
];

interface AssessmentAnswers {
    [key: string]: 'yes' | 'no' | 'partial' | 'not_applicable' | '';
}

export default function NIS2Assessment() {
    const params = useParams();
    const { selectedClientId } = useClientContext();
    const id = params.id;
    const clientId = id ? parseInt(id) : (selectedClientId || 0);

    const [answers, setAnswers] = useState<AssessmentAnswers>({});
    const [activeTab, setActiveTab] = useState('policies');
    const [isSubmitted, setIsSubmitted] = useState(false);

    // Calculate progress
    const totalQuestions = ASSESSMENT_CATEGORIES.reduce((sum, cat) => sum + cat.questions.length, 0);
    const answeredQuestions = Object.keys(answers).filter(k => answers[k] !== '').length;
    const progress = Math.round((answeredQuestions / totalQuestions) * 100);

    // Calculate scores per category
    const getCategoryScore = (categoryId: string) => {
        const category = ASSESSMENT_CATEGORIES.find(c => c.id === categoryId);
        if (!category) return 0;

        const categoryAnswers = category.questions
            .map(q => answers[q.id])
            .filter(a => a !== '' && a !== 'not_applicable');

        if (categoryAnswers.length === 0) return 0;

        const yesCount = categoryAnswers.filter(a => a === 'yes').length;
        const partialCount = categoryAnswers.filter(a => a === 'partial').length;

        return Math.round(((yesCount + (partialCount * 0.5)) / categoryAnswers.length) * 100);
    };

    const handleAnswer = (questionId: string, answer: string) => {
        setAnswers(prev => ({
            ...prev,
            [questionId]: answer
        }));
    };

    const handleSubmit = () => {
        setIsSubmitted(true);
        toast.success('Assessment submitted successfully!');
    };

    const getOverallScore = () => {
        let total = 0;
        let score = 0;

        ASSESSMENT_CATEGORIES.forEach(cat => {
            cat.questions.forEach(q => {
                const answer = answers[q.id];
                if (answer && answer !== 'not_applicable') {
                    total++;
                    if (answer === 'yes') score += 1;
                    else if (answer === 'partial') score += 0.5;
                }
            });
        });

        return total > 0 ? Math.round((score / total) * 100) : 0;
    };

    const getComplianceStatus = () => {
        const score = getOverallScore();
        if (score >= 80) return { label: 'Compliant', color: 'text-green-600', bg: 'bg-green-50' };
        if (score >= 50) return { label: 'Partial', color: 'text-amber-600', bg: 'bg-amber-50' };
        return { label: 'Non-Compliant', color: 'text-red-600', bg: 'bg-red-50' };
    };

    return (
        <DashboardLayout fullWidth={true}>
            <div className="container mx-auto py-8 space-y-8">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => window.history.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="p-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl shadow-lg">
                        <ClipboardCheck className="h-8 w-8 text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">NIS2 Compliance Assessment</h1>
                        <p className="text-muted-foreground">
                            Evaluate your organization's NIS2 compliance readiness
                        </p>
                    </div>
                    <Badge variant="outline" className="ml-auto bg-purple-50 text-purple-700 border-purple-200">
                        <Shield className="h-3 w-3 mr-1" />
                        Self-Assessment
                    </Badge>
                </div>

                {/* Progress Overview */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center justify-between">
                            <CardTitle>Assessment Progress</CardTitle>
                            <div className={`px-3 py-1 rounded-full ${getComplianceStatus().bg}`}>
                                <span className={`font-semibold ${getComplianceStatus().color}`}>
                                    {getComplianceStatus().label} ({getOverallScore()}%)
                                </span>
                            </div>
                        </div>
                        <CardDescription>
                            Complete all questions to get your compliance score
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Progress value={progress} className="h-3" />
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                            <span>{answeredQuestions} of {totalQuestions} questions answered</span>
                            <span>{progress}% complete</span>
                        </div>
                    </CardContent>
                </Card>

                {/* Category Overview */}
                <div className="grid gap-4 md:grid-cols-4">
                    {ASSESSMENT_CATEGORIES.map((category) => {
                        const score = getCategoryScore(category.id);
                        const answered = category.questions.filter(q => answers[q.id] !== '').length;
                        const Icon = category.icon;

                        return (
                            <Card
                                key={category.id}
                                className={`cursor-pointer transition-all hover:shadow-md ${activeTab === category.id ? 'ring-2 ring-purple-500' : ''
                                    }`}
                                onClick={() => setActiveTab(category.id)}
                            >
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <div className="p-2 rounded-lg bg-purple-50">
                                            <Icon className="h-4 w-4 text-purple-600" />
                                        </div>
                                        <Badge variant={score >= 80 ? 'default' : score >= 50 ? 'secondary' : 'outline'} className="text-xs">
                                            {score}%
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-sm mt-2">{category.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-xs text-muted-foreground">
                                        {answered}/{category.questions.length} answered
                                    </p>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>

                {/* Assessment Tabs */}
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="grid grid-cols-4 lg:grid-cols-8 h-auto">
                        {ASSESSMENT_CATEGORIES.map((category) => (
                            <TabsTrigger
                                key={category.id}
                                value={category.id}
                                className="text-xs py-2"
                            >
                                {category.title}
                            </TabsTrigger>
                        ))}
                    </TabsList>

                    {ASSESSMENT_CATEGORIES.map((category) => {
                        const Icon = category.icon;

                        return (
                            <TabsContent key={category.id} value={category.id}>
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg bg-purple-50">
                                                <Icon className="h-5 w-5 text-purple-600" />
                                            </div>
                                            <div>
                                                <CardTitle>{category.title}</CardTitle>
                                                <CardDescription>
                                                    {category.description} - Article {category.article}
                                                </CardDescription>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        {category.questions.map((question) => (
                                            <div key={question.id} className="space-y-3">
                                                <div className="flex items-start gap-2">
                                                    <Label className="text-sm font-medium flex-1">
                                                        {question.text}
                                                        {question.required && <span className="text-red-500 ml-1">*</span>}
                                                    </Label>
                                                    {answers[question.id] && (
                                                        answers[question.id] === 'yes' ?
                                                            <CheckCircle className="h-4 w-4 text-green-500 mt-1" /> :
                                                            answers[question.id] === 'partial' ?
                                                                <AlertCircle className="h-4 w-4 text-amber-500 mt-1" /> :
                                                                <Circle className="h-4 w-4 text-slate-300 mt-1" />
                                                    )}
                                                </div>
                                                <RadioGroup
                                                    value={answers[question.id] || ''}
                                                    onValueChange={(value) => handleAnswer(question.id, value)}
                                                    className="flex gap-4"
                                                >
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="yes" id={`${question.id}_yes`} />
                                                        <Label htmlFor={`${question.id}_yes`} className="text-sm cursor-pointer">Yes</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="partial" id={`${question.id}_partial`} />
                                                        <Label htmlFor={`${question.id}_partial`} className="text-sm cursor-pointer">Partial</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="no" id={`${question.id}_no`} />
                                                        <Label htmlFor={`${question.id}_no`} className="text-sm cursor-pointer">No</Label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <RadioGroupItem value="not_applicable" id={`${question.id}_na`} />
                                                        <Label htmlFor={`${question.id}_na`} className="text-sm cursor-pointer">N/A</Label>
                                                    </div>
                                                </RadioGroup>
                                            </div>
                                        ))}
                                    </CardContent>
                                </Card>
                            </TabsContent>
                        );
                    })}
                </Tabs>

                {/* Action Buttons */}
                <div className="flex justify-end gap-4">
                    <Button
                        variant="outline"
                        onClick={() => setAnswers({})}
                    >
                        Reset Assessment
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={answeredQuestions < totalQuestions * 0.5}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        Submit Assessment
                    </Button>
                </div>
            </div>
        </DashboardLayout>
    );
}
