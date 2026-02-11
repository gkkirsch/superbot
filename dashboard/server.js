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

const PORT = 3274;
const app = express();

// Path to Spaces React app build output
const SPACES_UI_DIST = path.join(PLUGIN_ROOT, 'spaces-ui', 'dist');

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

// Serve existing dashboard HTML at /
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

// Serve Spaces React app at /spaces and /spaces/*
if (fs.existsSync(SPACES_UI_DIST)) {
  app.use('/spaces', express.static(SPACES_UI_DIST, { redirect: false }));
  app.get('/spaces', (_req, res) => {
    res.sendFile(path.join(SPACES_UI_DIST, 'index.html'));
  });
  app.get('/spaces/{*path}', (_req, res) => {
    res.sendFile(path.join(SPACES_UI_DIST, 'index.html'));
  });
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

  res.json({
    fileChecks,
    dailyCount,
    activeSessions,
    totalSessions: (sessions.sessions || []).length,
    pendingTasks,
    totalUnread,
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
      .filter(e => e.isDirectory());
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
  res.json({ space, overview });
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

// ---------------------------------------------------------------------------
// Prompts API
// ---------------------------------------------------------------------------

app.get('/api/prompts', (_req, res) => {
  const prompts = [
    { id: 'team-lead', name: 'Team Lead (System)', file: path.join(PLUGIN_ROOT, 'templates', 'SYSTEM.md') },
    { id: 'worker', name: 'Worker', file: path.join(PLUGIN_ROOT, 'scripts', 'worker-prompt.md') },
    { id: 'space-worker', name: 'Space Worker', file: path.join(PLUGIN_ROOT, 'scripts', 'space-worker-prompt.md') },
    { id: 'triage', name: 'Triage (Heartbeat)', file: path.join(PLUGIN_ROOT, 'scripts', 'triage-prompt.md') },
    { id: 'observer', name: 'Daily Observer', file: path.join(PLUGIN_ROOT, 'scripts', 'observer-prompt.md') },
    { id: 'slack-worker', name: 'Slack Worker', file: path.join(PLUGIN_ROOT, 'scripts', 'slack-worker-prompt.md') },
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
    'space-worker': path.join(PLUGIN_ROOT, 'scripts', 'space-worker-prompt.md'),
    'triage': path.join(PLUGIN_ROOT, 'scripts', 'triage-prompt.md'),
    'observer': path.join(PLUGIN_ROOT, 'scripts', 'observer-prompt.md'),
    'slack-worker': path.join(PLUGIN_ROOT, 'scripts', 'slack-worker-prompt.md'),
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
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Superbot Dashboard running at http://localhost:${PORT}`);
  console.log(`  Dashboard:  http://localhost:${PORT}/`);
  console.log(`  Spaces UI:  http://localhost:${PORT}/spaces`);
});
