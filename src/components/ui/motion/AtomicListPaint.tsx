import { ReactNode } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { motion } from '../../../theme';
import { FadeInView } from './FadeInView';

interface AtomicListPaintProps {
  /** True once the first non-empty batch of rows is ready to paint. */
  ready: boolean;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Group entrance for a list's first data commit.
 *
 * The key flip is deliberate: FadeInView reads `active` at mount, so a stable
 * wrapper would not replay the fade when the batch lands. The flip coincides
 * with the empty↔non-empty remount LegendList already performs via
 * `listEpochKey`, so nothing extra is torn down. While `ready` is false the
 * skeleton/empty state renders at full opacity; when rows land, the whole batch
 * fades in as one motion (opacity only; no per-row stagger).
 */
export const AtomicListPaint = ({ ready, children, style }: AtomicListPaintProps) => (
  <FadeInView
    key={ready ? 'ready' : 'waiting'}
    active={ready}
    distance={0}
    duration={motion.duration.base}
    style={style}
  >
    {children}
  </FadeInView>
);
