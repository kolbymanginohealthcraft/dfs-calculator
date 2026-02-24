# Testing Authentication States

This guide explains how to test the application in both authenticated and unauthenticated states.

## Overview

The application has two access levels:
1. **Unauthenticated (Public)**: Basic mode only -- anyone can access
2. **Authenticated (Customer)**: Full access including Advanced mode with MDS file uploads

Authentication is handled by the C# backend using SAML/session cookies. The frontend calls `/account/me` to check session status; `AuthContext` uses this to set `isAuthenticated`.

## Development: Auto-Login

In development mode, `AuthContext` automatically calls `/account/dev-login` when it detects a 401 on `/account/me`. This creates a session as `dev-user@localhost` so you get full access without any manual steps.

To test the **unauthenticated** state in development, you need to manually log out first.

## Manual Testing

### Test Unauthenticated State

1. **Log out**:
   - Navigate to `http://localhost:5173/account/logout`
   - Or use a fresh incognito window (auto dev-login will fire, so you may need to stop the C# backend to truly test without auth)

2. **Verify the UI**:
   - Clicking "Advanced Mode" on home page shows `CustomerAccessModal`
   - Navigating to `/advanced` redirects to `/`
   - Mode banner shows "Advanced (Customer Only)" instead of "Switch to Advanced"

### Test Authenticated State

1. **With auto dev-login (default)**: Just start both servers and refresh -- `AuthContext` handles it automatically.

2. **Manual dev-login** (if needed):
   - Navigate to `http://localhost:5173/account/dev-login`
   - Or `curl -c cookies.txt https://localhost:7194/account/dev-login -k`
   - The C# server creates a session cookie for `dev-user@localhost`

3. **Verify the UI**:
   - Can access `/advanced`
   - Can upload MDS files
   - No blocking modals

**Note**: `/account/dev-login` only works when `ASPNETCORE_ENVIRONMENT=Development`. It returns 404 in production.

## Key UI Components to Test

### 1. Home Screen (`/`)
- **Unauthenticated**: "Advanced Mode" button shows modal
- **Authenticated**: "Advanced Mode" button navigates to `/advanced`

### 2. Mode Banner (top navigation)
- **Unauthenticated in Basic Mode**: Clicking "Switch to Advanced" shows `CustomerAccessModal`
- **Authenticated**: Clicking "Switch to Advanced" navigates (with data loss warning if needed)

### 3. Routing Protection
- **Unauthenticated**: Direct navigation to `/advanced` or `/advanced/summary` redirects to `/`
- **Authenticated**: Can access all routes

### 4. Customer Access Modal
- **Trigger**: Clicking "Advanced Mode" when unauthenticated
- **Content**:
  - Explains advanced features require customer access
  - "Go to myCare Portal" button (opens portal URL)
  - "Visit Aegis Therapies" button (opens company website)

## Troubleshooting

### Modal not showing when clicking Advanced Mode?
- Check browser console for errors
- Verify `isAuthenticated` is `false` in AuthContext (inspect React DevTools)
- Check that `CustomerAccessModal` is imported and used in `HomeScreen.jsx`
- Confirm `/account/me` returns 401 when unauthenticated

### Can't access advanced mode when authenticated?
- Verify you have a valid session (call `/account/me` -- should return 200 with user info)
- In development, ensure the C# backend is running (`npm run server`)
- Check browser console for authentication errors
- In production, ensure you're coming from the portal with a valid SAML session

### Auth state not updating?
- The app checks auth on mount via `getCurrentUser()` in AuthContext
- Refresh the page after logging in/out
- Check Network tab: `/account/me` should reflect your session status

## Production Behavior

In production, authentication is determined by:

- **SAML/session cookies**: Users authenticate via the myCare portal; the IdP sets cookies after the SAML flow. The C# backend validates the session.
- **No dev bypass**: `/account/dev-login` is disabled (returns 404) when not in Development.

- **Public users (no authentication)**:
  - Can only access Basic mode
  - See modals when trying to access Advanced features
  - Advanced routes redirect to home

- **Authenticated users (portal session)**:
  - Full access to all features
  - No redirects or blocking modals

## Testing Checklist

Before deploying to production, verify:

- [ ] Unauthenticated users can access Basic mode
- [ ] Unauthenticated users see modal when clicking "Advanced Mode"
- [ ] Unauthenticated users are redirected from `/advanced` routes
- [ ] Authenticated users can access all routes
- [ ] Authenticated users can upload files
- [ ] Mode banner shows correct behavior for both states
- [ ] Customer Access Modal displays correctly
- [ ] Modal links work (portal, company website)
