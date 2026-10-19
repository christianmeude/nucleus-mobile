/**
 * pdf.js version and CDN URLs, shared by the reader (`PdfViewer`) and the hidden
 * prewarm (`PdfPrewarm`) so both always point at the same artifacts and the
 * pinned version lives in exactly one place.
 *
 * The library is loaded from a CDN rather than bundled: bundling it needs a new
 * dependency plus Metro asset wiring, and (if the document origin moves to
 * `file://`) risks the Supabase range requests the reader depends on. The
 * prewarm below is what keeps the CDN off the reader's critical path instead.
 */
export const PDFJS_VERSION = '3.11.174';

export const PDFJS_LIB_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.min.js`;

export const PDFJS_WORKER_URL = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${PDFJS_VERSION}/build/pdf.worker.min.js`;

/**
 * Builds the throwaway document the prewarm WebView runs: it streams the three
 * URLs the reader will need — the engine, its worker, and the PDF itself — into
 * the WebView's HTTP cache.
 *
 * Each response body is read to completion so the cache actually stores it, but
 * the chunks are discarded rather than accumulated: the worker alone is ~1 MB,
 * and a long paper's PDF can be far larger, so `arrayBuffer()`-ing them into the
 * WebView's JS heap would undo the memory win of dropping the blurred preview.
 *
 * It deliberately does NOT instantiate pdf.js or rasterise a page. The reader
 * only waits on the *download* being warm — not on a second engine boot — so a
 * fetch-only warm-up gives the same fast open for much less work.
 */
export const buildPrewarmHtml = (uri: string): string => {
  const targets = [PDFJS_LIB_URL, PDFJS_WORKER_URL, uri].filter(Boolean);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body>
<script>
(function () {
  var targets = ${JSON.stringify(targets)};

  var drain = function (res) {
    if (!res || !res.body || typeof res.body.getReader !== 'function') {
      return res && res.arrayBuffer ? res.arrayBuffer() : undefined;
    }
    var reader = res.body.getReader();
    var pump = function () {
      return reader.read().then(function (chunk) {
        return chunk.done ? undefined : pump();
      });
    };
    return pump();
  };

  targets.forEach(function (url) {
    try {
      fetch(url, { cache: 'default' }).then(drain).catch(function () {});
    } catch (e) {
      // Ignore: a cold cache just falls back to the reader's own fetch.
    }
  });
})();
</script>
</body>
</html>`;
};
