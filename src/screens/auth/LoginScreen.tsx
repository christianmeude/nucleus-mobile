import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Button, Logo } from '../../components/ui';
import { consumeLoginRejection, LoginIntent, setLoginIntent } from '../../state/loginIntent';

export const LoginScreen = () => {
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submittingIntent, setSubmittingIntent] = useState<LoginIntent | null>(null);
  const [error, setError] = useState(() => consumeLoginRejection() || '');

  const onSubmit = async (intent: LoginIntent) => {
    if (!email.trim() || !password.trim()) {
      setError('Email and password are required.');
      return;
    }

    setSubmittingIntent(intent);
    setError('');
    setLoginIntent(intent);

    const result = await signIn(email.trim(), password);
    setSubmittingIntent(null);

    if (!result.success) {
      setLoginIntent(null);
      setError(result.error || 'Unable to sign in.');
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.blobTop} />
      <View style={styles.blobBottom} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.select({ ios: 'padding', android: 'height' })}
        keyboardVerticalOffset={Platform.select({ ios: 0, android: 24 })}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Logo size="lg" showWordmark />
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>
              Sign in to browse, track, and submit your research.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="mail-outline"
                  size={18}
                  color={theme.colors.text.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder="you@example.com"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={18}
                  color={theme.colors.text.muted}
                  style={styles.inputIcon}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                />
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color={theme.colors.state.danger} />
                <Text style={styles.error}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.actions}>
              <Button
                label="Sign in as Student"
                onPress={() => onSubmit('student')}
                loading={submittingIntent === 'student'}
                disabled={submittingIntent !== null}
              />
              <Button
                label="Sign in as Faculty"
                variant="secondary"
                onPress={() => onSubmit('faculty')}
                loading={submittingIntent === 'faculty'}
                disabled={submittingIntent !== null}
              />
            </View>
          </View>

          <Text style={styles.note}>
            NUcleus connects students and faculty to National University Dasmariñas research —
            discover, review, and submit papers in one place.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const makeStyles = (theme: Theme) =>
  StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
    overflow: 'hidden',
  },
  flex: {
    flex: 1,
  },
  blobTop: {
    position: 'absolute',
    top: -120,
    right: -100,
    width: 280,
    height: 280,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.primarySoft,
  },
  blobBottom: {
    position: 'absolute',
    bottom: -140,
    left: -110,
    width: 300,
    height: 300,
    borderRadius: theme.radii.pill,
    backgroundColor: theme.colors.brand.accentSoft,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.xl,
    gap: theme.spacing.xl,
  },
  header: {
    alignItems: 'center',
    gap: theme.spacing.sm,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    ...theme.typography.body,
    color: theme.colors.text.secondary,
    textAlign: 'center',
  },
  card: {
    backgroundColor: theme.colors.surface.raised,
    borderRadius: theme.radii.lg,
    padding: theme.spacing.xl,
    gap: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border.subtle,
    ...theme.shadows.level2,
  },
  formGroup: {
    gap: theme.spacing.xs,
  },
  label: {
    ...theme.typography.label,
    color: theme.colors.text.secondary,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border.strong,
    borderRadius: theme.radii.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: theme.colors.surface.raised,
  },
  inputIcon: {
    marginRight: theme.spacing.sm,
  },
  input: {
    flex: 1,
    paddingVertical: theme.spacing.sm,
    ...theme.typography.body,
    color: theme.colors.text.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
    backgroundColor: theme.colors.state.dangerSurface,
    borderRadius: theme.radii.md,
    padding: theme.spacing.sm,
  },
  error: {
    ...theme.typography.bodySmall,
    color: theme.colors.state.danger,
    flexShrink: 1,
  },
  actions: {
    gap: theme.spacing.sm,
  },
  note: {
    ...theme.typography.caption,
    color: theme.colors.text.muted,
    textAlign: 'center',
  },
});
