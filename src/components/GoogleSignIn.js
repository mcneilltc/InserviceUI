import React, { useEffect } from 'react';

const GoogleSignIn = () => {
  useEffect(() => {
    // Initialize Google Sign-In
    window.gapi.load('auth2', () => {
      window.gapi.auth2.init({
        client_id: '326880139857-ppgfr3n0rpu6b6fc13krgpteud2rqvp9.apps.googleusercontent.com',
      });
    });
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      const auth2 = window.gapi.auth2.getAuthInstance();
      const googleUser = await auth2.signIn();
      const idToken = googleUser.getAuthResponse().id_token;

      // Send the ID token to the backend
      const response = await axios.post('/api/google-signin', { idToken });
      console.log('Google Sign-In successful:', response.data);
    } catch (error) {
      console.error('Google Sign-In failed:', error);
    }
  };

  return (
    <div>
      <button onClick={handleGoogleSignIn}>Sign in with Google</button>
    </div>
  );
};

export default GoogleSignIn;