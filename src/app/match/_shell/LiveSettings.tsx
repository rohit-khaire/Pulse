'use client';

import React, { useState, useSyncExternalStore } from 'react';
import { Bell, BellOff, Smartphone, Vibrate, Download, Check } from 'lucide-react';
import { usePulseStore } from '@/lib/store';
import {
  currentPermission,
  pingSupported,
  requestPingPermission,
  type PingPermission,
} from './notify';
import { vibrateSupported, vibrate } from './haptics';
import { getInstallState, isIos, promptInstall, subscribeInstall } from './install';

const COPY = {
  hinglish: {
    title: 'Alerts aur app',
    ping: 'Pulse Ping',
    pingHelp: 'Tab chhupa ho to bade moments ka alert. Sirf is phone par, koi server nahi.',
    haptics: 'Vibration',
    hapticsHelp: 'Tumhare players ke wicket aur six par halka buzz.',
    install: 'App install karo',
    installHelp: 'Home screen se seedha khulega, offline replay ke saath.',
    iosHelp: 'iPhone: Share dabao, phir "Add to Home Screen".',
    denied: 'Notifications blocked hain. Browser settings se allow karo.',
    unsupported: 'Is browser mein notifications available nahi.',
  },
  en: {
    title: 'Alerts & app',
    ping: 'Pulse Ping',
    pingHelp: 'Alerts for big moments while this tab is hidden. Local to this phone, no server.',
    haptics: 'Vibration',
    hapticsHelp: 'A gentle buzz on wickets and sixes involving your players.',
    install: 'Install app',
    installHelp: 'Opens from your home screen and replays offline.',
    iosHelp: 'iPhone: tap Share, then "Add to Home Screen".',
    denied: 'Notifications are blocked. Allow them in your browser settings.',
    unsupported: 'Notifications are not available in this browser.',
  },
  hi: {
    title: 'अलर्ट और ऐप',
    ping: 'Pulse Ping',
    pingHelp: 'टैब छिपा हो तो बड़े पलों का अलर्ट। सिर्फ़ इसी फ़ोन पर, कोई सर्वर नहीं।',
    haptics: 'वाइब्रेशन',
    hapticsHelp: 'आपके खिलाड़ियों के विकेट और छक्कों पर हल्का कंपन।',
    install: 'ऐप इंस्टॉल करें',
    installHelp: 'होम स्क्रीन से खुलेगा, ऑफ़लाइन रीप्ले के साथ।',
    iosHelp: 'iPhone: Share दबाएँ, फिर "Add to Home Screen"।',
    denied: 'नोटिफ़िकेशन ब्लॉक हैं। ब्राउज़र सेटिंग से अनुमति दें।',
    unsupported: 'इस ब्राउज़र में नोटिफ़िकेशन उपलब्ध नहीं हैं।',
  },
} as const;

function Row({
  icon,
  title,
  help,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  help: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <div className="flex items-start gap-2.5 min-w-0">
        <span className="mt-0.5 text-amber-400 shrink-0" aria-hidden="true">
          {icon}
        </span>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white">{title}</div>
          <div className="text-[11px] text-slate-400 leading-snug">{help}</div>
        </div>
      </div>
      {children}
    </div>
  );
}

function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className="relative shrink-0 min-h-11 min-w-14 flex items-center justify-center disabled:opacity-40"
    >
      <span
        className={`w-12 h-7 rounded-full border transition-colors ${
          checked ? 'bg-red-600 border-red-500' : 'bg-slate-800 border-slate-600'
        }`}
      />
      <span
        className={`absolute top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-white shadow transition-all ${
          checked ? 'left-[calc(50%+4px)]' : 'left-[calc(50%-20px)]'
        }`}
      />
    </button>
  );
}

export function LiveSettings() {
  const lang = usePulseStore((s) => s.lang);
  const pingEnabled = usePulseStore((s) => s.pingEnabled);
  const setPingEnabled = usePulseStore((s) => s.setPingEnabled);
  const hapticsEnabled = usePulseStore((s) => s.hapticsEnabled);
  const setHapticsEnabled = usePulseStore((s) => s.setHapticsEnabled);
  const t = COPY[lang];

  const [permission, setPermission] = useState<PingPermission>(() =>
    typeof window === 'undefined' ? 'default' : currentPermission()
  );
  const install = useSyncExternalStore(subscribeInstall, getInstallState, () => 'unavailable' as const);

  const onPing = async (next: boolean) => {
    if (!next) return setPingEnabled(false);
    // Permission must be requested from a user gesture, so it lives in this click handler.
    const p = permission === 'granted' ? permission : await requestPingPermission();
    setPermission(p);
    setPingEnabled(p === 'granted');
  };

  const pingBlocked = permission === 'denied' || permission === 'unsupported' || !pingSupported();

  return (
    <section
      aria-labelledby="live-settings-title"
      className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3.5 py-2 divide-y divide-slate-800"
    >
      <h3 id="live-settings-title" className="text-[10px] font-extrabold uppercase tracking-wider text-red-400 py-1.5">
        {t.title}
      </h3>

      <Row
        icon={pingEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
        title={t.ping}
        help={pingBlocked && permission !== 'default' ? (permission === 'denied' ? t.denied : t.unsupported) : t.pingHelp}
      >
        <Switch checked={pingEnabled} onChange={onPing} label={t.ping} disabled={permission === 'unsupported'} />
      </Row>

      {vibrateSupported() && (
        <Row icon={<Vibrate className="w-4 h-4" />} title={t.haptics} help={t.hapticsHelp}>
          <Switch
            checked={hapticsEnabled}
            onChange={(v) => {
              setHapticsEnabled(v);
              if (v) vibrate(25);
            }}
            label={t.haptics}
          />
        </Row>
      )}

      <Row
        icon={install === 'installed' ? <Check className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
        title={t.install}
        help={install === 'unavailable' && isIos() ? t.iosHelp : t.installHelp}
      >
        {install === 'available' ? (
          <button
            type="button"
            onClick={() => void promptInstall()}
            className="shrink-0 min-h-11 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
          >
            <Download className="w-4 h-4" aria-hidden="true" />
            <span>{t.install}</span>
          </button>
        ) : (
          <span className="shrink-0 text-[11px] font-semibold text-slate-400 px-2">
            {install === 'installed' ? '✓' : ''}
          </span>
        )}
      </Row>
    </section>
  );
}
