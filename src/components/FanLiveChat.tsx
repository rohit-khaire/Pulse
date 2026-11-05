'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePulseStore } from '@/lib/store';
import { ChatMessage, generateFanReactionForDelivery } from '@/lib/engine/chat';
import { Send, MessageSquare, ThumbsUp, Flame, Heart, Users, Sparkles } from 'lucide-react';

export function FanLiveChat() {
  const { frames, cursor } = usePulseStore();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      sender: 'CricketFan_Delhi',
      avatarColor: 'bg-red-500',
      text: 'What a thriller match! Rajasthan vs Punjab always goes to the last over! 🔥🏏',
      timestamp: '2m ago',
      likes: 18,
      badge: 'Live',
    },
    {
      id: 'init-2',
      sender: 'Aman_PBKS',
      avatarColor: 'bg-rose-500',
      text: 'Mayank and Rahul are batting so well, Punjab will easily chase 185! 💪',
      timestamp: '1m ago',
      likes: 8,
    },
  ]);

  const [inputVal, setInputVal] = useState('');
  const [pollVote, setPollVote] = useState<'RR' | 'PBKS' | null>(null);
  const [rrVotes, setRrVotes] = useState(64);
  const [pbksVotes, setPbksVotes] = useState(36);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  // When cursor updates, generate live crowd reaction
  useEffect(() => {
    if (cursor > 0 && frames[cursor]) {
      const newReactions = generateFanReactionForDelivery(frames[cursor]);
      if (newReactions.length > 0) {
        setMessages((prev) => {
          const map = new Map(prev.map((m) => [m.id, m]));
          for (const r of newReactions) {
            map.set(r.id, r);
          }
          return Array.from(map.values()).slice(-30);
        });
      }
    }
  }, [cursor, frames]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'You',
      avatarColor: 'bg-emerald-600',
      text: inputVal.trim(),
      timestamp: 'Just now',
      isUser: true,
      likes: 1,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputVal('');
  };

  const handleQuickEmoji = (emoji: string) => {
    const userMsg: ChatMessage = {
      id: `user-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      sender: 'You',
      avatarColor: 'bg-emerald-600',
      text: emoji,
      timestamp: 'Just now',
      isUser: true,
      likes: 1,
    };
    setMessages((prev) => [...prev, userMsg]);
  };

  const handleVote = (team: 'RR' | 'PBKS') => {
    if (pollVote) return;
    setPollVote(team);
    if (team === 'RR') setRrVotes((v) => v + 1);
    else setPbksVotes((v) => v + 1);
  };

  const totalVotes = rrVotes + pbksVotes;
  const rrPct = Math.round((rrVotes / totalVotes) * 100);
  const pbksPct = 100 - rrPct;

  return (
    <div className="flex flex-col h-[520px] bg-slate-900/90 rounded-2xl border border-slate-800 shadow-xl overflow-hidden pb-2">
      {/* Top Poll / Crowd Sentiment Header */}
      <div className="p-3 bg-slate-950/80 border-b border-slate-800">
        <div className="flex items-center justify-between mb-1.5 text-xs">
          <div className="flex items-center space-x-1.5 font-bold text-white">
            <Users className="w-3.5 h-3.5 text-red-500" />
            <span>Fan Room (simulated demo crowd)</span>
          </div>
          <span className="text-[10px] text-slate-400">Crowd Poll</span>
        </div>

        {/* Live Crowd Poll Bar */}
        <div className="bg-slate-900 p-2 rounded-xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <button
              onClick={() => handleVote('RR')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                pollVote === 'RR' ? 'bg-blue-600 text-white' : 'text-blue-400 hover:text-white'
              }`}
            >
              Rajasthan Royals ({rrPct}%)
            </button>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Who wins?</span>
            <button
              onClick={() => handleVote('PBKS')}
              className={`px-2 py-0.5 rounded-md transition-colors ${
                pollVote === 'PBKS' ? 'bg-red-600 text-white' : 'text-red-400 hover:text-white'
              }`}
            >
              Punjab Kings ({pbksPct}%)
            </button>
          </div>

          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden flex">
            <div className="bg-blue-500 h-full transition-all duration-300" style={{ width: `${rrPct}%` }} />
            <div className="bg-red-500 h-full transition-all duration-300" style={{ width: `${pbksPct}%` }} />
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div ref={chatScrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
        {messages.map((m, idx) => (
          <div
            key={`${m.id}-${idx}`}
            className={`flex items-start space-x-2.5 ${
              m.isUser ? 'flex-row-reverse space-x-reverse' : ''
            }`}
          >
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[11px] shrink-0 shadow-sm ${
                m.avatarColor
              }`}
            >
              {m.sender.charAt(0)}
            </div>

            <div
              className={`max-w-[78%] rounded-2xl p-2.5 border ${
                m.isUser
                  ? 'bg-red-600/90 text-white border-red-500 shadow-md'
                  : 'bg-slate-850/80 text-slate-200 border-slate-750'
              }`}
            >
              <div className="flex items-center justify-between space-x-2 mb-0.5">
                <div className="flex items-center space-x-1">
                  <span className={`font-bold text-[11px] ${m.isUser ? 'text-white' : 'text-slate-300'}`}>
                    {m.sender}
                  </span>
                  {m.badge && (
                    <span className="px-1 py-0.2 rounded text-[9px] bg-red-950 text-red-400 border border-red-800/40">
                      {m.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[9px] ${m.isUser ? 'text-red-200' : 'text-slate-500'}`}>
                  {m.timestamp}
                </span>
              </div>

              <p className="text-xs leading-relaxed font-normal">{m.text}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Reaction Emoji Pills */}
      <div className="px-3 py-1.5 bg-slate-950/60 border-t border-slate-800/80 flex items-center justify-between">
        <span className="text-[10px] text-slate-500 font-bold uppercase mr-1">React:</span>
        <div className="flex space-x-1.5 overflow-x-auto">
          {['🔥', '🏏', '😱', '👏', '💔', '⚡', '🥶', '👑'].map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleQuickEmoji(emoji)}
              className="min-h-11 min-w-11 rounded-lg bg-slate-850 hover:bg-slate-800 text-sm active:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Chat Input Bar */}
      <div className="p-2.5 bg-slate-950 border-t border-slate-800">
        <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
          <input
            type="text"
            maxLength={140}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            placeholder="Share your live reaction with fans..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-red-500"
          />
          <button
            type="submit"
            disabled={!inputVal.trim()}
            className="p-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

