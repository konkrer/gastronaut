'use strict';

async function onSignIn(googleUser) {
  // Get google idtoken for user.
  const idtoken = googleUser.getAuthResponse().id_token;

  const data = {
    idtoken,
  };

  // Try logging user in.
  try {
    var resp = await axios.post('/v1/check-google-token', data);
  } catch (error) {
    Sentry.captureException(error);
    alert('Error reaching Gastronaut endpoint for Google sign-in.');
    // If error sign user out of this app with google.
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut();
    return;
  }
  if (resp.data && resp.data.error) {
    alert(resp.data.error);
    // If error sign user out of this app with google.
    const auth2 = gapi.auth2.getAuthInstance();
    auth2.signOut();
  } else if (resp.data && resp.data.success) {
    // Get next url to navigate to after sign in.
    const next_url = window.location.search
      .replace('?next_url=', '')
      .replace(/;/g, '&');
    window.location.href = next_url;
  }
}
