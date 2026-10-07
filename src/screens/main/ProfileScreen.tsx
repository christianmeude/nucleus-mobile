import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import {
  BottomSheet,
  BottomSheetScrollView,
  BottomSheetTextInput,
  Button,
  ProfileHeader,
  Screen,
  SettingsRow,
} from '../../components/ui';
import { supabase } from '../../lib/supabase';
import { withTimeout } from '../../utils/withTimeout';

import { initialsFor } from '../../utils/format';
import { Mail, Lock, Moon, LogOut } from 'lucide-react-native';

export const ProfileScreen = () => {
  const { user, signOut } = useAuth();
  const { preference, setPreference, scheme, theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const recoverySheetRef = useRef<BottomSheetModal>(null);
  const passwordSheetRef = useRef<BottomSheetModal>(null);
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryStatus, setRecoveryStatus] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStatus, setPasswordStatus] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const initials = initialsFor(user?.fullName);
  const roleLabel = user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : '';

  // Identity lines under the name: Department first (broader context), then Program or Role.
  const primaryIdentity = user?.department?.trim();
  const secondaryIdentity =
    user?.role === 'faculty' ? roleLabel : user?.program?.trim() || roleLabel;
  const identityLines = [primaryIdentity, secondaryIdentity].filter(
    (part): part is string => !!part,
  );

  const fallbackName = user?.role === 'faculty' ? 'Faculty' : 'Student';

  const openRecoverySheet = async () => {
    setRecoveryError('');
    setRecoveryStatus('');
    recoverySheetRef.current?.present();

    if (!user?.email) return;
    const { data, error } = await supabase
      .from('users')
      .select('recovery_email')
      .eq('email', user.email)
      .maybeSingle();
    if (!error) setRecoveryEmail(data?.recovery_email ?? '');
  };

  const saveRecoveryEmail = async () => {
    const normalizedEmail = recoveryEmail.trim().toLowerCase();
    if (!/^\S+@\S+\.\S+$/.test(normalizedEmail)) {
      setRecoveryError('Enter a valid personal email address.');
      return;
    }
    if (!user?.email) {
      setRecoveryError('Your account session has expired. Sign in again and try once more.');
      return;
    }

    setRecoveryLoading(true);
    setRecoveryError('');
    const { data, error } = await supabase.functions.invoke('update-recovery-email', {
      body: { recoveryEmail: normalizedEmail },
    });
    setRecoveryLoading(false);

    if (error || data?.error) {
      setRecoveryError(data?.error || 'We could not save your recovery email. Please try again.');
      return;
    }
    setRecoveryStatus('Recovery email saved. You can use it to reset your password.');
  };

  const savePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Enter your current password and a new password.');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new password entries do not match.');
      return;
    }
    if (!user?.email) {
      setPasswordError('Your account session has expired. Sign in again and try once more.');
      return;
    }

    setPasswordLoading(true);
    setPasswordError('');
    setPasswordStatus('');
    try {
      // Both calls are bounded and the spinner is cleared in `finally`: an
      // exception from either (stalled socket throws rather than returning an
      // error) previously left the sheet spinning forever.
      const { error: verificationError } = await withTimeout(
        supabase.auth.signInWithPassword({
          email: user.email,
          password: currentPassword,
        }),
        20000,
        'Password verification',
      );
      if (verificationError) {
        setPasswordError('Your current password is incorrect.');
        return;
      }

      const { error } = await withTimeout(
        supabase.auth.updateUser({ password: newPassword }),
        20000,
        'Password update',
      );
      if (error) {
        setPasswordError('We could not change your password. Please try again.');
        return;
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStatus('Password changed successfully.');
    } catch {
      setPasswordError(
        'The request timed out. Check your connection and try again. ' +
          'If your password did change, sign in again with the new one.',
      );
    } finally {
      setPasswordLoading(false);
    }
  };

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
            trailing="chevron"
            onPress={openRecoverySheet}
          />
          <SettingsRow
            icon={Lock}
            label="Password"
            divided
            trailing="chevron"
            onPress={() => {
              setPasswordError('');
              setPasswordStatus('');
              passwordSheetRef.current?.present();
            }}
          />
          <SettingsRow
            icon={Moon}
            label="Dark mode"
            divided
            trailing="toggle"
            value={scheme === 'dark'}
            onValueChange={(enabled) => setPreference(enabled ? 'dark' : 'light')}
            accessibilityLabel="Dark mode"
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

      <BottomSheet ref={recoverySheetRef} snapPoints={['52%']}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: theme.spacing.sm }}
        >
          <Text style={styles.sheetTitle}>Recovery email</Text>
          <Text style={styles.sheetDescription}>
            Use a personal address so you can reset your password if you lose access to your
            university email.
          </Text>
          <Text style={styles.sheetLabel}>Personal email</Text>
          <BottomSheetTextInput
            style={styles.sheetInput}
            value={recoveryEmail}
            onChangeText={setRecoveryEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            placeholder="name@example.com"
            placeholderTextColor={styles.placeholder.color}
            accessibilityLabel="Recovery email"
          />
          {recoveryError ? <Text style={styles.errorText}>{recoveryError}</Text> : null}
          {recoveryStatus ? <Text style={styles.successText}>{recoveryStatus}</Text> : null}
          <Button
            label="Save recovery email"
            onPress={saveRecoveryEmail}
            loading={recoveryLoading}
          />
        </BottomSheetScrollView>
      </BottomSheet>

      <BottomSheet ref={passwordSheetRef} snapPoints={['70%']}>
        <BottomSheetScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ gap: theme.spacing.sm }}
        >
          <Text style={styles.sheetTitle}>Change password</Text>
          <Text style={styles.sheetDescription}>
            Choose a new password with at least 8 characters.
          </Text>
          <Text style={styles.sheetLabel}>Current password</Text>
          <BottomSheetTextInput
            style={styles.sheetInput}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry
            accessibilityLabel="Current password"
          />
          <Text style={styles.sheetLabel}>New password</Text>
          <BottomSheetTextInput
            style={styles.sheetInput}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry
            accessibilityLabel="New password"
          />
          <Text style={styles.sheetLabel}>Confirm new password</Text>
          <BottomSheetTextInput
            style={styles.sheetInput}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            accessibilityLabel="Confirm new password"
          />
          {passwordError ? <Text style={styles.errorText}>{passwordError}</Text> : null}
          {passwordStatus ? <Text style={styles.successText}>{passwordStatus}</Text> : null}
          <Button label="Change password" onPress={savePassword} loading={passwordLoading} />
        </BottomSheetScrollView>
      </BottomSheet>
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
    sheetTitle: {
      ...t.typography.h2,
      color: t.colors.text.primary,
    },
    sheetDescription: {
      ...t.typography.body,
      color: t.colors.text.secondary,
      marginBottom: t.spacing.sm,
    },
    sheetLabel: {
      ...t.typography.label,
      color: t.colors.text.secondary,
    },
    sheetInput: {
      minHeight: 48,
      borderWidth: 1,
      borderColor: t.colors.border.strong,
      borderRadius: t.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: t.spacing.md,
      ...t.typography.body,
      color: t.colors.text.primary,
      backgroundColor: t.colors.surface.sunken,
    },
    placeholder: {
      color: t.colors.text.disabled,
    },
    errorText: {
      ...t.typography.bodySmall,
      color: t.colors.state.danger,
    },
    successText: {
      ...t.typography.bodySmall,
      color: t.colors.state.success,
    },
  });
