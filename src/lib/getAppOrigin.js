// Used by the OAuth callback API routes to reconstruct the exact redirect_uri
// they originally sent to the provider. req.headers.origin is NOT reliable
// here — browsers don't consistently send an Origin header on a plain
// top-level GET redirect (which is exactly what an OAuth callback is), so it
// can silently be undefined in production and fall through to a dev default,
// mismatching what was actually registered with the provider. req.headers.host
// is reliably present on every HTTP request, so it's the dependable fallback;
// NEXT_PUBLIC_APP_URL (same value used when initiating the redirect) takes
// priority when set, since it's the one source of truth for "what origin did
// we tell the provider about."
function getAppOrigin(req) {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (req.headers.host) {
    const protocol = req.headers['x-forwarded-proto'] || 'http';
    return `${protocol}://${req.headers.host}`;
  }
  return 'http://localhost:3000';
}

module.exports = { getAppOrigin };
