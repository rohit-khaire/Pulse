import type { ComponentType } from 'react';
import type { LucideIcon } from 'lucide-react';
import type { SkeletonKind } from './Skeletons';
import type { PulseState } from '@/lib/store';

/**
 * One plug-in registry entry. `component` takes NO props: it reads whatever it
 * needs from usePulseStore() (or its own pulse-<stream> store).
 */
export interface PluginEntry {
  id: string; // kebab-case, unique within its registry
  label: string; // human name, used in error + skeleton labels
  component: ComponentType;
  enabled: boolean;
  /** placeholder shown while a lazy chunk loads (default 'card') */
  skeleton?: SkeletonKind;
}

export interface TabEntry extends PluginEntry {
  icon?: LucideIcon;
}

export interface ModalEntry extends PluginEntry {
  /**
   * 'open'   (default): the chunk is mounted the first time the modal is opened
   * 'always': mounted after first paint; the modal manages its own visibility
   */
  mountOn?: 'open' | 'always';
  /** when is it open? default: usePulseStore state.openModal === id */
  isOpen?: (s: PulseState) => boolean;
}
