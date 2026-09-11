import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { useGuardedPress } from '@/lib/use-guarded-press';
import { colors, radius, spacing } from '@/theme';

import { AppText } from './AppText';

export type DashboardAction = {
  icon: keyof typeof Ionicons.glyphMap;
  iconBadge?: keyof typeof Ionicons.glyphMap;
  iconBackground?: string;
  iconColor?: string;
  onPress: () => void;
  subtitle?: string;
  title: string;
};

type DashboardProfileProps = {
  fullName: string;
  onPress: () => void;
  role: string;
};

export function DashboardProfile({
  fullName,
  onPress,
  role,
}: DashboardProfileProps): React.ReactElement {
  const guardedOnPress = useGuardedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={guardedOnPress}
      style={({ pressed }) => [styles.profile, pressed && styles.pressed]}
    >
      <View style={styles.profileContent}>
        <AppText variant="body" muted>
          Добрый день,
        </AppText>
        <AppText variant="heading" numberOfLines={2} style={styles.profileName}>
          {fullName}
        </AppText>
        <AppText variant="caption" color={colors.roleText} style={styles.role}>
          {role}
        </AppText>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

export function DashboardQuickActions({
  actions,
}: {
  actions: DashboardAction[];
}): React.ReactElement | null {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.quickGrid}>
      {actions.map((action) => (
        <DashboardQuickAction key={action.title} action={action} />
      ))}
    </View>
  );
}

function DashboardQuickAction({ action }: { action: DashboardAction }): React.ReactElement {
  const guardedOnPress = useGuardedPress(action.onPress);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={guardedOnPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <DashboardIcon action={action} size={20} compact />
      <AppText
        variant="label"
        numberOfLines={2}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={styles.quickTitle}
      >
        {action.title}
      </AppText>
    </Pressable>
  );
}

export function DashboardSection({
  actions,
  title,
}: {
  actions: DashboardAction[];
  title: string;
}): React.ReactElement | null {
  if (actions.length === 0) {
    return null;
  }

  return (
    <DashboardGroup title={title}>
      <DashboardMenuPanel actions={actions} />
    </DashboardGroup>
  );
}

export function DashboardGroup({
  children,
  title,
}: {
  children: React.ReactNode;
  title: string;
}): React.ReactElement {
  return (
    <View style={styles.section}>
      <AppText variant="caption" muted style={styles.sectionTitle}>
        {title.toUpperCase()}
      </AppText>
      <View style={styles.sectionContent}>{children}</View>
    </View>
  );
}

export function DashboardMenuPanel({
  actions,
}: {
  actions: DashboardAction[];
}): React.ReactElement | null {
  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={styles.sectionPanel}>
      {actions.map((action, index) => (
        <DashboardMenuAction
          key={action.title}
          action={action}
          showBorder={index < actions.length - 1}
        />
      ))}
    </View>
  );
}

function DashboardMenuAction({
  action,
  showBorder,
}: {
  action: DashboardAction;
  showBorder: boolean;
}): React.ReactElement {
  const guardedOnPress = useGuardedPress(action.onPress);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={guardedOnPress}
      style={({ pressed }) => [
        styles.menuItem,
        showBorder && styles.menuItemBorder,
        pressed && styles.pressed,
      ]}
    >
      <DashboardIcon action={action} size={20} />
      <View style={styles.menuContent}>
        <AppText variant="label" numberOfLines={2}>
          {action.title}
        </AppText>
        {action.subtitle ? (
          <AppText variant="caption" muted numberOfLines={2} style={styles.menuSubtitle}>
            {action.subtitle}
          </AppText>
        ) : null}
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.textMuted} />
    </Pressable>
  );
}

type DashboardContextCardProps = {
  address?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  name: string;
  onPress?: () => void;
  trailingIcon?: keyof typeof Ionicons.glyphMap;
};

export function DashboardContextCard({
  address,
  icon = 'storefront-outline',
  label,
  name,
  onPress,
  trailingIcon,
}: DashboardContextCardProps): React.ReactElement {
  const guardedOnPress = useGuardedPress(onPress);
  const content = (
    <>
      <View style={styles.contextIcon}>
        <Ionicons name={icon} size={22} color={colors.primary} />
      </View>
      <View style={styles.contextContent}>
        <AppText variant="caption" muted>
          {label}
        </AppText>
        <AppText variant="label" numberOfLines={2} style={styles.contextName}>
          {name}
        </AppText>
        {address ? (
          <AppText variant="caption" muted numberOfLines={2} style={styles.contextAddress}>
            {address}
          </AppText>
        ) : null}
      </View>
      {trailingIcon ? <Ionicons name={trailingIcon} size={22} color={colors.primary} /> : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={guardedOnPress}
        style={({ pressed }) => [styles.contextCard, pressed && styles.pressed]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={styles.contextCard}>{content}</View>;
}

export function DashboardLogout({ onPress }: { onPress: () => void }): React.ReactElement {
  const guardedOnPress = useGuardedPress(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={guardedOnPress}
      style={({ pressed }) => [styles.logout, pressed && styles.pressed]}
    >
      <Ionicons name="log-out-outline" size={22} color={colors.textMuted} />
      <AppText variant="label" muted style={styles.logoutText}>
        Выйти из системы
      </AppText>
    </Pressable>
  );
}

function DashboardIcon({
  action,
  compact = false,
  size,
}: {
  action: DashboardAction;
  compact?: boolean;
  size: number;
}): React.ReactElement {
  return (
    <View
      style={[
        styles.iconBox,
        compact && styles.quickIconBox,
        { backgroundColor: action.iconBackground ?? colors.iconBlueBackground },
      ]}
    >
      <Ionicons name={action.icon} size={size} color={action.iconColor ?? colors.iconBlue} />
      {action.iconBadge ? (
        <View style={styles.iconBadge}>
          <Ionicons name={action.iconBadge} size={12} color={colors.iconBlue} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.68,
  },
  profile: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 82,
  },
  profileContent: {
    flex: 1,
    minWidth: 0,
  },
  profileName: {
    marginTop: spacing.xs,
  },
  role: {
    fontWeight: '600',
    marginTop: spacing.sm,
  },
  quickGrid: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  quickAction: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    minHeight: 88,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.lg,
  },
  quickTitle: {
    flex: 1,
    fontSize: 14,
    lineHeight: 19,
    marginLeft: spacing.sm,
  },
  section: {
    marginTop: spacing.xl,
  },
  sectionTitle: {
    fontWeight: '700',
    marginBottom: spacing.md,
  },
  sectionContent: {
    gap: spacing.md,
  },
  sectionPanel: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    overflow: 'hidden',
  },
  menuItem: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 76,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  menuItemBorder: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconBox: {
    alignItems: 'center',
    borderRadius: radius.sm,
    flexShrink: 0,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  quickIconBox: {
    height: 38,
    width: 38,
  },
  iconBadge: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderColor: colors.surface,
    borderRadius: radius.full,
    borderWidth: 1,
    height: 17,
    justifyContent: 'center',
    position: 'absolute',
    right: -3,
    top: -3,
    width: 17,
  },
  menuContent: {
    flex: 1,
    marginHorizontal: spacing.md,
    minWidth: 0,
  },
  menuSubtitle: {
    marginTop: spacing.xs,
  },
  contextCard: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexDirection: 'row',
    marginTop: spacing.xl,
    minHeight: 82,
    padding: spacing.md,
  },
  contextIcon: {
    alignItems: 'center',
    backgroundColor: colors.iconBlueBackground,
    borderRadius: radius.sm,
    height: 40,
    justifyContent: 'center',
    marginRight: spacing.md,
    width: 40,
  },
  contextContent: {
    flex: 1,
    minWidth: 0,
  },
  contextName: {
    marginTop: spacing.xs,
  },
  contextAddress: {
    marginTop: spacing.xs,
  },
  logout: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    marginTop: spacing.xl,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  logoutText: {
    marginLeft: spacing.md,
  },
});
