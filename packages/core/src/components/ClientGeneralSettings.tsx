
import { useState, useEffect } from "react";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { Textarea } from "@complianceos/ui/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { trpc } from "@/lib/trpc";
import { Building2, Save, Loader2, Globe2, Coins, Calendar, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { 
  SUPPORTED_CURRENCIES, 
  SUPPORTED_LOCALES, 
  SUPPORTED_DATE_FORMATS, 
  formatCurrency, 
  getCurrencySymbol 
} from "@/lib/currency";

interface ClientGeneralSettingsProps {
    clientId: number;
    initialData: {
        name: string;
        description?: string | null;
        industry?: string | null;
        size?: string | null;
        cisoName?: string | null;
        dpoName?: string | null;
        headquarters?: string | null;
        mainServiceRegion?: string | null;
        currency?: string | null;
        locale?: string | null;
        dateFormat?: string | null;
    };
}

export default function ClientGeneralSettings({ clientId, initialData }: ClientGeneralSettingsProps) {
    const { t } = useTranslation(['settings', 'common']);
    const [name, setName] = useState(initialData.name);
    const [description, setDescription] = useState(initialData.description || "");
    const [industry, setIndustry] = useState(initialData.industry || "");
    const [size, setSize] = useState(initialData.size || "");
    const [cisoName, setCisoName] = useState(initialData.cisoName || "");
    const [dpoName, setDpoName] = useState(initialData.dpoName || "");
    const [headquarters, setHeadquarters] = useState(initialData.headquarters || "");
    const [mainServiceRegion, setMainServiceRegion] = useState(initialData.mainServiceRegion || "");
    const [currency, setCurrency] = useState(initialData.currency || "USD");
    const [locale, setLocale] = useState(initialData.locale || "en-US");
    const [dateFormat, setDateFormat] = useState(initialData.dateFormat || "YYYY-MM-DD");
    const [hasChanges, setHasChanges] = useState(false);

    const utils = trpc.useUtils();

    useEffect(() => {
        const changed =
            name !== initialData.name ||
            description !== (initialData.description || "") ||
            industry !== (initialData.industry || "") ||
            size !== (initialData.size || "") ||
            cisoName !== (initialData.cisoName || "") ||
            dpoName !== (initialData.dpoName || "") ||
            headquarters !== (initialData.headquarters || "") ||
            mainServiceRegion !== (initialData.mainServiceRegion || "") ||
            currency !== (initialData.currency || "USD") ||
            locale !== (initialData.locale || "en-US") ||
            dateFormat !== (initialData.dateFormat || "YYYY-MM-DD");
        setHasChanges(changed);
    }, [name, description, industry, size, cisoName, dpoName, headquarters, mainServiceRegion, currency, locale, dateFormat, initialData]);

    const updateClientMutation = trpc.clients.update.useMutation({
        onSuccess: () => {
            toast.success("Client & localization settings updated successfully");
            utils.clients.get.invalidate({ id: clientId });
            setHasChanges(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to update client settings");
        },
    });

    const handleSave = () => {
        if (!name.trim()) {
            toast.error("Client name is required");
            return;
        }

        updateClientMutation.mutate({
            id: clientId,
            name,
            description,
            industry,
            size,
            cisoName,
            dpoName,
            headquarters,
            mainServiceRegion,
            currency,
            locale,
            dateFormat,
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg">General Information</CardTitle>
                <CardDescription>
                    Basic information about the client organization
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Company Name */}
                    <div className="space-y-2">
                        <Label htmlFor="clientName" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-muted-foreground" />
                            Company Name
                        </Label>
                        <Input
                            id="clientName"
                            placeholder="Acme Corp"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Industry */}
                    <div className="space-y-2">
                        <Label htmlFor="industry">Industry</Label>
                        <Input
                            id="industry"
                            placeholder="Technology, Healthcare, etc."
                            value={industry}
                            onChange={(e) => setIndustry(e.target.value)}
                        />
                    </div>

                    {/* Company Size */}
                    <div className="space-y-2">
                        <Label htmlFor="size">Company Size</Label>
                        <Select value={size} onValueChange={setSize}>
                            <SelectTrigger id="size">
                                <SelectValue placeholder="Select size" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="1-10">1-10 employees</SelectItem>
                                <SelectItem value="11-50">11-50 employees</SelectItem>
                                <SelectItem value="51-200">51-200 employees</SelectItem>
                                <SelectItem value="201-500">201-500 employees</SelectItem>
                                <SelectItem value="500+">500+ employees</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    {/* CISO Name */}
                    <div className="space-y-2">
                        <Label htmlFor="cisoName">CISO Name</Label>
                        <Input
                            id="cisoName"
                            placeholder="John Doe"
                            value={cisoName}
                            onChange={(e) => setCisoName(e.target.value)}
                        />
                    </div>
                    {/* DPO Name */}
                    <div className="space-y-2">
                        <Label htmlFor="dpoName">DPO Name (Data Protection Officer)</Label>
                        <Input
                            id="dpoName"
                            placeholder="Jane Smith"
                            value={dpoName}
                            onChange={(e) => setDpoName(e.target.value)}
                        />
                    </div>
                    {/* Headquarters */}
                    <div className="space-y-2">
                        <Label htmlFor="headquarters">Headquarters Location</Label>
                        <Input
                            id="headquarters"
                            placeholder="San Francisco, CA"
                            value={headquarters}
                            onChange={(e) => setHeadquarters(e.target.value)}
                        />
                    </div>
                    {/* Service Region */}
                    <div className="space-y-2">
                        <Label htmlFor="mainServiceRegion">Main Service Region</Label>
                        <Input
                            id="mainServiceRegion"
                            placeholder="USA, EU, Global"
                            value={mainServiceRegion}
                            onChange={(e) => setMainServiceRegion(e.target.value)}
                        />
                    </div>
                </div>

                {/* Regional & Localization Settings */}
                <div className="pt-4 border-t border-border/60">
                    <div className="flex items-center gap-2 mb-3">
                        <Globe2 className="h-5 w-5 text-primary" />
                        <div>
                            <h3 className="text-base font-semibold text-foreground">Regional & Localization Settings</h3>
                            <p className="text-xs text-muted-foreground">Configure the currency, locale, and number formatting used across all reports, risk models, and dashboards.</p>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-3 bg-muted/30 p-4 rounded-xl border border-border/40">
                        {/* Primary Currency */}
                        <div className="space-y-2">
                            <Label htmlFor="currency" className="flex items-center gap-1.5 font-medium">
                                <Coins className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                Primary Currency
                            </Label>
                            <Select value={currency} onValueChange={(val) => {
                                setCurrency(val);
                                // Auto-suggest matching locale if user hasn't customized it
                                const matchingDef = SUPPORTED_CURRENCIES.find(c => c.code === val);
                                if (matchingDef && locale === "en-US") {
                                    setLocale(matchingDef.defaultLocale);
                                }
                            }}>
                                <SelectTrigger id="currency" className="bg-background">
                                    <SelectValue placeholder="Select currency" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                    {SUPPORTED_CURRENCIES.map((curr) => (
                                        <SelectItem key={curr.code} value={curr.code}>
                                            <span className="flex items-center gap-2">
                                                <span>{curr.flag}</span>
                                                <span className="font-semibold">{curr.code}</span>
                                                <span className="text-muted-foreground">({curr.symbol}) - {curr.name}</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Locale & Number Formatting */}
                        <div className="space-y-2">
                            <Label htmlFor="locale" className="flex items-center gap-1.5 font-medium">
                                <Globe2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                Number & Locale Format
                            </Label>
                            <Select value={locale} onValueChange={setLocale}>
                                <SelectTrigger id="locale" className="bg-background">
                                    <SelectValue placeholder="Select locale" />
                                </SelectTrigger>
                                <SelectContent className="max-h-72">
                                    {SUPPORTED_LOCALES.map((loc) => (
                                        <SelectItem key={loc.code} value={loc.code}>
                                            <span className="flex items-center gap-2">
                                                <span>{loc.flag}</span>
                                                <span>{loc.name}</span>
                                                <span className="text-xs text-muted-foreground font-mono">({loc.code})</span>
                                            </span>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Date Format */}
                        <div className="space-y-2">
                            <Label htmlFor="dateFormat" className="flex items-center gap-1.5 font-medium">
                                <Calendar className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                Date Display Format
                            </Label>
                            <Select value={dateFormat} onValueChange={setDateFormat}>
                                <SelectTrigger id="dateFormat" className="bg-background">
                                    <SelectValue placeholder="Select date format" />
                                </SelectTrigger>
                                <SelectContent>
                                    {SUPPORTED_DATE_FORMATS.map((fmt) => (
                                        <SelectItem key={fmt.value} value={fmt.value}>
                                            {fmt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Live Preview Bar */}
                    <div className="mt-3 p-3.5 bg-brand/5 border border-brand/20 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs">
                        <div className="flex items-center gap-2 text-brand font-medium">
                            <Sparkles className="h-4 w-4" />
                            <span>Live Formatting Preview:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                            <div>
                                Standard: <strong className="text-foreground">{formatCurrency(14280, currency, locale)}</strong>
                            </div>
                            <div>
                                Compact (VaR): <strong className="text-foreground">{formatCurrency(120000, currency, locale, { compact: true })}</strong>
                            </div>
                            <div>
                                Millions: <strong className="text-foreground">{formatCurrency(2500000, currency, locale, { compact: true })}</strong>
                            </div>
                            <div>
                                Symbol: <strong className="text-foreground">{getCurrencySymbol(currency, locale)}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                        id="description"
                        placeholder="Brief description of the client..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={3}
                    />
                </div>

                {/* Save Button */}
                <div className="flex justify-end pt-2">
                    <Button
                        onClick={handleSave}
                        disabled={!hasChanges || updateClientMutation.isPending}
                    >
                        {updateClientMutation.isPending ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                {t('settings.save', 'Save Changes')}
                            </>
                        )}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
