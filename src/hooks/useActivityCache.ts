import { useState, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface ActivityCache {
  [key: string]: CacheEntry<any>;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export function useActivityCache() {
  const [cache, setCache] = useState<ActivityCache>({});

  const get = useCallback(<T>(key: string): T | null => {
    const entry = cache[key];
    if (!entry) return null;
    
    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      // Cache expired, remove it
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
      return null;
    }
    
    return entry.data as T;
  }, [cache]);

  const set = useCallback(<T>(key: string, data: T, ttl: number = CACHE_TTL): void => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        ttl
      }
    }));
  }, []);

  const clear = useCallback((key?: string): void => {
    if (key) {
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
    } else {
      setCache({});
    }
  }, []);

  const isExpired = useCallback((key: string): boolean => {
    const entry = cache[key];
    if (!entry) return true;
    
    const now = Date.now();
    return now - entry.timestamp > entry.ttl;
  }, [cache]);

  return {
    get,
    set,
    clear,
    isExpired,
    hasKey: (key: string) => key in cache
  };
}
