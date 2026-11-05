'use client';

/**
 * Plug-in isolation. Every registry entry renders inside <PluginSlot>:
 *   error boundary  -> a thrown render error shows a small retry card, never a blank page
 *   Suspense        -> lazy chunks show a fixed-height skeleton while they load
 *   lazyPlugin()    -> a missing/broken module rejects inside the boundary instead of the build page
 * Depends on React only, so it cannot be broken by another stream's code.
 */
import React, {
  Component,
  Suspense,
  lazy,
  type ComponentType,
  type ErrorInfo,
  type LazyExoticComponent,
  type ReactNode,
} from 'react';
import { Skeleton, type SkeletonKind } from './Skeletons';

type ModuleLike = Record<string, unknown>;

/**
 * One-line lazy import for a plug-in:
 *   component: lazyPlugin(() => import('@/components/intel/WinProbCard'), 'WinProbCard')
 * Omit the export name to use the module's default export.
 */
export function lazyPlugin<P = Record<string, never>>(
  loader: () => Promise<ModuleLike>,
  exportName?: string
): LazyExoticComponent<ComponentType<P>> & { preload: () => void } {
  const load = async (): Promise<{ default: ComponentType<P> }> => {
    const mod = await loader();
    const picked = exportName ? mod[exportName] : mod.default;
    if (typeof picked !== 'function' && typeof picked !== 'object') {
      throw new Error(
        `Plug-in export "${exportName ?? 'default'}" was not found. Check the name in registry.tsx.`
      );
    }
    return { default: picked as ComponentType<P> };
  };
  const Comp = lazy(load) as LazyExoticComponent<ComponentType<P>> & { preload: () => void };
  Comp.preload = () => {
    void loader().catch(() => undefined);
  };
  return Comp;
}

interface BoundaryProps {
  id: string;
  label: string;
  children: ReactNode;
  /** render nothing instead of a retry card (used for floating buttons / modals) */
  quiet?: boolean;
}
interface BoundaryState {
  error: Error | null;
  attempt: number;
}

export class PluginBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { error: null, attempt: 0 };

  static getDerivedStateFromError(error: Error): Partial<BoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // eslint-disable-next-line no-console
    console.warn(`[pulse] plug-in "${this.props.id}" failed and was isolated:`, error, info.componentStack);
  }

  retry = () => this.setState((s) => ({ error: null, attempt: s.attempt + 1 }));

  render() {
    const { error, attempt } = this.state;
    const { id, label, quiet, children } = this.props;
    if (!error) return <React.Fragment key={attempt}>{children}</React.Fragment>;
    if (quiet) return null;
    return (
      <div
        role="alert"
        data-plugin-error={id}
        className="rounded-2xl border border-slate-800 bg-slate-900/70 px-3.5 py-3 flex items-center justify-between gap-3 text-xs"
      >
        <span className="text-slate-300">
          <strong className="text-white">{label}</strong> is unavailable right now. The rest of Pulse works as usual.
        </span>
        <button
          type="button"
          onClick={this.retry}
          className="shrink-0 min-h-11 px-3 rounded-lg border border-slate-700 bg-slate-800 text-slate-100 font-semibold hover:bg-slate-700"
        >
          Retry
        </button>
      </div>
    );
  }
}

export interface PluginSlotProps {
  id: string;
  label: string;
  Component: ComponentType;
  skeleton?: SkeletonKind;
  quiet?: boolean;
}

export function PluginSlot({ id, label, Component: Comp, skeleton = 'card', quiet }: PluginSlotProps) {
  return (
    <PluginBoundary id={id} label={label} quiet={quiet}>
      <Suspense fallback={<Skeleton kind={skeleton} label={label} />}>
        <Comp />
      </Suspense>
    </PluginBoundary>
  );
}

/** Warm every lazy entry's chunk (call during idle time so first taps feel instant). */
export function preloadEntries(entries: ReadonlyArray<{ enabled: boolean; component: unknown }>) {
  for (const e of entries) {
    if (!e.enabled) continue;
    const c = e.component as { preload?: () => void };
    try {
      c.preload?.();
    } catch {
      /* ignore */
    }
  }
}
