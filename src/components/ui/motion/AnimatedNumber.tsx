import { StyleProp, TextStyle, View } from 'react-native';
import Animated, { FadeInUp, FadeOutDown, FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useEffect, useRef } from 'react';

interface AnimatedNumberProps {
  value: number;
  style?: StyleProp<TextStyle>;
}

export const AnimatedNumber = ({ value, style }: AnimatedNumberProps) => {
  const prevValue = useRef(value);
  const isIncreasing = value >= prevValue.current;

  useEffect(() => {
    prevValue.current = value;
  }, [value]);

  return (
    <View style={{ overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.Text
        key={value}
        entering={
          isIncreasing ? FadeInDown.springify().damping(14) : FadeInUp.springify().damping(14)
        }
        exiting={
          isIncreasing
            ? FadeOutUp.springify().damping(14).withInitialValues({ position: 'absolute' })
            : FadeOutDown.springify().damping(14).withInitialValues({ position: 'absolute' })
        }
        style={style}
      >
        {value}
      </Animated.Text>
    </View>
  );
};
