import { PageSkeleton } from './_shell/Skeletons';

export default function Loading() {
  return (
    <div className="min-h-screen bg-slate-950" role="status" aria-label="Loading match">
      <PageSkeleton />
    </div>
  );
}
