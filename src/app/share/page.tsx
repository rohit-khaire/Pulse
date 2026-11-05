import type { Metadata } from 'next';
import { DemoClient } from './DemoClient';

export const metadata: Metadata = {
  title: 'Pulse Social · preview',
  description: 'Preview every Pulse Social card and widget with sample data.',
  robots: { index: false, follow: false },
};

export default function ShareDemoPage() {
  return <DemoClient />;
}
