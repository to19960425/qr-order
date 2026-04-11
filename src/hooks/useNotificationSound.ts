'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

const STORAGE_KEY = 'qr-order:notification-enabled';
const FREQUENCY = 800;
const DURATION = 0.2;

export function useNotificationSound() {
  const ctxRef = useRef<AudioContext | null>(null);
  const [isEnabled, setIsEnabled] = useState(() => {
    try {
      return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  // localStorage にフラグがあれば AudioContext を初期化 + アンマウント時クリーンアップ
  useEffect(() => {
    if (isEnabled && !ctxRef.current) {
      try {
        ctxRef.current = new AudioContext();
      } catch {
        setIsEnabled(false);
      }
    }
    return () => {
      ctxRef.current?.close().catch(() => {});
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const enableNotification = useCallback(() => {
    try {
      ctxRef.current?.close().catch(() => {});
    } catch { /* already closed */ }
    try {
      ctxRef.current = new AudioContext();
      setIsEnabled(true);
      window.localStorage.setItem(STORAGE_KEY, 'true');
    } catch {
      setIsEnabled(false);
    }
  }, []);

  const playNotification = useCallback(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(FREQUENCY, ctx.currentTime);

    gain.gain.setValueAtTime(0.5, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + DURATION);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + DURATION);
  }, []);

  return { isEnabled, enableNotification, playNotification };
}
