import { useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import Pdf from 'react-native-pdf';
import { theme } from '../theme';
import { Button, InlineNotice } from './ui';

// Shared, native, read-only PDF viewer used by both the student ResearchDetail and the
// faculty review detail. Renders the document inline (scroll/zoom) and offers a fullscreen
// in-app modal — no browser/external handoff. Falls back to opening in the in-app browser
// if native rendering fails. react-native-pdf is a native module, so the app must run on a
// dev build that includes it.

interface PdfSurfaceProps {
  uri: string;
  /** Fired the first time this surface finishes loading. */
  onLoaded?: () => void;
}

/** A single native PDF render surface with its own loading + error handling. */
const PdfSurface = ({ uri, onLoaded }: PdfSurfaceProps) => {
  const [loading, setLoading] = useState(true);
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <View style={styles.overlay}>
        <InlineNotice tone="warning" message="This PDF could not be displayed in the app." />
        <Button
          label="Open in browser"
          variant="secondary"
          onPress={() => {
            WebBrowser.openBrowserAsync(uri).catch(() => undefined);
          }}
        />
      </View>
    );
  }

  return (
    <>
      <Pdf
        source={{ uri, cache: true }}
        trustAllCerts={false}
        onLoadComplete={() => {
          setLoading(false);
          onLoaded?.();
        }}
        onError={() => {
          setLoading(false);
          setErrored(true);
        }}
        style={StyleSheet.absoluteFill}
      />
      {loading ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        </View>
      ) : null}
    </>
  );
};

interface PdfViewerProps {
  uri: string;
  /** Fired once, the first time the inline PDF finishes loading (e.g. to track a view). */
  onFirstLoad?: () => void;
  /** Inline panel height. Defaults to 460. */
  height?: number;
}

export const PdfViewer = ({ uri, onFirstLoad, height = 460 }: PdfViewerProps) => {
  const [fullscreen, setFullscreen] = useState(false);
  const firstLoadFired = useRef(false);

  const handleFirstLoad = () => {
    if (firstLoadFired.current) return;
    firstLoadFired.current = true;
    onFirstLoad?.();
  };

  return (
    <View>
      <View style={[styles.panel, { height }]}>
        <PdfSurface uri={uri} onLoaded={handleFirstLoad} />
        <Pressable
          onPress={() => setFullscreen(true)}
          accessibilityRole="button"
          accessibilityLabel="View PDF fullscreen"
          style={styles.expandButton}
        >
          <Ionicons name="expand-outline" size={18} color={theme.colors.text.onBrand} />
        </Pressable>
      </View>

      <Modal
        visible={fullscreen}
        animationType="slide"
        onRequestClose={() => setFullscreen(false)}
      >
        <SafeAreaView style={styles.modal} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Pressable
              onPress={() => setFullscreen(false)}
              accessibilityRole="button"
              accessibilityLabel="Close fullscreen PDF"
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={theme.colors.text.primary} />
            </Pressable>
          </View>
          <View style={styles.modalBody}>{fullscreen ? <PdfSurface uri={uri} /> : null}</View>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.radii.lg,
    overflow: 'hidden',
    backgroundColor: theme.colors.surface.sunken,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.border.subtle,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    padding: theme.spacing.lg,
    backgroundColor: theme.colors.surface.sunken,
  },
  expandButton: {
    position: 'absolute',
    top: theme.spacing.sm,
    right: theme.spacing.sm,
    width: 36,
    height: 36,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.brand.primary,
    ...theme.shadows.level2,
  },
  modal: {
    flex: 1,
    backgroundColor: theme.colors.surface.base,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: theme.spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: theme.radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.surface.raised,
  },
  modalBody: {
    flex: 1,
    backgroundColor: theme.colors.surface.sunken,
  },
});
