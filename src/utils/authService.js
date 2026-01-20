/**
 * Authentication Service
 * Handles SAML login/logout and user session management for C# backend
 */

const AUTH_BASE_URL = import.meta.env.VITE_AUTH_BASE_URL || '';
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

/**
 * Get the current user or check if logged in
 * @returns {Promise<{loggedIn: boolean, user?: object}>}
 */
export async function getCurrentUser() {
  // In development, always use relative URL to go through Vite proxy (avoids CORS)
  // In production, use full URL from environment variable
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const authUrl = isDevelopment
    ? '/account/me'  // Always use relative URL in dev (goes through Vite proxy)
    : `${AUTH_BASE_URL}/account/me`; // Use full URL in production
  
  try {
    const response = await fetch(authUrl, {
      method: 'GET',
      credentials: 'include', // Important: Include cookies for session
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
 * Initiate login flow
 * Redirects to SAML login, then back to the specified return URL
 * @param {string} returnUrl - URL to return to after login (default: current page)
 */
export function login(returnUrl = null) {
  const currentUrl = returnUrl || window.location.href;
  const encodedReturnUrl = encodeURIComponent(currentUrl);
  
  // In development, always use relative URL to go through Vite proxy (avoids CORS)
  // In production, use full URL from environment variable
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const loginUrl = isDevelopment
    ? `/account/login?returnUrl=${encodedReturnUrl}`  // Always use relative URL in dev
    : `${AUTH_BASE_URL}/account/login?returnUrl=${encodedReturnUrl}`; // Use full URL in production
  
  // Redirect to login endpoint (which will handle SAML flow)
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
  
  // In development, always use relative URL to go through Vite proxy (avoids CORS)
  // In production, use full URL from environment variable
  const isDevelopment = import.meta.env.DEV || import.meta.env.MODE === 'development';
  const logoutUrl = isDevelopment
    ? `/account/logout?returnUrl=${encodedReturnUrl}`  // Always use relative URL in dev
    : `${AUTH_BASE_URL}/account/logout?returnUrl=${encodedReturnUrl}`; // Use full URL in production
  
  // Redirect to logout endpoint
  window.location.href = logoutUrl;
}

/**
 * Check if user is authenticated (synchronous check using stored state)
 * For real check, use getCurrentUser()
 */
export function isAuthenticated() {
  // You might store this in localStorage or context after initial check
  return localStorage.getItem('user-authenticated') === 'true';
}
