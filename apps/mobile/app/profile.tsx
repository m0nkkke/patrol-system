import Constants from 'expo-constants';
import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';

import { useShop } from '@/features/route-setup/queries';
import { useAuthStore } from '@/store/auth-store';
import { spacing } from '@/theme';
import { Button, Card, Header, InfoRow, Screen } from '@/ui';

export default function ProfileScreen(): React.ReactElement {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const signOut = useAuthStore((state) => state.signOut);
  const { data: shop } = useShop(user?.shopId);

  const version = Constants.expoConfig?.version ?? '-';

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header title="Профиль" onBack={() => router.back()} />

        <Card>
          <InfoRow label="Основной магазин" value={shop?.name ?? '-'} first />
          <InfoRow label="Версия приложения" value={version} />
        </Card>

        <View style={styles.gapLg}>
          <Button
            label="Выйти"
            variant="secondary"
            icon="log-out-outline"
            onPress={() => void signOut()}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xxl,
  },
  gapLg: {
    marginTop: spacing.lg,
  },
});
