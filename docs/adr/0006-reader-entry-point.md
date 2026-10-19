# The Reader Opens From a Sticky Action, Not an Inline Preview

The paper detail screen used to mount a blurred, first-page-only preview of the PDF inline. It looked decorative but was load-bearing: it downloaded the pdf.js engine, its worker, and the PDF while the user read the abstract, so the reader sheet opened warm. Removing it naively would push a cold multi-second download back onto the first tap (measured: ~2.4–3.0 s cold vs ~0.6 s warm).

We decided to remove the inline preview — the reader now opens from a sticky **View Full Paper** action — and to replace its hidden work with an explicit, invisible warm-up: a 1×1, transparent WebView (`src/components/PdfPrewarm.tsx`) that streams the engine, worker, and PDF into the WebView HTTP cache. It renders nothing and boots no pdf.js, so it is strictly cheaper than the preview it replaced.

We kept the reader as a `Modal`-hosted sheet rather than collapsing the preview and reader into one WebView: a native view cannot be re-parented from the screen into a Modal's separate window, and the ~0.6 s the collapse would save does not justify losing the sheet's drag-to-dismiss and hardware-back handling.

## Consequences

- pdf.js still loads from a CDN at runtime. Bundling it locally was rejected (it needs a new dependency, Metro asset wiring, and a `file://`/Blob origin change that risks the Supabase range requests the reader depends on). The prewarm keeps the CDN off the reader's critical path, but a blocked or slow CDN still degrades the first open. Bundling remains the fix if CDN reliability becomes a field problem.
- The prewarm reliably warms the static pdf.js engine and worker; whether it warms the PDF bytes depends on Supabase Storage's cache headers and range-request handling.
- The prewarm is torn down while the reader sheet is open, so at most one WebView is live at a time.
