import React, { ReactNode, useRef } from 'react';
import { StyleSheet, Animated } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';

interface SwipeActionProps {
  children: ReactNode;
  /** Component to render on the right when swiped */
  rightActions?: (
    progressAnimatedValue: Animated.AnimatedInterpolation<number>,
    dragAnimatedValue: Animated.AnimatedInterpolation<number>,
    swipeable: Swipeable
  ) => React.ReactNode;
  /** Component to render on the left when swiped */
  leftActions?: (
    progressAnimatedValue: Animated.AnimatedInterpolation<number>,
    dragAnimatedValue: Animated.AnimatedInterpolation<number>,
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
 */
export const SwipeAction = ({
  children,
  rightActions,
  leftActions,
  onSwipeRight,
  onSwipeLeft,
  enabled = true,
}: SwipeActionProps) => {
  const swipeableRef = useRef<Swipeable>(null);

  return (
    <Swipeable
      ref={swipeableRef}
      enabled={enabled}
      renderRightActions={rightActions}
      renderLeftActions={leftActions}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') onSwipeRight?.();
        else if (direction === 'left') onSwipeLeft?.();
      }}
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
