
import { useState, useEffect } from "react";
import { Button } from "@complianceos/ui/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@complianceos/ui/ui/card";
import { Input } from "@complianceos/ui/ui/input";
import { Label } from "@complianceos/ui/ui/label";
import { trpc } from "@/lib/trpc";
import { Save, Loader2, Palette, LayoutTemplate, Settings, Code, Zap } from "lucide-react";
import { toast } from "sonner";
import ClientLogoUpload from "@/components/ClientLogoUpload";
import { CURATED_FONTS, getContrastColor, BRAND_PRESETS } from "@/config/branding";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@complianceos/ui/ui/select";
import { Slider } from "@complianceos/ui/ui/slider";
import { Type, Sparkles, Check } from "lucide-react";
import { Switch } from "@complianceos/ui/ui/switch";
import { Textarea } from "@complianceos/ui/ui/textarea";

interface ClientBrandingSettingsProps {
    clientId: number;
    clientName: string;
    initialData: {
        logoUrl?: string | null;
        brandPrimaryColor?: string | null;
        brandSecondaryColor?: string | null;
        sidebarBg?: string | null;
        headingFont?: string | null;
        bodyFont?: string | null;
        portalTitle?: string | null;
    };
    onUpdate?: () => void;
}

export default function ClientBrandingSettings({ clientId, clientName, initialData, onUpdate }: ClientBrandingSettingsProps) {
    const [brandPrimaryColor, setBrandPrimaryColor] = useState(initialData.brandPrimaryColor || "#2563eb"); // Default blue-600
    const [brandSecondaryColor, setBrandSecondaryColor] = useState(initialData.brandSecondaryColor || "#0f172a");
    const [sidebarBg, setSidebarBg] = useState(initialData.sidebarBg || "#002a40");
    const [headingFont, setHeadingFont] = useState(initialData.headingFont || "Outfit");
    const [bodyFont, setBodyFont] = useState(initialData.bodyFont || "Inter");
    const [baseFontSize, setBaseFontSize] = useState((initialData as any).baseFontSize || 16);
    const [portalTitle, setPortalTitle] = useState(initialData.portalTitle || clientName);
    const [hasChanges, setHasChanges] = useState(false);

    const utils = trpc.useUtils();

    // Check for changes
    useEffect(() => {
        const hasChanged =
            brandPrimaryColor !== (initialData.brandPrimaryColor || "#2563eb") ||
            brandSecondaryColor !== (initialData.brandSecondaryColor || "#0f172a") ||
            sidebarBg !== (initialData.sidebarBg || "#002a40") ||
            headingFont !== (initialData.headingFont || "Outfit") ||
            bodyFont !== (initialData.bodyFont || "Inter") ||
            baseFontSize !== ((initialData as any).baseFontSize || 16) ||
            portalTitle !== (initialData.portalTitle || clientName);

        setHasChanges(hasChanged);
    }, [brandPrimaryColor, brandSecondaryColor, sidebarBg, headingFont, bodyFont, baseFontSize, portalTitle, initialData, clientName]);

    const updateClientMutation = trpc.clients.update.useMutation({
        onSuccess: () => {
            toast.success("Branding settings saved successfully");
            utils.clients.get.invalidate({ id: clientId });
            if (onUpdate) onUpdate();
            setHasChanges(false);
        },
        onError: (error) => {
            toast.error(error.message || "Failed to save branding settings");
        },
    });

    // Feature flags state
    const [featureFlags, setFeatureFlags] = useState<Record<string, boolean>>({});
    const [customSettings, setCustomSettings] = useState<string>("");

    // Fetch existing client settings from new table
    const { data: clientSettings } = trpc.settings.getClientSettings.useQuery(
        { clientId },
        { enabled: !!clientId }
    );

    // Load settings when data arrives
    useEffect(() => {
        if (clientSettings) {
            if (clientSettings.featureFlags) {
                setFeatureFlags(clientSettings.featureFlags as Record<string, boolean>);
            }
            if (clientSettings.customSettings) {
                setCustomSettings(JSON.stringify(clientSettings.customSettings, null, 2));
            }
        }
    }, [clientSettings]);

    // Save feature flags mutation
    const saveFeatureFlagsMutation = trpc.settings.updateClientSettings.useMutation({
        onSuccess: () => {
            toast.success("Feature flags saved successfully");
        },
        onError: (error) => {
            toast.error(error.message || "Failed to save feature flags");
        }
    });

    const handleSave = () => {
        updateClientMutation.mutate({
            id: clientId,
            brandPrimaryColor,
            brandSecondaryColor: sidebarBg, // Sync for legacy components
            sidebarBg,
            sidebarFg: getContrastColor(sidebarBg),
            headingFont,
            bodyFont,
            baseFontSize,
            portalTitle,
        });
    };

    return (
        <div className="space-y-6">
            {/* Logo Section */}
            <ClientLogoUpload
                clientId={clientId}
                currentLogoUrl={initialData.logoUrl}
                clientName={clientName}
            />

            {/* Design Personas (Presets) */}
            <Card className="border-indigo-100 bg-indigo-50/10">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-amber-500" />
                        Design Personas
                    </CardTitle>
                    <CardDescription>
                        Quickly apply professional style presets to match your client's brand identity.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                        {Object.entries(BRAND_PRESETS).map(([key, preset]) => {
                            const isActive =
                                brandPrimaryColor === preset.primaryColor &&
                                sidebarBg === preset.sidebarBg &&
                                headingFont === preset.headingFont &&
                                bodyFont === preset.bodyFont;

                            return (
                                <button
                                    key={key}
                                    onClick={() => {
                                        setBrandPrimaryColor(preset.primaryColor);
                                        setSidebarBg(preset.sidebarBg);
                                        setHeadingFont(preset.headingFont);
                                        setBodyFont(preset.bodyFont);
                                        toast.info(`Applied ${preset.name} preset`);
                                    }}
                                    className={`relative flex flex-col items-start p-4 rounded-xl border-2 text-left transition-all hover:shadow-md ${isActive
                                        ? "border-blue-600 bg-blue-50/50 shadow-sm"
                                        : "border-slate-200 bg-white hover:border-slate-300"
                                        }`}
                                >
                                    {isActive && (
                                        <div className="absolute top-2 right-2 h-5 w-5 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Check className="h-3 w-3 text-white" />
                                        </div>
                                    )}
                                    <span className="font-semibold text-sm mb-1">{preset.name}</span>
                                    <span className="text-xs text-slate-500 line-clamp-2 leading-relaxed mb-4">
                                        {preset.description}
                                    </span>
                                    <div className="flex gap-1.5 mt-auto">
                                        <div
                                            className="h-4 w-4 rounded-full border border-black/5"
                                            style={{ backgroundColor: preset.primaryColor }}
                                        />
                                        <div
                                            className="h-4 w-4 rounded-full border border-black/5"
                                            style={{ backgroundColor: preset.sidebarBg }}
                                        />
                                        <div className="flex items-center justify-center h-4 px-1.5 rounded bg-slate-100 text-[10px] font-medium text-slate-600">
                                            {preset.baseFontSize || 16}px Aa
                                        </div>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Colors & Identity */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Palette className="h-5 w-5 text-indigo-500" />
                        Color Theme
                    </CardTitle>
                    <CardDescription>
                        Customize the look and feel of your client portal.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Primary Color */}
                        <div className="space-y-3">
                            <Label htmlFor="primaryColor">Primary Brand Color</Label>
                            <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer group">
                                    <input
                                        type="color"
                                        id="primaryColor"
                                        value={brandPrimaryColor}
                                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0 bg-transparent"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={brandPrimaryColor}
                                        onChange={(e) => setBrandPrimaryColor(e.target.value)}
                                        placeholder="#000000"
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">Used for buttons, links, and active states.</p>
                        </div>

                        {/* Sidebar Background */}
                        <div className="space-y-3">
                            <Label htmlFor="sidebarBg">Sidebar Background</Label>
                            <div className="flex items-center gap-3">
                                <div className="relative h-10 w-10 rounded-lg overflow-hidden border border-slate-200 shadow-sm cursor-pointer group">
                                    <input
                                        type="color"
                                        id="sidebarBg"
                                        value={sidebarBg}
                                        onChange={(e) => setSidebarBg(e.target.value)}
                                        className="absolute -top-2 -left-2 w-16 h-16 cursor-pointer p-0 border-0 bg-transparent"
                                    />
                                </div>
                                <div className="flex-1">
                                    <Input
                                        value={sidebarBg}
                                        onChange={(e) => setSidebarBg(e.target.value)}
                                        placeholder="#002a40"
                                        className="font-mono"
                                    />
                                </div>
                            </div>
                            <p className="text-xs text-muted-foreground">The background color of the main navigation sidebar.</p>
                        </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Heading Font */}
                        <div className="space-y-3">
                            <Label>Heading Font</Label>
                            <Select value={headingFont} onValueChange={setHeadingFont}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a font" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURATED_FONTS.map(font => (
                                        <SelectItem key={font.name} value={font.family} style={{ fontFamily: font.family }}>
                                            {font.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Body Font */}
                        <div className="space-y-3">
                            <Label>Body Font</Label>
                            <Select value={bodyFont} onValueChange={setBodyFont}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a font" />
                                </SelectTrigger>
                                <SelectContent>
                                    {CURATED_FONTS.map(font => (
                                        <SelectItem key={font.name} value={font.family} style={{ fontFamily: font.family }}>
                                            {font.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-4 pt-2">
                        <Label>Global Text Scale (Base Font Size)</Label>
                        <div className="flex items-center gap-4">
                            <span className="text-xs text-muted-foreground w-8">12px</span>
                            <Slider
                                defaultValue={[baseFontSize]}
                                max={24}
                                min={12}
                                step={1}
                                onValueChange={(vals) => setBaseFontSize(vals[0])}
                                className="flex-1"
                            />
                            <span className="text-xs font-medium w-8 text-right">{baseFontSize}px</span>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Portal Settings */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5 text-blue-500" />
                        Portal Identity
                    </CardTitle>
                    <CardDescription>
                        Configure how the application appears in the browser.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label htmlFor="portalTitle">Portal Title</Label>
                        <Input
                            id="portalTitle"
                            value={portalTitle}
                            onChange={(e) => setPortalTitle(e.target.value)}
                            placeholder={`${clientName} Compliance Portal`}
                        />
                        <p className="text-xs text-muted-foreground">This title appears in the browser tab and search results.</p>
                    </div>

                    {/* Preview Box */}
                    <div className="mt-6 p-4 border border-slate-200 rounded-lg bg-slate-50/50">
                        <Label className="mb-3 block text-xs uppercase tracking-wider text-slate-500 font-semibold">Live Preview</Label>
                        <div className="flex flex-col gap-4">
                            {/* Browser Tab Preview */}
                            <div className="bg-[#dee1e6] p-2 rounded-t-lg w-full max-w-md mx-auto shadow-sm">
                                <div className="bg-white rounded-md py-1.5 px-3 flex items-center gap-2 text-xs text-slate-700 max-w-[200px] shadow-sm border border-slate-200">
                                    {initialData.logoUrl ? (
                                        <img src={initialData.logoUrl} className="w-3 h-3 object-contain" alt="" />
                                    ) : (
                                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                                    )}
                                    <span className="truncate">{portalTitle}</span>
                                </div>
                            </div>

                            {/* UI Preview */}
                            <div className="w-full max-w-md mx-auto bg-slate-100 rounded-lg shadow-md overflow-hidden border border-slate-200 flex h-48">
                                {/* Sidebar Mock */}
                                <div
                                    className="w-16 h-full flex flex-col items-center py-4 gap-3 transition-colors"
                                    style={{
                                        backgroundColor: sidebarBg,
                                        backdropFilter: sidebarBg === '#020617' ? 'blur(8px)' : 'none',
                                        borderRight: '1px solid rgba(255,255,255,0.1)'
                                    }}
                                >
                                    <div className="w-8 h-8 rounded bg-white/10" />
                                    <div className="w-8 h-1 bg-white/10 rounded-full" />
                                    <div className="w-8 h-1 bg-white/10 rounded-full" />
                                    <div className="w-8 h-1 bg-white/10 rounded-full" />
                                </div>
                                {/* Content Mock */}
                                <div className="flex-1 bg-white p-4 space-y-3">
                                    <div className="h-4 w-1/3 bg-slate-100 rounded mb-4" />
                                    <div className="space-y-2">
                                        <div className="h-2 w-full bg-slate-50 rounded" />
                                        <div className="h-2 w-full bg-slate-50 rounded" />
                                        <div className="h-2 w-2/3 bg-slate-50 rounded" />
                                    </div>
                                    <div className="mt-6">
                                        <button
                                            className="px-4 py-2 rounded text-[10px] font-bold text-white transition-opacity hover:opacity-90 uppercase tracking-wider"
                                            style={{ backgroundColor: brandPrimaryColor }}
                                        >
                                            Execute Audit
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
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
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Feature Flags */}
            <Card className="border-amber-100 bg-amber-50/10">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Zap className="h-5 w-5 text-amber-500" />
                        Feature Flags
                    </CardTitle>
                    <CardDescription>
                        Enable or disable specific features for this organization.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                            <div>
                                <Label className="text-sm font-medium">AI Assistant</Label>
                                <p className="text-xs text-muted-foreground">Enable AI-powered compliance recommendations</p>
                            </div>
                            <Switch
                                checked={featureFlags.aiAssistant ?? true}
                                onCheckedChange={(checked) => setFeatureFlags(prev => ({ ...prev, aiAssistant: checked }))}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                            <div>
                                <Label className="text-sm font-medium">Advanced Analytics</Label>
                                <p className="text-xs text-muted-foreground">Enable detailed compliance analytics</p>
                            </div>
                            <Switch
                                checked={featureFlags.advancedAnalytics ?? true}
                                onCheckedChange={(checked) => setFeatureFlags(prev => ({ ...prev, advancedAnalytics: checked }))}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                            <div>
                                <Label className="text-sm font-medium">Threat Intelligence</Label>
                                <p className="text-xs text-muted-foreground">Enable threat intelligence feeds</p>
                            </div>
                            <Switch
                                checked={featureFlags.threatIntel ?? true}
                                onCheckedChange={(checked) => setFeatureFlags(prev => ({ ...prev, threatIntel: checked }))}
                            />
                        </div>
                        <div className="flex items-center justify-between p-3 border rounded-lg bg-white/50">
                            <div>
                                <Label className="text-sm font-medium">Custom Workflows</Label>
                                <p className="text-xs text-muted-foreground">Enable custom workflow automation</p>
                            </div>
                            <Switch
                                checked={featureFlags.customWorkflows ?? false}
                                onCheckedChange={(checked) => setFeatureFlags(prev => ({ ...prev, customWorkflows: checked }))}
                            />
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        onClick={() => {
                            saveFeatureFlagsMutation.mutate({
                                clientId,
                                featureFlags
                            });
                        }}
                        disabled={saveFeatureFlagsMutation.isPending}
                    >
                        {saveFeatureFlagsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Settings className="mr-2 h-4 w-4" />}
                        Save Feature Flags
                    </Button>
                </CardContent>
            </Card>

            {/* Custom Settings */}
            <Card className="border-purple-100 bg-purple-50/10">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Code className="h-5 w-5 text-purple-500" />
                        Custom Settings
                    </CardTitle>
                    <CardDescription>
                        Advanced JSON configuration for deep customization. Leave empty to use premium defaults.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Textarea
                        value={customSettings}
                        onChange={(e) => setCustomSettings(e.target.value)}
                        placeholder='{ "customField": "value" }'
                        className="font-mono text-sm min-h-[150px]"
                    />
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => {
                                try {
                                    const parsed = customSettings ? JSON.parse(customSettings) : {};
                                    saveFeatureFlagsMutation.mutate({
                                        clientId,
                                        customSettings: parsed
                                    });
                                } catch (e) {
                                    toast.error("Invalid JSON format");
                                }
                            }}
                            disabled={saveFeatureFlagsMutation.isPending}
                        >
                            {saveFeatureFlagsMutation.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Code className="mr-2 h-4 w-4" />}
                            Save Custom Settings
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setCustomSettings("")}
                        >
                            Reset to Defaults
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
