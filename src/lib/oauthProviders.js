// Redirect-based OAuth entry points for all three sign-in providers. Each one
// stashes a random CSRF `state` in sessionStorage before leaving the page —
// the matching callback route (src/pages/api/*-callback.js) checks it against
// what comes back from the provider, so a forged/replayed callback URL can't
// complete a login. `email`, when known, is passed as `login_hint` so the
// provider's own sign-in page can pre-fill it.

function randomState() {
  return window.crypto.randomUUID();
}

export function redirectToGoogle(email) {
  const state = randomState();
  sessionStorage.setItem('google_oauth_state', state);
  const redirectUri = `${window.location.origin}/api/google-callback`;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    ...(email ? { login_hint: email } : {}),
  });
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export function redirectToMicrosoft(email) {
  const state = randomState();
  sessionStorage.setItem('ms_oauth_state', state);
  const redirectUri = `${window.location.origin}/api/microsoft-callback`;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '',
    response_type: 'code',
    redirect_uri: redirectUri,
    response_mode: 'query',
    scope: 'openid profile email',
    state,
    ...(email ? { login_hint: email } : {}),
  });
  window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;
}

export function redirectToYahoo(email) {
  const state = randomState();
  sessionStorage.setItem('yahoo_oauth_state', state);
  const redirectUri = `${window.location.origin}/api/yahoo-callback`;
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID || '',
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    ...(email ? { login_hint: email } : {}),
  });
  window.location.href = `https://api.login.yahoo.com/oauth2/request_auth?${params.toString()}`;
}

export const PROVIDER_REDIRECTS = {
  google: redirectToGoogle,
  microsoft: redirectToMicrosoft,
  yahoo: redirectToYahoo,
};
