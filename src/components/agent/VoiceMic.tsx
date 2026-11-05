'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import { stopSpeaking } from '@/lib/useVoice';
import { useAgentStore } from './agentStore';

/* eslint-disable @typescript-eslint/no-explicit-any */
function getRecognitionCtor(): any {
  if (typeof window === 'undefined') return null;
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const ERRORS: Record<string, string> = {
  'not-allowed': 'Microphone permission is blocked. Allow it in the browser, or type your question.',
  'service-not-allowed': 'Voice input is blocked on this device. You can type instead.',
  'no-speech': "I didn't hear anything. Hold the mic and speak.",
  'audio-capture': 'No microphone found.',
  network: 'Voice recognition needs an internet connection. You can type instead.',
};

/** Push-to-talk: hold to speak, release to send. hi-IN and en-IN. Falls back gracefully where unsupported. */
export function VoiceMic() {
  const lang = usePulseStore((s) => s.lang);
  const listening = useAgentStore((s) => s.listening);
  const micLang = useAgentStore((s) => s.micLang);
  const setMicLang = useAgentStore((s) => s.setMicLang);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const recRef = useRef<any>(null);
  const finalRef = useRef('');
  const activeRef = useRef(false);

  useEffect(() => {
    setSupported(!!getRecognitionCtor());
    return () => {
      try {
        recRef.current?.abort();
      } catch {
        /* noop */
      }
    };
  }, []);

  const effective: 'hi-IN' | 'en-IN' = micLang === 'auto' ? (lang === 'en' ? 'en-IN' : 'hi-IN') : micLang;

  const start = () => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) {
      setNote('Voice input is not supported in this browser (try Chrome or Edge). You can type your question.');
      return;
    }
    if (activeRef.current) return;
    const store = useAgentStore.getState();
    stopSpeaking(); // never let Pulse's own voice leak into the mic
    setNote(null);
    finalRef.current = '';
    try {
      const rec = new Ctor();
      rec.lang = effective;
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      rec.onresult = (e: any) => {
        let interim = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) finalRef.current += r[0].transcript;
          else interim += r[0].transcript;
        }
        store.setDraft((finalRef.current + interim).trim());
      };
      rec.onerror = (e: any) => setNote(ERRORS[e?.error] ?? 'Voice input failed. You can type instead.');
      rec.onend = () => {
        activeRef.current = false;
        useAgentStore.getState().setListening(false);
        const text = (finalRef.current || useAgentStore.getState().draft).trim();
        if (text) useAgentStore.getState().submitVoice(text);
      };
      recRef.current = rec;
      activeRef.current = true;
      store.setListening(true);
      rec.start();
    } catch {
      activeRef.current = false;
      store.setListening(false);
      setNote('Could not start the microphone.');
    }
  };

  const stop = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* noop */
    }
  };

  if (supported === false) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setNote('Voice input is not supported in this browser (try Chrome or Edge). You can type your question.')}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-500 border border-slate-700"
          aria-label="Voice input not supported"
        >
          <MicOff className="w-4 h-4" />
        </button>
        {note && <p className="absolute bottom-12 left-0 w-56 rounded-lg bg-slate-800 border border-slate-700 p-2 text-[10px] text-slate-300 shadow-xl">{note}</p>}
      </div>
    );
  }

  return (
    <div className="relative flex items-center gap-1">
      <button
        type="button"
        onClick={() => setMicLang(effective === 'hi-IN' ? 'en-IN' : 'hi-IN')}
        className="px-1.5 py-1 rounded-md text-[10px] font-bold text-slate-400 border border-slate-700 hover:text-white"
        aria-label={`Speech language ${effective}`}
        title="Speech recognition language"
      >
        {effective === 'hi-IN' ? 'हि' : 'EN'}
      </button>
      <button
        type="button"
        aria-label="Hold to talk"
        aria-pressed={listening}
        onPointerDown={(e) => {
          e.preventDefault();
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          start();
        }}
        onPointerUp={stop}
        onPointerCancel={stop}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => {
          if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
            e.preventDefault();
            start();
          }
        }}
        onKeyUp={(e) => {
          if (e.key === ' ' || e.key === 'Enter') stop();
        }}
        className={`touch-none select-none p-2.5 rounded-xl border transition-all ${
          listening ? 'bg-red-600 border-red-400 text-white scale-110 shadow-lg shadow-red-600/50 animate-pulse' : 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700'
        }`}
      >
        <Mic className="w-4 h-4" />
      </button>
      {note && <p className="absolute bottom-12 right-0 w-56 rounded-lg bg-slate-800 border border-slate-700 p-2 text-[10px] text-slate-300 shadow-xl">{note}</p>}
    </div>
  );
}
