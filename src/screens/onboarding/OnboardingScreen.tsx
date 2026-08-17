import { Fragment, useCallback, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  CloudUpload,
  Bell,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Trophy,
  Check,
} from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { PressableScale, Icon } from '../../components/ui';

import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { armFirstEntrance } from '../../lib/firstEntrance';

type Slide =
  | { key: string; kind: 'icon'; icon: LucideIcon; title: string; body: string }
  | { key: string; kind: 'badge'; icon: LucideIcon; title: string; body: string }
  | { key: string; kind: 'stages'; title: string; body: string };

const SLIDES: Slide[] = [
  {
    key: 'discover',
    kind: 'icon',
    icon: Search,
    title: 'Discover NU Research',
    body: 'Browse research across every department — search, filter, and read what National University is publishing.',
  },
  {
    key: 'submit',
    kind: 'icon',
    icon: CloudUpload,
    title: 'Submit in Minutes',
    body: 'Upload your paper and send it straight into faculty review, right from your phone.',
  },
  {
    key: 'stages',
    kind: 'stages',
    title: 'Track your Progress',
    body: 'Track your submission from faculty review all the way to publication — every step visible.',
  },
  {
    key: 'loop',
    kind: 'badge',
    icon: Bell,
    title: 'Stay in the Loop',
    body: 'Get notified the moment your status changes or a co-author invites you in.',
  },
];

const STAGES = ['Submitted', 'Faculty', 'Dean', 'Published'];
/** The "Dean" dot carries the accent gold-ring current-stage treatment (DESIGN.md A4). */
const CURRENT_STAGE = 2;

/** `linear-gradient(158deg)` start/end (same navy band the app's heroes use). */
const HERO_START = { x: 0.313, y: 0.036 };
const HERO_END = { x: 0.687, y: 0.964 };

/** Translucent white for secondary controls sitting on the navy ground. */
const ON_NAVY_MUTED = 'rgba(255, 255, 255, 0.75)';

interface OnboardingScreenProps {
  /** Called when the student finishes ("Get Started") or skips — persists the flag. */
  onDone: () => void;
}

/**
 * First-run onboarding (A4): an immersive, navy-gradient value-prop carousel — the
 * same hero identity the Dashboard/Profile use — with scroll-choreographed icon +
 * copy, a worm progress indicator, and Skip/Back/Next controls. Purely
 * presentational: no data, no navigation route; `AppNavigator` renders it ahead of
 * the app until `onDone` flips the persisted `useHasOnboarded` flag. All motion
 * no-ops under reduced-motion (the swipe itself still works).
 */
export const OnboardingScreen = ({ onDone }: OnboardingScreenProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  const goTo = useCallback(
    (target: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, target));
      scrollRef.current?.scrollTo({ x: clamped * width, animated: !reducedMotion });
      setIndex(clamped);
    },
    [scrollRef, width, reducedMotion],
  );

  // Finishing arms the one-time home "assemble" entrance, then flips the flag so
  // the app mounts immediately (no fade-to-blank gap) and its chrome animates
  // itself in — header dropping in, cards rising, navbar sliding up.
  const onNext = useCallback(() => {
    if (!isLast) {
      goTo(index + 1);
      return;
    }
    armFirstEntrance();
    onDone();
  }, [isLast, onDone, goTo, index]);

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover]}
        start={HERO_START}
        end={HERO_END}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.glow, { backgroundColor: theme.colors.brand.accent }]} />
      {/* NUcleus mark as an oversized translucent-white silhouette (the mark tinted
          onBrand + low opacity keeps its alpha, so the logo shape reads). */}
      <Image
        source={require('../../../assets/images/nucleus-mark.png')}
        style={styles.watermark}
        resizeMode="contain"
        accessibilityIgnoresInvertColors
      />

      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.topBar}>
          {index > 0 ? (
            <PressableScale
              style={styles.navBtn}
              onPress={() => goTo(index - 1)}
              accessibilityRole="button"
              accessibilityLabel="Previous"
            >
              <ChevronLeft size={18} color={ON_NAVY_MUTED} />
              <Text style={styles.navBtnText}>Back</Text>
            </PressableScale>
          ) : (
            <View style={styles.navBtn} />
          )}
          <Pressable
            onPress={onDone}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
          >
            <Text style={styles.navBtnText}>Skip</Text>
          </Pressable>
        </View>

        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          ref={scrollRef}
          horizontal
          pagingEnabled

          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) =>
            setIndex(Math.round(event.nativeEvent.contentOffset.x / width))
          }
        >
          {SLIDES.map((slide, i) => (
            <SlideView
              key={slide.key}
              slide={slide}
              index={i}
              scrollX={scrollX}
              width={width}
              reducedMotion={reducedMotion}
            />
          ))}
        </Animated.ScrollView>

        <View style={styles.footer}>
          <View style={styles.dotsRow}>
            {SLIDES.map((slide, i) => (
              <Dot
                key={slide.key}
                index={i}
                scrollX={scrollX}
                width={width}
                active={i === index}
                reducedMotion={reducedMotion}
              />
            ))}
          </View>

          <PressableScale
            style={styles.cta}
            onPress={onNext}
            accessibilityRole="button"
            accessibilityLabel={isLast ? 'Get started' : 'Next slide'}
          >
            <Text style={styles.ctaLabel}>{isLast ? 'Get Started' : 'Next'}</Text>
            {isLast ? (
              <ArrowRight size={18} color={theme.colors.brand.primary} />
            ) : (
              <ChevronRight size={18} color={theme.colors.brand.primary} />
            )}
          </PressableScale>
        </View>
      </SafeAreaView>
    </View>
  );
};

interface SlideViewProps {
  slide: Slide;
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  reducedMotion: boolean;
}

const SlideView = ({ slide, index, scrollX, width, reducedMotion }: SlideViewProps) => {
  const styles = useThemedStyles(makeStyles);
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const artStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { scale: interpolate(scrollX.value, inputRange, [0.6, 1, 0.6], Extrapolation.CLAMP) },
        {
          translateX: interpolate(
            scrollX.value,
            inputRange,
            [width * 0.22, 0, -width * 0.22],
            Extrapolation.CLAMP,
          ),
        },
      ],
    };
  });

  const copyStyle = useAnimatedStyle(() => {
    if (reducedMotion) return {};
    return {
      opacity: interpolate(scrollX.value, inputRange, [0, 1, 0], Extrapolation.CLAMP),
      transform: [
        { translateY: interpolate(scrollX.value, inputRange, [28, 0, 28], Extrapolation.CLAMP) },
      ],
    };
  });

  return (
    <View style={[styles.slide, { width }]}>
      <Animated.View style={[styles.artArea, artStyle]}>
        {slide.kind === 'stages' ? (
          <StageStrip />
        ) : (
          <SlideIcon icon={slide.icon} badge={slide.kind === 'badge'} />
        )}
      </Animated.View>
      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
};

const SlideIcon = ({ icon: Icon, badge }: { icon: LucideIcon; badge: boolean }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.iconTile}>
      <Icon size={60} color={badge ? theme.colors.brand.accent : theme.colors.text.onBrand} />
      {badge ? <View style={styles.badgeDot} /> : null}
    </View>
  );
};

interface DotProps {
  index: number;
  scrollX: SharedValue<number>;
  width: number;
  active: boolean;
  reducedMotion: boolean;
}

const Dot = ({ index, scrollX, width, active, reducedMotion }: DotProps) => {
  const styles = useThemedStyles(makeStyles);
  const inputRange = [(index - 1) * width, index * width, (index + 1) * width];

  const style = useAnimatedStyle(() => {
    if (reducedMotion) {
      return { width: active ? 22 : 7, opacity: active ? 1 : 0.35 };
    }
    return {
      width: interpolate(scrollX.value, inputRange, [7, 22, 7], Extrapolation.CLAMP),
      opacity: interpolate(scrollX.value, inputRange, [0.35, 1, 0.35], Extrapolation.CLAMP),
    };
  });

  return <Animated.View style={[styles.dot, style]} />;
};

/**
 * Slide 3 art: a wordless journey map (DESIGN.md kept the same navy/gold palette,
 * labels dropped for a cleaner, prouder read). Travelled stages are solid white
 * with a check, the current stage is a glowing gold ring, and the final stage is
 * the goal — a larger gold node crowned with a trophy and its own halo, reached
 * by a dashed "path ahead" connector.
 */
const StageStrip = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const lastIndex = STAGES.length - 1;

  return (
    <View style={styles.stageStrip}>
      {STAGES.map((label, i) => {
        const done = i < CURRENT_STAGE;
        const current = i === CURRENT_STAGE;
        const goal = i === lastIndex;
        return (
          <Fragment key={label}>
            {i > 0 ? (
              <View
                style={[
                  styles.stageConnector,
                  i <= CURRENT_STAGE ? styles.stageConnectorDone : styles.stageConnectorAhead,
                ]}
              />
            ) : null}
            <View style={styles.stageNodeWrap}>
              {current ? <View style={styles.stageGlow} /> : null}
              {goal ? <View style={[styles.stageGlow, styles.stageGlowGoal]} /> : null}
              {goal ? (
                <View style={styles.stageGoal}>
                  <Trophy size={18} color={theme.colors.brand.primary} />
                </View>
              ) : current ? (
                <View style={styles.stageCurrent}>
                  <View style={styles.stageCurrentCore} />
                </View>
              ) : done ? (
                <View style={styles.stageDone}>
                  <Check size={13} color={theme.colors.brand.primary} />
                </View>
              ) : (
                <View style={styles.stageUpcoming} />
              )}
            </View>
          </Fragment>
        );
      })}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: t.colors.brand.primary,
    },
    glow: {
      position: 'absolute',
      top: -80,
      right: -70,
      width: 240,
      height: 240,
      borderRadius: t.radii.pill,
      opacity: 0.16,
    },
    watermark: {
      position: 'absolute',
      left: -70,
      // Lifted up off the bottom so the CTA button no longer sits fully over the
      // mark — more of the NUcleus silhouette reads above the footer.
      bottom: 40,
      width: 340,
      height: 340,
      tintColor: t.colors.text.onBrand,
      opacity: 0.07,
    },
    safe: {
      flex: 1,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
      minHeight: 32,
    },
    navBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
      minWidth: 60,
    },
    navBtnText: {
      ...t.typography.label,
      color: ON_NAVY_MUTED,
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.spacing.xl,
      gap: t.spacing['3xl'],
    },
    artArea: {
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: 176,
    },
    iconTile: {
      width: 140,
      height: 140,
      borderRadius: 40,
      borderCurve: 'continuous',
      backgroundColor: 'rgba(255, 255, 255, 0.10)',
      borderWidth: 1,
      borderColor: 'rgba(255, 255, 255, 0.18)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeDot: {
      position: 'absolute',
      top: 26,
      right: 30,
      width: 16,
      height: 16,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
      borderWidth: 2,
      borderColor: t.colors.brand.primary,
    },
    copy: {
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    title: {
      ...t.typography.display,
      color: t.colors.text.onBrand,
      textAlign: 'center',
    },
    body: {
      ...t.typography.body,
      color: 'rgba(255, 255, 255, 0.78)',
      textAlign: 'center',
    },
    footer: {
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.md,
      gap: t.spacing.xl,
    },
    dotsRow: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: t.spacing.sm,
      height: 8,
    },
    dot: {
      height: 7,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
    },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.sm,
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      paddingVertical: t.spacing.md + 2,
      paddingHorizontal: t.spacing.xl,
      ...t.shadows.level2,
    },
    ctaLabel: {
      ...t.typography.button,
      color: t.colors.brand.primary,
    },
    // Slide 3 — wordless stage journey on the navy ground (labels removed).
    stageStrip: {
      width: 288,
      flexDirection: 'row',
      alignItems: 'center',
    },
    stageNodeWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Soft gold halo behind the current + goal nodes (approximates a glow without
    // a blur dependency — a low-opacity oversized gold disc).
    stageGlow: {
      position: 'absolute',
      width: 46,
      height: 46,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
      opacity: 0.18,
    },
    stageGlowGoal: {
      width: 58,
      height: 58,
      opacity: 0.22,
    },
    stageDone: {
      width: 24,
      height: 24,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.text.onBrand,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageCurrent: {
      width: 30,
      height: 30,
      borderRadius: t.radii.pill,
      borderWidth: 3,
      borderColor: t.colors.brand.accent,
      backgroundColor: 'rgba(205, 164, 52, 0.16)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageCurrentCore: {
      width: 9,
      height: 9,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
    },
    // The goal: a larger solid-gold node capped with a trophy — the proud finish.
    stageGoal: {
      width: 38,
      height: 38,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.55)',
    },
    stageUpcoming: {
      width: 22,
      height: 22,
      borderRadius: t.radii.pill,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    stageConnector: {
      flex: 1,
      height: 2,
      marginHorizontal: 4,
    },
    stageConnectorDone: {
      backgroundColor: t.colors.brand.accent,
    },
    stageConnectorAhead: {
      height: 0,
      borderRadius: 1,
      borderTopWidth: 2,
      borderStyle: 'dashed',
      borderColor: 'rgba(255, 255, 255, 0.35)',
    },
  });
