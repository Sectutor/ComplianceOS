import React, { createContext, useContext, useState, ReactNode, ComponentType } from 'react';

/**
 * Standard slot names for enterprise/premium extensions
 */
export type ExtensionSlotName =
  | 'global.copilot'
  | 'global.copilot-panel'
  | 'topbar.copilot-help'
  | 'frameworks.custom-import'
  | 'tprm.mitigation-viewer'
  | 'ai.enhance-button'
  | (string & {});

export interface ExtensionRegistryState {
  extensions: Record<string, ComponentType<any>>;
  registerExtension: (name: ExtensionSlotName, component: ComponentType<any>) => void;
  unregisterExtension: (name: ExtensionSlotName) => void;
}

const ExtensionContext = createContext<ExtensionRegistryState>({
  extensions: {},
  registerExtension: () => {},
  unregisterExtension: () => {},
});

/**
 * Global provider for open-core extension slots
 */
export function ExtensionProvider({
  children,
  initialExtensions = {},
}: {
  children: ReactNode;
  initialExtensions?: Record<string, ComponentType<any>>;
}) {
  const [extensions, setExtensions] = useState<Record<string, ComponentType<any>>>(initialExtensions);

  const registerExtension = (name: ExtensionSlotName, component: ComponentType<any>) => {
    setExtensions((prev) => ({
      ...prev,
      [name]: component,
    }));
  };

  const unregisterExtension = (name: ExtensionSlotName) => {
    setExtensions((prev) => {
      const copy = { ...prev };
      delete copy[name];
      return copy;
    });
  };

  return (
    <ExtensionContext.Provider value={{ extensions, registerExtension, unregisterExtension }}>
      {children}
    </ExtensionContext.Provider>
  );
}

/**
 * Hook to access and register extensions
 */
export function useExtensions() {
  return useContext(ExtensionContext);
}

import { registry } from './registry';

/**
 * ExtensionSlot component: renders a registered plugin or a fallback.
 * Allows @complianceos/core to stay 100% decoupled from premium add-ons.
 */
export function ExtensionSlot<P = Record<string, any>>({
  name,
  props,
  fallback = null,
}: {
  name: ExtensionSlotName;
  props?: P;
  fallback?: ReactNode;
}) {
  const { extensions } = useContext(ExtensionContext);
  const ExtensionComponent = extensions[name];
  const registeredList = registry.getComponents(name);

  if (ExtensionComponent) {
    return <ExtensionComponent {...(props || ({} as P))} />;
  }

  if (registeredList && registeredList.length > 0) {
    return (
      <>
        {registeredList.map((Comp, idx) => (
          <Comp key={`${name}-${idx}`} {...(props || ({} as P))} />
        ))}
      </>
    );
  }

  return <>{fallback}</>;
}
