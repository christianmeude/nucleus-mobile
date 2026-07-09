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
import { Ionicons } from '@expo/vector-icons';
import { PressableScale } from '../../components/ui';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

type IoniconName = keyof typeof Ionicons.glyphMap;

type Slide =
  | { key: string; kind: 'icon'; icon: IoniconName; title: string; body: string }
  | { key: string; kind: 'badge'; icon: IoniconName; title: string; body: string }
  | { key: string; kind: 'stages'; title: string; body: string };

const SLIDES: Slide[] = [
  {
    key: 'discover',
    kind: 'icon',
    icon: 'search-outline',
    title: 'Discover NU Research',
    body: 'Browse research across every department — search, filter, and read what National University is publishing.',
  },
  {
    key: 'submit',
    kind: 'icon',
    icon: 'cloud-upload-outline',
    title: 'Submit in Minutes',
    body: 'Upload your paper and send it straight into faculty review, right from your phone.',
  },
  {
    key: 'stages',
    kind: 'stages',
    title: 'Follow Every Stage',
    body: 'Track your submission from faculty review all the way to publication — every step visible.',
  },
  {
    key: 'loop',
    kind: 'badge',
    icon: 'notifications-outline',
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

  const onNext = useCallback(() => (isLast ? onDone() : goTo(index + 1)), [isLast, onDone, goTo, index]);

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
              <Ionicons name="chevron-back" size={18} color={ON_NAVY_MUTED} />
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
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
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
            <Ionicons
              name={isLast ? 'arrow-forward' : 'chevron-forward'}
              size={18}
              color={theme.colors.brand.primary}
            />
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
        { translateX: interpolate(scrollX.value, inputRange, [width * 0.22, 0, -width * 0.22], Extrapolation.CLAMP) },
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
        {slide.kind === 'stages' ? <StageStrip /> : <SlideIcon icon={slide.icon} badge={slide.kind === 'badge'} />}
      </Animated.View>
      <Animated.View style={[styles.copy, copyStyle]}>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.body}>{slide.body}</Text>
      </Animated.View>
    </View>
  );
};

const SlideIcon = ({ icon, badge }: { icon: IoniconName; badge: boolean }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.iconTile}>
      <Ionicons name={icon} size={60} color={badge ? theme.colors.brand.accent : theme.colors.text.onBrand} />
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

const StageStrip = () => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.stageStrip}>
      <View style={styles.stageDotsRow}>
        {STAGES.map((label, i) => (
          <Fragment key={label}>
            <View
              style={[
                styles.stageDot,
                i < CURRENT_STAGE && styles.stageDotDone,
                i === CURRENT_STAGE && styles.stageDotCurrent,
              ]}
            >
              {i < CURRENT_STAGE ? (
                <Ionicons name="checkmark" size={12} color={theme.colors.brand.primary} />
              ) : i === CURRENT_STAGE ? (
                <View style={styles.stageDotCurrentCore} />
              ) : null}
            </View>
            {i < STAGES.length - 1 ? (
              <View style={[styles.stageConnector, i < CURRENT_STAGE && styles.stageConnectorDone]} />
            ) : null}
          </Fragment>
        ))}
      </View>
      <View style={styles.stageLabelsRow}>
        {STAGES.map((label, i) => (
          <Text
            key={label}
            style={[styles.stageLabel, i === CURRENT_STAGE && styles.stageLabelCurrent]}
          >
            {label}
          </Text>
        ))}
      </View>
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
      bottom: -80,
      width: 340,
      height: 340,
      tintColor: t.colors.text.onBrand,
      opacity: 0.06,
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
    // Slide 3 — stage-progress strip, adapted to the navy ground.
    stageStrip: {
      width: 268,
    },
    stageDotsRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    stageDot: {
      width: 24,
      height: 24,
      borderRadius: t.radii.pill,
      borderWidth: 2,
      borderColor: 'rgba(255, 255, 255, 0.3)',
      backgroundColor: 'rgba(255, 255, 255, 0.08)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageDotDone: {
      backgroundColor: t.colors.text.onBrand,
      borderColor: t.colors.text.onBrand,
    },
    stageDotCurrent: {
      backgroundColor: 'rgba(205, 164, 52, 0.14)',
      borderColor: t.colors.brand.accent,
      borderWidth: 3,
    },
    stageDotCurrentCore: {
      width: 8,
      height: 8,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
    },
    stageConnector: {
      flex: 1,
      height: 2,
      marginHorizontal: 2,
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
    },
    stageConnectorDone: {
      backgroundColor: t.colors.text.onBrand,
    },
    stageLabelsRow: {
      flexDirection: 'row',
      marginTop: t.spacing.xs,
    },
    stageLabel: {
      flex: 1,
      ...t.typography.caption,
      color: 'rgba(255, 255, 255, 0.6)',
      textAlign: 'center',
    },
    stageLabelCurrent: {
      color: t.colors.brand.accent,
      fontFamily: t.fontFamilies.ui.semibold,
    },
  });
