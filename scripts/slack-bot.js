#!/usr/bin/env node

const { App } = require('@slack/bolt');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Paths
const SUPERBOT_DIR = path.join(os.homedir(), '.superbot');
const PLUGIN_ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(os.homedir(), '.superbot', 'config.json');
const LOG_PATH = path.join(SUPERBOT_DIR, 'logs', 'slack-bot.log');
const TEAM_DIR = path.join(os.homedir(), '.claude', 'teams', 'superbot');
const SUPERBOT_INBOX = path.join(TEAM_DIR, 'inboxes', 'team-lead.json');

// ---------------------------------------------------------------------------
// Logging
// ---------------------------------------------------------------------------

function log(msg) {
  const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
  const line = `${ts} - ${msg}`;
  console.log(line);
  try {
    fs.appendFileSync(LOG_PATH, line + '\n');
  } catch (_) {
    // best-effort
  }
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    console.error('Run setup to create config.json.');
    process.exit(1);
  }
  const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
  const config = JSON.parse(raw);
  if (!config.slack || !config.slack.botToken || !config.slack.appToken) {
    console.error('config.json must contain slack.botToken and slack.appToken');
    process.exit(1);
  }
  return config;
}

// ---------------------------------------------------------------------------
// Write to orchestrator inbox — all message types flow here
// ---------------------------------------------------------------------------

function writeToOrchestrator(displayName, text, channel, ts, threadTs) {
  try {
    let inbox = [];
    if (fs.existsSync(SUPERBOT_INBOX)) {
      inbox = JSON.parse(fs.readFileSync(SUPERBOT_INBOX, 'utf8'));
      if (!Array.isArray(inbox)) inbox = [];
    }

    const channelReply = `bash ${PLUGIN_ROOT}/scripts/slack-send.sh ${channel} "<your reply>"`;
    const startThread = `bash ${PLUGIN_ROOT}/scripts/slack-send.sh ${channel} "<your reply>" ${ts}`;

    const parts = [
      `[Slack] ${displayName}: ${text}`,
      '',
      `Channel: ${channel}`,
      `Timestamp: ${ts}`,
      `Thread: ${threadTs || 'none (top-level)'}`,
      '',
    ];

    if (threadTs) {
      parts.push(`Reply in thread: ${startThread}`);
      parts.push(`Reply in channel: ${channelReply}`);
    } else {
      parts.push(`Reply (default): ${channelReply}`);
      parts.push(`Start thread (only for spawning a teammate): ${startThread}`);
    }

    inbox.push({
      from: 'slack',
      text: parts.join('\n'),
      summary: `Slack from ${displayName}: ${text.slice(0, 60)}`,
      timestamp: new Date().toISOString(),
      read: false,
    });

    fs.writeFileSync(SUPERBOT_INBOX, JSON.stringify(inbox, null, 2));
    log(`Wrote to orchestrator inbox: ${displayName}: ${text.slice(0, 80)}`);
  } catch (err) {
    log(`Failed to write to orchestrator inbox: ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const config = loadConfig();

  const app = new App({
    token: config.slack.botToken,
    appToken: config.slack.appToken,
    socketMode: true,
  });

  // User display name cache
  const userNames = new Map();

  async function getDisplayName(userId) {
    if (userNames.has(userId)) return userNames.get(userId);
    try {
      const result = await app.client.users.info({ token: config.slack.botToken, user: userId });
      const name = result.user.profile.display_name || result.user.real_name || userId;
      userNames.set(userId, name);
      return name;
    } catch (err) {
      log(`Could not resolve user ${userId}: ${err.message}`);
      userNames.set(userId, userId);
      return userId;
    }
  }

  // Get bot user ID to strip mentions
  let botUserId = null;
  try {
    const auth = await app.client.auth.test({ token: config.slack.botToken });
    botUserId = auth.user_id;
    log(`Bot user ID: ${botUserId}`);
  } catch (err) {
    log(`Warning: could not get bot user ID: ${err.message}`);
  }

  // Helper: strip bot mention from text
  function stripMention(text) {
    if (!botUserId) return text;
    return text.replace(new RegExp(`<@${botUserId}>\\s*`, 'g'), '').trim();
  }

  // Helper: react with eyes emoji to acknowledge receipt
  async function ack(channel, ts) {
    try {
      await app.client.reactions.add({ token: config.slack.botToken, channel, name: 'eyes', timestamp: ts });
    } catch (_) {
      // best-effort — may fail if already reacted
    }
  }

  // Message listener — handles DMs and thread replies in channels
  // Skip @mentions here since app_mention handler covers those
  app.event('message', async ({ event }) => {
    if (event.subtype) return;
    if (event.bot_id) return;
    if (!event.text) return;
    if (botUserId && event.text.includes(`<@${botUserId}>`)) return;

    await ack(event.channel, event.ts);

    const displayName = await getDisplayName(event.user);
    const text = stripMention(event.text);
    writeToOrchestrator(displayName, text, event.channel, event.ts, event.thread_ts || null);
    log(`Message from ${displayName} routed to orchestrator`);
  });

  // @mention listener
  app.event('app_mention', async ({ event }) => {
    if (event.bot_id) return;

    const text = stripMention(event.text || '');
    if (!text) return;

    await ack(event.channel, event.ts);

    const displayName = await getDisplayName(event.user);
    writeToOrchestrator(displayName, text, event.channel, event.ts, event.thread_ts || null);
    log(`@mention from ${displayName} routed to orchestrator`);
  });

  // Start
  await app.start();
  log('Slack bot is running');

  // Graceful shutdown
  function shutdown(signal) {
    log(`Received ${signal}, shutting down`);
    app.stop().then(() => process.exit(0)).catch(() => process.exit(1));
  }

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  console.error('Fatal:', err.message);
  process.exit(1);
});
