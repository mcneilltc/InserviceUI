import axios from 'axios';
import { getAppOrigin } from '../../lib/getAppOrigin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code, state } = req.query;

  if (!code) {
    return res.status(400).send(`
      <html>
        <body>
          <h1>Authorization Error</h1>
          <p>Authorization code not provided. Please try again.</p>
          <script>
            setTimeout(() => window.location.href = '/login', 3000);
          </script>
        </body>
      </html>
    `);
  }

  try {
    const redirectUri = `${getAppOrigin(req)}/api/google-callback`;

    // Exchange authorization code for tokens. With scope=openid, Google's
    // token endpoint returns an id_token alongside the access_token — that's
    // the same kind of token POST /api/auth/google already verifies (via
    // google-auth-library's verifyIdToken), so the backend needed no changes
    // for this redirect-flow migration, only how the frontend obtains it.
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { id_token, access_token } = tokenResponse.data;

    // Same pattern as the Microsoft/Yahoo callbacks: hand the token to the
    // browser via sessionStorage (never the URL), and re-check `state`
    // against what the sign-in button stashed before redirecting to Google —
    // a forged or replayed callback URL won't have a matching value.
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <html>
        <body>
          <script>
            (function () {
              var expectedState = sessionStorage.getItem('google_oauth_state');
              sessionStorage.removeItem('google_oauth_state');
              if (!expectedState || expectedState !== ${JSON.stringify(state || '')}) {
                document.body.innerHTML = '<h1>Authentication Error</h1><p>Invalid or expired sign-in attempt. Please try again.</p>';
                setTimeout(function () { window.location.href = '/login'; }, 3000);
                return;
              }
              sessionStorage.setItem('google_id_token', ${JSON.stringify(id_token)});
              sessionStorage.setItem('google_access_token', ${JSON.stringify(access_token)});
              window.location.replace('/login');
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Google OAuth error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Failed to authenticate with Google. Please try again.</p>
          <script>
            setTimeout(() => window.location.href = '/login', 3000);
          </script>
        </body>
      </html>
    `);
  }
}
