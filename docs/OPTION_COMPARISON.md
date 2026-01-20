# Development Options Comparison

## Option 1: Use Staging Backend (What We've Been Doing)

### Setup
- **Frontend**: Run locally with `npm run dev`
- **Backend**: Use remote staging backend (already deployed)
- **Connection**: Frontend → Vite Proxy → Staging Backend

### What You Need
- ✅ Just your frontend code
- ✅ `.env.development` pointing to staging URL
- ✅ Vite proxy configured (already done)
- ❌ No .NET SDK needed
- ❌ No need to run backend locally

### How It Works
```
Your Computer:
  Frontend (npm run dev) → localhost:5173
         ↓ (via Vite proxy)
  Staging Backend → https://kind-mushroom-023e7820f-staging...
```

### Pros
- ✅ Simplest setup - just run `npm run dev`
- ✅ No need to install .NET SDK
- ✅ Tests against actual staging environment
- ✅ Backend is already running (when it's working)

### Cons
- ❌ Depends on staging backend being available
- ❌ Can't debug backend code
- ❌ Can't modify backend behavior
- ❌ Network dependency (needs internet)

### Current Status
- ⚠️ **Not working right now** - staging backend returning 404
- Need IT/Hannah to fix staging backend

---

## Option 2: Run C# Backend Locally

### Setup
- **Frontend**: Run locally with `npm run dev`
- **Backend**: Run locally with `dotnet run` (in `Aegis.DfsCalculator/DFSCalculator.Server/`)
- **Connection**: Frontend → Direct to localhost:7194

### What You Need
- ✅ .NET SDK installed
- ✅ Visual Studio or VS Code (optional, for debugging)
- ✅ `.env.development` pointing to localhost
- ✅ Run both frontend AND backend

### How It Works
```
Your Computer:
  Frontend (npm run dev) → localhost:5173
         ↓ (direct connection)
  Backend (dotnet run) → localhost:7194
```

### Pros
- ✅ Full control - can debug and modify backend
- ✅ No dependency on staging backend
- ✅ Faster (no network latency)
- ✅ Can test backend changes immediately
- ✅ Works offline

### Cons
- ❌ More setup required (.NET SDK, etc.)
- ❌ Need to run two processes (frontend + backend)
- ❌ Need to configure backend (SAML, certificates, etc.)
- ❌ More complex

### Steps to Set Up
1. Install .NET SDK
2. Trust certificate: `dotnet dev-certs https --trust`
3. Update `.env.development`:
   ```env
   VITE_API_BASE_URL=https://localhost:7194
   VITE_AUTH_BASE_URL=https://localhost:7194
   ```
4. Terminal 1: `cd Aegis.DfsCalculator/DFSCalculator.Server && dotnet run`
5. Terminal 2: `npm run dev`

---

## Key Differences Summary

| Aspect | Option 1 (Staging) | Option 2 (Local) |
|--------|-------------------|------------------|
| **Backend Location** | Remote (staging) | Local (your computer) |
| **Setup Complexity** | Simple | More complex |
| **Dependencies** | Just frontend | Frontend + .NET SDK |
| **Processes to Run** | 1 (`npm run dev`) | 2 (frontend + backend) |
| **Backend Control** | None (IT controls) | Full control |
| **Debugging** | Frontend only | Frontend + Backend |
| **Network Required** | Yes | No (after setup) |
| **Current Status** | ❌ Not working (404) | ✅ Should work if set up |

---

## Which Should You Use?

### Use Option 1 (Staging) When:
- ✅ You just want to test frontend changes
- ✅ Staging backend is working
- ✅ You don't need to modify backend
- ✅ You want the simplest setup

### Use Option 2 (Local) When:
- ✅ Staging backend isn't working (like now!)
- ✅ You need to debug backend issues
- ✅ You want to modify backend code
- ✅ You want to work offline
- ✅ You're comfortable with .NET

---

## Recommendation Right Now

Since staging backend is returning 404, you have two choices:

1. **Wait for IT to fix staging** (easiest, but you're blocked)
2. **Set up Option 2 (local backend)** (more work, but you can continue)

If you want to proceed with Option 2, I can help you:
- Install .NET SDK
- Configure the local backend
- Set up the environment
- Get it running

Let me know which path you'd like to take!
