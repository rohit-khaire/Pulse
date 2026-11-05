'use client';

import React, { useState } from 'react';
import { Share2, Check, MessageCircle } from 'lucide-react';

interface ShareBragButtonProps {
  text: string;
  className?: string;
  label?: string;
}

export function ShareBragButton({ text, className = '', label = 'Brag' }: ShareBragButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    const shareMessage = `🔥 Pulse Fantasy Update:\n"${text}"\n\nFollowed live with AI on Pulse Cricket Companion!`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`;

    // Try web share first if on mobile
    if (navigator.share) {
      navigator
        .share({
          title: 'Pulse Cricket Fantasy',
          text: shareMessage,
        })
        .catch(() => {
          window.open(whatsappUrl, '_blank');
        });
    } else {
      // Open WhatsApp or copy
      window.open(whatsappUrl, '_blank');
    }

    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleShare}
      className={`inline-flex items-center space-x-1 min-h-11 min-w-11 justify-center px-2.5 rounded-lg text-[11px] font-bold transition-all ${
        copied
          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
          : 'bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-400 border border-emerald-500/30'
      } ${className}`}
      title="Share to WhatsApp cricket group"
      aria-label="Share this update to WhatsApp"
    >
      {copied ? (
        <>
          <Check className="w-3 h-3 text-emerald-400" />
          <span>Shared!</span>
        </>
      ) : (
        <>
          <MessageCircle className="w-3 h-3 fill-emerald-400 text-transparent" />
          <span>{label}</span>
        </>
      )}
    </button>
  );
}

