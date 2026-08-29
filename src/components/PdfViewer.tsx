import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from './ui/Icon';

import * as WebBrowser from 'expo-web-browser';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { forwardRef, useImperativeHandle } from 'react';
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

import { AnnotationType, AnnotationRect, AnnotationPoint } from '../utils/annotation';
import { MousePointer2, Eye, Maximize, X } from 'lucide-react-native';

/**
 * A positioned annotation overlay to render on top of a PDF page.
 * Pass an array of these to PdfViewer.annotations (faculty review only; student screen omits).
 * Annotations with pageNumber === null are general comments with no page position — PdfViewer
 * ignores them for overlay rendering.
 */
export interface PdfAnnotationOverlay {
  id: string;
  pageNumber: number | null;
  annotationType: AnnotationType;
  highlightColor?: string | null;
  highlightRects?: AnnotationRect[] | null;
  anchorPercent?: AnnotationPoint | null;
  drawImageUrl?: string | null;
}

export interface PdfViewerRef {
  jumpToPage: (pageNumber: number) => void;
}

/** Self-contained HTML that pulls pdf.js from a CDN and renders the signed URL to canvases.
 * `firstPageOnly` renders just page 1 with no scroll — used for the tap-to-open preview. */
const buildViewerHtml = (
  uri: string,
  themeColors: {
    background: string;
    canvas: string;
    shadow: string;
    accent: string;
    danger: string;
  },
  firstPageOnly = false,
  watermarkText = 'NU DASMARIÑAS',
): string => {
  const encodedWatermark = encodeURIComponent(watermarkText);
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=4, user-scalable=yes" />
<style>
  html, body { margin: 0; padding: 0; background: ${themeColors.background}; ${firstPageOnly ? 'overflow: hidden;' : ''} }
  #container { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: ${firstPageOnly ? '0' : '8px'}; position: relative; }
  .page-wrapper::before { content: ''; position: absolute; inset: 0; z-index: 1; pointer-events: none; background-repeat: repeat; background-size: 200px 200px; background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Ctext x='50%25' y='50%25' font-size='28' font-weight='bold' fill='%23000000' fill-opacity='0.08' text-anchor='middle' dominant-baseline='middle' transform='rotate(-45 100 100)'%3E${encodedWatermark}%3C/text%3E%3C/svg%3E"); }
  .page-wrapper { position: relative; width: 100%; }
  canvas { width: 100%; height: auto; background: ${themeColors.canvas}; box-shadow: 0 1px 4px ${themeColors.shadow}; display: block; position: relative; z-index: 0; }
  .ann-overlay { position: absolute; pointer-events: none; display: none; z-index: 2; }
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
        img.style.cssText = 'position:absolute;top:0;left:0;width:100%;height:100%;object-fit:contain;opacity:0.85;pointer-events:auto;cursor:pointer;';
        img.onclick = function(e) { e.stopPropagation(); post({ type: 'tapAnnotation', id: ann.id }); };
        wrapper.appendChild(img);
      }
      if (ann.highlightRects && ann.highlightRects.length) {
        ann.highlightRects.forEach(function(rect) {
          var el = document.createElement('div');
          el.className = 'ann-overlay';
          el.style.cssText = 'position:absolute;pointer-events:auto;cursor:pointer;';
          el.style.left = rect.x + '%';
          el.style.top = rect.y + '%';
          el.style.width = rect.w + '%';
          el.style.height = rect.h + '%';
          el.style.background = safeColor(ann.highlightColor, 0.35) || safeColor('${themeColors.accent}', 0.35);
          el.onclick = function(e) { e.stopPropagation(); post({ type: 'tapAnnotation', id: ann.id }); };
          wrapper.appendChild(el);
        });
      }
      if (ann.annotationType === 'note' && ann.anchorPercent) {
        var pin = document.createElement('div');
        pin.className = 'ann-overlay ann-pin';
        pin.style.cssText = 'position:absolute;pointer-events:auto;cursor:pointer;';
        pin.style.left = ann.anchorPercent.x + '%';
        pin.style.top = ann.anchorPercent.y + '%';
        pin.style.background = safeColor(ann.highlightColor, 0.9) || '${themeColors.accent}';
        pin.onclick = function(e) { e.stopPropagation(); post({ type: 'tapAnnotation', id: ann.id }); };
        wrapper.appendChild(pin);
      }
    });
    if (window.__isAnnotationsVisible) {
      window.__showAnnotations();
    }
  };

  window.__jumpToPage = function(pageNumber) {
    var wrappers = document.querySelectorAll('.page-wrapper');
    if (wrappers[pageNumber - 1]) {
      wrappers[pageNumber - 1].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  window.__isAnnotationsVisible = false;
  window.__showAnnotations = function() {
    window.__isAnnotationsVisible = true;
    document.querySelectorAll('.ann-overlay').forEach(function(el) { el.style.display = 'block'; });
  };
  window.__hideAnnotations = function() {
    window.__isAnnotationsVisible = false;
    document.querySelectorAll('.ann-overlay').forEach(function(el) { el.style.display = 'none'; });
  };

  // Annotation modes (faculty write path) — note only (web parity).
  window.__annotationMode = 'none';
  window.__setAnnotationMode = function(mode) {
    window.__annotationMode = mode;
    if (mode === 'note') document.body.style.cursor = 'crosshair';
    else document.body.style.cursor = '';
  };

  function getPageRect(ev) {
    var clientX = ev.touches ? ev.touches[0].clientX : ev.clientX;
    var clientY = ev.touches ? ev.touches[0].clientY : ev.clientY;
    var wrappers = Array.from(document.querySelectorAll('.page-wrapper'));
    for (var i = 0; i < wrappers.length; i++) {
      var r = wrappers[i].getBoundingClientRect();
      if (clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom) {
        return { pageIndex: i, rect: r, x: clientX - r.left, y: clientY - r.top };
      }
    }
    return null;
  }

  function handlePointerUp(ev) {
    if (window.__annotationMode === 'note') {
      var hit = getPageRect(ev);
      if (hit) {
        post({
          type: 'placeNote',
          pageNumber: hit.pageIndex + 1,
          x: (hit.x / hit.rect.width) * 100,
          y: (hit.y / hit.rect.height) * 100,
        });
      }
    }
  }

  var container = document.getElementById('container');
  container.addEventListener('mouseup', handlePointerUp);
  container.addEventListener('touchend', handlePointerUp);

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
        var lastPage = ${firstPageOnly ? 1 : 'pdf.numPages'};
        for (var i = 1; i <= lastPage; i++) {
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
};

interface PdfSurfaceProps {
  uri: string;
  onLoaded?: () => void;
  annotations?: PdfAnnotationOverlay[];
  showAnnotations?: boolean;
  /** Render only page 1 (for the tap-to-open preview). */
  firstPageOnly?: boolean;
  /** Disable WebView scrolling (preview is a fixed, non-scrollable page). */
  scrollEnabled?: boolean;
  /** When true, a tap on a page reports its position via onPlaceNote (faculty add-note mode). */
  annotationMode?: 'none' | 'note' | 'highlight' | 'draw';
  onPlaceNote?: (pageNumber: number, anchor: { x: number; y: number }) => void;
  onPlaceHighlight?: (pageNumber: number, rect: AnnotationRect) => void;
  onPlaceDraw?: (pageNumber: number, imageDataUrl: string) => void;
  onAnnotationPress?: (id: string) => void;
  watermarkText?: string;
}

/** Renders the PDF via a pdf.js-in-WebView surface with its own loading + error handling. */
const PdfSurface = forwardRef<PdfViewerRef, PdfSurfaceProps>(
  (
    {
      uri,
      onLoaded,
      annotations,
      showAnnotations = false,
      firstPageOnly = false,
      scrollEnabled = true,
      annotationMode = 'none',
      onPlaceNote,
      onPlaceHighlight,
      onPlaceDraw,
      onAnnotationPress,
      watermarkText,
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const webViewRef = useRef<WebView>(null);
    const [loaded, setLoaded] = useState(false);
    const [errored, setErrored] = useState(false);
    const [errorText, setErrorText] = useState<string | null>(null);
    const firedFirstLoad = useRef(false);

    useImperativeHandle(ref, () => ({
      jumpToPage: (pageNumber: number) => {
        if (webViewRef.current) {
          webViewRef.current.injectJavaScript(
            `window.__jumpToPage && window.__jumpToPage(${pageNumber}); true;`,
          );
        }
      },
    }));

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

    // Toggle note-placement mode in the WebView whenever annotationMode or loaded changes.
    useEffect(() => {
      if (!loaded || !webViewRef.current) return;
      webViewRef.current.injectJavaScript(
        `window.__setAnnotationMode && window.__setAnnotationMode('${annotationMode}'); true;`,
      );
    }, [annotationMode, loaded]);

    const handleMessage = (event: WebViewMessageEvent) => {
      let payload: {
        type?: string;
        message?: string;
        pages?: number;
        pageNumber?: number;
        x?: number;
        y?: number;
        id?: string;
        rect?: AnnotationRect;
        imageDataUrl?: string;
      } = {};
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
      } else if (payload.type === 'placeNote') {
        if (
          typeof payload.pageNumber === 'number' &&
          typeof payload.x === 'number' &&
          typeof payload.y === 'number'
        ) {
          onPlaceNote?.(payload.pageNumber, { x: payload.x, y: payload.y });
        }
      } else if (payload.type === 'placeHighlight') {
        if (typeof payload.pageNumber === 'number' && payload.rect) {
          onPlaceHighlight?.(payload.pageNumber, payload.rect);
        }
      } else if (payload.type === 'placeDraw') {
        if (typeof payload.pageNumber === 'number' && payload.imageDataUrl) {
          onPlaceDraw?.(payload.pageNumber, payload.imageDataUrl);
        }
      } else if (payload.type === 'tapAnnotation' && payload.id) {
        onAnnotationPress?.(payload.id);
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
          source={{
            html: buildViewerHtml(
              uri,
              {
                background: theme.colors.surface.sunken,
                canvas: theme.colors.surface.raised,
                shadow: theme.colors.border.subtle,
                accent: theme.colors.brand.accent,
                danger: theme.colors.state.danger,
              },
              firstPageOnly,
              watermarkText,
            ),
            baseUrl: 'https://localhost/',
          }}
          originWhitelist={['*']}
          javaScriptEnabled
          domStorageEnabled
          setSupportMultipleWindows={false}
          androidLayerType="hardware"
          nestedScrollEnabled
          scrollEnabled={scrollEnabled}
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
        {firstPageOnly ? null : (
          <View style={styles.footer}>
            <Text style={styles.footerText}>🔒 Protected document. Copying is disabled.</Text>
          </View>
        )}
      </View>
    );
  },
);

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
   * full-screen frame. 'preview': fills its parent showing only page 1,
   * non-scrollable, no controls — for a tap-to-open blurred preview.
   */
  variant?: 'inline' | 'fill' | 'preview';
  /**
   * Faculty review only (#14): enable placing note-pin annotations. When true, a
   * pencil toggle appears; tapping the PDF drops a pin and opens a note composer.
   * Student screens omit this prop, so the viewer stays read-only for them.
   */
  canAnnotate?: boolean;
  /** Persist a new note pin. Resolves once saved so the viewer can refresh + reset. */
  onCreateNote?: (input: {
    pageNumber: number;
    anchorPercent: { x: number; y: number };
    note: string;
  }) => Promise<void>;
  onCreateHighlight?: (input: {
    pageNumber: number;
    highlightRects: AnnotationRect[];
    note: string;
  }) => Promise<void>;
  onCreateDraw?: (input: { pageNumber: number; imageDataUrl: string }) => Promise<void>;
  onAnnotationPress?: (id: string) => void;
  /** Watermark to show on pages. Defaults to 'NU DASMARIÑAS'. Pass empty string to hide. */
  watermarkText?: string;
}

export const PdfViewer = forwardRef<PdfViewerRef, PdfViewerProps>(
  (
    {
      uri,
      onFirstLoad,
      height = 460,
      annotations,
      variant = 'inline',
      canAnnotate = false,
      onCreateNote,
      onCreateHighlight,
      onCreateDraw,
      onAnnotationPress,
      watermarkText,
    },
    ref,
  ) => {
    const { theme } = useTheme();
    const styles = useThemedStyles(makeStyles);
    const [fullscreen, setFullscreen] = useState(false);
    const [showAnnotations, setShowAnnotations] = useState(false);

    // Note-placement state (faculty add-note mode).
    const [annotationMode, setAnnotationMode] = useState<'none' | 'note'>('none');
    const [pendingAnchor, setPendingAnchor] = useState<{
      type: 'note';
      pageNumber: number;
      x: number;
      y: number;
    } | null>(null);
    const [noteText, setNoteText] = useState('');
    const [savingNote, setSavingNote] = useState(false);
    const [noteError, setNoteError] = useState<string | null>(null);

    const fill = variant === 'fill';
    const hasPositionedAnnotations = (annotations ?? []).some((a) => a.pageNumber !== null);
    const annotateEnabled =
      canAnnotate && (!!onCreateNote || !!onCreateHighlight || !!onCreateDraw);
    // While placing, keep existing pins visible so the reviewer can position relative to them.
    const overlaysVisible = showAnnotations || annotationMode !== 'none';

    const closeComposer = () => {
      if (savingNote) return;
      setPendingAnchor(null);
      setNoteText('');
      setNoteError(null);
    };

    const saveNote = async () => {
      if (!pendingAnchor) return;
      const note = noteText.trim();
      if (!note) {
        setNoteError('Add a comment before saving.');
        return;
      }
      setSavingNote(true);
      setNoteError(null);
      try {
        if (onCreateNote) {
          await onCreateNote({
            pageNumber: pendingAnchor.pageNumber,
            anchorPercent: { x: pendingAnchor.x, y: pendingAnchor.y },
            note,
          });
        }
        setSavingNote(false);
        setPendingAnchor(null);
        setNoteText('');
        setAnnotationMode('none');
        setShowAnnotations(true);
      } catch (err) {
        setSavingNote(false);
        setNoteError(err instanceof Error ? err.message : 'Unable to save the annotation.');
      }
    };

    const renderControls = (isFullscreen = false) => (
      <View style={styles.controls}>
        {annotateEnabled ? (
          <Pressable
            onPress={() => {
              setAnnotationMode((prev) => (prev === 'note' ? 'none' : 'note'));
              setPendingAnchor(null);
            }}
            accessibilityRole="button"
            accessibilityLabel={annotationMode === 'note' ? 'Cancel adding a note' : 'Add a note'}
            style={[
              styles.controlButton,
              annotationMode === 'note' ? styles.controlButtonActive : null,
            ]}
          >
            <Icon icon={MousePointer2} size={18} color={theme.colors.text.onBrand} />
          </Pressable>
        ) : null}
        {hasPositionedAnnotations ? (
          <Pressable
            onPress={() => setShowAnnotations((prev) => !prev)}
            accessibilityRole="button"
            accessibilityLabel={showAnnotations ? 'Hide annotations' : 'Show annotations'}
            style={styles.controlButton}
          >
            <Icon icon={Eye} size={18} color={theme.colors.text.onBrand} />
          </Pressable>
        ) : null}
        {fill || isFullscreen ? null : (
          <Pressable
            onPress={() => setFullscreen(true)}
            accessibilityRole="button"
            accessibilityLabel="View PDF fullscreen"
            style={styles.controlButton}
          >
            <Icon icon={Maximize} size={18} color={theme.colors.text.onBrand} />
          </Pressable>
        )}
      </View>
    );

    // Preview: page 1 only, non-scrollable, no controls or fullscreen — the host
    // (a blurred preview card) owns the frame and the tap-to-open affordance.
    if (variant === 'preview') {
      return (
        <View style={styles.fillRoot}>
          <PdfSurface
            ref={ref}
            uri={uri}
            onLoaded={onFirstLoad}
            firstPageOnly
            scrollEnabled={false}
            watermarkText={watermarkText}
          />
        </View>
      );
    }

    return (
      <View style={fill ? styles.fillRoot : undefined}>
        <View style={[fill ? styles.panelFill : styles.panel, fill ? undefined : { height }]}>
          <PdfSurface
            ref={ref}
            uri={uri}
            onLoaded={onFirstLoad}
            annotations={annotations}
            showAnnotations={overlaysVisible}
            annotationMode={pendingAnchor ? 'none' : annotationMode}
            onPlaceNote={(pageNumber, anchor) => {
              setNoteError(null);
              setNoteText('');
              setPendingAnchor({ type: 'note', pageNumber, x: anchor.x, y: anchor.y });
            }}
            onAnnotationPress={onAnnotationPress}
          />
          {renderControls(false)}
          {annotationMode !== 'none' && !pendingAnchor ? (
            <View style={styles.hint} pointerEvents="none">
              <Text style={styles.hintText}>Tap the page to place a note</Text>
            </View>
          ) : null}
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
                  <Icon icon={X} size={24} color={theme.colors.text.primary} />
                </Pressable>
              </View>
              <View style={styles.modalBody}>
                {fullscreen ? (
                  <>
                    <PdfSurface
                      ref={ref}
                      uri={uri}
                      annotations={annotations}
                      showAnnotations={showAnnotations}
                      onAnnotationPress={onAnnotationPress}
                      annotationMode={pendingAnchor ? 'none' : annotationMode}
                      onPlaceNote={(pageNumber, anchor) => {
                        setNoteError(null);
                        setNoteText('');
                        setPendingAnchor({ type: 'note', pageNumber, x: anchor.x, y: anchor.y });
                      }}
                      watermarkText={watermarkText}
                    />
                    {renderControls(true)}
                    {annotationMode !== 'none' && !pendingAnchor ? (
                      <View style={styles.hint} pointerEvents="none">
                        <Text style={styles.hintText}>Tap the page to place a note</Text>
                      </View>
                    ) : null}
                  </>
                ) : null}
              </View>
            </SafeAreaView>
          </Modal>
        )}

        <Modal
          visible={pendingAnchor !== null}
          transparent
          animationType="fade"
          onRequestClose={closeComposer}
        >
          <View style={styles.composerBackdrop}>
            <View style={styles.composerCard}>
              <Text style={styles.composerTitle}>Add note</Text>
              {pendingAnchor ? (
                <Text style={styles.composerHint}>Page {pendingAnchor.pageNumber}</Text>
              ) : null}
              <TextInput
                value={noteText}
                onChangeText={setNoteText}
                placeholder="Write a note for this spot"
                placeholderTextColor={theme.colors.text.muted}
                style={styles.composerInput}
                multiline
                autoFocus
                editable={!savingNote}
              />
              {noteError ? <Text style={styles.composerError}>{noteError}</Text> : null}
              <View style={styles.composerButtons}>
                <Pressable
                  onPress={closeComposer}
                  disabled={savingNote}
                  accessibilityRole="button"
                  style={styles.composerBtnGhost}
                >
                  <Text style={styles.composerBtnGhostText}>Cancel</Text>
                </Pressable>
                <Pressable
                  onPress={saveNote}
                  disabled={savingNote || !noteText.trim()}
                  accessibilityRole="button"
                  style={[
                    styles.composerBtnPrimary,
                    savingNote || !noteText.trim() ? styles.composerBtnDisabled : null,
                  ]}
                >
                  {savingNote ? (
                    <ActivityIndicator size="small" color={theme.colors.text.onBrand} />
                  ) : (
                    <Text style={styles.composerBtnPrimaryText}>Save</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    );
  },
);

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
    footer: {
      paddingVertical: t.spacing.sm,
      alignItems: 'center',
      backgroundColor: t.colors.surface.sunken,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: t.colors.border.subtle,
    },
    footerText: {
      ...t.typography.caption,
      color: t.colors.text.muted,
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
    controlButtonActive: {
      backgroundColor: t.colors.brand.accent,
    },
    hint: {
      position: 'absolute',
      top: t.spacing.sm,
      left: t.spacing.sm,
      paddingHorizontal: t.spacing.sm,
      paddingVertical: t.spacing.xs,
      borderRadius: t.radii.pill,
      backgroundColor: t.colors.brand.primary,
      ...t.shadows.level2,
    },
    hintText: {
      ...t.typography.caption,
      color: t.colors.text.onBrand,
    },
    composerBackdrop: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.45)',
      justifyContent: 'center',
      padding: t.spacing.lg,
    },
    composerCard: {
      backgroundColor: t.colors.surface.raised,
      borderRadius: t.radii.lg,
      padding: t.spacing.lg,
      gap: t.spacing.sm,
      ...t.shadows.level2,
    },
    composerTitle: {
      ...t.typography.h3,
      color: t.colors.text.primary,
    },
    composerHint: {
      ...t.typography.bodySmall,
      color: t.colors.text.muted,
    },
    composerInput: {
      ...t.typography.body,
      color: t.colors.text.primary,
      backgroundColor: t.colors.surface.base,
      borderWidth: 1,
      borderColor: t.colors.border.subtle,
      borderRadius: t.radii.md,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      minHeight: 96,
      textAlignVertical: 'top',
    },
    composerError: {
      ...t.typography.bodySmall,
      color: t.colors.state.danger,
    },
    composerButtons: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      gap: t.spacing.sm,
      marginTop: t.spacing.xs,
    },
    composerBtnGhost: {
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      borderRadius: t.radii.md,
    },
    composerBtnGhostText: {
      ...t.typography.bodyStrong,
      color: t.colors.text.secondary,
    },
    composerBtnPrimary: {
      minWidth: 84,
      paddingHorizontal: t.spacing.md,
      paddingVertical: t.spacing.sm,
      borderRadius: t.radii.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: t.colors.brand.primary,
    },
    composerBtnPrimaryText: {
      ...t.typography.bodyStrong,
      color: t.colors.text.onBrand,
    },
    composerBtnDisabled: {
      opacity: 0.5,
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
