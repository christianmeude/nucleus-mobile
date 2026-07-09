import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { formatMonthYear, initialsFor } from '../../utils/format';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { ProfileHeader, Screen, SettingsRow } from '../../components/ui';

export const FacultyProfileScreen = () => {
  const { user, signOut } = useAuth();
  const styles = useThemedStyles(makeStyles);

  const initials = useMemo(() => initialsFor(user?.fullName), [user?.fullName]);

  const roleLabel = useMemo(() => {
    if (!user?.role) return '';
    return user.role.charAt(0).toUpperCase() + user.role.slice(1);
  }, [user?.role]);

  // Program first, department beneath — same identity block as the student
  // Profile. The email-prefix "handle" was dropped (read as a random username).
  const identityLines = useMemo(
    () => [user?.program?.trim(), user?.department?.trim()].filter((part): part is string => !!part),
    [user?.program, user?.department]
  );

  return (
    // Same frame as the student Profile: navy banner bleeds under the status bar
    // (top edge opted out), floating tab bar owns the bottom.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ProfileHeader
          initials={initials}
          name={user?.fullName || 'Faculty'}
          handle={identityLines[0]}
          subhandle={identityLines[1]}
        />

        <View style={styles.rowsSection}>
          {roleLabel ? (
            <SettingsRow icon="ribbon-outline" label="Role" subtitle={roleLabel} />
          ) : null}
          <SettingsRow
            icon="mail-outline"
            label="Email"
            subtitle={user?.email || '—'}
            divided={!!roleLabel}
          />
          <SettingsRow
            icon="business-outline"
            label="Department"
            subtitle={user?.department || '—'}
            divided
          />
          <SettingsRow
            icon="school-outline"
            label="Program"
            subtitle={user?.program || '—'}
            divided
          />
          <SettingsRow
            icon="calendar-outline"
            label="Member since"
            subtitle={formatMonthYear(user?.createdAt)}
            divided
          />
          <SettingsRow
            icon="log-out-outline"
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
      paddingHorizontal: t.spacing.lg,
    },
  });
