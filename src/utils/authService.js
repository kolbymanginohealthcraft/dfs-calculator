/**
 * Authentication Service
 * Handles SAML login/logout and user session management for C# backend.
 * In development, uses the /account/dev-login endpoint to avoid
 * redirecting to the external SAML IdP.
 */

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || '';
const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';

/**
 * Get the current user or check if logged in
 * @returns {Promise<{loggedIn: boolean, user?: object}>}
 */
export async function getCurrentUser() {
  const authUrl = isDevelopment
    ? '/account/me'
    : `${AUTH_BASE_URL}/account/me`;
  
  try {
    const response = await fetch(authUrl, {
      method: 'GET',
      credentials: 'include',
    });

    if (response.ok) {
      const user = await response.json();
      return { loggedIn: true, user };
    } else if (response.status === 401) {
      return { loggedIn: false };
    } else {
      throw new Error(`Failed to check auth status: ${response.status}`);
    }
  } catch (error) {
    console.error('Error checking authentication:', error);
    return { loggedIn: false };
  }
}

/**
 * Initiate login flow.
 * Production: redirects to the SAML IdP via /account/login.
 * Development: calls /account/dev-login to create a local session, then reloads.
 * @param {string} returnUrl - URL to return to after login (default: current page)
 */
export async function login(returnUrl = null) {
  if (isDevelopment) {
    try {
      const res = await fetch('/account/dev-login', { credentials: 'include' });
      if (res.ok) {
        window.location.href = returnUrl || window.location.href;
        return;
      }
    } catch (err) {
      console.error('Dev login failed:', err);
    }
    return;
  }

  const currentUrl = returnUrl || window.location.href;
  const encodedReturnUrl = encodeURIComponent(currentUrl);
  const loginUrl = `${AUTH_BASE_URL}/account/login?returnUrl=${encodedReturnUrl}`;
  window.location.href = loginUrl;
}

/**
 * Logout current user
 * @param {string} returnUrl - URL to redirect to after logout (default: home page)
 */
export function logout(returnUrl = null) {
  const defaultReturnUrl = `${window.location.origin}/`;
  const targetUrl = returnUrl || defaultReturnUrl;
  const encodedReturnUrl = encodeURIComponent(targetUrl);
  
  const logoutUrl = isDevelopment
    ? `/account/logout?returnUrl=${encodedReturnUrl}`
    : `${AUTH_BASE_URL}/account/logout?returnUrl=${encodedReturnUrl}`;
  
  window.location.href = logoutUrl;
}

/**
 * Check if user is authenticated (synchronous check using stored state)
 * For real check, use getCurrentUser()
 */
export function isAuthenticated() {
  return localStorage.getItem('user-authenticated') === 'true';
}
