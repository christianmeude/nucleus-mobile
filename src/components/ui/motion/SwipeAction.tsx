import React, { ReactNode, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { useReduceMotion } from '../../../hooks/useReduceMotion';

interface SwipeActionProps {
  children: ReactNode;
  /** Component to render on the right when swiped */
  rightActions?: (
    progressAnimatedValue: any,
    dragAnimatedValue: any,
    swipeable: Swipeable
  ) => React.ReactNode;
  /** Component to render on the left when swiped */
  leftActions?: (
    progressAnimatedValue: any,
    dragAnimatedValue: any,
    swipeable: Swipeable
  ) => React.ReactNode;
  /** Callback when swiped open on the right */
  onSwipeRight?: () => void;
  /** Callback when swiped open on the left */
  onSwipeLeft?: () => void;
  /** Whether swiping is enabled */
  enabled?: boolean;
}

/**
 * A swipeable row component for revealing contextual actions.
 * Disables swiping if reduced motion is enabled.
 */
export const SwipeAction = ({
  children,
  rightActions,
  leftActions,
  onSwipeRight,
  onSwipeLeft,
  enabled = true,
}: SwipeActionProps) => {
  const reduceMotion = useReduceMotion();
  const swipeableRef = useRef<Swipeable>(null);

  const handleSwipeableOpen = (direction: 'left' | 'right') => {
    if (direction === 'right' && onSwipeRight) {
      onSwipeRight();
    } else if (direction === 'left' && onSwipeLeft) {
      onSwipeLeft();
    }
  };

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={enabled && !reduceMotion}
      renderRightActions={rightActions}
      renderLeftActions={leftActions}
      onSwipeableOpen={handleSwipeableOpen}
      containerStyle={styles.container}
    >
      {children}
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
