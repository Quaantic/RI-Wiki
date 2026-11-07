// RI Wiki Feedback — paste this entire file into the existing Apps Script
// project, then Deploy > Manage deployments > Edit > New version > Deploy.
// Keep DISCORD_WEBHOOK in Script Properties; never paste the webhook into the site.
const MAX_FEEDBACK_LENGTH = 3500;
const PING_USER_ID = '1186388052877254656';

function doPost(e) {
  try {
    const webhook = PropertiesService.getScriptProperties().getProperty('DISCORD_WEBHOOK');
    if (!webhook) throw new Error('DISCORD_WEBHOOK não configurado.');
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    const categories = {
      suggestion: { title: '💡 New Suggestion', color: 0xB103FC, mention: false },
      bugs:       { title: '🐛 Bug Report', color: 0xE3194B, mention: true },
      missinfo:   { title: '⚠️ Incorrect Information', color: 0xFF8C00, mention: true },
      feedback:   { title: '💬 New Feedback', color: 0x0FBD63, mention: false }
    };
    const key = String(data.category || '').toLowerCase();
    const category = categories[key];
    if (!category || typeof data.message !== 'string' || !data.message.trim()) {
      return jsonResponse({ success: false, error: 'Invalid feedback.' });
    }
    if (data.message.trim().length > MAX_FEEDBACK_LENGTH) {
      return jsonResponse({ success: false, error: 'Message exceeds 3500 characters.' });
    }
    // Discord EMBED FIELDS allow only 1024 chars. Use the embed DESCRIPTION
    // instead (4096 chars), so Markdown, newlines, and long reports survive.
    const message = data.message.trim();
    const username = String(data.name || 'Anonymous').slice(0, 80);
    const page = String(data.page || '#/feedback').slice(0, 200);
    const payload = {
      content: category.mention ? '<@' + PING_USER_ID + '>' : '',
      allowed_mentions: { parse: [], users: category.mention ? [PING_USER_ID] : [] },
      embeds: [{
        title: category.title,
        color: category.color,
        description: message,
        fields: [
          { name: '👤 Submitted by', value: username || 'Anonymous', inline: true },
          { name: '📂 Category', value: key, inline: true },
          { name: '🔗 Page', value: page || '#/feedback', inline: false }
        ],
        footer: { text: 'RI Gaming Wiki • Feedback System' },
        timestamp: new Date().toISOString()
      }]
    };
    const response = UrlFetchApp.fetch(webhook, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const status = response.getResponseCode();
    if (status < 200 || status >= 300) {
      console.error('Discord error: ' + status + ' ' + response.getContentText());
      return jsonResponse({ success: false, error: 'Discord rejected the message.' });
    }
    return jsonResponse({ success: true });
  } catch (error) {
    console.error(error);
    return jsonResponse({ success: false, error: 'Failed to process feedback.' });
  }
}

function doGet() {
  return ContentService.createTextOutput('RI Gaming Wiki Feedback API is online.');
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
