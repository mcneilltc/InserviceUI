import React from 'react';

const SignOut = () => {
  const handleSignOut = () => {
    const auth2 = window.gapi.auth2.getAuthInstance();
    auth2.signOut().then(() => {
      console.log('User signed out.');
      // Optionally, redirect the user or clear user data from the state
    });
  };

  return (
    <a href="#" onClick={handleSignOut}>
      Sign out
    </a>
  );
};

export default SignOut;