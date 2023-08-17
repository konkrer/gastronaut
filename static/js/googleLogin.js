'use strict';

async function onGoogleSignIn(credentialResponse) {
  const data = { credential: credentialResponse.credential };
  // Try logging user in.
  try {
    var resp = await axios.post('/v1/check-google-token', data);
  } catch (error) {
    Sentry.captureException(error);
    alert('Error reaching Gastronaut endpoint for Google sign-in.');
    return;
  }
  if (resp.data && resp.data.error) {
    alert(resp.data.error);
  } else if (resp.data && resp.data.success) {
    // Get next url to navigate to after sign in.
    const next_url = window.location.search
      .replace('?next_url=', '')
      .replace(/;/g, '&');
    window.location.href = next_url;
  }
}
