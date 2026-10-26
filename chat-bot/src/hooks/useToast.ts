// ── Toast notification hook ──

import { useState, useCallback, useRef } from 'react';
import type { ToastType } from '../types';

export function useToast() {
  const [message, setMessage] = useState('');
  const [type, setType] = useState<ToastType>('');
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const toast = useCallback((msg: string, t: ToastType) => {
    setMessage(msg);
    setType(t);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setType('');
      setMessage('');
    }, 5000);
  }, []);

  const dismiss = useCallback(() => {
    setType('');
    setMessage('');
  }, []);

  return { message, type, toast, dismiss };
}
