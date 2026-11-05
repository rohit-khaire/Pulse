'use client';

import { useEffect, useRef } from 'react';
import { usePulseStore } from '@/lib/store';

export function voiceSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function stopSpeaking(): void {
  if (voiceSupported()) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignore synthesis errors
    }
  }
}

export function speak(text: string, lang: string = 'en'): void {
  if (!voiceSupported() || !text) return;
  try {
    stopSpeaking();
    const utterance = new SpeechSynthesisUtterance(text);
    const code = lang === 'hi' ? 'hi-IN' : lang === 'hinglish' ? 'hi-IN' : 'en-IN';
    utterance.lang = code;
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } catch {
    // Ignore synthesis errors
  }
}

/** Hook that speaks new live nudges aloud if the user enabled voice in settings. */
export function useAutoSpeak(): void {
  const voice = usePulseStore((s) => s.voice);
  const nudges = usePulseStore((s) => s.nudges);
  const lang = usePulseStore((s) => s.lang);
  const lastNudgeIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!voice || nudges.length === 0) return;
    const latest = nudges[nudges.length - 1];
    if (latest && latest.id !== lastNudgeIdRef.current) {
      lastNudgeIdRef.current = latest.id;
      speak(latest.text, latest.lang || lang);
    }
  }, [voice, nudges, lang]);
}

