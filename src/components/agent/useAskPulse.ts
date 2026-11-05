'use client';

import { useCallback } from 'react';
import { usePulseStore } from '@/lib/store';
import { speak, stopSpeaking, voiceSupported } from '@/lib/useVoice';
import { buildAgentContext } from '@/lib/agent/context';
import { answerOffline } from '@/lib/agent/router';
import { createNdjsonParser, AgentEvent } from '@/lib/agent/protocol';
import { useAgentStore, ChatMsg } from './agentStore';

let controller: AbortController | null = null;
let seq = 0;
const uid = () => `m${Date.now().toString(36)}${(seq++).toString(36)}`;

/**
 * Sends a question to /api/agent and streams the reply into the agent store.
 * If the network or server is unavailable it answers locally with the same deterministic router,
 * so Ask Pulse also works fully offline.
 */
export function useAskPulse() {
  return useCallback(async (raw: string, via: 'text' | 'voice' = 'text') => {
    const question = raw.trim();
    const agent = useAgentStore.getState();
    if (!question || agent.busy) return;

    const pulse = usePulseStore.getState();
    const { frames, config, cursor, myTeam, lang } = pulse;
    if (frames.length === 0) return;

    stopSpeaking();
    controller?.abort();
    controller = new AbortController();

    const history = agent.messages.filter((m) => m.role === 'user').slice(-2).map((m) => m.text);
    const user: ChatMsg = { id: uid(), role: 'user', text: question, status: 'done', via };
    const bot: ChatMsg = { id: uid(), role: 'assistant', text: '', status: 'pending', tools: [], atLabel: frames[cursor]?.scoreLine };
    agent.pushMessages(user, bot);
    agent.setDraft('');
    agent.setBusy(true);

    const finish = (e: Extract<AgentEvent, { t: 'final' }>) => {
      const s = useAgentStore.getState();
      s.patchMessage(bot.id, (m) => ({
        text: e.text,
        status: 'done',
        replyLang: e.replyLang,
        source: e.source,
        verdict: e.verdict,
        intents: e.intents,
        atLabel: e.atLabel || m.atLabel,
        tools: (m.tools ?? []).map((t) => ({ ...t, done: true })),
      }));
      s.setLastMeta({ source: e.source, metrics: e.metrics, numbersChecked: e.numbersChecked, numbersAllowed: e.numbersAllowed, verdict: e.verdict });
      if (s.speakReplies && voiceSupported()) speak(e.text, e.replyLang);
    };

    const runLocal = (reason: string) => {
      const ctx = buildAgentContext({ frames, config, cursor, team: myTeam, lang });
      const a = answerOffline(ctx, question, { via, fallbackReason: reason });
      finish({
        t: 'final', text: a.text, source: a.source, verdict: a.verdict, intents: a.intents, replyLang: a.replyLang,
        tools: a.tools.map((t) => ({ name: t.name, args: t.args })), numbersChecked: a.numbersChecked, numbersAllowed: a.numbersAllowed,
        metrics: a.metrics, atLabel: frames[cursor]?.scoreLine ?? '',
      });
    };

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({ question, lang, via, cursor, team: myTeam, history, offline: useAgentStore.getState().forceOffline }),
      });
      if (!res.ok || !res.body) throw new Error('bad response');

      let gotFinal = false;
      const parse = createNdjsonParser((e) => {
        const s = useAgentStore.getState();
        switch (e.t) {
          case 'tool':
            s.patchMessage(bot.id, (m) => ({ tools: [...(m.tools ?? []), { name: e.name, done: false }] }));
            break;
          case 'tool_done':
            s.patchMessage(bot.id, (m) => ({ tools: (m.tools ?? []).map((t) => (t.name === e.name ? { ...t, done: true } : t)) }));
            break;
          case 'delta':
            s.patchMessage(bot.id, (m) => ({ status: 'streaming', text: m.text ? `${m.text} ${e.text}` : e.text }));
            break;
          case 'replace':
            s.patchMessage(bot.id, { status: 'streaming', text: e.text });
            break;
          case 'final':
            gotFinal = true;
            finish(e);
            break;
          default:
            break;
        }
      });
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        parse(dec.decode(value, { stream: true }));
      }
      parse('', true);
      if (!gotFinal) runLocal('stream-ended-early');
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') {
        useAgentStore.getState().patchMessage(bot.id, { status: 'done', text: '…' });
      } else {
        runLocal('network-offline');
      }
    } finally {
      useAgentStore.getState().setBusy(false);
    }
  }, []);
}
