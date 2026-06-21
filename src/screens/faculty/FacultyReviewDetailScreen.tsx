import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { EmptyState } from '../../components/ui';
import { theme } from '../../theme';

export const FacultyReviewDetailScreen = () => {
  return (
    <View style={styles.container}>
      <EmptyState
        title="Paper Review"
        message="Paper metadata, workflow history, and the PDF will appear here. Coming in Phase 5."
        icon={
          <Ionicons name="reader-outline" size={40} color={theme.colors.text.muted} />
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
