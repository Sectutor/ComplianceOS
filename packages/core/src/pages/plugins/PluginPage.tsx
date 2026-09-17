import React from 'react';
import { useLocation } from 'wouter';
import { trpc } from '@/lib/trpc';
import { useClientContext } from '@/contexts/ClientContext';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@complianceos/ui/ui/card';
import { Button } from '@complianceos/ui/ui/button';
import { ArrowLeft, ExternalLink, Settings, Shield } from 'lucide-react';
import { Skeleton } from '@complianceos/ui/ui/skeleton';

export const PluginPage: React.FC = () => {
  const [location, setLocation] = useLocation();
  const { selectedClientId } = useClientContext();
  
  // Extract slug from URL: /clients/:id/plugins/:slug
  const match = location.match(/\/clients\/\d+\/plugins\/([^/]+)/);
  const slug = match ? match[1] : null;

  const { data: plugin, isLoading } = trpc.plugins.getMarketplacePlugin.useQuery(
    { slug: slug || '' },
    { enabled: !!slug }
  );

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-8 w-8 rounded-full" />
          <Skeleton className="h-8 w-64" />
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48 mb-2" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!plugin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Shield className="h-12 w-12 text-muted-foreground opacity-20" />
        <h2 className="text-xl font-semibold">Plugin Not Found</h2>
        <p className="text-muted-foreground">The requested plugin could not be found or is not available.</p>
        <Button variant="outline" onClick={() => setLocation('/settings/plugins')}>
          Back to Marketplace
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => window.history.back()}
            className="rounded-full"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">{plugin.name}</h1>
            <p className="text-muted-foreground text-sm flex items-center gap-2">
              By {plugin.author} • v{plugin.version}
              {plugin.homepage && (
                <a href={plugin.homepage} target="_blank" rel="noreferrer" className="inline-flex items-center hover:text-primary">
                  <ExternalLink className="h-3 w-3 ml-1" />
                </a>
              )}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setLocation(`/clients/${selectedClientId}/settings/plugins?plugin=${plugin.id}`)}>
            <Settings className="h-4 w-4 mr-2" />
            Plugin Settings
          </Button>
        </div>
      </div>

      <Card className="border-none shadow-premium bg-white/50 backdrop-blur-sm overflow-hidden min-h-[600px]">
        <CardHeader className="bg-slate-50/50 border-b">
          <CardTitle className="text-lg">App Extension: {plugin.name}</CardTitle>
          <CardDescription>{plugin.description}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 flex items-center justify-center min-h-[500px]">
          {/* 
            In a real implementation, we would dynamic import based on plugin.frontend
            For demo purposes, we show a professional placeholder for the Risk Game
          */}
          <div className="text-center space-y-6 max-w-md p-8">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4 animate-pulse">
              <Shield className="h-10 w-10 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Interactive {plugin.name} Demo</h3>
            <p className="text-muted-foreground">
              This extension has been successfully registered and mapped to your workspace. 
              The plugin container is ready to load the component from:
              <code className="block mt-2 p-2 bg-slate-100 rounded text-xs">
                {plugin.frontend || 'Default Entry Point'}
              </code>
            </p>
            <div className="pt-4 grid grid-cols-2 gap-3 text-left">
              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                <p className="text-[10px] font-bold uppercase text-emerald-600 mb-1">Status</p>
                <p className="text-sm font-medium">Active & Mounted</p>
              </div>
              <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
                <p className="text-[10px] font-bold uppercase text-blue-600 mb-1">Permissions</p>
                <p className="text-sm font-medium">{plugin.permissions.length} Granted</p>
              </div>
            </div>
            <Button className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200">
              Launch Extension Interface
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default PluginPage;
