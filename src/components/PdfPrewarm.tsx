import { StyleSheet, View } from 'react-native';
import { WebView } from 'react-native-webview';

import { buildPrewarmHtml } from '../utils/pdfjs';

interface PdfPrewarmProps {
  /** The signed file URL the reader will open. */
  uri: string;
}

/**
 * Invisible warm-up for the reader.
 *
 * Mounted on the paper detail screen while a file URL is known, it streams the
 * pdf.js engine, its worker, and the PDF into the WebView HTTP cache so the
 * reader's first tap is a cache hit instead of a multi-second cold download.
 *
 * This replaces the blurred preview, which did the same download but paid to
 * rasterise a page and hold a canvas behind the blur. The prewarm renders
 * nothing and boots no engine, so it is strictly cheaper.
 */
export const PdfPrewarm = ({ uri }: PdfPrewarmProps) => (
  <View
    style={styles.host}
    pointerEvents="none"
    accessible={false}
    accessibilityElementsHidden
    importantForAccessibility="no-hide-descendants"
  >
    <WebView
      source={{ html: buildPrewarmHtml(uri), baseUrl: 'https://localhost/' }}
      originWhitelist={['*']}
      javaScriptEnabled
      domStorageEnabled
      setSupportMultipleWindows={false}
      style={styles.webview}
    />
  </View>
);

const styles = StyleSheet.create({
  // 1x1 and fully transparent: attached (so the WebView's JS and network run)
  // but occupying no layout and showing nothing.
  host: {
    position: 'absolute',
    left: 0,
    bottom: 0,
    width: 1,
    height: 1,
    opacity: 0,
  },
  webview: {
    width: 1,
    height: 1,
    backgroundColor: 'transparent',
  },
});
