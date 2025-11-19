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

    // Get user info from Microsoft Graph API
    const userResponse = await axios.get('https://graph.microsoft.com/v1.0/me', {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    const userData = {
      name: userResponse.data.displayName || userResponse.data.userPrincipalName,
      email: userResponse.data.mail || userResponse.data.userPrincipalName,
      provider: 'microsoft',
    };

    // Redirect to login page with user data
    const redirectUrl = `/login?microsoft_user=${encodeURIComponent(JSON.stringify(userData))}`;
    
    return res.redirect(redirectUrl);
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

