import NetInfo from '@react-native-community/netinfo';
import { onlineManager, QueryClient } from '@tanstack/react-query';

onlineManager.setEventListener((setOnline) =>
  NetInfo.addEventListener((state) => {
    const isOnline =
      state.isConnected === true &&
      (state.isInternetReachable === true || state.isInternetReachable === null);
    setOnline(isOnline);
  }),
);

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
