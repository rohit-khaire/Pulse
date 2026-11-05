'use client';

import React, { useEffect, useState } from 'react';
import { PageTour } from '@/components/demo/PageTour';
import { EVALS_TOUR_STEPS } from '@/lib/demo-system';
import { isDemoActive } from '@/components/demo/SystemDemoBar';

export function EvalsTour() {
  const [tourOpen, setTourOpen] = useState(false);

  useEffect(() => {
    if (isDemoActive()) {
      try {
        const dismissed = sessionStorage.getItem('pulse_tour_evals_done') === '1';
        if (!dismissed) setTourOpen(true);
      } catch {}
    }
    const onReopen = () => setTourOpen(true);
    window.addEventListener('pulse-reopen-tour', onReopen);
    return () => window.removeEventListener('pulse-reopen-tour', onReopen);
  }, []);

  return (
    <PageTour
      steps={EVALS_TOUR_STEPS}
      storageKey="pulse_tour_evals_done"
      isOpen={tourOpen}
      onClose={() => setTourOpen(false)}
    />
  );
}

