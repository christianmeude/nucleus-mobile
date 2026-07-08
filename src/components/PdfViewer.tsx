import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { useTheme, useThemedStyles } from '../context/ThemeContext';
import { type Theme } from '../theme';
import { Button, InlineNotice } from './ui';

// Shared, read-only PDF viewer used by both the student ResearchDetail and the faculty review
// detail. It renders the document inline (scroll/zoom) plus a fullscreen in-app modal — no
// external browser handoff in the happy path.
//
// Why a WebView + pdf.js (not react-native-pdf): under this app's RN 0.85 + New-Architecture
// build, the native PDF/download modules (react-native-pdf, react-native-blob-util) fail their
// own native HTTP fetch before a single byte transfers ("Download interrupted"), while the
// system WebView loads the same signed URL fine. So pdf.js runs inside a WebView and fetches the
// signed URL through the WebView's own (working) network stack, range-streaming the file instead
// of pre-downloading it. The pdf.js *library* loads from a pinned CDN; the PDF bytes themselves
// never leave the device <-> Supabase channel (no third-party document viewer). If anything
// fails, it falls back to opening the PDF in the in-app browser and surfaces the error.

const PDFJS_VERSION = '3.11.174';

/**
 * A positioned annotation overlay to render on top of a PDF page.
 * Pass an array of these to PdfViewer.annotations (faculty review only; student screen omits).
 * Annotations with pageNumber === null are general comments with no page position — PdfViewer
 * ignores them for overlay rendering.
 */
export interface PdfAnnotationOverlay {
  id: string;
  pageNumber: number | null;
  annotationType: 'comment' | 'note' | 'draw';
  highlightColor?: string | null;
  highlightRects?: Array<{ left: number; top: number; width: number; height: number }> | null;
  anchorPercent?: { x: number; y: number } | null;
  drawImageUrl?: string | null;
}

/** Self-contained HTML that pulls pdf.js from a CDN and renders the signed URL to canvases. */
const buildViewerHtml = (uri: string, backgroundColor: string): string => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes" />
<style>
  html, body { margin: 0; padding: 0; background: ${backgroundColor}; }
  #container { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 8px; }
  .page-wrapper { position: relative; width: 100%; }
  canvas { width: 100%; height: auto; background: #fff; box-shadow: 0 1px 4px rgba(0,0,0,0.15); display: block; }
  .ann-overlay { position: absolute; pointer-events: none; display: none; }
  .ann-pin { border-radius: 50%; border: 2px solid rgba(255,255,255,0.85); width: 16px; height: 16px; transform: translate(-50%,-50%); }
</style>
</head>
<body>
<div id="container"></div>
<script src="https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js"></script>
<script>
(function () {
  var post = function (obj) {
    if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(obj)); }
  };
  var fail = function (e) { post({ type: 'error', message: (e && e.message) ? e.message : String(e) }); };

  function safeColor(c, opacity) {
    if (!c) return null;
    if (/^#[0-9a-fA-F]{6}$/.test(c)) {
      var r = parseInt(c.slice(1,3),16), g = parseInt(c.slice(3,5),16), b = parseInt(c.slice(5,7),16);
      return 'rgba('+r+','+g+','+b+','+(opacity||0.35)+')';
    }
    if (/^rgb/.test(c)) return c;
    return null;
  }

  window.__buildOverlays = function(jsonStr) {
    document.querySelectorAll('.ann-overlay').forEach(function(el) { el.remove(); });
    var anns;
    try { anns = JSON.parse(jsonStr); } catch(e) { return; }
    var wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
    anns.forEach(function(ann) {
      var wrapper = wrappers[ann.pageNumber - 1];
      if (!wrapper) return;
      if (ann.annotationType === 'draw' && ann.drawImageUrl) {
        var img = document.createElement('img');
        img.className = 'ann-overlay';
        img.src = ann.drawImageUrl;
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;opacity:0.85;';
        wrapper.appendChild(img);
      }
      if (ann.highlightRects && ann.highlightRects.length) {
        ann.highlightRects.forEach(function(rect) {
          var el = document.createElement('div');
          el.className = 'ann-overlay';
          el.style.cssText = 'position:absolute;border-radius:2px;';
          el.style.left = rect.left + '%';
          el.style.top = rect.top + '%';
          el.style.width = rect.width + '%';
          el.style.height = rect.height + '%';
          el.style.background = safeColor(ann.highlightColor, 0.35) || 'rgba(255,220,0,0.35)';
          wrapper.appendChild(el);
        });
      }
      if (ann.annotationType === 'note' && ann.anchorPercent) {
        var pin = document.createElement('div');
        pin.className = 'ann-overlay ann-pin';
        pin.style.cssText = 'position:absolute;';
        pin.style.left = ann.anchorPercent.x + '%';
        pin.style.top = ann.anchorPercent.y + '%';
        pin.style.background = safeColor(ann.highlightColor, 0.9) || '#f5a623';
        wrapper.appendChild(pin);
      }
    });
  };

  window.__showAnnotations = function() {
    document.querySelectorAll('.ann-overlay').forEach(function(el) { el.style.display = ''; });
  };
  window.__hideAnnotations = function() {
    document.querySelectorAll('.ann-overlay').forEach(function(el) { el.style.display = 'none'; });
  };

  try {
    var url = ${JSON.stringify(uri)};
    var pdfjsLib = window.pdfjsLib;
    if (!pdfjsLib) { fail('pdf.js failed to load'); return; }
    // Browsers block cross-origin Workers, so fetch the worker source (CDN sends CORS *) and run
    // it as a same-origin Blob URL.
    fetch('https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js')
      .then(function (r) { return r.text(); })
      .then(function (src) {
        var blob = new Blob([src], { type: 'text/javascript' });
        pdfjsLib.GlobalWorkerOptions.workerSrc = URL.createObjectURL(blob);
        return pdfjsLib.getDocument({ url: url }).promise;
      })
      .then(function (pdf) {
        var container = document.getElementById('container');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var width = container.clientWidth || window.innerWidth;
        var firstDone = false;
        var chain = Promise.resolve();
        for (var i = 1; i <= pdf.numPages; i++) {
          (function (pageNum) {
            chain = chain.then(function () {
              return pdf.getPage(pageNum).then(function (page) {
                var unscaled = page.getViewport({ scale: 1 });
                var viewport = page.getViewport({ scale: (width / unscaled.width) * dpr });
                var wrapper = document.createElement('div');
                wrapper.className = 'page-wrapper';
                var canvas = document.createElement('canvas');
                canvas.width = viewport.width;
                canvas.height = viewport.height;
                wrapper.appendChild(canvas);
                container.appendChild(wrapper);
                return page.render({ canvasContext: canvas.getContext('2d'), viewport: viewport }).promise
                  .then(function () {
                    if (!firstDone) { firstDone = true; post({ type: 'loaded', pages: pdf.numPages }); }
                  });
              });
            });
          })(i);
        }
        return chain;
      })
      .catch(fail);
  } catch (e) { fail(e); }
})();
</script>
</body>
</html>`;

interface PdfSurfaceProps {
  uri: string;
  onLoaded?: () => void;
  annotations?: PdfAnnotationOverlay[];
  showAnnotations?: boolean;
}

/** Renders the PDF via a pdf.js-in-WebView surface with its own loading + error handling. */
const PdfSurface = ({ uri, onLoaded, annotations, showAnnotations = false }: PdfSurfaceProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const webViewRef = useRef<WebView>(null);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);
  const firedFirstLoad = useRef(false);

  // Inject annotation overlay data whenever the PDF finishes loading or annotations change.
  // Overlays are created hidden; the visibility effect below controls show/hide independently.
  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    const positioned = (annotations ?? []).filter((a) => a.pageNumber !== null);
    if (!positioned.length) return;
    const json = JSON.stringify(positioned);
    webViewRef.current.injectJavaScript(
      `window.__buildOverlays && window.__buildOverlays(${JSON.stringify(json)}); true;`,
    );
  }, [loaded, annotations]);

  // Toggle overlay visibility whenever showAnnotations or loaded changes.
  useEffect(() => {
    if (!loaded || !webViewRef.current) return;
    const cmd = showAnnotations
      ? 'window.__showAnnotations && window.__showAnnotations(); true;'
      : 'window.__hideAnnotations && window.__hideAnnotations(); true;';
    webViewRef.current.injectJavaScript(cmd);
  }, [showAnnotations, loaded]);

  const handleMessage = (event: WebViewMessageEvent) => {
    let payload: { type?: string; message?: string; pages?: number } = {};
    try {
      payload = JSON.parse(event.nativeEvent.data);
    } catch {
      return;
    }
    if (payload.type === 'loaded') {
      console.log('[PdfViewer] rendered', payload);
      setLoaded(true);
      if (!firedFirstLoad.current) {
        firedFirstLoad.current = true;
        onLoaded?.();
      }
    } else if (payload.type === 'error') {
      console.log('[PdfViewer] render error', payload.message);
      setErrored(true);
      setErrorText(payload.message ?? null);
    }
  };

  if (errored) {
    return (
      <View style={styles.overlay}>
        <InlineNotice tone="warning" message="This PDF could not be displayed in the app." />
        {errorText ? <Text style={styles.errorDetail}>{errorText}</Text> : null}
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
    <View style={StyleSheet.absoluteFill}>
      <WebView
        ref={webViewRef}
        key={uri}
        source={{ html: buildViewerHtml(uri, theme.colors.surface.sunken), baseUrl: 'https://localhost/' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        androidLayerType="hardware"
        nestedScrollEnabled
        onMessage={handleMessage}
        onError={(e) => {
          setErrored(true);
          setErrorText(e.nativeEvent.description || 'WebView failed to load.');
        }}
        style={styles.webview}
      />
      {!loaded ? (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator size="large" color={theme.colors.brand.primary} />
        </View>
      ) : null}
    </View>
  );
};

interface PdfViewerProps {
  uri: string;
  /** Fired once, the first time the inline PDF finishes rendering (e.g. to track a view). */
  onFirstLoad?: () => void;
  /** Inline panel height. Defaults to 460. Ignored when variant is 'fill'. */
  height?: number;
  /**
   * Optional annotation overlays (faculty review only). When provided and at least one
   * annotation has a page position, an eye-icon toggle appears in the panel corner.
   * Student screens omit this prop entirely.
   */
  annotations?: PdfAnnotationOverlay[];
  /**
   * 'inline' (default): a fixed-height rounded panel with a fullscreen-expand
   * toggle. 'fill': stretches to fill its parent (e.g. inside `SheetPresenter`) —
   * no expand toggle and no panel chrome, since the host sheet already owns the
   * full-screen frame.
   */
  variant?: 'inline' | 'fill';
}

export const PdfViewer = ({
  uri,
  onFirstLoad,
  height = 460,
  annotations,
  variant = 'inline',
}: PdfViewerProps) => {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [fullscreen, setFullscreen] = useState(false);
  const [showAnnotations, setShowAnnotations] = useState(false);

  const fill = variant === 'fill';
  const hasPositionedAnnotations = (annotations ?? []).some((a) => a.pageNumber !== null);

  return (
    <View style={fill ? styles.fillRoot : undefined}>
      <View style={[fill ? styles.panelFill : styles.panel, fill ? undefined : { height }]}>
        <PdfSurface
          uri={uri}
          onLoaded={onFirstLoad}
          annotations={annotations}
          showAnnotations={showAnnotations}
        />
        <View style={styles.controls}>
          {hasPositionedAnnotations ? (
            <Pressable
              onPress={() => setShowAnnotations((prev) => !prev)}
              accessibilityRole="button"
              accessibilityLabel={showAnnotations ? 'Hide annotations' : 'Show annotations'}
              style={styles.controlButton}
            >
              <Ionicons
                name={showAnnotations ? 'eye' : 'eye-outline'}
                size={18}
                color={theme.colors.text.onBrand}
              />
            </Pressable>
          ) : null}
          {fill ? null : (
            <Pressable
              onPress={() => setFullscreen(true)}
              accessibilityRole="button"
              accessibilityLabel="View PDF fullscreen"
              style={styles.controlButton}
            >
              <Ionicons name="expand-outline" size={18} color={theme.colors.text.onBrand} />
            </Pressable>
          )}
        </View>
      </View>

      {fill ? null : (
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
            <View style={styles.modalBody}>
              {fullscreen ? (
                <PdfSurface uri={uri} annotations={annotations} showAnnotations={showAnnotations} />
              ) : null}
            </View>
          </SafeAreaView>
        </Modal>
      )}
    </View>
  );
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    panel: {
      borderRadius: t.radii.lg,
      overflow: 'hidden',
      backgroundColor: t.colors.surface.sunken,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: t.colors.border.subtle,
    },
    fillRoot: {
      flex: 1,
    },
    panelFill: {
      flex: 1,
      overflow: 'hidden',
      backgroundColor: t.colors.surface.sunken,
    },
    webview: {
      flex: 1,
      backgroundColor: t.colors.surface.sunken,
    },
    overlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: t.spacing.sm,
      padding: t.spacing.lg,
      backgroundColor: t.colors.surface.sunken,
    },
    errorDetail: {
      ...t.typography.caption,
      color: t.colors.text.muted,
      textAlign: 'center',
    },
    controls: {
      position: 'absolute',
      top: t.spacing.sm,
      right: t.spacing.sm,
      flexDirection: 'row',
      gap: t.spacing.xs,
    },
    controlButton: {
      width: 36,
      height: 36,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.brand.primary,
      ...t.shadows.level2,
    },
    modal: {
      flex: 1,
      backgroundColor: t.colors.surface.base,
    },
    modalHeader: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      padding: t.spacing.sm,
    },
    closeButton: {
      width: 40,
      height: 40,
      borderRadius: t.radii.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.surface.raised,
    },
    modalBody: {
      flex: 1,
      backgroundColor: t.colors.surface.sunken,
    },
  });
