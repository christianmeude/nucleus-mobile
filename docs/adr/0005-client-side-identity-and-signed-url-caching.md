# Client-side Identity and Signed-URL Caching

Opening a paper took 3–5 s because nearly every API call re-resolved the current user's identity (two network round trips: `auth.getUser` plus a `public.users` lookup) and every open minted a _fresh_ signed storage URL. A fresh URL changed the WebView's document URL, remounted it, and missed its HTTP cache — so the pdf.js engine, its worker, and the PDF were re-downloaded on every open.

We decided the client caches both: the resolved profile, keyed by auth user id + email, for 5 minutes (`src/auth/currentProfile.ts`), and signed storage URLs, keyed by bucket + path, for 45 minutes (`src/utils/signedStorageUrl.ts`). Identity resolution reads the _local_ session rather than the network.

The signed-URL TTL is deliberately shorter than the 60-minute URL expiry, so a cached URL is never handed out past its validity. Both caches are cleared on any identity change (sign-in, sign-out, user switch).

## Consequences

- A profile or storage-path change can take up to its TTL to be reflected; anything that must be immediate has to clear the relevant cache.
- The reader's speed depends on the signed URL being _stable_ across opens — that is what makes the WebView HTTP cache hit. Do not reintroduce per-call signing.
- The 5-minute and 45-minute constants are not arbitrary: changing them changes the freshness/latency trade-off above.
