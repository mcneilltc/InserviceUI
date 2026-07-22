import axios from 'axios';

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
    const redirectUri = `${req.headers.origin || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/microsoft-callback`;
    
    // Exchange authorization code for access token
    const tokenResponse = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      new URLSearchParams({
        client_id: process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID,
        client_secret: process.env.MICROSOFT_CLIENT_SECRET,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        scope: 'openid profile email',
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Hand the token to the browser via sessionStorage instead of a URL query
    // param — a bearer token in the URL would end up in browser history and
    // server access logs. The inline script also re-checks `state` against
    // what MicrosoftAuth.js stashed in sessionStorage before redirecting to
    // Microsoft: only a request originating from that same browser tab can
    // have set it, so a forged/replayed callback URL won't have a match and
    // the login is rejected instead of silently proceeding (CSRF protection).
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <html>
        <body>
          <script>
            (function () {
              var expectedState = sessionStorage.getItem('ms_oauth_state');
              sessionStorage.removeItem('ms_oauth_state');
              if (!expectedState || expectedState !== ${JSON.stringify(state || '')}) {
                document.body.innerHTML = '<h1>Authentication Error</h1><p>Invalid or expired sign-in attempt. Please try again.</p>';
                setTimeout(function () { window.location.href = '/login'; }, 3000);
                return;
              }
              sessionStorage.setItem('microsoft_access_token', ${JSON.stringify(access_token)});
              window.location.replace('/login');
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Microsoft OAuth error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Failed to authenticate with Microsoft. Please try again.</p>
          <script>
            setTimeout(() => window.location.href = '/login', 3000);
          </script>
        </body>
      </html>
    `);
  }
}

