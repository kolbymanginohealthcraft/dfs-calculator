# Testing Authentication States

This guide explains how to test your application in both authenticated and unauthenticated states.

## Overview

Your application has two access modes:
1. **Unauthenticated (Public)**: Basic mode only - anyone can access
2. **Authenticated (Portal)**: Full access including advanced mode with file uploads

Authentication is determined by the C# backend using SAML/session cookies. The frontend calls `/account/me` to check session status; `PortalContext` uses this to set `isFromPortal`.

## Manual Testing Method

### Test Unauthenticated State:

1. **Ensure you're logged out**:
   - Navigate to `/account/logout` (or call it via the C# dev server)
   - Or use a fresh browser session / incognito window

2. **Test the UI**:
   - Try clicking "Advanced Mode" on home page → should show modal
   - Try navigating to `/advanced` → should redirect to home
   - Try switching from basic to advanced in mode banner → should show modal

### Test Authenticated State (Development):

When running against the C# backend in Development mode:

1. **Get a dev session**:
   - Navigate to `http://localhost:<port>/account/dev-login` (or your dev server URL)
   - Or use a request tool (curl, Postman) to `GET /account/dev-login` with credentials
   - The C# server creates a session cookie for `dev-user@localhost`

2. **Test the UI**:
   - Should be able to access `/advanced`
   - Should be able to upload files
   - No modals blocking access

**Note**: The `/account/dev-login` endpoint only exists when `ASPNETCORE_ENVIRONMENT=Development`. It returns 404 in production.

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
- Verify `isFromPortal` is `false` in PortalContext (inspect React DevTools)
- Check that `CustomerAccessModal` is imported and used in `HomeScreen.jsx`
- Confirm `/account/me` returns 401 when unauthenticated

### Can't access advanced mode when authenticated?
- Verify you have a valid session (call `/account/me` - should return 200 with user info)
- In development, ensure you've hit `/account/dev-login` first
- Check browser console for authentication errors
- In production, ensure you're coming from the portal with valid SAML session

### Auth state not updating?
- The app checks auth on mount via `getCurrentUser()` in PortalContext
- Refresh the page after logging in/out
- Check Network tab: `/account/me` should reflect your session status

## Production Behavior

In production, authentication is determined by:

- **SAML/session cookies**: Users authenticate via the portal (myCare); the IdP sets cookies after SAML flow. The C# backend validates the session.
- **No dev bypass**: `/account/dev-login` is disabled (returns 404) when not in Development.

- **Public users (no authentication)**:
  - Can only access basic mode
  - See modals when trying to access advanced features
  - Advanced routes redirect to home

- **Authenticated users (portal session)**:
  - Full access to all features
  - No redirects or blocking modals

## Testing Checklist

Before deploying to production, verify:

- [ ] Unauthenticated users can access basic mode
- [ ] Unauthenticated users see modal when clicking "Advanced Mode"
- [ ] Unauthenticated users are redirected from `/advanced` routes
- [ ] Authenticated users can access all routes
- [ ] Authenticated users can upload files
- [ ] Mode banner shows correct behavior for both states
- [ ] Customer Access Modal displays correctly
- [ ] Modal links work (portal, company website)
