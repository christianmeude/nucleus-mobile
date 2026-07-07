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

  const handle = useMemo(() => {
    const parts = [
      user?.email ? user.email.split('@')[0] : null,
      user?.department || user?.program,
    ].filter((part): part is string => !!part);
    return parts.join(' · ');
  }, [user?.email, user?.department, user?.program]);

  return (
    // Same frame as the student Profile: navy banner bleeds under the status bar
    // (top edge opted out), floating tab bar owns the bottom.
    <Screen gutter={0} edges={{ top: false, bottom: false }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ProfileHeader
          initials={initials}
          name={user?.fullName || 'Faculty'}
          handle={handle || undefined}
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
