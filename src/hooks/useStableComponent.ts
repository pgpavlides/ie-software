import { useRef, useEffect } from 'react';

/**
 * Hook to prevent component remounting during tab switches and auth events
 * Maintains component state across tab visibility changes
 */
export function useStableComponent() {
  const hasInitialized = useRef(false);
  
  useEffect(() => {
    hasInitialized.current = true;
  }, []);
  
  return hasInitialized.current;
}

/**
 * Hook to track if component should skip initial loading due to tab switch
 */
export function useTabSwitchDetection() {
  const isTabSwitchRef = useRef(false);
  
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // Tab became hidden
        isTabSwitchRef.current = true;
      } else if (isTabSwitchRef.current) {
        // Tab became visible again after being hidden
        // Component should NOT reload data
        isTabSwitchRef.current = false;
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);
  
  return isTabSwitchRef.current;
}