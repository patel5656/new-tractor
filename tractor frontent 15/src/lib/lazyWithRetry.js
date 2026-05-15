import { lazy } from 'react';

/**
 * A wrapper for React.lazy that retries the import on failure.
 * Useful for handling chunk loading errors caused by spotty network connections.
 */
export const lazyWithRetry = (componentImport) =>
  lazy(async () => {
    const STORAGE_KEY = 'chunk_retry_count';
    
    try {
      const component = await componentImport();
      window.sessionStorage.removeItem(STORAGE_KEY);
      return component;
    } catch (error) {
      const retryCount = parseInt(window.sessionStorage.getItem(STORAGE_KEY) || '0', 10);
      
      // Retry up to 2 times (3 attempts total)
      if (retryCount < 2) {
        window.sessionStorage.setItem(STORAGE_KEY, (retryCount + 1).toString());
        
        // Wait 1.5 seconds before retrying
        console.warn(`[LazyLoad] Chunk fetch failed. Retry ${retryCount + 1}/2...`);
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Use a simple window reload if needed, but here we just re-try the import
        return window.location.reload(); 
      }
      
      // If we exhausted retries, bubble up the error to be caught by ErrorBoundary
      window.sessionStorage.removeItem(STORAGE_KEY);
      throw error;
    }
  });
