# Deployment Guide for Vercel

## Changes Made for Vercel Deployment

### 1. API Serverless Function
- Created `api/facility-name/[ccn].js` - A Vercel serverless function that handles facility name lookups
- This replaces the Express server (`src/utils/server.js`) which doesn't run on Vercel

### 2. Static Files
- Moved CSV files from `src/data/` to `public/` directory:
  - `itm_val.csv`
  - `mds_sections.csv` 
  - `descriptions.csv`
- Updated `src/utils/useValueDescriptions.js` to use the new path `/itm_val.csv`

### 3. Vercel Configuration
- Added `vercel.json` with proper routing and function configuration
- Updated `package.json` with `vercel-build` script

## How to Deploy

1. **Push to GitHub**: Make sure all changes are committed and pushed to your GitHub repository

2. **Deploy to Vercel**:
   - Connect your GitHub repository to Vercel
   - Vercel will automatically detect the React app and deploy it
   - The API routes will be automatically handled by the serverless functions

3. **Environment Variables** (if needed):
   - No environment variables are required for this deployment
   - The CMS API calls are made directly from the serverless function

## API Endpoints

- `GET /api/facility-name/[ccn]` - Returns facility information for a given CCN
  - Returns: `{ facility_name, address, city, state, zip }`
  - Example: `/api/facility-name/123456`

## Development vs Production

- **Development**: Uses Vite proxy to route `/api` calls to local Express server (`localhost:3001`)
- **Production**: Uses Vercel serverless functions to handle API calls

## Troubleshooting

If the facility lookup fails in production:
1. Check Vercel function logs in the Vercel dashboard
2. Verify the CMS API is accessible from Vercel's servers
3. Ensure the CCN parameter is being passed correctly

## Local Development

To run locally with the new setup:
1. `npm run dev` - Starts Vite dev server with proxy
2. `npm run server` - Starts Express server (optional, for testing API directly)
