import axios from 'axios';
import { getAppOrigin } from '../../lib/getAppOrigin';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { code, state, error, error_description } = req.query;

  if (!code) {
    console.error('Yahoo OAuth callback returned no code:', { error, error_description });
    return res.status(400).send(`
      <html>
        <body>
          <h1>Authorization Error</h1>
          <p>Authorization code not provided. Please try again.</p>
          ${error ? `<p><small>${error}${error_description ? `: ${error_description}` : ''}</small></p>` : ''}
          <script>
            setTimeout(() => window.location.href = '/login', 3000);
          </script>
        </body>
      </html>
    `);
  }

  try {
    const redirectUri = `${getAppOrigin(req)}/api/yahoo-callback`;

    // Yahoo's token endpoint authenticates the client via a Basic auth header
    // (client_id:client_secret), not as form body params like Microsoft's does.
    const basicAuth = Buffer.from(
      `${process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID}:${process.env.YAHOO_CLIENT_SECRET}`
    ).toString('base64');

    const tokenResponse = await axios.post(
      'https://api.login.yahoo.com/oauth2/get_token',
      new URLSearchParams({
        grant_type: 'authorization_code',
        redirect_uri: redirectUri,
        code: code,
      }),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${basicAuth}`,
        },
      }
    );

    const { access_token } = tokenResponse.data;

    // Same pattern as the Microsoft callback: hand the token to the browser
    // via sessionStorage (never the URL), and re-check `state` against what
    // the sign-in button stashed before redirecting to Yahoo — a forged or
    // replayed callback URL won't have a matching value and gets rejected.
    res.setHeader('Content-Type', 'text/html');
    return res.send(`
      <html>
        <body>
          <script>
            (function () {
              var expectedState = sessionStorage.getItem('yahoo_oauth_state');
              sessionStorage.removeItem('yahoo_oauth_state');
              if (!expectedState || expectedState !== ${JSON.stringify(state || '')}) {
                document.body.innerHTML = '<h1>Authentication Error</h1><p>Invalid or expired sign-in attempt. Please try again.</p>';
                setTimeout(function () { window.location.href = '/login'; }, 3000);
                return;
              }
              sessionStorage.setItem('yahoo_access_token', ${JSON.stringify(access_token)});
              window.location.replace('/login');
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Yahoo OAuth error:', error);
    return res.status(500).send(`
      <html>
        <body>
          <h1>Authentication Error</h1>
          <p>Failed to authenticate with Yahoo. Please try again.</p>
          <script>
            setTimeout(() => window.location.href = '/login', 3000);
          </script>
        </body>
      </html>
    `);
  }
}
