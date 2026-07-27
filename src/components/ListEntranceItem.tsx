import { createContext, memo, ReactNode, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';
import { motion } from '../theme';
import { useReduceMotion } from '../hooks/useReduceMotion';

interface ListEntranceItemProps {
  index: number;
  children: ReactNode;
}

const ListEntranceContext = createContext(false);

export const useListEntranceActive = () => useContext(ListEntranceContext);

export const ListEntranceItem = memo(({ index, children }: ListEntranceItemProps) => {
  const reduceMotion = useReduceMotion();
  const shouldAnimateInitial = !reduceMotion && index < 8;
  const opacity = useRef(new Animated.Value(shouldAnimateInitial ? 0 : 1)).current;
  const translateY = useRef(new Animated.Value(shouldAnimateInitial ? 8 : 0)).current;
  const [entering, setEntering] = useState(shouldAnimateInitial);
  const isMountedRef = useRef(true);
  const hasAnimatedRef = useRef(!shouldAnimateInitial);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (reduceMotion || index >= 8 || hasAnimatedRef.current) {
      opacity.setValue(1);
      translateY.setValue(0);
      setEntering(false);
      hasAnimatedRef.current = true;
      return;
    }

    hasAnimatedRef.current = true;
    setEntering(true);

    const animation = Animated.sequence([
      Animated.delay(index * motion.listStaggerDelay),
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: motion.listItemDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: motion.listItemDuration,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
    ]);

    animation.start(({ finished }) => {
      if (finished && isMountedRef.current) {
        setEntering(false);
      }
    });
    return () => {
      animation.stop();
    };
  }, [index, opacity, reduceMotion, translateY]);

  return (
    <ListEntranceContext.Provider value={entering}>
      <Animated.View style={[styles.wrap, { opacity, transform: [{ translateY }] }]}>
        {children}
      </Animated.View>
    </ListEntranceContext.Provider>
  );
});

ListEntranceItem.displayName = 'ListEntranceItem';

const styles = StyleSheet.create({
  wrap: {
    alignSelf: 'stretch',
  },
});
