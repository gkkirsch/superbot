# Spaces Dashboard Guide

A comprehensive guide to understanding, building, and deploying the Superbot Spaces Dashboard.

## Overview

The Spaces Dashboard is a web-based user interface for managing and monitoring Superbot spaces, tasks, documentation, and other resources. It provides a clean, modern interface for viewing space status, task counts, documentation, and other metrics across your Superbot ecosystem.

**Access URL**: http://localhost:3274/

## Architecture

The dashboard uses a modern web architecture with a clear separation of concerns:

```
┌─────────────────────────────────────────────────────────────┐
│              Spaces Dashboard Architecture                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Frontend (React + Vite)                                   │
│  ├── Components                                            │
│  │   ├── App.jsx (main entry point)                       │
│  │   ├── SpacesList.jsx (space listing)                   │
│  │   └── SpaceCard.jsx (individual space card)            │
│  ├── UI Components (shadcn/ui)                            │
│  │   ├── Card, Button, Badge, Tabs                        │
│  │   └── Other reusable components                        │
│  └── Styling (Tailwind CSS)                               │
│                                                              │
│  Built Output → /dashboard-ui/dist/                        │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Backend (Express.js)                                      │
│  ├── Server: /dashboard/server.js (Port 3274)             │
│  ├── API Routes                                            │
│  │   ├── /api/spaces (list all spaces)                    │
│  │   ├── /api/spaces/:slug (detail view)                  │
│  │   ├── /api/spaces/:slug/tasks (space tasks)            │
│  │   ├── /api/spaces/:slug/docs (space docs)              │
│  │   └── Other endpoints (config, logs, etc.)             │
│  └── Static Files                                          │
│      └── Serves dashboard UI dist files                    │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Data Sources                                              │
│  ├── ~/.superbot/spaces/ (space definitions, tasks, docs)  │
│  ├── ~/.superbot/ (identity, user, memory, heartbeat)      │
│  ├── ~/.superbot/daily/ (daily notes)                      │
│  ├── ~/.superbot/logs/ (system logs)                       │
│  └── ~/.superbot/config.json (configuration)               │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Frontend Stack

- **Framework**: React 19.2.0 - Modern UI library with hooks
- **Build Tool**: Vite 7.3.1 - Fast, optimized build system
- **Styling**: Tailwind CSS 4.1.18 - Utility-first CSS framework
- **UI Components**: shadcn/ui 0.9.5 - Customizable component library
- **Icons**: Lucide React 0.563.0 - Beautiful icon set

### Backend Stack

- **Server**: Express.js - Node.js web framework
- **Port**: 3274 - Dedicated dashboard port
- **Data Access**: File system based (reads from ~/.superbot/)
- **API Format**: JSON REST API

## Build Process

### Prerequisites

```bash
# Node.js and npm must be installed
node --version    # Should be 16.x or higher
npm --version     # Should be 8.x or higher
```

### Building the Frontend

Navigate to the dashboard-ui directory and build:

```bash
cd ~/dev/superbot/dashboard-ui

# Install dependencies (if not already installed)
npm install

# Build for production
npm run build

# Output will be generated in: ~/dev/superbot/dashboard-ui/dist/
```

### How the Build Works

1. **Vite Build Process**
   - Vite bundles React components and dependencies
   - Minifies and optimizes assets for production
   - Generates static files in the `dist/` directory
   - Produces optimized JavaScript, CSS, and asset files

2. **Frontend Distribution**
   - The `dist/` folder contains production-ready files
   - Express server serves these static files from `/`
   - Files are pre-compressed and optimized for fast loading

3. **Starting the Server**
   ```bash
   # Navigate to the dashboard directory
   cd ~/dev/superbot/dashboard

   # Start the Express server
   node server.js

   # The dashboard will be available at: http://localhost:3274/
   ```

### Development vs Production

**Development Mode**:
```bash
cd ~/dev/superbot/dashboard-ui
npm run dev

# Vite dev server runs on port 5173
# Hot module replacement enabled for fast iteration
```

**Production Mode**:
```bash
# 1. Build the frontend
cd ~/dev/superbot/dashboard-ui
npm run build

# 2. Start the Express server
cd ~/dev/superbot/dashboard
node server.js

# Dashboard available at http://localhost:3274/
```

## API Integration Points

The dashboard communicates with the backend through REST API endpoints. All endpoints are documented in `/DASHBOARD_API.md`.

### Core Endpoints

#### Spaces Management
```
GET  /api/spaces              - List all spaces with statistics
GET  /api/spaces/:slug        - Get detailed space information
GET  /api/spaces/:slug/tasks  - Get all tasks for a space
GET  /api/spaces/:slug/docs   - List documentation files
GET  /api/spaces/:slug/docs/* - Get specific doc file content
GET  /api/spaces/:slug/overview - Get OVERVIEW.md for a space
```

#### System Context
```
GET  /api/identity            - Bot identity context
GET  /api/user                - User context
GET  /api/memory              - Persistent memory
GET  /api/heartbeat           - Heartbeat tasks
GET  /api/onboard             - Onboarding info
```

#### Utilities
```
GET  /api/daily               - List daily notes
GET  /api/daily/:date         - Get specific daily note
GET  /api/logs                - List available logs
GET  /api/logs/:name          - Get specific log content
GET  /api/config              - Configuration (with redacted secrets)
GET  /api/status              - System health status
GET  /api/skills              - Installed skills
GET  /api/tasks               - All tasks grouped by directory
GET  /api/schedule            - Scheduled jobs
GET  /api/sessions            - Session history
GET  /api/team                - Team configuration
GET  /api/inbox               - Message inboxes
GET  /api/inbox/:name         - Specific inbox messages
```

### Making API Calls

The frontend makes API calls from React components:

```javascript
// Example: Fetching spaces
const fetchSpaces = async () => {
  try {
    const response = await fetch('/api/spaces');
    const data = await response.json();
    setSpaces(data.spaces);
  } catch (error) {
    console.error('Error fetching spaces:', error);
  }
};
```

### Response Format

All API endpoints return JSON:

```json
{
  "spaces": [
    {
      "slug": "project-a",
      "name": "Project A",
      "status": "active",
      "description": "Main project",
      "taskCounts": {
        "pending": 5,
        "in_progress": 2,
        "completed": 15,
        "total": 22
      },
      "docCount": 8,
      "lastUpdated": "2024-02-10T15:30:00Z"
    }
  ]
}
```

## Features & Components

### App.jsx (Main Component)

The root component that:
- Manages overall app state
- Handles space data fetching
- Provides tab-based filtering (All, Active, Archived, Paused)
- Displays header with refresh button
- Renders space cards in a responsive grid

**Key Features**:
- Auto-refresh capability
- Status filters
- Responsive design (mobile, tablet, desktop)
- Loading states and error handling

### SpacesList.jsx

Component for:
- Displaying list of spaces
- Modal/expandable detail views
- Error handling
- Loading states

**Key Features**:
- Clickable space cards
- Modal detail view
- Full space properties display
- Responsive grid layout

### SpaceCard.jsx

Individual space display component featuring:
- Space name and slug
- Status badge (active, archived, paused)
- Task and documentation counts
- Last updated timestamp
- Action buttons

**Key Features**:
- Color-coded status indicators
- Time-relative "last updated" display
- Hover effects
- Compact, clean design

### UI Components (shadcn/ui)

Reusable components include:
- **Card**: Container for content grouping
- **Button**: Interactive elements
- **Badge**: Status indicators
- **Tabs**: Section navigation

## Adding New Spaces or Features

### Adding a New Space

Spaces are stored in `~/.superbot/spaces/`. Each space directory requires:

```
~/.superbot/spaces/my-new-space/
├── space.json          # Space metadata
├── OVERVIEW.md         # Space overview
├── tasks/
│   ├── task-1.json
│   └── task-2.json
└── docs/
    ├── guide.md
    └── api.md
```

**space.json format**:
```json
{
  "slug": "my-new-space",
  "name": "My New Space",
  "description": "Description of the space",
  "status": "active",
  "type": "project",
  "owner": "user-name"
}
```

### Adding a New Dashboard Component

1. Create component file in `/dashboard-ui/src/components/`
   ```bash
   touch ~/dev/superbot/dashboard-ui/src/components/MyComponent.jsx
   ```

2. Import required UI components and hooks
   ```javascript
   import { useState, useEffect } from 'react';
   import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
   ```

3. Fetch data from API endpoints
   ```javascript
   const fetchData = async () => {
     const response = await fetch('/api/spaces');
     const data = await response.json();
   };
   ```

4. Import and use in App.jsx
   ```javascript
   import MyComponent from './components/MyComponent';
   ```

5. Rebuild and test
   ```bash
   npm run build
   npm start
   ```

### Modifying the API

The Express server in `/dashboard/server.js` defines all API routes:

1. Add a new route
   ```javascript
   app.get('/api/new-endpoint', (req, res) => {
     // Fetch or process data
     res.json({ data: 'result' });
   });
   ```

2. Implement data access logic
   ```javascript
   const result = readFileOr(filePath);
   const json = readJsonOr(filePath, {});
   ```

3. Restart the server
   ```bash
   node server.js
   ```

## Styling & Theming

### Tailwind CSS

The dashboard uses Tailwind CSS for styling:

- **Color Scheme**: Slate grays with blue accents
- **Responsive**: Mobile-first, with breakpoints for tablet/desktop
- **Utilities**: Padding, margins, spacing, colors, etc.

**Example Status Colors**:
```
Active:   bg-green-500/100 (green)
Archived: bg-slate-400/100 (gray)
Paused:   bg-yellow-500/100 (yellow)
```

### Customizing Theme

1. Edit `~/dev/superbot/dashboard-ui/tailwind.config.js`
   ```javascript
   export default {
     theme: {
       extend: {
         colors: {
           // Add custom colors
         }
       }
     }
   }
   ```

2. Rebuild CSS
   ```bash
   npm run build
   ```

## Troubleshooting Guide

### Dashboard Not Loading

**Issue**: Browser shows blank page or 404 error

**Solutions**:
1. Check server is running
   ```bash
   curl http://localhost:3274/
   ```

2. Verify frontend was built
   ```bash
   ls -la ~/dev/superbot/dashboard-ui/dist/
   ```

3. Rebuild if needed
   ```bash
   cd ~/dev/superbot/dashboard-ui
   npm run build
   ```

4. Check server logs for errors
   ```bash
   # Server should output:
   # Superbot Dashboard running at http://localhost:3274/
   ```

### API Endpoints Returning Errors

**Issue**: 404 or 500 errors from API calls

**Solutions**:
1. Verify data files exist
   ```bash
   ls -la ~/.superbot/spaces/
   ```

2. Check endpoint path in console logs
   ```javascript
   console.log(response.status, response.statusText);
   ```

3. Verify Express server has correct paths
   ```bash
   # Check SUPERBOT_DIR and SPACES_DIR in server.js
   ```

### Styling Issues (Broken Layout)

**Issue**: Component layout looks wrong, missing styles

**Solutions**:
1. Clear Tailwind cache and rebuild
   ```bash
   rm -rf ~/dev/superbot/dashboard-ui/dist/
   npm run build
   ```

2. Verify Tailwind config is loaded
   ```bash
   cat ~/dev/superbot/dashboard-ui/tailwind.config.js
   ```

3. Restart server
   ```bash
   node server.js
   ```

### Component Not Rendering

**Issue**: Expected component doesn't appear on page

**Solutions**:
1. Check browser console for errors (F12)
   ```javascript
   // Look for red error messages
   ```

2. Verify component import path
   ```javascript
   // Check @ alias is configured in vite.config.js
   ```

3. Check component render conditions
   ```javascript
   // Verify loading states and conditionals
   ```

### Performance Issues

**Issue**: Dashboard loads slowly or is sluggish

**Solutions**:
1. Check API response times
   ```bash
   # Monitor network tab in browser DevTools
   ```

2. Optimize large datasets
   ```javascript
   // Add pagination or virtual scrolling for many spaces
   ```

3. Minify assets
   ```bash
   npm run build  # Automatically minifies for production
   ```

### Building Fails

**Issue**: `npm run build` produces errors

**Solutions**:
1. Clear node_modules and reinstall
   ```bash
   cd ~/dev/superbot/dashboard-ui
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Check Node version
   ```bash
   node --version  # Should be 16.x or higher
   ```

3. Look for syntax errors in source files
   ```bash
   npm run lint
   ```

## Deployment Checklist

### Pre-Deployment

- [ ] All components built and tested
- [ ] No console errors or warnings
- [ ] API endpoints responding correctly
- [ ] All data files present (~/.superbot/spaces/*)
- [ ] Configuration file exists (~/.superbot/config.json)

### Build Steps

```bash
# 1. Navigate to dashboard UI directory
cd ~/dev/superbot/dashboard-ui

# 2. Install dependencies
npm install

# 3. Run linter (optional)
npm run lint

# 4. Build for production
npm run build

# 5. Verify build output
ls -la dist/
```

### Deployment Steps

```bash
# 1. Navigate to dashboard server directory
cd ~/dev/superbot/dashboard

# 2. Start the server
node server.js

# 3. Verify dashboard is accessible
curl http://localhost:3274/

# 4. Open in browser
open http://localhost:3274/
```

### Post-Deployment

- [ ] Dashboard loads without errors
- [ ] All tabs and filters work
- [ ] Space cards display correctly
- [ ] API calls succeed
- [ ] Responsive design works on mobile

## Environment Variables

Environment variables can be set in `~/.superbot/config.json`:

```json
{
  "spacesDir": "~/.superbot/spaces",
  "defaultModel": "claude-opus-4",
  "slack": {
    "botToken": "xoxb-...",
    "appToken": "xapp-..."
  },
  "schedule": [],
  "heartbeat": {
    "intervalMinutes": 30
  }
}
```

**Server reads from**:
- `SUPERBOT_DIR` = `~/.superbot/`
- `SPACES_DIR` = `~/.superbot/spaces/`
- `PORT` = 3274 (hardcoded in server.js)

### Changing the Port

Edit `/dashboard/server.js`:

```javascript
const PORT = 3274;  // Change this value
```

Then restart the server.

## File Structure

```
~/dev/superbot/
├── dashboard/                 # Express backend
│   └── server.js             # Main server file
├── dashboard-ui/             # React frontend
│   ├── src/
│   │   ├── App.jsx          # Main app component
│   │   ├── components/
│   │   │   ├── SpacesList.jsx
│   │   │   ├── SpaceCard.jsx
│   │   │   └── ui/          # shadcn/ui components
│   │   ├── index.css        # Global styles
│   │   └── main.jsx         # React entry point
│   ├── dist/                # Built output (production)
│   ├── public/              # Static assets
│   ├── package.json
│   ├── vite.config.js       # Vite configuration
│   ├── tailwind.config.js   # Tailwind configuration
│   └── postcss.config.js    # PostCSS configuration
├── DASHBOARD_API.md         # API documentation
├── DASHBOARD_GUIDE.md       # This file
└── README.md                # Main project README
```

## Version History

**Current Version**: 1.0.0

- React 19.2.0
- Vite 7.3.1
- Tailwind CSS 4.1.18
- shadcn/ui 0.9.5
- Lucide React 0.563.0

## Additional Resources

- **API Documentation**: See `/DASHBOARD_API.md` for detailed endpoint documentation
- **Main README**: See `/README.md` for Superbot project overview
- **Vite Docs**: https://vite.dev/
- **React Docs**: https://react.dev/
- **Tailwind Docs**: https://tailwindcss.com/docs
- **shadcn/ui**: https://ui.shadcn.com/

## Support & Debugging

For issues or questions:

1. Check the troubleshooting guide above
2. Review console logs (F12 in browser)
3. Check server output in terminal
4. Verify data files exist in ~/.superbot/spaces/
5. Rebuild both frontend and restart server

## Contributing

To contribute improvements:

1. Create a new branch
2. Make changes to components or styles
3. Test thoroughly
4. Build and verify
5. Submit pull request
