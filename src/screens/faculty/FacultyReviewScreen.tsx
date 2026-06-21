import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui';
import { theme } from '../../theme';

export const FacultyReviewScreen = () => {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Review Submissions"
        message="Papers assigned to you for review will appear here. Coming in Phase 4."
        icon={
          <Ionicons
            name="document-text-outline"
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
