import { Fragment, useCallback, useRef, useState } from 'react';
import {
  FlatList,
  type ListRenderItem,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Button } from '../../components/ui';
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
    body: 'Browse research across every department — search, filter, and read what NU is publishing.',
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
    body: 'Track your submission from faculty review to publication, every step visible.',
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

interface OnboardingScreenProps {
  /** Called when the student finishes ("Get Started") or skips — persists the flag. */
  onDone: () => void;
}

/**
 * First-run onboarding (A4): a four-slide, icon-only value-prop carousel shown to
 * a student before their first entry into the app. Purely presentational — no
 * data, no navigation route; `AppNavigator` renders it ahead of the app until
 * `onDone` flips the persisted `useHasOnboarded` flag.
 */
export const OnboardingScreen = ({ onDone }: OnboardingScreenProps) => {
  const styles = useThemedStyles(makeStyles);
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);

  const isLast = index === SLIDES.length - 1;

  const goNext = useCallback(() => {
    if (isLast) {
      onDone();
      return;
    }
    const next = index + 1;
    listRef.current?.scrollToIndex({ index: next, animated: true });
    setIndex(next);
  }, [index, isLast, onDone]);

  const onMomentumEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
    },
    [width],
  );

  const renderSlide: ListRenderItem<Slide> = useCallback(
    ({ item }) => (
      <View style={[styles.slide, { width }]}>
        <View style={styles.artArea}>
          {item.kind === 'stages' ? (
            <StageStrip />
          ) : (
            <SlideIcon icon={item.icon} badge={item.kind === 'badge'} />
          )}
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.body}>{item.body}</Text>
        </View>
      </View>
    ),
    [styles, width],
  );

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <View style={styles.skipRow}>
        <Pressable
          onPress={onDone}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onMomentumEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
      />

      <View style={styles.dots}>
        {SLIDES.map((slide, i) => (
          <View
            key={slide.key}
            style={[styles.dot, i === index ? styles.dotActive : styles.dotInactive]}
          />
        ))}
      </View>

      <View style={styles.footer}>
        <Button label={isLast ? 'Get Started' : 'Next'} onPress={goNext} />
      </View>
    </SafeAreaView>
  );
};

const SlideIcon = ({ icon, badge }: { icon: IoniconName; badge: boolean }) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.iconTile}>
      <Ionicons
        name={icon}
        size={56}
        color={badge ? theme.colors.brand.accent : theme.colors.brand.primary}
      />
      {badge ? <View style={styles.badgeDot} /> : null}
    </View>
  );
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
                <Ionicons name="checkmark" size={12} color={theme.colors.text.onBrand} />
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
      backgroundColor: t.colors.surface.base,
    },
    skipRow: {
      alignItems: 'flex-end',
      paddingHorizontal: t.spacing.lg,
      paddingTop: t.spacing.sm,
    },
    skip: {
      ...t.typography.label,
      color: t.colors.text.secondary,
    },
    slide: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: t.spacing.xl,
      gap: t.spacing['2xl'],
    },
    artArea: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconTile: {
      width: 132,
      height: 132,
      borderRadius: t.radii.pill,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.primarySurface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeDot: {
      position: 'absolute',
      top: 26,
      right: 34,
      width: 16,
      height: 16,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.accent,
      borderWidth: 2,
      borderColor: t.colors.surface.base,
    },
    copy: {
      alignItems: 'center',
      gap: t.spacing.sm,
    },
    title: {
      ...t.typography.h1,
      color: t.colors.text.primary,
      textAlign: 'center',
    },
    body: {
      ...t.typography.body,
      color: t.colors.text.secondary,
      textAlign: 'center',
    },
    dots: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      gap: t.spacing.sm,
      paddingVertical: t.spacing.lg,
    },
    dot: {
      borderRadius: t.radii.pill,
    },
    dotActive: {
      width: 8,
      height: 8,
      backgroundColor: t.colors.brand.primary,
    },
    dotInactive: {
      width: 6,
      height: 6,
      backgroundColor: t.colors.border.subtle,
    },
    footer: {
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.md,
    },
    // Slide 3 — standalone stage-progress strip (the Dashboard motif was removed
    // per #50, so this is a fresh presentational build, not wired to real data).
    stageStrip: {
      width: 260,
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
      borderColor: t.colors.border.strong,
      backgroundColor: t.colors.surface.sunken,
      alignItems: 'center',
      justifyContent: 'center',
    },
    stageDotDone: {
      backgroundColor: t.colors.brand.primary,
      borderColor: t.colors.brand.primary,
    },
    stageDotCurrent: {
      backgroundColor: t.colors.brand.primarySurface,
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
      backgroundColor: t.colors.border.subtle,
    },
    stageConnectorDone: {
      backgroundColor: t.colors.brand.primary,
    },
    stageLabelsRow: {
      flexDirection: 'row',
      marginTop: t.spacing.xs,
    },
    stageLabel: {
      flex: 1,
      ...t.typography.caption,
      color: t.colors.text.muted,
      textAlign: 'center',
    },
    stageLabelCurrent: {
      color: t.colors.text.primary,
      fontFamily: t.fontFamilies.ui.semibold,
    },
  });
