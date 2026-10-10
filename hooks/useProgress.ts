'use client';

import { useCallback, useEffect, useState } from 'react';

export function useProgress(key: string) {
  const [value, setValue] = useState<string[]>([]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(window.localStorage.getItem(key) || '[]');
      setValue(Array.isArray(parsed) ? parsed : []);
    } catch {
      setValue([]);
    }
  }, [key]);

  const update = useCallback((next: string[]) => {
    setValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch {}
  }, [key]);

  return { completed: value, setCompleted: update, progress: value.length };
}
