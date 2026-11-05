'use client';

import React from 'react';

interface Props {
  name: string;
  children: React.ReactNode;
}
interface State {
  failed: boolean;
}

/** Keeps a failing intel card from taking the page down. */
export class IntelBoundary extends React.Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    // eslint-disable-next-line no-console
    console.warn(`[pulse-intel] ${this.props.name} failed to render`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-3.5 text-[11px] text-slate-400">
        <div className="font-semibold text-slate-300">{this.props.name}</div>
        <div className="mt-1">Yeh card abhi load nahi ho paya. Baaki app normal chal raha hai.</div>
        <button
          type="button"
          onClick={() => this.setState({ failed: false })}
          className="mt-2 rounded-lg border border-slate-700 px-2 py-1 text-[11px] font-semibold text-slate-200 hover:bg-slate-800"
        >
          Retry
        </button>
      </div>
    );
  }
}
