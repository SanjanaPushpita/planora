'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function KnowledgeAliasPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/vault');
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-[60vh] text-planora-charcoal/40 text-sm">
      Redirecting to Knowledge Vault...
    </div>
  );
}
