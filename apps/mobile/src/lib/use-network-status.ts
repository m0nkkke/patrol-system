import NetInfo from '@react-native-community/netinfo';
import { useEffect, useState } from 'react';

export type NetworkStatus = 'unknown' | 'online' | 'offline';

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>('unknown');

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      if (state.isConnected === false || state.isInternetReachable === false) {
        setStatus('offline');
      } else if (state.isConnected === true && state.isInternetReachable === true) {
        setStatus('online');
      } else {
        setStatus('unknown');
      }
    });
    return unsubscribe;
  }, []);

  return status;
}

export function useIsOffline(): boolean {
  return useNetworkStatus() === 'offline';
}
