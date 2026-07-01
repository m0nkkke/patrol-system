import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet } from 'react-native';

import { colors, spacing } from '@/theme';
import { Header, MenuItem, Screen } from '@/ui';

export default function HistoryChooserScreen(): React.ReactElement {
  const router = useRouter();

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <Header
          title="История обходов"
          subtitle="Выберите, как смотреть обходы"
          onBack={() => router.back()}
        />
        <MenuItem
          icon="storefront-outline"
          iconColor={colors.iconBlue}
          iconBackground={colors.iconBlueBackground}
          title="По магазинам"
          subtitle="Обходы конкретного магазина"
          onPress={() => router.push('/history/shops')}
        />
        <MenuItem
          icon="people-outline"
          iconColor={colors.iconSlate}
          iconBackground={colors.iconSlateBackground}
          title="По сотрудникам"
          subtitle="Обходы конкретного обходчика"
          onPress={() => router.push('/history/employees')}
        />
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
  },
});
