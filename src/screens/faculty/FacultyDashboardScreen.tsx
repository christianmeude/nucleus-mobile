import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui';
import { theme } from '../../theme';

export const FacultyDashboardScreen = () => {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Faculty Dashboard"
        message="Your review workload and recent assignments will appear here. Coming in Phase 3."
        icon={
          <Ionicons
            name="speedometer-outline"
            size={40}
            color={theme.colors.text.muted}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface.base,
    padding: theme.spacing.xl,
  },
});
