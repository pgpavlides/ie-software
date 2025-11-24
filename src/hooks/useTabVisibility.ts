import { useState, useEffect } from 'react';

/**
 * Hook to track browser tab visibility
 * Prevents unnecessary operations when tab is not visible
 */
export function useTabVisibility() {
  const [isVisible, setIsVisible] = useState(!document.hidden);

  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}

/**
 * Hook to cache data in sessionStorage with expiration
 */
export function useSessionCache<T>(key: string, ttlMinutes: number = 5) {
  const set = (data: T) => {
    try {
      sessionStorage.setItem(key, JSON.stringify(data));
      sessionStorage.setItem(`${key}_time`, Date.now().toString());
    } catch (error) {
      console.error('Error setting session cache:', error);
    }
  };

  const get = (): T | null => {
    try {
      const cached = sessionStorage.getItem(key);
      const cacheTime = sessionStorage.getItem(`${key}_time`);
      
      if (!cached || !cacheTime) return null;
      
      const age = Date.now() - parseInt(cacheTime);
      if (age > ttlMinutes * 60 * 1000) {
        // Cache expired, clear it
        sessionStorage.removeItem(key);
        sessionStorage.removeItem(`${key}_time`);
        return null;
      }
      
      return JSON.parse(cached);
    } catch (error) {
      console.error('Error getting session cache:', error);
      return null;
    }
  };

  const clear = () => {
    sessionStorage.removeItem(key);
    sessionStorage.removeItem(`${key}_time`);
  };

  return { get, set, clear };
}