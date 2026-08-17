import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { ProfileHeader, Screen, SettingsRow } from '../../components/ui';

import { initialsFor } from '../../utils/format';
import { Mail, Lock, Moon, LogOut } from 'lucide-react-native';


export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);

  const roleLabel = useMemo(() => {
    if (!user?.role) return '';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role]);

  // Identity lines under the name: Department first (broader context), then Program or Role.
  const identityLines = useMemo(() => {
    const primary = user?.department?.trim();
    const secondary = user?.role === 'faculty' ? roleLabel : (user?.program?.trim() || roleLabel);
    return [primary, secondary].filter((part): part is string => !!part);
  }, [user?.department, user?.program, user?.role, roleLabel]);

  const fallbackName = user?.role === 'faculty' ? 'Faculty' : 'Student';

  return (
    // Top edge opted out of Screen's own inset padding: the navy banner (inside
    // ProfileHeader) bleeds under the status bar and owns its own clearance.
    // Bottom edge is opted out too — the floating tab bar owns it.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        showsHorizontalScrollIndicator={false}
        style={styles.container}
        contentContainerStyle={styles.content}
      >
        <ProfileHeader
          initials={initials}
          name={user?.fullName || fallbackName}
          handle={identityLines[0]}
          subhandle={identityLines[1]}
        />

        <View style={styles.rowsSection}>
          <SettingsRow
            icon={Mail}
            label="Recovery email"
            subtitle="Add a personal email for password reset"
            trailing="chevron"
          />
          <SettingsRow
            icon={Lock}
            label="Password"
            subtitle="Change your password"
            divided
            trailing="chevron"
          />
          <SettingsRow
            icon={Moon}
            label="Dark mode"
            subtitle="Match system appearance"
            divided
            trailing="toggle"
          />
          <SettingsRow
            icon={LogOut}
            label="Sign out"
            divided
            onPress={signOut}
            accessibilityLabel="Sign out"
          />
        </View>
      </ScrollView>
    </Screen>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      paddingBottom: t.spacing['3xl'] + 56,
    },
    rowsSection: {
      marginTop: t.spacing.xl,
      marginHorizontal: t.spacing.lg,
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.lg,
      ...t.shadows.level1,
    },
  });
