import React, { forwardRef, useCallback, useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { BottomSheetModal, BottomSheetBackdrop, BottomSheetView } from '@gorhom/bottom-sheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import type { Theme } from '../../theme';

interface BottomSheetProps {
  onDismiss?: () => void;
  children: React.ReactNode;
  snapPoints?: (string | number)[];
}

export const BottomSheet = forwardRef<BottomSheetModal, BottomSheetProps>(
  ({ onDismiss, children, snapPoints }, ref) => {
    const { theme } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const insets = useSafeAreaInsets();

    const renderBackdrop = useCallback(
      (props: any) => (
        <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} opacity={0.6} />
      ),
      [],
    );

    return (
      <BottomSheetModal
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enableDynamicSizing={!snapPoints}
        enablePanDownToClose
        onDismiss={onDismiss}
        backdropComponent={renderBackdrop}
        backgroundStyle={styles.bottomSheetBackground}
        handleIndicatorStyle={styles.bottomSheetIndicator}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView
          style={[
            styles.sheetContent,
            !snapPoints && { flex: 0 },
            { paddingBottom: theme.spacing.lg + insets.bottom },
          ]}
        >
          {children}
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

export {
  BottomSheetScrollView,
  BottomSheetTextInput,
  BottomSheetFlatList,
  BottomSheetSectionList,
} from '@gorhom/bottom-sheet';

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    bottomSheetBackground: {
      backgroundColor: t.colors.surface.raised,
      borderTopLeftRadius: t.radii.lg,
      borderTopRightRadius: t.radii.lg,
    },
    bottomSheetIndicator: {
      backgroundColor: t.colors.border.strong,
      width: 42,
    },
    sheetContent: {
      paddingHorizontal: t.spacing.lg,
      gap: t.spacing.md,
      flex: 1,
    },
  });
