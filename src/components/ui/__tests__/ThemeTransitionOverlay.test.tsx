import React from 'react';
import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { act, create } from 'react-test-renderer';
import { ThemeTransitionOverlay } from '../ThemeTransitionOverlay';

let mockScheme: 'light' | 'dark' = 'light';
let mockReduceMotion = false;

// Mock react-native-reanimated for Jest
jest.mock('react-native-reanimated', () => {
  const RN = jest.requireActual('react-native') as typeof import('react-native');
  return {
    __esModule: true,
    default: {
      View: RN.View,
    },
    useSharedValue: (initial: number) => ({ value: initial }),
    useAnimatedStyle: (fn: () => unknown) => fn(),
    withTiming: (toValue: number, _config?: unknown, callback?: (finished: boolean) => void) => {
      callback?.(true);
      return toValue;
    },
    Easing: {
      bezier: () => (t: number) => t,
      out: (f: (t: number) => number) => f,
      inOut: (f: (t: number) => number) => f,
      quad: (t: number) => t,
    },
    interpolateColor: (_v: number, _in: number[], out: string[]) => out[0],
    useReducedMotion: () => false,
  };
});

jest.mock('../../../context/ThemeContext', () => {
  const { themes } = jest.requireActual('../../../theme') as typeof import('../../../theme');
  return {
    useTheme: () => ({
      theme: themes[mockScheme],
      scheme: mockScheme,
      preference: mockScheme,
      setPreference: () => {},
    }),
  };
});

jest.mock('../../../hooks/useReduceMotion', () => ({
  useReduceMotion: () => mockReduceMotion,
}));

describe('ThemeTransitionOverlay', () => {
  beforeEach(() => {
    mockScheme = 'light';
    mockReduceMotion = false;
    jest.clearAllMocks();
  });

  it('mounts cleanly with pointerEvents="none"', () => {
    let tree: ReturnType<typeof create> | undefined;
    act(() => {
      tree = create(<ThemeTransitionOverlay />);
    });

    expect(tree).toBeDefined();
    const root = tree!.root;
    const view = root.findByProps({ pointerEvents: 'none' });
    expect(view).toBeDefined();
  });

  it('handles scheme change cleanly', () => {
    let tree: ReturnType<typeof create> | undefined;
    act(() => {
      tree = create(<ThemeTransitionOverlay />);
    });

    // Update scheme to dark
    mockScheme = 'dark';
    act(() => {
      tree!.update(<ThemeTransitionOverlay />);
    });

    const root = tree!.root;
    const view = root.findByProps({ pointerEvents: 'none' });
    expect(view).toBeDefined();
  });

  it('respects reduced motion', () => {
    mockReduceMotion = true;
    let tree: ReturnType<typeof create> | undefined;
    act(() => {
      tree = create(<ThemeTransitionOverlay />);
    });

    mockScheme = 'dark';
    act(() => {
      tree!.update(<ThemeTransitionOverlay />);
    });

    const root = tree!.root;
    const view = root.findByProps({ pointerEvents: 'none' });
    expect(view).toBeDefined();
  });
});
