import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { ProfileHeader, Screen, SettingsRow } from '../../components/ui';
import { initialsFor } from '../../utils/format';
// TEMP QA helper (#69) — remove with the row below before merging.
import { resetFirstRun } from '../../lib/devResetFirstRun';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);

  // Identity lines under the name: program first, department beneath it. The
  // email-prefix "handle" was dropped — it read as a random username.
  const identityLines = useMemo(
    () => [user?.program?.trim(), user?.department?.trim()].filter((part): part is string => !!part),
    [user?.program, user?.department]
  );

  return (
    // Top edge opted out of Screen's own inset padding: the navy banner (inside
    // ProfileHeader) bleeds under the status bar and owns its own clearance.
    // Bottom edge is opted out too — the floating tab bar owns it.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ProfileHeader
          initials={initials}
          name={user?.fullName || 'Student'}
          handle={identityLines[0]}
          subhandle={identityLines[1]}
        />

        <View style={styles.rowsSection}>
          <SettingsRow
            icon="mail-outline"
            label="Recovery email"
            subtitle="Add a personal email for password reset"
            trailing="chevron"
          />
          <SettingsRow
            icon="lock-closed-outline"
            label="Password"
            subtitle="Change your password"
            divided
            trailing="chevron"
          />
          <SettingsRow
            icon="moon-outline"
            label="Dark mode"
            subtitle="Match system appearance"
            divided
            trailing="toggle"
          />
          <SettingsRow
            icon="log-out-outline"
            label="Sign out"
            divided
            onPress={signOut}
            accessibilityLabel="Sign out"
          />
          {/* TEMP QA (#69) — replay onboarding + coachmarks. Remove before merge. */}
          <SettingsRow
            icon="refresh-outline"
            label="Reset first-run (DEV)"
            subtitle="Replay onboarding + coachmarks"
            divided
            trailing="chevron"
            onPress={resetFirstRun}
            accessibilityLabel="Reset first-run onboarding and coachmarks"
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
      paddingHorizontal: t.spacing.lg,
    },
  });
