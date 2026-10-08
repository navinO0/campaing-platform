/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs");

const rawWf = fs.readFileSync("/tmp/promo_clean.json", "utf8");
const wf = JSON.parse(rawWf);

// 1. Add Webhook Start Node
const webhookStart = {
  parameters: {
    httpMethod: "POST",
    path: "whatsapp-campaign/start",
    responseMode: "responseNode",
    options: {}
  },
  id: "node-webhook-campaign-start",
  name: "Webhook - Start Campaign",
  type: "n8n-nodes-base.webhook",
  typeVersion: 2,
  position: [ 80, 420 ],
  webhookId: "whatsapp-campaign/start"
};

// 2. Add Respond to Webhook Node
const webhookRespond = {
  parameters: {
    respondWith: "json",
    responseBody: "={\n  \"success\": true,\n  \"campaignId\": \"{{ $('00 - Feature Flags & Config').first().json.config.CAMPAIGN_ID }}\",\n  \"status\": \"queued\",\n  \"audienceCount\": {{ $('04 - Filter Eligible & Deduplicate').first().json._campaign_stats?.selected_count || 0 }}\n}",
    options: {}
  },
  id: "node-respond-to-webhook",
  name: "Respond to Webhook",
  type: "n8n-nodes-base.respondToWebhook",
  typeVersion: 1.1,
  position: [ 1420, 440 ]
};

// 3. Update Node 00 (Feature Flags & Config)
const node00 = wf.nodes.find(n => n.name === "00 - Feature Flags & Config");
node00.parameters.jsCode = `// 00 - Feature Flags, Operational Parameters & Target Endpoints
const incoming = $input.first()?.json?.body || $input.first()?.json || {};

const DEFAULT_CONFIG = {
  CAMPAIGN_ID: incoming.campaignId || incoming.name || 'fashion_campaign_001',
  CAMPAIGN_NAME: incoming.name || 'Promotional Campaign',
  TEST_MODE: incoming.testMode !== undefined ? incoming.testMode : false,
  TEST_MODE_LIMIT: incoming.testModeLimit || 10,
  MESSAGE_DELAY_MS: (incoming.throttling?.delaySeconds ? incoming.throttling.delaySeconds * 1000 : null) || 3000,
  BATCH_SIZE: incoming.throttling?.batchSize || 1,
  EVOLUTION_API_URL: 'https://evo-sgwly6o49pvn1dvcdxwemtrc.navin.lol',
  EVOLUTION_INSTANCE: 'Naveen kumar kambham',
  GOOGLE_SHEET_URL: incoming.googleSheetUrl || 'https://docs.google.com/spreadsheets/d/1KksJV1JHF_4W2u-___xpBCoT3hMwn-TsQvc-whqwi_0/edit?usp=sharing',
  ENABLE_PRESENCE_TYPING: true,
  TYPING_DELAY_MS: 1200,
  MAX_RETRIES: 3,
  RETRY_WAIT_MS: 2000,
  DEFAULT_COUNTRY_CODE: '91',
  DEFAULT_CURRENCY_SYMBOL: '₹',
  CUSTOM_VARIABLES: incoming.variables || {},
  INCOMING_CUSTOMERS: incoming.audience?.customers || incoming.customers || null
};

return [{
  json: {
    config: DEFAULT_CONFIG,
    executionId: $execution.id,
    startTime: Date.now()
  }
}];`;

// 4. Update Node 02 (Ingest & Parse Records)
const node02 = wf.nodes.find(n => n.name === "02 - Ingest & Parse Records");
node02.parameters.jsCode = `// 02 - Ingest & Parse Records (from UI payload or Google Sheet)
const cfg = $('00 - Feature Flags & Config').first().json.config;

if (cfg.INCOMING_CUSTOMERS && Array.isArray(cfg.INCOMING_CUSTOMERS) && cfg.INCOMING_CUSTOMERS.length > 0) {
  return cfg.INCOMING_CUSTOMERS.map((c, idx) => ({
    json: {
      customer_name: c.name || c.customer_name || '',
      phone: c.phone || '',
      product_name: c.product_name || cfg.CUSTOM_VARIABLES.product_name || '',
      product_price: c.product_price || '',
      discount_price: c.discount_price || '',
      product_link: c.product_link || cfg.CUSTOM_VARIABLES.product_link || '',
      opt_out: c.optedOut || c.opt_out || false,
      campaign_status: 'pending',
      _rowIndex: idx + 1
    }
  }));
}

const input = $input.first();
let csvText = '';
if (input && input.json) {
  csvText = typeof input.json.data === 'string' ? input.json.data : (typeof input.json === 'string' ? input.json : '');
}

if (!csvText) return [];

const lines = csvText.split(/\\r?\\n/).filter(line => line.trim().length > 0);
if (lines.length <= 1) return [];

function parseCsvLine(line) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cur.trim());
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur.trim());
  return result;
}

const headers = parseCsvLine(lines[0]).map(h => h.replace(/^["\\s]+|["\\s]+$/g, '').toLowerCase());
const records = [];

for (let i = 1; i < lines.length; i++) {
  const values = parseCsvLine(lines[i]);
  const row = {};
  headers.forEach((h, idx) => {
    let val = values[idx] || '';
    val = val.replace(/^"|"$/g, '').trim();
    row[h] = val;
  });
  row._rowIndex = i + 1;
  records.push({ json: row });
}

return records;`;

// 5. Update Node 05 (Build Promotional Message)
const node05 = wf.nodes.find(n => n.name === "05 - Build Promotional Message");
node05.parameters.jsCode = `// 05 - Contextual Promotion Personalization Engine
const cfg = $('00 - Feature Flags & Config').first().json.config;
const items = $input.all();

return items.map(item => {
  const c = item.json;
  const name = c.customer_name || 'there';
  const greeting = \`Hi \${name} 👋\`;

  const discount = cfg.CUSTOM_VARIABLES.discount || '20%';
  const coupon = cfg.CUSTOM_VARIABLES.coupon_code || 'FESTIVE20';
  const shopLink = c.product_link || cfg.CUSTOM_VARIABLES.product_link || 'https://google.com';

  const parts = [
    greeting,
    '',
    \`Special Offer! Enjoy \${discount} OFF today.\`,
    '',
    'Explore catalog:',
    shopLink,
    '',
    \`Use coupon: \${coupon}\`,
    '',
    'Reply STOP to opt out.'
  ];

  const messageText = parts.join('\\n');

  return {
    json: {
      ...c,
      message: messageText,
      whatsappJid: c.phone
    }
  };
});`;

// 6. Connect Webhook nodes
wf.nodes = wf.nodes.filter(n => n.id !== "node-webhook-campaign-start" && n.id !== "node-respond-to-webhook");
wf.nodes.push(webhookStart);
wf.nodes.push(webhookRespond);

wf.connections["Webhook - Start Campaign"] = {
  main: [ [ { node: "00 - Feature Flags & Config", type: "main", index: 0 } ] ]
};

if (!wf.connections["04 - Filter Eligible & Deduplicate"]) {
  wf.connections["04 - Filter Eligible & Deduplicate"] = { main: [ [] ] };
}
wf.connections["04 - Filter Eligible & Deduplicate"].main[0].push({
  node: "Respond to Webhook",
  type: "main",
  index: 0
});

// Set active to true so webhooks are ready to accept calls
wf.active = true;

fs.writeFileSync("/tmp/workflow_updated.json", JSON.stringify(wf, null, 2));
console.log("Updated workflow created successfully at /tmp/workflow_updated.json");
