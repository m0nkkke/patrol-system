import { StyleSheet, View } from 'react-native';

import { colors } from '@/theme';

import { AppText } from './AppText';

type AvatarProps = {
  initials: string;
  size?: number;
};

export function Avatar({ initials, size = 56 }: AvatarProps): React.ReactElement {
  return (
    <View style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}>
      <AppText variant="heading" color={colors.textInverse}>
        {initials}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.avatar,
    justifyContent: 'center',
  },
});
