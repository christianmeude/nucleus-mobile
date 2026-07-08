import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemedStyles } from '../../context/ThemeContext';
import { type Theme } from '../../theme';

interface ProfileHeaderProps {
  /** Two-letter initials for the avatar squircle. */
  initials: string;
  /** Display name under the avatar. */
  name: string;
  /** Optional secondary line (handle / email · program). */
  handle?: string;
}

/**
 * Shared Profile hero: the navy banner (bleeds under the status bar via its own
 * top inset), the gold avatar squircle overlapping it, and the centered name +
 * handle. Used by both the student and faculty Profile screens so the two never
 * drift (DESIGN.md Profile A3). Render it as the first child of a `gutter={0}`,
 * top-edge-opted-out `Screen`.
 */
export const ProfileHeader = ({ initials, name, handle }: ProfileHeaderProps) => {
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(makeStyles);

  return (
    <>
      <View style={[styles.banner, { height: 120 + insets.top }]}>
        <Text style={styles.watermark}>N</Text>
      </View>

      <View style={styles.avatarWrap}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>
        <Text style={styles.name}>{name}</Text>
        {handle ? <Text style={styles.handle}>{handle}</Text> : null}
      </View>
    </>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    banner: {
      backgroundColor: t.colors.brand.primary,
      borderBottomLeftRadius: 26,
      borderBottomRightRadius: 26,
      borderCurve: 'continuous',
      overflow: 'hidden',
    },
    watermark: {
      position: 'absolute',
      right: t.spacing.lg,
      bottom: -14,
      // Same faded "N" glyph as the dashboard hero — app display typeface, not
      // monospace (the atom/mono motif was dropped project-wide).
      fontFamily: t.fontFamilies.display.bold,
      fontSize: 96,
      lineHeight: 96,
      letterSpacing: -6,
      color: 'rgba(255, 255, 255, 0.06)',
    },
    avatarWrap: {
      alignItems: 'center',
    },
    avatar: {
      width: 82,
      height: 82,
      borderRadius: 24,
      borderCurve: 'continuous',
      backgroundColor: t.colors.brand.accent,
      borderWidth: 4,
      borderColor: t.colors.surface.base,
      marginTop: -42,
      alignItems: 'center',
      justifyContent: 'center',
      ...t.shadows.level1,
    },
    avatarText: {
      fontFamily: t.fontFamilies.ui.bold,
      fontSize: 28,
      color: t.colors.text.onAccent,
    },
    name: {
      fontFamily: t.typography.h2.fontFamily,
      fontWeight: t.typography.h2.fontWeight,
      fontSize: t.typography.h2.fontSize,
      lineHeight: t.typography.h2.lineHeight,
      color: t.colors.text.primary,
      textAlign: 'center',
      marginTop: t.spacing.sm,
    },
    handle: {
      fontFamily: t.typography.metadata.fontFamily,
      fontWeight: t.typography.metadata.fontWeight,
      fontSize: t.typography.metadata.fontSize,
      lineHeight: t.typography.metadata.lineHeight,
      color: t.colors.text.muted,
      textAlign: 'center',
      marginTop: t.spacing.xs,
    },
  });
