'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Check, Download, Link2, MessageCircle, Share2, X } from 'lucide-react';
import { ogPath, sharePath, shareCaption, type OgVariant, type SharePayload } from '@/lib/social/payload';
import { useSocialStore } from '@/lib/social/store';
import { cleanText } from '@/lib/social/text';
import { st } from './copy';
import { RESPONSIBLE_NOTE } from './ui';

interface Props {
  payload: SharePayload | null;
  open: boolean;
  onClose: () => void;
}

async function fetchImageFile(url: string): Promise<File> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`image ${res.status}`);
  const blob = await res.blob();
  return new File([blob], 'pulse-card.png', { type: blob.type || 'image/png' });
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(ta);
      return ok;
    } catch {
      return false;
    }
  }
}

/**
 * Bottom sheet: card preview (wide / 9:16 story) + WhatsApp, native share with the image file when
 * the browser allows it, copy link, download. No backend: the whole card lives in the URL.
 */
export function ShareSheet({ payload, open, onClose }: Props) {
  const displayName = useSocialStore((s) => s.displayName);
  const setDisplayName = useSocialStore((s) => s.setDisplayName);
  const [variant, setVariant] = useState<OgVariant>('wide');
  const [mounted, setMounted] = useState(false);
  const [imgState, setImgState] = useState<'loading' | 'ok' | 'error'>('loading');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => setMounted(true), []);

  const effective = useMemo<SharePayload | null>(() => {
    if (!payload) return null;
    const name = cleanText(displayName, 24);
    return name ? ({ ...payload, n: name } as SharePayload) : payload;
  }, [payload, displayName]);

  const t = st(effective?.l ?? 'hinglish');
  const imagePath = effective ? ogPath(effective, variant) : '';

  useEffect(() => {
    setImgState('loading');
  }, [imagePath]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const flash = (msg: string) => {
    setStatus(msg);
    if (statusTimer.current) clearTimeout(statusTimer.current);
    statusTimer.current = setTimeout(() => setStatus(''), 2500);
  };

  if (!open || !mounted || !effective) return null;

  const origin = window.location.origin;
  const pageUrl = origin + sharePath(effective);
  const imageUrl = origin + imagePath;
  const caption = shareCaption(effective);
  const isLocal = /^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(window.location.hostname);

  const onWhatsApp = () => {
    const text = `${caption}\n${pageUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const onNativeShare = async () => {
    setBusy(true);
    try {
      if (typeof navigator.share !== 'function') {
        flash((await copyText(pageUrl)) ? t.copied : t.failed);
        return;
      }
      try {
        const file = await fetchImageFile(imageUrl);
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], text: `${caption}\n${pageUrl}` });
          flash(t.shared);
          return;
        }
      } catch (e) {
        if ((e as DOMException)?.name === 'AbortError') return;
        // image fetch failed or files unsupported: fall through to link share
      }
      await navigator.share({ text: caption, url: pageUrl });
      flash(t.shared);
    } catch (e) {
      if ((e as DOMException)?.name !== 'AbortError') flash(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const onCopy = async () => flash((await copyText(pageUrl)) ? t.copied : t.failed);

  const onDownload = async () => {
    setBusy(true);
    try {
      const file = await fetchImageFile(imageUrl);
      const href = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = href;
      a.download = `pulse-${effective.k}-${variant}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(href), 2000);
    } catch {
      flash(t.failed);
    } finally {
      setBusy(false);
    }
  };

  const btn =
    'flex flex-col items-center justify-center space-y-1 py-2.5 rounded-xl border text-[11px] font-bold active:scale-95 transition-all disabled:opacity-50';

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end justify-center" role="dialog" aria-modal="true" aria-label={t.title}>
      <button className="absolute inset-0 bg-black/70" onClick={onClose} aria-label="Close" />
      <div className="relative w-full max-w-md rounded-t-3xl bg-slate-900 border-t border-slate-700 p-4 pb-6 max-h-[92vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between mb-3">
          <div className="text-sm font-extrabold text-white flex items-center space-x-1.5">
            <Share2 className="w-4 h-4 text-red-400" />
            <span>{t.title}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-3 text-xs font-bold">
          {(['wide', 'story'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setVariant(v)}
              aria-pressed={variant === v}
              className={`py-1.5 rounded-lg ${variant === v ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
            >
              {v === 'wide' ? t.wide : t.story}
            </button>
          ))}
        </div>

        <div
          className={`relative mx-auto rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 ${
            variant === 'wide' ? 'w-full aspect-[1200/630]' : 'w-48 aspect-[9/16]'
          }`}
        >
          {imgState !== 'error' && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={imagePath}
              src={imagePath}
              alt={caption}
              className={`w-full h-full object-cover transition-opacity ${imgState === 'ok' ? 'opacity-100' : 'opacity-0'}`}
              onLoad={() => setImgState('ok')}
              onError={() => setImgState('error')}
            />
          )}
          {imgState === 'loading' && (
            <div className="absolute inset-0 flex items-center justify-center text-[11px] text-slate-500 animate-pulse">{t.loading}</div>
          )}
          {imgState === 'error' && (
            <div className="absolute inset-0 flex items-center justify-center p-3 text-center text-[11px] text-slate-400">{t.previewFail}</div>
          )}
        </div>

        <p className="mt-3 text-xs text-slate-300 leading-snug">{caption}</p>

        <label className="mt-3 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {t.name}
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            maxLength={24}
            placeholder={effective.n}
            className="mt-1 w-full rounded-lg bg-slate-950 border border-slate-800 px-2.5 py-1.5 text-sm font-medium normal-case tracking-normal text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500"
          />
        </label>

        <div className="mt-3 grid grid-cols-4 gap-2">
          <button onClick={onWhatsApp} className={`${btn} bg-emerald-600/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/25`}>
            <MessageCircle className="w-4 h-4" />
            <span>{t.whatsapp}</span>
          </button>
          <button onClick={onNativeShare} disabled={busy} className={`${btn} bg-red-600/15 border-red-500/40 text-red-300 hover:bg-red-600/25`}>
            <Share2 className="w-4 h-4" />
            <span>{t.image}</span>
          </button>
          <button onClick={onCopy} className={`${btn} bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700`}>
            <Link2 className="w-4 h-4" />
            <span>{t.copy}</span>
          </button>
          <button onClick={onDownload} disabled={busy} className={`${btn} bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700`}>
            <Download className="w-4 h-4" />
            <span>{t.download}</span>
          </button>
        </div>

        <div className="mt-2 h-4 text-[11px] text-emerald-300 font-semibold flex items-center space-x-1" aria-live="polite">
          {status && (
            <>
              <Check className="w-3 h-3" />
              <span>{status}</span>
            </>
          )}
        </div>
        {isLocal && <p className="text-[10px] text-amber-300/80">{t.localhost}</p>}
        <p className="mt-1 text-[10px] text-slate-500">{RESPONSIBLE_NOTE}</p>
      </div>
    </div>,
    document.body
  );
}
