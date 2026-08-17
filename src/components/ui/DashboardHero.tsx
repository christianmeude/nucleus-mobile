import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme, useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';
import { TopBar } from './TopBar';
import { PressableScale } from './motion/PressableScale';

/**
 * `linear-gradient(158deg, primary, primary-hover)` (DESIGN.md, Dashboard A3),
 * pre-converted to expo-linear-gradient's normalized start/end points. Shared
 * by both role dashboards so the hero band is byte-identical across roles.
 */
const HERO_GRADIENT_START = { x: 0.313, y: 0.036 };
const HERO_GRADIENT_END = { x: 0.687, y: 0.964 };

/**
 * Gold gradient for the profile avatar squircle using semantic tokens
 * distinct from the translucent-white Activity bell beside it.
 */

interface DashboardHeroProps {
  greeting: string;
  name: string;
  initials: string;
  statusLine?: { text: string; urgent: boolean } | null;
  onPressAvatar: () => void;
}

/**
 * The navy gradient hero band atop the student and faculty dashboards: greeting
 * + name + a one-glance status line on the left, the Activity bell (via TopBar)
 * and a profile avatar on the right. Owns its own safe-area top inset so the
 * band bleeds under the status bar. One component => the two dashboards cannot
 * drift apart.
 */
export const DashboardHero = ({
  greeting,
  name,
  initials,
  statusLine,
  onPressAvatar,
}: DashboardHeroProps) => {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.hero}>
      <LinearGradient
        colors={[theme.colors.brand.primary, theme.colors.brand.primaryHover]}
        start={HERO_GRADIENT_START}
        end={HERO_GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.heroGlow, { backgroundColor: theme.colors.brand.accent }]} />
      <Text style={[styles.heroWatermark, { color: theme.colors.text.onBrand }]}>N</Text>

      <View style={[styles.heroContent, { paddingTop: insets.top + theme.spacing.xl }]}>
        <TopBar
          tone="hero"
          variant="compact"
          leading={
            <PressableScale
              onPress={onPressAvatar}
              style={styles.heroAvatar}
              accessibilityRole="button"
              accessibilityLabel="Profile"
            >
              <LinearGradient
                colors={[theme.colors.brand.accentSoft, theme.colors.brand.accent]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={StyleSheet.absoluteFill}
              />
              <Text style={styles.heroAvatarText}>{initials}</Text>
            </PressableScale>
          }
        >
          <View style={styles.heroTextContent}>
            <Text style={styles.heroGreeting}>{greeting}</Text>
            <Text style={styles.heroName} numberOfLines={1}>
              {name}
            </Text>
            {statusLine ? (
              <Text style={[styles.heroSubLine, statusLine.urgent && styles.heroSubLineUrgent]}>
                {statusLine.text}
              </Text>
            ) : null}
          </View>
        </TopBar>
      </View>
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    hero: {
      overflow: 'hidden',
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
      borderCurve: 'continuous',
    },
    heroGlow: {
      position: 'absolute',
      top: -60,
      right: -60,
      width: 180,
      height: 180,
      borderRadius: t.radii.pill,
      opacity: 0.18,
    },
    heroWatermark: {
      position: 'absolute',
      right: -18,
      bottom: -36,
      fontSize: 168,
      lineHeight: 168,
      fontFamily: t.fontFamilies.display.bold,
      opacity: 0.05,
    },
    heroContent: {
      paddingHorizontal: t.spacing.lg,
      paddingBottom: t.spacing.xl,
    },
    heroGreeting: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 14,
      color: t.colors.text.onBrand,
      opacity: 0.75,
    },
    heroTextContent: {
      flex: 1,
      minWidth: 0,
      justifyContent: 'center',
    },
    heroName: {
      ...t.typography.h1,
      color: t.colors.text.onBrand,
      marginTop: 2,
    },
    heroSubLine: {
      fontFamily: t.fontFamilies.ui.regular,
      fontSize: 13,
      color: t.colors.text.onBrand,
      opacity: 0.75,
      marginTop: t.spacing.xs,
    },
    heroSubLineUrgent: {
      fontFamily: t.fontFamilies.ui.semibold,
      opacity: 1,
    },
    heroAvatar: {
      width: 44,
      height: 44,
      borderRadius: t.radii.lg,
      borderCurve: 'continuous',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    heroAvatarText: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 15,
      color: t.colors.text.onAccent,
    },
  });
