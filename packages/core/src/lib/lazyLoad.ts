import { lazy, ComponentType } from 'react';

/**
 * Enhanced lazy loader that handles ChunkLoadErrors (useful for deployments)
 * by retrying once and then reloading the page.
 */
export function lazyLoad(importFn: () => Promise<{ default: ComponentType<any> }>) {
  return lazy(async () => {
    const key = `retry-lazy-${importFn.toString()}`;
    const hasRetried = window.sessionStorage.getItem(key);

    try {
      const result = await importFn();
      window.sessionStorage.removeItem(key);
      return result;
    } catch (error: any) {
      // Check if it's a dynamic import error (ChunkLoadError or network failure)
      const isChunkError = 
        error.name === 'ChunkLoadError' || 
        error.message?.includes('Failed to fetch dynamically imported module') ||
        error.message?.includes('loading dynamically imported module');

      if (isChunkError && !hasRetried) {
        console.warn('Chunk loading failed. Retrying once...', error);
        window.sessionStorage.setItem(key, 'true');
        return window.location.reload() as any;
      }

      console.error('Lazy load failed completely:', error);
      throw error;
    }
  });
}
