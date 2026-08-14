# Environment Configuration Setup

## ✅ API URL Updated to ems2.exasa.net

The application is now configured to use `ems2.exasa.net` for API calls.

## Current Configuration

### Default Settings (No .env file needed)
The app will automatically use:

**API URL:**
```
http://ems2.exasa.net/api
```

**OAuth Client Credentials (from legacy React 18):**
```
CLIENT_ID:     1_1l29yg3q0ev4wosgwssccs00o4g44ko4ockgcwowgwwo88cg04
CLIENT_SECRET: 45diujtrpyww04s84w8sc0swgkgsckc0cco4os800g0gw4cw8s
```

All defaults are hardcoded as fallbacks, so it will work out of the box!

## Optional: Create .env File for Custom Configuration

If you want to override the default or use different settings, create a `.env` file in the project root:

### Development (.env)

```bash
# Create the file
cat > /Users/apple/Sites/Projects/Exa/exa_services/exa-ems-ui/.env << 'EOF'
# API Configuration
VITE_API_URL=http://ems2.exasa.net/api

# OAuth Client Configuration (Same as legacy React 18 app)
VITE_CLIENT_ID=1_1l29yg3q0ev4wosgwssccs00o4g44ko4ockgcwowgwwo88cg04
VITE_CLIENT_SECRET=45diujtrpyww04s84w8sc0swgkgsckc0cco4os800g0gw4cw8s

# App Configuration
VITE_APP_NAME=EXA EMS
VITE_APP_VERSION=1.0.0
EOF
```

### Production (.env.production)

For production builds, you can use HTTPS:

```bash
# Create the file
cat > /Users/apple/Sites/Projects/Exa/exa_services/exa-ems-ui/.env.production << 'EOF'
# API Configuration
VITE_API_URL=https://ems2.exasa.net/api

# OAuth Client Configuration
VITE_CLIENT_ID=exa-ems-client
VITE_CLIENT_SECRET=

# App Configuration
VITE_APP_NAME=EXA EMS
VITE_APP_VERSION=1.0.0
EOF
```

## Docker Configuration

The `docker-compose.yml` has been updated to:
1. Use `VITE_API_URL` from environment variables
2. Default to `http://ems2.exasa.net/api` if not set
3. Pass through OAuth client credentials

## Quick Start

### 1. No Setup Needed! 
The app is ready to use with ems2.exasa.net:

```bash
docker compose up -d --build
```

### 2. Access the App
Open http://localhost:3000

### 3. Login
The app will make API calls to:
```
http://ems2.exasa.net/api/auth/user
```

## Verify API Configuration

To check which API URL is being used:

### Check Docker Environment
```bash
docker compose exec exa-ems-ui-dev env | grep VITE_API_URL
```

### Check in Browser Console
```javascript
// In browser dev tools console
console.log(import.meta.env.VITE_API_URL)
```

## Different API URLs for Different Environments

You can override the API URL when starting the container:

### Local Kubernetes
```bash
VITE_API_URL=http://ems2.exasa.net/api docker compose up -d --build
```

### Staging
```bash
VITE_API_URL=https://stg.exasa.net/api docker compose up -d --build
```

### Production
```bash
VITE_API_URL=https://api.exasa.net/api docker compose up -d --build
```

## Testing API Connection

### 1. Check if ems2.exasa.net is reachable
```bash
curl http://ems2.exasa.net/api/health
```

### 2. Test authentication endpoint
```bash
curl -X POST http://ems2.exasa.net/api/auth/user \
  -H "Content-Type: application/json" \
  -d '{
    "username": "your_username",
    "password": "your_password",
    "client_id": "exa-ems-client",
    "grant_type": "password"
  }'
```

### 3. Check from within Docker container
```bash
docker compose exec exa-ems-ui-dev sh -c "apk add curl && curl http://ems2.exasa.net/api/health"
```

## Troubleshooting

### "Network Error" or "ERR_CONNECTION_REFUSED"

**Issue**: Can't reach ems2.exasa.net

**Solutions**:

1. **Check if domain resolves**:
   ```bash
   ping ems2.exasa.net
   ```

2. **Check /etc/hosts** (if using local Kubernetes):
   ```bash
   cat /etc/hosts | grep ems2
   ```
   Should see:
   ```
   127.0.0.1 ems2.exasa.net
   ```

3. **Add to /etc/hosts** if missing:
   ```bash
   echo "127.0.0.1 ems2.exasa.net" | sudo tee -a /etc/hosts
   ```

4. **Check Kubernetes Ingress** (if applicable):
   ```bash
   kubectl get ingress
   ```

### CORS Issues

If you see CORS errors in browser console:

1. **Check API server CORS config** - Should allow `http://localhost:3000`
2. **Try with credentials**: The axios client is already configured with proper headers

### Wrong API URL Being Used

1. **Rebuild the container** to pick up environment changes:
   ```bash
   docker compose down
   docker compose up -d --build
   ```

2. **Clear browser cache**: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

3. **Verify in browser console**:
   ```javascript
   console.log(import.meta.env.VITE_API_URL)
   ```

## Summary

✅ **Default API URL**: `http://ems2.exasa.net/api`  
✅ **No .env file required** - works out of the box  
✅ **Docker configured** - passes through environment variables  
✅ **Easy to override** - just set `VITE_API_URL` environment variable  

The application is ready to connect to ems2.exasa.net! 🚀

