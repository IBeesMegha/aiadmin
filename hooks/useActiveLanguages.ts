'use client';

/**
 * useActiveLanguages
 *
 * Loads the active languages (default language first) for the Content Manager
 * language pickers. Content editors only ever see active languages.
 */

import { useEffect, useState } from 'react';
import { fetchActiveLanguages, type Language } from '@/lib/content-i18n-client';

export function useActiveLanguages() {
  const [languages, setLanguages] = useState<Language[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    fetchActiveLanguages()
      .then((result) => {
        if (mounted) setLanguages(result);
      })
      .catch((error) => {
        console.error('Failed to load active languages:', error);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  return { languages, loading };
}
