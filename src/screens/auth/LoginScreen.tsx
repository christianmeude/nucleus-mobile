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
import { Icon } from '../../components/ui/Icon';
import { Mail, Lock, CircleAlert } from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { Button, Logo } from '../../components/ui';
import { consumeLoginRejection, LoginIntent, setLoginIntent } from '../../state/loginIntent';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';

type LoginNavigationProp = NativeStackNavigationProp<RootStackParamList, 'Login'>;

type FocusField = 'email' | 'password' | null;

export const LoginScreen = () => {
  const navigation = useNavigation<LoginNavigationProp>();
  const { signIn } = useAuth();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [focused, setFocused] = useState<FocusField>(null);
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

  const iconColor = (field: FocusField) =>
    focused === field ? theme.colors.brand.primary : theme.colors.text.muted;

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Blue-dominant background accents (both navy-family; gold is reserved for
          the single emphasis underline below, never decoration). */}
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
            <View style={styles.headingBlock}>
              <Text style={styles.title}>Welcome back</Text>
              <View style={styles.accentUnderline} />
            </View>
            <Text style={styles.subtitle}>
              Sign in to browse, track, and submit National University Dasmariñas research.
            </Text>
          </View>

          <View style={styles.card}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[styles.inputWrap, focused === 'email' && styles.inputWrapFocused]}>
                <Icon
                  icon={Mail}
                  size={18}
                  color={iconColor('email')}
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
                  onFocus={() => setFocused('email')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={[styles.inputWrap, focused === 'password' && styles.inputWrapFocused]}>
                <Icon
                  icon={Lock}
                  size={18}
                  color={iconColor('password')}
                  style={styles.inputIcon}
                />
                <TextInput
                  secureTextEntry
                  placeholder="Enter your password"
                  placeholderTextColor={theme.colors.text.disabled}
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                />
              </View>
            </View>

            {error ? (
              <View style={styles.errorBox}>
                <Icon icon={CircleAlert} size={16} color={theme.colors.state.danger} />
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
              <Button
                label="Forgot password?"
                variant="subtle"
                onPress={() => navigation.navigate('ForgotPassword', { email: email.trim() })}
                disabled={submittingIntent !== null}
              />
            </View>
          </View>

          <Text style={styles.note}>
            Choose the option that matches your account — a student account can only sign in as
            Student, and a faculty account only as Faculty.
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
      top: -130,
      right: -90,
      width: 300,
      height: 300,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.primarySoft,
    },
    blobBottom: {
      position: 'absolute',
      bottom: -150,
      left: -120,
      width: 320,
      height: 320,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.primarySurface,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: theme.spacing.xl,
      gap: theme.spacing.xl,
    },
    header: {
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    headingBlock: {
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    title: {
      ...theme.typography.h1,
      color: theme.colors.text.primary,
      textAlign: 'center',
    },
    // The single gold emphasis on the screen — a short underline under the
    // heading, per the "gold for emphasis only, never decoration" rule.
    accentUnderline: {
      width: 44,
      height: 3,
      borderRadius: theme.radii.pill,
      backgroundColor: theme.colors.brand.accent,
    },
    subtitle: {
      ...theme.typography.body,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    card: {
      backgroundColor: theme.colors.surface.raised,
      borderRadius: theme.radii.xl,
      borderCurve: 'continuous',
      padding: theme.spacing.xl,
      gap: theme.spacing.md,
      borderWidth: StyleSheet.hairlineWidth,
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
      borderWidth: 1.5,
      borderColor: theme.colors.border.subtle,
      borderRadius: theme.radii.md,
      borderCurve: 'continuous',
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface.sunken,
    },
    // Navy focus ring + subtle navy fill — the main (blue) color leading the
    // interaction state.
    inputWrapFocused: {
      borderColor: theme.colors.brand.primary,
      backgroundColor: theme.colors.brand.primarySurface,
    },
    inputIcon: {
      marginRight: theme.spacing.sm,
    },
    input: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
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
      marginTop: theme.spacing.xs,
    },
    note: {
      ...theme.typography.caption,
      color: theme.colors.text.muted,
      textAlign: 'center',
    },
  });
