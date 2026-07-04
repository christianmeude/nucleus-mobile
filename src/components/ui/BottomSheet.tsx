import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { ReactNode } from 'react';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
}

export const BottomSheet = ({ visible, onClose, children }: BottomSheetProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, theme.shadows.level2]} onPress={() => undefined}>
          <View style={styles.handle} />
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: t.colors.surface.overlay,
      justifyContent: 'flex-end',
    },
    sheet: {
      backgroundColor: t.colors.surface.raised,
      borderTopLeftRadius: t.radii.lg,
      borderTopRightRadius: t.radii.lg,
      padding: t.spacing.lg,
      gap: t.spacing.md,
    },
    handle: {
      width: 42,
      height: 4,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.border.strong,
      alignSelf: 'center',
    },
  });
