'use client';

import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  name: string;
  children: React.ReactNode;
}

/** A failure in a social widget must never take the match page down with it. */
export class SocialErrorBoundary extends React.Component<Props, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.warn(`[pulse-social] ${this.props.name} crashed`, error);
  }

  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div role="alert" className="rounded-2xl border border-slate-800 bg-slate-900/70 p-3 flex items-center justify-between text-xs">
        <span className="flex items-center space-x-2 text-slate-400">
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>{this.props.name} is taking a breather.</span>
        </span>
        <button
          onClick={() => this.setState({ failed: false })}
          className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-800 text-slate-200 font-bold hover:bg-slate-700"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Retry</span>
        </button>
      </div>
    );
  }
}
