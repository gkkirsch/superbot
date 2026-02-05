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

const PORT = 3274;
const app = express();

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

// Allowlisted log file names
const ALLOWED_LOGS = ['heartbeat.log', 'slack-bot.log', 'scheduler.log', 'observer.log', 'worker.log'];

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Serve dashboard HTML
app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'dashboard.html'));
});

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
// Start
// ---------------------------------------------------------------------------

app.listen(PORT, () => {
  console.log(`Superbot Dashboard running at http://localhost:${PORT}`);
});
