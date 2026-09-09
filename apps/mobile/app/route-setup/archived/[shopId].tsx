import { Redirect, useLocalSearchParams } from 'expo-router';

export default function ArchivedPatrolPointsRedirect(): React.ReactElement {
  const { shopId = '' } = useLocalSearchParams<{ shopId: string }>();

  return (
    <Redirect
      href={{
        pathname: '/patrol-routes/[shopId]',
        params: { shopId, tab: 'points', status: 'archived' },
      }}
    />
  );
}
