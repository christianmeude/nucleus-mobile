import { StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';
import { Button, Card, Divider } from '../../components/ui';
import { theme } from '../../theme';

function titleCase(value?: string | null): string {
  if (!value) return '—';
  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

const FIELD_ROWS = [
  { key: 'fullName', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'role', label: 'Role' },
  { key: 'department', label: 'Department' },
  { key: 'program', label: 'Program' },
] as const;

export const FacultyProfileScreen = () => {
  const { user, signOut } = useAuth();

  const fieldValue = (key: (typeof FIELD_ROWS)[number]['key']): string => {
    if (!user) return '—';
    if (key === 'role') return titleCase(user.role);
    const value = user[key];
    return value && value.trim() ? value : '—';
  };

  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Profile</Text>

      <Card>
        {FIELD_ROWS.map((field, index) => (
          <View key={field.key}>
            {index > 0 ? <Divider /> : null}
            <View style={styles.row}>
              <Text style={styles.rowLabel}>{field.label}</Text>
              <Text style={styles.rowValue}>{fieldValue(field.key)}</Text>
            </View>
          </View>
        ))}
      </Card>

      <Button
        label="Sign out"
        variant="subtle"
        onPress={signOut}
        accessibilityLabel="Sign out"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
    padding: theme.spacing.lg,
    gap: theme.spacing.lg,
  },
  title: {
    ...theme.typography.h1,
    color: theme.colors.text.primary,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  rowLabel: {
    ...theme.typography.bodySmall,
    color: theme.colors.text.muted,
  },
  rowValue: {
    ...theme.typography.bodyStrong,
    color: theme.colors.text.primary,
    flexShrink: 1,
    textAlign: 'right',
  },
});
