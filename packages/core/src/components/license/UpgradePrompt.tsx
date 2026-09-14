/**
 * Upgrade Prompt Components
 * 
 * Provides unified prompts and banners to guide open-source users to the commercial UpgradeModal.
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@complianceos/ui/ui/dialog';
import { Button } from '@complianceos/ui/ui/button';
import { Badge } from '@complianceos/ui/ui/badge';
import {
  Sparkles,
  Lock,
} from 'lucide-react';
import { useLicense } from '@/lib/license/index';
import { UpgradeModal } from './UpgradeModal';

interface UpgradePromptProps {
  trigger?: React.ReactNode;
  featureId?: string;
  featureName?: string;
  featureDescription?: string;
  showTrialOption?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

/**
 * Main upgrade prompt dialog
 */
export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  trigger,
  featureName = 'Premium Feature',
  featureDescription = 'This feature requires an Enterprise license',
}) => {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const { isCommunityEdition, isTrialEdition } = useLicense();

  const isCommunity = isCommunityEdition();
  const isTrial = isTrialEdition();

  if (!isCommunity && !isTrial) return null;

  return (
    <>
      <UpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureName={featureName}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className="max-w-md border border-border">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold">Upgrade to Enterprise</DialogTitle>
                <DialogDescription className="text-xs">
                  Unlock {featureName} and advanced compliance automation
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="bg-muted/40 p-3.5 rounded-lg border border-border">
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-semibold text-xs">{featureName}</span>
                <Badge variant="outline" className="text-[10px] uppercase font-bold text-primary border-primary/30">Enterprise</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{featureDescription}</p>
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <Button
              className="sm:flex-1 font-semibold text-xs gap-1.5"
              onClick={() => {
                setOpen(false);
                setModalOpen(true);
              }}
            >
              <Sparkles className="w-3.5 h-3.5" />
              View Plans & Activate
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setOpen(false)}>
              Maybe Later
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

/**
 * Inline upgrade banner
 */
export const InlineUpgradePrompt: React.FC<{
  featureName?: string;
  compact?: boolean;
}> = ({ featureName = 'this feature', compact = false }) => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isCommunityEdition } = useLicense();

  if (!isCommunityEdition()) return null;

  return (
    <>
      <UpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureName={featureName}
      />
      {compact ? (
        <button
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-1 rounded hover:bg-primary/20 transition-colors"
        >
          <Lock className="w-3 h-3" />
          <span>Upgrade for {featureName}</span>
        </button>
      ) : (
        <div className="flex items-center justify-between p-3.5 bg-muted/40 border border-border rounded-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-semibold text-xs text-foreground">Unlock {featureName}</h4>
              <p className="text-xs text-muted-foreground">
                Available in Professional and Enterprise MSP editions.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            className="text-xs font-semibold gap-1.5"
            onClick={() => setModalOpen(true)}
          >
            <Sparkles className="h-3.5 w-3.5" /> Upgrade Plan
          </Button>
        </div>
      )}
    </>
  );
};

/**
 * Floating upgrade button
 */
export const FloatingUpgradeButton: React.FC = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const { isCommunityEdition } = useLicense();

  if (!isCommunityEdition()) return null;

  return (
    <>
      <UpgradeModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        featureName="Enterprise Edition"
      />
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          className="rounded-full shadow-lg h-12 w-12 p-0 gap-0"
          onClick={() => setModalOpen(true)}
        >
          <Sparkles className="w-5 h-5 text-amber-300" />
        </Button>
      </div>
    </>
  );
};

export default UpgradePrompt;