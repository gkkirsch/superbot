# Spaces Dashboard Deployment Checklist

Complete reference for building, testing, and deploying the Spaces Dashboard to production.

## Pre-Deployment Verification

### System Requirements
- [ ] Node.js v16+ installed (`node --version`)
- [ ] npm v8+ installed (`npm --version`)
- [ ] 500MB+ free disk space
- [ ] Port 3274 available for dashboard server
- [ ] Express.js and dependencies installed

### Data Prerequisites
- [ ] `~/.superbot/` directory exists
- [ ] `~/.superbot/config.json` configured
- [ ] `~/.superbot/spaces/` directory exists (or will be created)
- [ ] Sample spaces in `~/.superbot/spaces/` (at least one for testing)
- [ ] `IDENTITY.md`, `USER.md`, `MEMORY.md` files exist

### Code Review
- [ ] All React components compile without errors
- [ ] No console errors or warnings in browser
- [ ] All API endpoints accessible and returning correct data
- [ ] CSS and styling applied correctly
- [ ] Responsive design verified on mobile/tablet/desktop

## Build Process

### Step 1: Clean Build Environment

```bash
# Navigate to frontend directory
cd ~/dev/superbot/dashboard-ui

# Clear previous build artifacts
rm -rf dist/ node_modules/

# Clear npm cache (optional)
npm cache clean --force
```

**Verification**:
- [ ] `dist/` directory removed
- [ ] `node_modules/` directory removed

### Step 2: Install Dependencies

```bash
# Install all required packages
npm install

# Verify installation
npm list --depth=0
```

**Expected Output**:
```
dashboard-ui@0.0.0
├── @tailwindcss/postcss@4.1.18
├── class-variance-authority@0.7.1
├── clsx@2.1.1
├── lucide-react@0.563.0
├── react@19.2.0
├── react-dom@19.2.0
└── tailwind-merge@3.4.0
```

**Verification**:
- [ ] No error messages during installation
- [ ] All dependencies installed
- [ ] `node_modules/` directory created

### Step 3: Code Quality Checks

```bash
# Run linter
npm run lint

# Fix any fixable issues automatically
npm run lint -- --fix
```

**Verification**:
- [ ] Linting passes or issues are documented
- [ ] No critical errors blocking build

### Step 4: Production Build

```bash
# Build optimized frontend
npm run build

# Verify build output
ls -la dist/
```

**Expected Output Structure**:
```
dist/
├── index.html
├── assets/
│   ├── index-*.js (main bundle)
│   └── index-*.css (styles)
└── vite.svg
```

**Verification**:
- [ ] Build completes without errors
- [ ] `dist/` directory contains HTML and assets
- [ ] No build warnings about large chunks
- [ ] File sizes reasonable (<500KB for main bundles)

### Step 5: Build Artifact Verification

```bash
# Check built file sizes
du -sh dist/
ls -lh dist/assets/

# Verify HTML entry point
head dist/index.html
```

**Verification**:
- [ ] Total dist size < 2MB
- [ ] Individual bundle files < 500KB
- [ ] index.html references correct asset paths
- [ ] No hardcoded localhost paths in built files

## Pre-Production Testing

### Step 1: Local Server Testing

```bash
# Navigate to dashboard server
cd ~/dev/superbot/dashboard

# Start Express server
node server.js

# In another terminal, verify server is running
curl -s http://localhost:3274/ | head -20
```

**Verification**:
- [ ] Server starts without errors
- [ ] Server logs show: "Superbot Dashboard running at http://localhost:3274/"
- [ ] curl command returns HTML content
- [ ] Dashboard accessible at http://localhost:3274/

### Step 2: API Endpoint Testing

```bash
# Test core API endpoints
curl -s http://localhost:3274/api/spaces | jq .
curl -s http://localhost:3274/api/status | jq .
curl -s http://localhost:3274/api/config | jq .
```

**Verification**:
- [ ] /api/spaces returns JSON with spaces array
- [ ] /api/status returns system health info
- [ ] /api/config returns configuration (tokens redacted)
- [ ] All endpoints return 200 status

### Step 3: Browser Testing

Open http://localhost:3274/ in browser:

#### Visual Testing
- [ ] Header displays "Spaces Dashboard"
- [ ] All tabs visible (All Spaces, Active, Archived, Paused)
- [ ] Space cards render in grid layout
- [ ] Status badges color-coded correctly
- [ ] Refresh button functional

#### Functional Testing
- [ ] Click refresh button - data updates
- [ ] Switch between tabs - filters work
- [ ] Click on space card - detail view opens (if implemented)
- [ ] Responsive design - works on narrower viewport
- [ ] No JavaScript errors in console (F12)

#### Performance Testing
- [ ] Page loads in < 2 seconds
- [ ] No layout shift during load
- [ ] Smooth animations/transitions
- [ ] No memory leaks in DevTools

### Step 4: Data Integration Testing

```bash
# Create test space if needed
mkdir -p ~/.superbot/spaces/test-space/tasks
mkdir -p ~/.superbot/spaces/test-space/docs

# Create space.json
cat > ~/.superbot/spaces/test-space/space.json << 'EOF'
{
  "slug": "test-space",
  "name": "Test Space",
  "status": "active",
  "description": "Test space for dashboard verification"
}
EOF

# Verify API returns the space
curl -s http://localhost:3274/api/spaces | jq '.spaces[] | select(.slug=="test-space")'
```

**Verification**:
- [ ] Dashboard displays test space
- [ ] Task and doc counts accurate
- [ ] Last updated timestamp present
- [ ] Status filtering includes new space

### Step 5: Mobile Responsiveness Testing

Test on different screen sizes:

```bash
# Desktop (1920x1080)
# Tablet (768x1024)
# Mobile (375x812)
```

Using browser DevTools (F12 -> Toggle device toolbar):

- [ ] Layout adapts to mobile (single column)
- [ ] Text remains readable
- [ ] Buttons are easy to tap (44px+ height)
- [ ] No horizontal scrolling
- [ ] Navigation accessible on all sizes

### Step 6: Error Handling Testing

Test error scenarios:

```bash
# Stop Express server (Ctrl+C)
# Try to access dashboard - should show connection error

# Verify graceful error handling in browser console
```

**Verification**:
- [ ] Page handles server down gracefully
- [ ] Loading states display appropriately
- [ ] Error messages helpful and visible

## Production Deployment

### Step 1: Environment Preparation

```bash
# Verify production configuration
cat ~/.superbot/config.json

# Check disk space
df -h /

# Verify port 3274 not in use
lsof -i :3274
```

**Verification**:
- [ ] Configuration file complete and valid
- [ ] Adequate disk space (>500MB free)
- [ ] Port 3274 available

### Step 2: Deploy Frontend

```bash
# Ensure latest build
cd ~/dev/superbot/dashboard-ui
npm run build

# Verify dist/ is fresh
ls -lt dist/ | head -5
```

**Verification**:
- [ ] Build completes successfully
- [ ] dist/ files have recent timestamps

### Step 3: Start Production Server

```bash
# Navigate to dashboard server
cd ~/dev/superbot/dashboard

# Start server (recommended: use process manager)
node server.js &

# Or with nohup for persistence
nohup node server.js > dashboard.log 2>&1 &

# Verify process started
ps aux | grep "node server.js"
```

**Verification**:
- [ ] Server process running
- [ ] No errors in logs
- [ ] Server accessible on port 3274

### Step 4: Post-Deployment Verification

```bash
# Health check
curl -s http://localhost:3274/ > /dev/null && echo "OK" || echo "FAILED"

# Full status check
curl -s http://localhost:3274/api/status | jq .

# Check for errors in server logs
tail -20 dashboard.log
```

**Verification**:
- [ ] Health check returns "OK"
- [ ] /api/status shows healthy system
- [ ] No error messages in logs
- [ ] Dashboard loads in browser

### Step 5: Smoke Testing

Perform basic operations:

1. Open http://localhost:3274/
2. Refresh the page (test F5)
3. Click each tab to verify filtering
4. Open DevTools Network tab - verify no 404s
5. Check DevTools Console - no red errors

**Verification**:
- [ ] Dashboard fully functional
- [ ] All API calls successful (200 status)
- [ ] No console errors or warnings
- [ ] Data displays correctly

## Continuous Operation

### Monitoring

```bash
# Monitor server uptime
watch -n 5 'curl -s http://localhost:3274/api/status | jq .timestamp'

# Monitor resource usage
top -p $(pgrep -f "node server.js")

# Check logs periodically
tail -f ~/dev/superbot/dashboard/dashboard.log
```

### Maintenance

- [ ] Set up log rotation for server logs
- [ ] Monitor disk usage
- [ ] Periodically rebuild frontend with latest dependencies
- [ ] Keep Node.js updated

## Rollback Procedure

If deployment fails or issues arise:

```bash
# Stop current server
pkill -f "node server.js"

# Restore previous build
cd ~/dev/superbot/dashboard-ui
git restore dist/  # if using git

# Or rebuild from last known good state
npm run build

# Restart server
cd ~/dev/superbot/dashboard
node server.js
```

**Verification**:
- [ ] Server stopped cleanly
- [ ] Previous version running
- [ ] Dashboard accessible

## Troubleshooting

### Build Failures

**Error**: `npm ERR! ERESOLVE unable to resolve dependency tree`

**Solution**:
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

**Error**: `Out of memory`

**Solution**:
```bash
node --max-old-space-size=4096 node_modules/.bin/vite build
```

### Server Issues

**Error**: `Port 3274 already in use`

**Solution**:
```bash
# Find process using port
lsof -i :3274

# Kill process
kill -9 <PID>

# Or use different port - edit server.js
```

**Error**: `Cannot find module 'express'`

**Solution**:
```bash
cd ~/dev/superbot/dashboard
npm install express fs path os
```

### API Failures

**Error**: `Cannot GET /api/spaces`

**Solution**:
```bash
# Verify server is running
curl http://localhost:3274/

# Check server logs for errors
tail -20 dashboard.log

# Verify data directories exist
ls -la ~/.superbot/spaces/
```

## Performance Optimization

### Frontend Optimization

```bash
# Check bundle size
npm run build -- --analyze

# Compress assets
gzip -9 dist/assets/*

# Lazy load routes
# Already implemented in React components
```

### Server Optimization

```bash
# Add compression middleware (edit server.js)
const compression = require('compression');
app.use(compression());

# Use caching headers
# Already implemented for static files
```

## Post-Deployment Monitoring

### Daily Checks

- [ ] Dashboard accessible
- [ ] No error messages in console
- [ ] API responses fast (<100ms)
- [ ] All spaces visible and up-to-date
- [ ] Styling renders correctly

### Weekly Checks

- [ ] Review server logs for errors
- [ ] Check disk space
- [ ] Verify process still running
- [ ] Test complete workflow end-to-end

### Monthly Checks

- [ ] Update dependencies
- [ ] Performance review
- [ ] Security audit
- [ ] Backup verification

## Sign-Off

- [ ] All checklist items completed
- [ ] Dashboard fully functional in production
- [ ] Monitoring in place
- [ ] Team informed of deployment
- [ ] Documentation updated

**Deployment Date**: _______________

**Deployed By**: _______________

**Version**: 1.0.0

**Status**: [ ] Production Ready
