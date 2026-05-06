import { useEffect } from 'react';

import { subscribeCRMDataChanged } from '@/lib/mobile-sync';

export function useCRMDataSyncRefresh(refresh: () => Promise<void>) {
  useEffect(() => {
    const unsubscribe = subscribeCRMDataChanged(() => {
      void refresh();
    });

    return unsubscribe;
  }, [refresh]);
}
