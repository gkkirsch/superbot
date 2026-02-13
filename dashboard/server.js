#!/usr/bin/env node

const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths (matches slack-bot.js patterns)
const SUPERBOT_DIR = path.join(os.homedir(), '.superbot');
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(os.homedir(), '.superbot', 'config.json');
const TEAM_DIR = path.join(os.homedir(), '.claude', 'teams', 'superbot');
const SKILLS_DIR = path.join(os.homedir(), '.claude', 'skills');
const TASKS_DIR = path.join(os.homedir(), '.claude', 'tasks');
const SPACES_DIR = path.join(os.homedir(), '.superbot', 'spaces');
// Decisions now live per-space in ~/.superbot/spaces/<slug>/decisions.json

const PORT = 3274;
const app = express();

app.use(express.json());

// Path to Dashboard React app build output
const DASHBOARD_UI_DIST = path.join(PLUGIN_ROOT, 'dashboard-ui', 'dist');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readFileOr(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return { content: fs.readFileSync(filePath, 'utf8'), exists: true };
    }
  } catch (_) {}
  return { content: '', exists: false };
}

function readJsonOr(filePath, fallback) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }
  } catch (_) {}
  return fallback;
}

function tailLines(content, n) {
  const lines = content.split('\n');
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}

function redactTokens(obj) {
  if (typeof obj === 'string') {
    // Redact anything that looks like a token (xoxb-, xapp-, sk-, etc.)
    return obj.replace(/\b(xoxb-|xapp-|xoxp-|sk-|ghp_|ghu_)\S+/g, '***');
  }
  if (Array.isArray(obj)) return obj.map(redactTokens);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, val] of Object.entries(obj)) {
      if (/token|secret|key|password/i.test(key) && typeof val === 'string') {
        result[key] = '***';
      } else {
        result[key] = redactTokens(val);
      }
    }
    return result;
  }
  return obj;
}

function sanitizeSlug(slug) {
  return slug.replace(/[^a-zA-Z0-9_-]/g, '');
}

// ---------------------------------------------------------------------------
// Decisions helpers (per-space storage)
// ---------------------------------------------------------------------------

function getSpaceDecisionsPath(slug) {
  return path.join(SPACES_DIR, slug, 'decisions.json');
}

function readSpaceDecisions(slug) {
  return readJsonOr(getSpaceDecisionsPath(slug), []).map(d => ({ ...d, space: slug }));
}

function readAllDecisions() {
  if (!fs.existsSync(SPACES_DIR)) return [];
  const dirs = fs.readdirSync(SPACES_DIR, { withFileTypes: true })
    .filter(e => e.isDirectory() && fs.existsSync(path.join(SPACES_DIR, e.name, 'space.json')));
  const all = [];
  for (const d of dirs) {
    all.push(...readSpaceDecisions(d.name));
  }
  // Sort by createdAt descending (newest first)
  all.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  return all;
}

function writeSpaceDecisions(slug, decisions) {
  // Strip the space field before writing (it's inferred from the directory)
  const cleaned = decisions.map(({ space, ...rest }) => rest);
  fs.writeFileSync(getSpaceDecisionsPath(slug), JSON.stringify(cleaned, null, 2));
}

// Recursively count .md files in a directory
function countDocsRecursive(dir) {
  let count = 0;
  try {
    if (!fs.existsSync(dir)) return 0;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        count += countDocsRecursive(full);
      } else if (entry.name.endsWith('.md')) {
        count++;
      }
    }
  } catch (_) {}
  return count;
}

// Recursively list .md files in a directory with metadata
function listDocsRecursive(dir, baseDir) {
  let docs = [];
  try {
    if (!fs.existsSync(dir)) return docs;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        docs = docs.concat(listDocsRecursive(full, baseDir));
      } else if (entry.name.endsWith('.md')) {
        const stat = fs.statSync(full);
        docs.push({
          name: entry.name,
          relativePath: path.relative(baseDir, full),
          size: stat.size,
          modified: stat.mtime.toISOString(),
        });
      }
    }
  } catch (_) {}
  return docs;
}

// Find the latest mtime across all files in a directory (recursive)
function latestMtime(dir) {
  let latest = null;
  try {
    if (!fs.existsSync(dir)) return latest;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        const sub = latestMtime(full);
        if (sub && (!latest || sub > latest)) latest = sub;
      } else {
        const stat = fs.statSync(full);
        if (!latest || stat.mtime > latest) latest = stat.mtime;
      }
    }
  } catch (_) {}
  return latest;
}

// Allowlisted log file names
const ALLOWED_LOGS = ['heartbeat.log', 'slack-bot.log', 'scheduler.log', 'observer.log', 'worker.log'];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Serve React app at root
if (fs.existsSync(DASHBOARD_UI_DIST)) {
  app.use(express.static(DASHBOARD_UI_DIST, { redirect: false }));
}

// Context files
app.get('/api/identity', (_req, res) => res.json(readFileOr(path.join(SUPERBOT_DIR, 'IDENTITY.md'))));
app.get('/api/user', (_req, res) => res.json(readFileOr(path.join(SUPERBOT_DIR, 'USER.md'))));
app.get('/api/memory', (_req, res) => res.json(readFileOr(path.join(SUPERBOT_DIR, 'MEMORY.md'))));
app.get('/api/heartbeat', (_req, res) => res.json(readFileOr(path.join(SUPERBOT_DIR, 'HEARTBEAT.md'))));
app.get('/api/onboard', (_req, res) => res.json(readFileOr(path.join(SUPERBOT_DIR, 'ONBOARD.md'))));

// Daily notes
app.get('/api/daily', (_req, res) => {
  const dailyDir = path.join(SUPERBOT_DIR, 'daily');
  try {
    if (!fs.existsSync(dailyDir)) return res.json({ files: [] });
    const files = fs.readdirSync(dailyDir)
      .filter(f => f.endsWith('.md'))
      .sort()
      .reverse()
      .map(f => ({
        date: f.replace('.md', ''),
        filename: f,
        size: fs.statSync(path.join(dailyDir, f)).size,
      }));
    res.json({ files });
  } catch (_) {
    res.json({ files: [] });
  }
});

app.get('/api/daily/:date', (req, res) => {
  const date = req.params.date.replace(/[^0-9-]/g, '');
  res.json(readFileOr(path.join(SUPERBOT_DIR, 'daily', `${date}.md`)));
});

// Sessions
app.get('/api/sessions', (_req, res) => {
  res.json(readJsonOr(path.join(SUPERBOT_DIR, 'sessions.json'), { sessions: [] }));
});

// Team config
app.get('/api/team', (_req, res) => {
  res.json(readJsonOr(path.join(TEAM_DIR, 'config.json'), { members: [] }));
});

// Inboxes
app.get('/api/inbox', (_req, res) => {
  const inboxDir = path.join(TEAM_DIR, 'inboxes');
  try {
    if (!fs.existsSync(inboxDir)) return res.json({ inboxes: [] });
    const files = fs.readdirSync(inboxDir).filter(f => f.endsWith('.json'));
    const inboxes = files.map(f => {
      const messages = readJsonOr(path.join(inboxDir, f), []);
      const arr = Array.isArray(messages) ? messages : [];
      return {
        name: f.replace('.json', ''),
        total: arr.length,
        unread: arr.filter(m => !m.read).length,
      };
    });
    res.json({ inboxes });
  } catch (_) {
    res.json({ inboxes: [] });
  }
});

app.get('/api/inbox/:name', (req, res) => {
  const name = req.params.name.replace(/[^a-zA-Z0-9_-]/g, '');
  const messages = readJsonOr(path.join(TEAM_DIR, 'inboxes', `${name}.json`), []);
  res.json({ name, messages: Array.isArray(messages) ? messages : [] });
});

// Logs
app.get('/api/logs', (_req, res) => {
  const logs = ALLOWED_LOGS.map(name => {
    const { content, exists } = readFileOr(path.join(SUPERBOT_DIR, 'logs', name));
    return {
      name,
      exists,
      lines: exists ? tailLines(content, 50) : '',
    };
  }).filter(l => l.exists);
  res.json({ logs });
});

app.get('/api/logs/:name', (req, res) => {
  const name = req.params.name;
  if (!ALLOWED_LOGS.includes(name)) {
    return res.status(403).json({ error: 'Log file not allowed' });
  }
  const { content, exists } = readFileOr(path.join(SUPERBOT_DIR, 'logs', name));
  res.json({ name, exists, lines: exists ? tailLines(content, 100) : '' });
});

// Config (redacted)
app.get('/api/config', (_req, res) => {
  const config = readJsonOr(CONFIG_PATH, {});
  res.json(redactTokens(config));
});

// Skills
app.get('/api/skills', (_req, res) => {
  try {
    if (!fs.existsSync(SKILLS_DIR)) return res.json({ skills: [] });
    const entries = fs.readdirSync(SKILLS_DIR, { withFileTypes: true });
    const skills = entries
      .filter(e => e.isDirectory() || e.isSymbolicLink())
      .map(e => {
        const fullPath = path.join(SKILLS_DIR, e.name);
        let isSymlink = false;
        let target = null;
        try {
          const stat = fs.lstatSync(fullPath);
          isSymlink = stat.isSymbolicLink();
          if (isSymlink) target = fs.readlinkSync(fullPath);
        } catch (_) {}
        return { name: e.name, isSymlink, target };
      });
    res.json({ skills });
  } catch (_) {
    res.json({ skills: [] });
  }
});

// Tasks
app.get('/api/tasks', (_req, res) => {
  try {
    if (!fs.existsSync(TASKS_DIR)) return res.json({ groups: [] });
    const dirs = fs.readdirSync(TASKS_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory());
    const groups = dirs.map(d => {
      const groupDir = path.join(TASKS_DIR, d.name);
      const files = fs.readdirSync(groupDir).filter(f => f.endsWith('.json'));
      const tasks = files.map(f => readJsonOr(path.join(groupDir, f), {}));
      return { name: d.name, tasks };
    });
    res.json({ groups });
  } catch (_) {
    res.json({ groups: [] });
  }
});

// Schedule
app.get('/api/schedule', (_req, res) => {
  const config = readJsonOr(CONFIG_PATH, {});
  const schedule = config.schedule || [];
  const lastRun = readJsonOr(path.join(SUPERBOT_DIR, 'schedule-last-run.json'), null);
  res.json({ schedule, lastRun });
});

// Aggregated status
app.get('/api/status', (_req, res) => {
  const files = ['IDENTITY.md', 'USER.md', 'MEMORY.md', 'HEARTBEAT.md', 'ONBOARD.md'];
  const fileChecks = files.map(f => {
    const filePath = path.join(SUPERBOT_DIR, f);
    const exists = fs.existsSync(filePath);
    let lines = 0;
    if (exists) {
      try {
        lines = fs.readFileSync(filePath, 'utf8').split('\n').length;
      } catch (_) {}
    }
    return { name: f, exists, lines };
  });

  // Daily notes count
  const dailyDir = path.join(SUPERBOT_DIR, 'daily');
  let dailyCount = 0;
  try {
    if (fs.existsSync(dailyDir)) {
      dailyCount = fs.readdirSync(dailyDir).filter(f => f.endsWith('.md')).length;
    }
  } catch (_) {}

  // Sessions
  const sessions = readJsonOr(path.join(SUPERBOT_DIR, 'sessions.json'), { sessions: [] });
  const activeSessions = (sessions.sessions || []).filter(s => s.status === 'active').length;

  // Pending heartbeat tasks
  const hb = readFileOr(path.join(SUPERBOT_DIR, 'HEARTBEAT.md'));
  const pendingTasks = (hb.content.match(/^- \[ \]/gm) || []).length;

  // Inbox unread
  const inboxDir = path.join(TEAM_DIR, 'inboxes');
  let totalUnread = 0;
  try {
    if (fs.existsSync(inboxDir)) {
      for (const f of fs.readdirSync(inboxDir).filter(f => f.endsWith('.json'))) {
        const msgs = readJsonOr(path.join(inboxDir, f), []);
        if (Array.isArray(msgs)) totalUnread += msgs.filter(m => !m.read).length;
      }
    }
  } catch (_) {}

  // Launchd
  let launchdRunning = false;
  try {
    const { execSync } = require('child_process');
    const out = execSync('launchctl list 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
    launchdRunning = out.includes('com.claude.superbot-heartbeat');
  } catch (_) {}

  // Pending decisions (aggregated from all spaces)
  const allDecisions = readAllDecisions();
  const pendingDecisions = allDecisions.filter(d => d.status === 'pending').length;

  res.json({
    fileChecks,
    dailyCount,
    activeSessions,
    totalSessions: (sessions.sessions || []).length,
    pendingTasks,
    totalUnread,
    pendingDecisions,
    launchdRunning,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Spaces
// ---------------------------------------------------------------------------

// 1. List all spaces with summary stats
app.get('/api/spaces', (_req, res) => {
  try {
    if (!fs.existsSync(SPACES_DIR)) return res.json({ spaces: [] });
    const dirs = fs.readdirSync(SPACES_DIR, { withFileTypes: true })
      .filter(e => e.isDirectory() && fs.existsSync(path.join(SPACES_DIR, e.name, 'space.json')));
    const spaces = dirs.map(d => {
      const spaceDir = path.join(SPACES_DIR, d.name);
      const spaceJson = readJsonOr(path.join(spaceDir, 'space.json'), {});

      // Count tasks by status
      const tasksDir = path.join(spaceDir, 'tasks');
      const taskCounts = { pending: 0, in_progress: 0, completed: 0, total: 0 };
      try {
        if (fs.existsSync(tasksDir)) {
          const taskFiles = fs.readdirSync(tasksDir)
            .filter(f => f.endsWith('.json') && f !== '.highwatermark');
          for (const f of taskFiles) {
            const task = readJsonOr(path.join(tasksDir, f), {});
            taskCounts.total++;
            if (task.status === 'pending') taskCounts.pending++;
            else if (task.status === 'in_progress') taskCounts.in_progress++;
            else if (task.status === 'completed') taskCounts.completed++;
          }
        }
      } catch (_) {}

      // Count docs recursively
      const docsDir = path.join(spaceDir, 'docs');
      const docCount = countDocsRecursive(docsDir);

      // Find latest mtime across the entire space directory
      const lastMtime = latestMtime(spaceDir);
      const lastUpdated = lastMtime ? lastMtime.toISOString() : null;

      return { ...spaceJson, taskCounts, docCount, lastUpdated };
    });
    res.json({ spaces });
  } catch (_) {
    res.json({ spaces: [] });
  }
});

// 2. Full space detail
app.get('/api/spaces/:slug', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  const spaceDir = path.join(SPACES_DIR, slug);
  if (!fs.existsSync(spaceDir)) {
    return res.status(404).json({ error: 'Space not found' });
  }
  const space = readJsonOr(path.join(spaceDir, 'space.json'), {});
  const overview = readFileOr(path.join(spaceDir, 'OVERVIEW.md'));
  const hasDashboard = fs.existsSync(path.join(spaceDir, 'dashboard.jsx'));
  const hasApp = fs.existsSync(path.join(spaceDir, 'app'));
  res.json({ space, overview, hasDashboard, hasApp });
});

// 3. All tasks for a space
app.get('/api/spaces/:slug/tasks', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  const tasksDir = path.join(SPACES_DIR, slug, 'tasks');
  try {
    if (!fs.existsSync(tasksDir)) return res.json({ tasks: [] });
    const files = fs.readdirSync(tasksDir)
      .filter(f => f.endsWith('.json') && f !== '.highwatermark');
    const priorityRank = { critical: 0, high: 1, medium: 2, low: 3 };
    const tasks = files
      .map(f => readJsonOr(path.join(tasksDir, f), {}))
      .sort((a, b) => {
        const pa = priorityRank[a.priority] ?? 4;
        const pb = priorityRank[b.priority] ?? 4;
        if (pa !== pb) return pa - pb;
        return (a.id || 0) - (b.id || 0);
      });
    res.json({ tasks });
  } catch (_) {
    res.json({ tasks: [] });
  }
});

// 4. List all doc files for a space
app.get('/api/spaces/:slug/docs', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  const docsDir = path.join(SPACES_DIR, slug, 'docs');
  const docs = listDocsRecursive(docsDir, docsDir);
  res.json({ docs });
});

// 5. Content of a specific doc
app.get(/^\/api\/spaces\/([^/]+)\/docs\/(.+)$/, (req, res) => {
  const slug = sanitizeSlug(req.params[0]);
  const slugParam = req.params[0];
  if (!slug || slug !== slugParam) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  const relativePath = req.params[1];
  if (!relativePath || relativePath.includes('..')) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const docsDir = path.join(SPACES_DIR, slug, 'docs');
  const fullPath = path.join(docsDir, relativePath);
  // Ensure resolved path stays within docsDir
  if (!path.resolve(fullPath).startsWith(path.resolve(docsDir))) {
    return res.status(400).json({ error: 'Invalid path' });
  }
  const result = readFileOr(fullPath);
  res.json({ content: result.content, exists: result.exists, path: relativePath });
});

// 6. Shortcut for OVERVIEW.md
app.get('/api/spaces/:slug/overview', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  res.json(readFileOr(path.join(SPACES_DIR, slug, 'OVERVIEW.md')));
});

// 7. Compile and serve space dashboard.jsx
app.get('/api/spaces/:slug/dashboard', async (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  const dashboardPath = path.join(SPACES_DIR, slug, 'dashboard.jsx');
  if (!fs.existsSync(dashboardPath)) {
    return res.status(404).json({ error: 'No dashboard.jsx found' });
  }
  try {
    const esbuild = require('esbuild');
    const source = fs.readFileSync(dashboardPath, 'utf8');
    const result = await esbuild.transform(source, {
      loader: 'jsx',
      format: 'esm',
      target: 'es2020',
    });
    res.set('Content-Type', 'application/javascript');
    res.send(result.code);
  } catch (err) {
    res.status(500).json({ error: 'Compilation failed', detail: err.message });
  }
});

// 8. Serve space app/ static files
app.get('/spaces/:slug/app/*rest', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).send('Invalid slug');
  }
  const appDir = path.join(SPACES_DIR, slug, 'app');
  if (!fs.existsSync(appDir)) {
    return res.status(404).send('No app directory');
  }
  const filePath = req.params.rest || 'index.html';
  if (filePath.includes('..')) {
    return res.status(400).send('Invalid path');
  }
  const fullPath = path.join(appDir, filePath);
  if (!path.resolve(fullPath).startsWith(path.resolve(appDir))) {
    return res.status(400).send('Invalid path');
  }
  if (fs.existsSync(fullPath)) {
    res.sendFile(fullPath);
  } else {
    res.status(404).send('Not found');
  }
});

// ---------------------------------------------------------------------------
// Prompts API
// ---------------------------------------------------------------------------

app.get('/api/prompts', (_req, res) => {
  const prompts = [
    { id: 'team-lead', name: 'Orchestrator (System)', file: path.join(PLUGIN_ROOT, 'templates', 'SYSTEM.md') },
    { id: 'worker', name: 'Worker', file: path.join(PLUGIN_ROOT, 'scripts', 'worker-prompt.md') },
    { id: 'triage', name: 'Triage (Heartbeat)', file: path.join(PLUGIN_ROOT, 'scripts', 'triage-prompt.md') },
    { id: 'observer', name: 'Daily Observer', file: path.join(PLUGIN_ROOT, 'scripts', 'observer-prompt.md') },
  ];

  const result = prompts.map((p) => {
    const data = readFileOr(p.file);
    return {
      id: p.id,
      name: p.name,
      exists: data.exists,
      size: data.exists ? Buffer.byteLength(data.content, 'utf8') : 0,
      lines: data.exists ? data.content.split('\n').length : 0,
    };
  });

  res.json({ prompts: result });
});

app.get('/api/prompts/:id', (req, res) => {
  const promptMap = {
    'team-lead': path.join(PLUGIN_ROOT, 'templates', 'SYSTEM.md'),
    'worker': path.join(PLUGIN_ROOT, 'scripts', 'worker-prompt.md'),
    'triage': path.join(PLUGIN_ROOT, 'scripts', 'triage-prompt.md'),
    'observer': path.join(PLUGIN_ROOT, 'scripts', 'observer-prompt.md'),
  };

  const filePath = promptMap[req.params.id];
  if (!filePath) {
    return res.status(404).json({ error: 'Prompt not found' });
  }

  const data = readFileOr(filePath);
  res.json({ id: req.params.id, ...data });
});

// ---------------------------------------------------------------------------
// Docs API (extract main content from static HTML docs)
// ---------------------------------------------------------------------------

const DOCS_DIR = path.join(PLUGIN_ROOT, 'docs');

const docsPages = [
  { slug: 'getting-started', file: 'getting-started.html', title: 'Getting Started' },
  { slug: 'commands', file: 'commands.html', title: 'Commands' },
  { slug: 'memory', file: 'memory.html', title: 'Memory' },
  { slug: 'heartbeat', file: 'heartbeat.html', title: 'Heartbeat' },
  { slug: 'scheduler', file: 'scheduler.html', title: 'Scheduler' },
  { slug: 'slack', file: 'slack.html', title: 'Slack' },
  { slug: 'skills', file: 'skills.html', title: 'Skills' },
  { slug: 'architecture', file: 'architecture.html', title: 'Architecture' },
  { slug: 'prompt', file: 'prompt.html', title: 'System Prompt' },
  { slug: 'files', file: 'files.html', title: 'File Reference' },
];

app.get('/api/docs/:slug', (req, res) => {
  const page = docsPages.find((p) => p.slug === req.params.slug);
  if (!page) {
    return res.status(404).json({ content: '', exists: false });
  }

  const filePath = path.join(DOCS_DIR, page.file);
  if (!fs.existsSync(filePath)) {
    return res.json({ content: '', exists: false });
  }

  const html = fs.readFileSync(filePath, 'utf8');

  // Extract content between <main> tags
  const mainMatch = html.match(/<main[^>]*>([\s\S]*?)<\/main>/i);
  if (mainMatch) {
    res.json({ content: mainMatch[1].trim(), exists: true });
  } else {
    // Fallback: extract body content
    const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    res.json({ content: bodyMatch ? bodyMatch[1].trim() : '', exists: !!bodyMatch });
  }
});

// ---------------------------------------------------------------------------
// Health / Dashboard API
// ---------------------------------------------------------------------------

app.get('/api/health', (_req, res) => {
  const { execSync } = require('child_process');
  const checks = [];

  // Heartbeat daemon
  try {
    const out = execSync('launchctl list 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
    checks.push({
      name: 'Heartbeat',
      description: 'Background heartbeat cron',
      status: out.includes('com.claude.superbot-heartbeat') ? 'healthy' : 'stopped',
      detail: out.includes('com.claude.superbot-heartbeat') ? 'LaunchAgent running' : 'LaunchAgent not loaded',
    });
  } catch (_) {
    checks.push({ name: 'Heartbeat', description: 'Background heartbeat cron', status: 'unknown', detail: 'Could not check launchctl' });
  }

  // Scheduler daemon
  try {
    const out = execSync('launchctl list 2>/dev/null', { encoding: 'utf8', timeout: 3000 });
    checks.push({
      name: 'Scheduler',
      description: 'Time-based job scheduler',
      status: out.includes('com.claude.superbot-scheduler') ? 'healthy' : 'stopped',
      detail: out.includes('com.claude.superbot-scheduler') ? 'LaunchAgent running' : 'LaunchAgent not loaded',
    });
  } catch (_) {
    checks.push({ name: 'Scheduler', description: 'Time-based job scheduler', status: 'unknown', detail: 'Could not check launchctl' });
  }

  // Slack bot
  try {
    const out = execSync('pgrep -f "slack-bot.js" 2>/dev/null || true', { encoding: 'utf8', timeout: 3000 });
    checks.push({
      name: 'Slack Bot',
      description: 'Slack message listener',
      status: out.trim() ? 'healthy' : 'stopped',
      detail: out.trim() ? `PID ${out.trim().split('\\n')[0]}` : 'Process not found',
    });
  } catch (_) {
    checks.push({ name: 'Slack Bot', description: 'Slack message listener', status: 'unknown', detail: 'Could not check process' });
  }

  // Dashboard server (this is us — always healthy if we're responding)
  checks.push({
    name: 'Dashboard',
    description: `Express server on port ${PORT}`,
    status: 'healthy',
    detail: `Running (PID ${process.pid})`,
  });

  // Active workers/sessions
  const sessions = readJsonOr(path.join(SUPERBOT_DIR, 'sessions.json'), { sessions: [] });
  const activeSessions = (sessions.sessions || []).filter(s => s.status === 'active');
  checks.push({
    name: 'Workers',
    description: 'Active agent sessions',
    status: activeSessions.length > 0 ? 'healthy' : 'idle',
    detail: `${activeSessions.length} active session${activeSessions.length !== 1 ? 's' : ''}`,
    sessions: activeSessions.map(s => ({ name: s.name, space: s.space || null })),
  });

  // Context files
  const contextFiles = ['IDENTITY.md', 'USER.md', 'MEMORY.md', 'HEARTBEAT.md'];
  const missing = contextFiles.filter(f => !fs.existsSync(path.join(SUPERBOT_DIR, f)));
  checks.push({
    name: 'Context Files',
    description: 'Core identity and memory files',
    status: missing.length === 0 ? 'healthy' : 'warning',
    detail: missing.length === 0 ? `All ${contextFiles.length} files present` : `Missing: ${missing.join(', ')}`,
  });

  // Spaces
  let spaceCount = 0;
  try {
    if (fs.existsSync(SPACES_DIR)) {
      spaceCount = fs.readdirSync(SPACES_DIR, { withFileTypes: true }).filter(e => e.isDirectory()).length;
    }
  } catch (_) {}
  checks.push({
    name: 'Spaces',
    description: 'Active project spaces',
    status: spaceCount > 0 ? 'healthy' : 'idle',
    detail: `${spaceCount} space${spaceCount !== 1 ? 's' : ''}`,
  });

  // Heartbeat items
  const hb = readFileOr(path.join(SUPERBOT_DIR, 'HEARTBEAT.md'));
  const pendingItems = (hb.content.match(/^- \[ \]/gm) || []).length;
  const recurringChecks = (hb.content.match(/^- Check /gm) || []).length + (hb.content.match(/^- Scan /gm) || []).length + (hb.content.match(/^- Remind /gm) || []).length;
  checks.push({
    name: 'Heartbeat Queue',
    description: 'Pending work items and recurring checks',
    status: pendingItems > 0 ? 'active' : 'idle',
    detail: `${pendingItems} pending item${pendingItems !== 1 ? 's' : ''}, ${recurringChecks} recurring check${recurringChecks !== 1 ? 's' : ''}`,
  });

  const healthy = checks.filter(c => c.status === 'healthy').length;
  const total = checks.length;

  res.json({
    overall: healthy >= total - 2 ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
  });
});

// ---------------------------------------------------------------------------
// Decisions API
// ---------------------------------------------------------------------------

// List all decisions (aggregated from all spaces)
app.get('/api/decisions', (req, res) => {
  const all = readAllDecisions();
  const status = req.query.status;
  const space = req.query.space;
  let filtered = all;
  if (status) filtered = filtered.filter(d => d.status === status);
  if (space) filtered = filtered.filter(d => d.space === space);
  res.json({ decisions: filtered });
});

// List decisions for a specific space
app.get('/api/spaces/:slug/decisions', (req, res) => {
  const slug = sanitizeSlug(req.params.slug);
  if (!slug || slug !== req.params.slug) {
    return res.status(400).json({ error: 'Invalid slug' });
  }
  const decisions = readSpaceDecisions(slug);
  const status = req.query.status;
  const filtered = status ? decisions.filter(d => d.status === status) : decisions;
  res.json({ decisions: filtered });
});

// Create a decision in a space
app.post('/api/decisions', (req, res) => {
  const { question, context, space, suggestedAnswers } = req.body;
  if (!question) {
    return res.status(400).json({ error: 'question is required' });
  }
  if (!space) {
    return res.status(400).json({ error: 'space is required' });
  }
  const slug = sanitizeSlug(space);
  if (!slug || !fs.existsSync(path.join(SPACES_DIR, slug, 'space.json'))) {
    return res.status(400).json({ error: `space '${space}' not found` });
  }

  const decisions = readJsonOr(getSpaceDecisionsPath(slug), []);
  const maxId = decisions.reduce((max, d) => Math.max(max, d.id || 0), 0);
  const decision = {
    id: maxId + 1,
    question,
    context: context || '',
    suggestedAnswers: suggestedAnswers || [],
    status: 'pending',
    resolution: null,
    createdAt: new Date().toISOString(),
    resolvedAt: null,
  };
  decisions.push(decision);
  writeSpaceDecisions(slug, decisions);
  res.status(201).json({ ...decision, space: slug });
});

// Resolve a decision (search across all spaces)
app.patch('/api/decisions/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  const targetSpace = req.body.space; // optional hint

  // Find which space has this decision
  const spaceSlugs = targetSpace
    ? [sanitizeSlug(targetSpace)]
    : fs.readdirSync(SPACES_DIR, { withFileTypes: true })
        .filter(e => e.isDirectory() && fs.existsSync(path.join(SPACES_DIR, e.name, 'space.json')))
        .map(e => e.name);

  for (const slug of spaceSlugs) {
    const decisions = readJsonOr(getSpaceDecisionsPath(slug), []);
    const idx = decisions.findIndex(d => d.id === id);
    if (idx !== -1) {
      const { status, resolution } = req.body;
      if (status) decisions[idx].status = status;
      if (resolution !== undefined) decisions[idx].resolution = resolution;
      if (status === 'resolved') {
        decisions[idx].resolvedAt = new Date().toISOString();
      }
      writeSpaceDecisions(slug, decisions);
      return res.json({ ...decisions[idx], space: slug });
    }
  }
  res.status(404).json({ error: 'Decision not found' });
});

// ---------------------------------------------------------------------------
// SPA Catch-all (must be LAST)
// ---------------------------------------------------------------------------

if (fs.existsSync(DASHBOARD_UI_DIST)) {
  app.get('{*path}', (_req, res) => {
    res.sendFile(path.join(DASHBOARD_UI_DIST, 'index.html'));
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Superbot Dashboard running at http://localhost:${PORT}`);
});
