'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ResearchPapersAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/papers');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-planora-charcoal/40 text-sm">
      Redirecting to Research Papers...
    </div>
  );
}
