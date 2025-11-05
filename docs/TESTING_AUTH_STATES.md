# Testing Authentication States

This guide explains how to test your application in both authenticated and unauthenticated states.

## Overview

Your application has two access modes:
1. **Unauthenticated (Public)**: Basic mode only - anyone can access
2. **Authenticated (myCare Portal)**: Full access including advanced mode with file uploads

## Quick Test Method: Auth State Tester

A development-only component has been added to help you toggle between states.

### How to Use

1. **Start your dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Look for the Auth Tester widget** in the bottom-right corner of your app
   - It only appears in development mode
   - Shows your current authentication state

3. **Toggle between states**:
   - Click **"✅ Simulate Authenticated"** to test as a myCare portal user
   - Click **"❌ Simulate Unauthenticated"** to test as a public user
   - The page will reload to apply the change

### What You Should See

#### Unauthenticated State (Public User):
- ✅ Can access home page (`/`)
- ✅ Can access basic mode (`/basic/*`)
- ✅ Can see FAQ
- ❌ Cannot access advanced mode (redirected to home)
- ❌ Clicking "Advanced Mode" shows `CustomerAccessModal` with myCare portal link
- ❌ Mode banner shows modal when trying to switch from basic to advanced

#### Authenticated State (myCare Portal User):
- ✅ Can access home page
- ✅ Can access basic mode
- ✅ Can access advanced mode (`/advanced`, `/advanced/summary`)
- ✅ Can upload MDS files
- ✅ Can use all calculation features
- ✅ No modals blocking access

## Manual Testing Method

If you prefer to test manually without the widget:

### Test Unauthenticated State:

1. **Remove dev bypass** from your `.env` file:
   ```env
   # Comment out or remove these lines:
   # VITE_ALLOW_DEV_BYPASS=true
   # ALLOW_DEV_BYPASS=true
   ```

2. **Clear localStorage**:
   - Open browser DevTools (F12)
   - Go to Application → Local Storage
   - Delete `dev-sso-token` and `auth-test-override`

3. **Restart dev server**:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

4. **Test the UI**:
   - Try clicking "Advanced Mode" on home page → should show modal
   - Try navigating to `/advanced` → should redirect to home
   - Try switching from basic to advanced in mode banner → should show modal

### Test Authenticated State:

1. **Add dev bypass** to your `.env` file:
   ```env
   VITE_ALLOW_DEV_BYPASS=true
   ALLOW_DEV_BYPASS=true
   ```

2. **Set localStorage**:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Run: `localStorage.setItem('dev-sso-token', 'dev-bypass-token')`
   - Refresh the page

3. **Restart dev server** (if you changed `.env`):
   ```bash
   npm run dev
   ```

4. **Test the UI**:
   - Should be able to access `/advanced`
   - Should be able to upload files
   - No modals blocking access

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
  - "Go to myCare Portal" button (opens https://www.mycare.com/)
  - "Visit Aegis Therapies" button (opens https://aegistherapies.com/)

## Troubleshooting

### Auth Tester not appearing?
- Ensure you're in development mode (`npm run dev`)
- Check that you're on `localhost` or `127.0.0.1`
- Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### Modal not showing when clicking Advanced Mode?
- Check browser console for errors
- Verify `isFromPortal` is `false` in PortalContext
- Check that `CustomerAccessModal` is imported and used in `HomeScreen.jsx`

### Can't access advanced mode when authenticated?
- Check that `dev-sso-token` exists in localStorage
- Verify `VITE_ALLOW_DEV_BYPASS=true` in `.env` (if using manual method)
- Check browser console for authentication errors

### Auth state not changing after toggle?
- Wait for page reload (should happen automatically)
- If stuck, manually refresh the page
- Clear localStorage and try again

## Production Behavior

**Important**: The Auth Tester widget does NOT appear in production builds. In production:

- Authentication is determined by:
  1. SAML token in `UPN` cookie (from myCare portal)
  2. Referrer checking (if coming from myCare domain)
  3. No dev bypass is available

- Public users (no authentication):
  - Can only access basic mode
  - See modals when trying to access advanced features
  - Advanced routes redirect to home

- Authenticated users (from myCare):
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
- [ ] Modal links work (myCare portal, Aegis website)

