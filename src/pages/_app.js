import "../lib/timezone"; // side effect only — pins moment's default zone; see that file

// The legacy Pages Router tree (src/pages/**) is a separate render tree from
// the App Router's src/app/layout.tsx and gets none of its setup — this is
// the Pages Router's own equivalent entry point, kept intentionally minimal
// (no theme/CSS here) so it changes nothing about how these pages already
// render, beyond applying the timezone pin above.
export default function App({ Component, pageProps }) {
  return <Component {...pageProps} />;
}
