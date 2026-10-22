import { Pool } from "pg";
import { env } from "@/config/env";
import type {
  Customer,
  Campaign,
  Template,
  CustomerSegment,
  CampaignLog,
  DashboardStats,
  Client,
  ClientTemplate,
  ClientReminder,
} from "@/types";

declare global {
  var __pg_pool: Pool | undefined;
}

/**
 * Lazily creates and returns the PostgreSQL connection pool.
 * Dynamically retrieves DATABASE_URL from process.env at runtime (Coolify / Docker container).
 */
export function getPool(): Pool {
  if (global.__pg_pool) {
    return global.__pg_pool;
  }

  const connectionUrl = env.DATABASE_URL;
  if (!connectionUrl) {
    throw new Error(
      "DATABASE_URL environment variable is missing. Please configure DATABASE_URL in your deployment platform (e.g. Coolify)."
    );
  }

  // Clean connection URL to avoid pg-pool leaf signature verification issue with sslmode=require
  const cleanUrl = connectionUrl.replace(/[?&]sslmode=[^&]+/, "");

  const poolInstance = new Pool({
    connectionString: cleanUrl,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  if (process.env.NODE_ENV !== "production") {
    global.__pg_pool = poolInstance;
  }

  return poolInstance;
}

/**
 * Proxy object for pg Pool that lazily delegates all method calls (query, connect, etc.)
 * to getPool(), ensuring that connection is initialized dynamically at runtime when requested.
 */
export const pool = new Proxy({} as Pool, {
  get(_target, prop: string | symbol) {
    const targetPool = getPool();
    const val = (targetPool as any)[prop];
    if (typeof val === "function") {
      return val.bind(targetPool);
    }
    return val;
  },
});

// ----------------------------------------------------
// Row Mappers
// ----------------------------------------------------

function mapCustomer(row: any): Customer {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    email: row.email || undefined,
    countryCode: row.country_code || "91",
    tags: Array.isArray(row.tags) ? row.tags : [],
    segment: row.segment || undefined,
    source: row.source || undefined,
    optedIn: Boolean(row.opted_in),
    optedOut: Boolean(row.opted_out),
    optedOutAt: row.opted_out_at ? new Date(row.opted_out_at).toISOString() : null,
    optOutReason: row.opt_out_reason || null,
    lastContactedAt: row.last_contacted_at ? new Date(row.last_contacted_at).toISOString() : null,
    lastMessageStatus: row.last_message_status || null,
    purchaseCount: Number(row.purchase_count) || 0,
    totalSpent: Number(row.total_spent) || 0,
    metadata: typeof row.metadata === "object" && row.metadata !== null ? row.metadata : {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapTemplate(row: any): Template {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    language: row.language || "en",
    category: row.category || "MARKETING",
    status: row.status || "Approved",
    headerText: row.header_text || undefined,
    bodyText: row.body_text,
    footerText: row.footer_text || undefined,
    variables: Array.isArray(row.variables) ? row.variables : [],
    exampleValues: typeof row.example_values === "object" && row.example_values !== null ? row.example_values : {},
    mediaType: row.media_type || "none",
    mediaUrl: row.media_url || undefined,
    buttons: Array.isArray(row.buttons) ? row.buttons : [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapSegment(row: any): CustomerSegment {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    customerCount: Number(row.customer_count) || 0,
    filter: typeof row.filter === "object" && row.filter !== null ? row.filter : {},
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapCampaign(row: any): Campaign {
  return {
    id: row.id,
    name: row.name,
    description: row.description || undefined,
    status: row.status,
    templateId: row.template_id,
    templateName: row.template_name || undefined,
    audience: {
      type: row.audience_type,
      segmentId: row.segment_id || undefined,
    },
    variables: typeof row.variables === "object" && row.variables !== null ? row.variables : {},
    media: row.media ? row.media : undefined,
    tracking: row.tracking ? row.tracking : undefined,
    schedule: row.schedule || { type: "immediate" },
    throttling: row.throttling || { batchSize: 10, delaySeconds: 3, maxPerMinute: 60 },
    evolutionInstance: row.evolution_instance || env.EVOLUTION_INSTANCE_NAME,
    evolutionApiUrl: row.evolution_api_url || env.EVOLUTION_API_URL,
    stats: {
      totalAudience: Number(row.total_audience) || 0,
      queued: Number(row.queued_count) || 0,
      sent: Number(row.sent_count) || 0,
      delivered: Number(row.delivered_count) || 0,
      read: Number(row.read_count) || 0,
      failed: Number(row.failed_count) || 0,
      optedOut: Number(row.opted_out_count) || 0,
    },
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
    startedAt: row.started_at ? new Date(row.started_at).toISOString() : null,
    completedAt: row.completed_at ? new Date(row.completed_at).toISOString() : null,
  };
}

function mapJobToLog(row: any): CampaignLog {
  return {
    id: String(row.id),
    campaignId: row.campaign_id,
    customerId: row.customer_id || "",
    customerName: row.customer_name || "Unknown",
    phone: row.phone,
    message: row.message || "",
    templateName: row.campaign_name || "Campaign Template",
    status: (row.status === "pending" ? "queued" : row.status) as CampaignLog["status"],
    error: row.error_message || null,
    timestamp: new Date(row.dispatched_at || row.created_at).toISOString(),
  };
}

// ----------------------------------------------------
// Customers Repository
// ----------------------------------------------------

export async function getCustomersFromDb(options?: {
  search?: string;
  tag?: string;
  segment?: string;
  optedIn?: boolean;
  optedOut?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Customer[]> {
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIdx = 1;

  if (options?.search) {
    conditions.push(`(name ILIKE $${paramIdx} OR phone ILIKE $${paramIdx} OR email ILIKE $${paramIdx})`);
    params.push(`%${options.search}%`);
    paramIdx++;
  }

  if (options?.tag) {
    conditions.push(`$${paramIdx} = ANY(tags)`);
    params.push(options.tag);
    paramIdx++;
  }

  if (options?.segment) {
    conditions.push(`segment = $${paramIdx}`);
    params.push(options.segment);
    paramIdx++;
  }

  if (options?.optedIn !== undefined) {
    conditions.push(`opted_in = $${paramIdx}`);
    params.push(options.optedIn);
    paramIdx++;
  }

  if (options?.optedOut !== undefined) {
    conditions.push(`opted_out = $${paramIdx}`);
    params.push(options.optedOut);
    paramIdx++;
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const limitClause = options?.limit ? `LIMIT ${options.limit}` : "";
  const offsetClause = options?.offset ? `OFFSET ${options.offset}` : "";

  const query = `
    SELECT * FROM whatsapp_campaign.customers
    ${whereClause}
    ORDER BY created_at DESC
    ${limitClause} ${offsetClause};
  `;

  const result = await pool.query(query, params);
  return result.rows.map(mapCustomer);
}

export async function getCustomerByIdFromDb(id: string): Promise<Customer | null> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.customers WHERE id = $1 LIMIT 1;`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return mapCustomer(result.rows[0]);
}

export async function createCustomerInDb(customer: Customer): Promise<Customer> {
  const query = `
    INSERT INTO whatsapp_campaign.customers (
      id, name, phone, email, country_code, tags, segment, source,
      opted_in, opted_out, purchase_count, total_spent, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT (phone) DO UPDATE SET
      name = EXCLUDED.name,
      email = EXCLUDED.email,
      country_code = EXCLUDED.country_code,
      tags = EXCLUDED.tags,
      segment = EXCLUDED.segment,
      opted_in = EXCLUDED.opted_in,
      opted_out = EXCLUDED.opted_out,
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [
    customer.id,
    customer.name,
    customer.phone,
    customer.email || null,
    customer.countryCode || "91",
    customer.tags || [],
    customer.segment || "All Customers",
    customer.source || "System",
    customer.optedIn ?? true,
    customer.optedOut ?? false,
    customer.purchaseCount ?? 0,
    customer.totalSpent ?? 0,
  ];

  const result = await pool.query(query, values);
  return mapCustomer(result.rows[0]);
}

export async function updateCustomerInDb(id: string, updates: Partial<Customer>): Promise<Customer | null> {
  const existing = await getCustomerByIdFromDb(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  const query = `
    UPDATE whatsapp_campaign.customers SET
      name = $1,
      phone = $2,
      email = $3,
      country_code = $4,
      tags = $5,
      segment = $6,
      opted_in = $7,
      opted_out = $8,
      opted_out_at = $9,
      opt_out_reason = $10,
      updated_at = NOW()
    WHERE id = $11
    RETURNING *;
  `;
  const values = [
    merged.name,
    merged.phone,
    merged.email || null,
    merged.countryCode,
    merged.tags,
    merged.segment || null,
    merged.optedIn,
    merged.optedOut,
    merged.optedOutAt ? new Date(merged.optedOutAt) : null,
    merged.optOutReason || null,
    id,
  ];

  const result = await pool.query(query, values);
  return mapCustomer(result.rows[0]);
}

export async function deleteCustomerFromDb(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM whatsapp_campaign.customers WHERE id = $1;`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function bulkTagCustomersInDb(customerIds: string[], tags: string[]): Promise<number> {
  if (customerIds.length === 0 || tags.length === 0) return 0;
  const result = await pool.query(
    `
    UPDATE whatsapp_campaign.customers
    SET tags = ARRAY(SELECT DISTINCT unnest(tags || $1::text[])), updated_at = NOW()
    WHERE id = ANY($2::varchar[]);
    `,
    [tags, customerIds]
  );
  return result.rowCount ?? 0;
}

export async function bulkOptOutCustomersInDb(customerIds: string[], reason = "Bulk opt-out via dashboard"): Promise<number> {
  if (customerIds.length === 0) return 0;
  const result = await pool.query(
    `
    UPDATE whatsapp_campaign.customers
    SET opted_in = FALSE, opted_out = TRUE, opted_out_at = NOW(), opt_out_reason = $1, updated_at = NOW()
    WHERE id = ANY($2::varchar[]);
    `,
    [reason, customerIds]
  );
  return result.rowCount ?? 0;
}

// ----------------------------------------------------
// Templates Repository
// ----------------------------------------------------

export async function getTemplatesFromDb(): Promise<Template[]> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.templates ORDER BY created_at DESC;`
  );
  return result.rows.map(mapTemplate);
}

export async function getTemplateByIdFromDb(id: string): Promise<Template | null> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.templates WHERE id = $1 LIMIT 1;`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return mapTemplate(result.rows[0]);
}

export async function createTemplateInDb(template: Template): Promise<Template> {
  const query = `
    INSERT INTO whatsapp_campaign.templates (
      id, name, description, language, category, status,
      header_text, body_text, footer_text, variables, example_values,
      media_type, media_url, buttons, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      language = EXCLUDED.language,
      category = EXCLUDED.category,
      status = EXCLUDED.status,
      header_text = EXCLUDED.header_text,
      body_text = EXCLUDED.body_text,
      footer_text = EXCLUDED.footer_text,
      variables = EXCLUDED.variables,
      example_values = EXCLUDED.example_values,
      media_type = EXCLUDED.media_type,
      media_url = EXCLUDED.media_url,
      buttons = EXCLUDED.buttons,
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [
    template.id,
    template.name,
    template.description || null,
    template.language || "en",
    template.category || "MARKETING",
    template.status || "Approved",
    template.headerText || null,
    template.bodyText,
    template.footerText || null,
    template.variables || [],
    JSON.stringify(template.exampleValues || {}),
    template.mediaType || "none",
    template.mediaUrl || null,
    JSON.stringify(template.buttons || []),
  ];

  const result = await pool.query(query, values);
  return mapTemplate(result.rows[0]);
}

export async function updateTemplateInDb(id: string, updates: Partial<Template>): Promise<Template | null> {
  const existing = await getTemplateByIdFromDb(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  const query = `
    UPDATE whatsapp_campaign.templates SET
      name = $1,
      description = $2,
      language = $3,
      category = $4,
      status = $5,
      header_text = $6,
      body_text = $7,
      footer_text = $8,
      variables = $9,
      example_values = $10,
      media_type = $11,
      media_url = $12,
      buttons = $13,
      updated_at = NOW()
    WHERE id = $14
    RETURNING *;
  `;
  const values = [
    merged.name,
    merged.description || null,
    merged.language,
    merged.category,
    merged.status,
    merged.headerText || null,
    merged.bodyText,
    merged.footerText || null,
    merged.variables,
    JSON.stringify(merged.exampleValues || {}),
    merged.mediaType,
    merged.mediaUrl || null,
    JSON.stringify(merged.buttons || []),
    id,
  ];

  const result = await pool.query(query, values);
  return mapTemplate(result.rows[0]);
}

export async function deleteTemplateFromDb(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM whatsapp_campaign.templates WHERE id = $1;`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ----------------------------------------------------
// Segments Repository
// ----------------------------------------------------

export async function getSegmentsFromDb(): Promise<CustomerSegment[]> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.segments ORDER BY created_at ASC;`
  );
  return result.rows.map(mapSegment);
}

export async function getSegmentByIdFromDb(id: string): Promise<CustomerSegment | null> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.segments WHERE id = $1 LIMIT 1;`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return mapSegment(result.rows[0]);
}

export async function createSegmentInDb(segment: CustomerSegment): Promise<CustomerSegment> {
  const query = `
    INSERT INTO whatsapp_campaign.segments (
      id, name, description, filter, customer_count, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      filter = EXCLUDED.filter,
      customer_count = EXCLUDED.customer_count,
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [
    segment.id,
    segment.name,
    segment.description || null,
    JSON.stringify(segment.filter || {}),
    segment.customerCount || 0,
  ];

  const result = await pool.query(query, values);
  return mapSegment(result.rows[0]);
}

export async function updateSegmentInDb(id: string, updates: Partial<CustomerSegment>): Promise<CustomerSegment | null> {
  const existing = await getSegmentByIdFromDb(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  const query = `
    UPDATE whatsapp_campaign.segments SET
      name = $1,
      description = $2,
      filter = $3,
      customer_count = $4,
      updated_at = NOW()
    WHERE id = $5
    RETURNING *;
  `;
  const values = [
    merged.name,
    merged.description || null,
    JSON.stringify(merged.filter || {}),
    merged.customerCount || 0,
    id,
  ];

  const result = await pool.query(query, values);
  return mapSegment(result.rows[0]);
}

export async function deleteSegmentFromDb(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM whatsapp_campaign.segments WHERE id = $1;`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

// ----------------------------------------------------
// Campaigns & Jobs Repository
// ----------------------------------------------------

export async function getCampaignsFromDb(): Promise<Campaign[]> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.campaigns ORDER BY created_at DESC;`
  );
  return result.rows.map(mapCampaign);
}

export async function getCampaignByIdFromDb(id: string): Promise<Campaign | null> {
  const result = await pool.query(
    `SELECT * FROM whatsapp_campaign.campaigns WHERE id = $1 LIMIT 1;`,
    [id]
  );
  if (result.rows.length === 0) return null;
  return mapCampaign(result.rows[0]);
}

/**
 * Creates a campaign in `whatsapp_campaign.campaigns` AND
 * generates granular dispatch jobs in `whatsapp_campaign.campaign_jobs`
 * with idempotency keys for each eligible customer.
 */
export async function createCampaignInDb(campaign: Campaign): Promise<Campaign> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Fetch matching audience customers (who are opted in and NOT opted out)
    let customerRows: Customer[] = [];
    if (campaign.audience.type === "segment" && campaign.audience.segmentId) {
      // Find customers matching segment filter or tag
      const segRes = await client.query(
        `SELECT * FROM whatsapp_campaign.segments WHERE id = $1 LIMIT 1;`,
        [campaign.audience.segmentId]
      );
      if (segRes.rows.length > 0) {
        const seg = segRes.rows[0];
        const tags = seg.filter?.tags || [];
        if (tags.length > 0) {
          const custRes = await client.query(
            `SELECT * FROM whatsapp_campaign.customers WHERE opted_in = TRUE AND opted_out = FALSE AND tags && $1::text[];`,
            [tags]
          );
          customerRows = custRes.rows.map(mapCustomer);
        } else {
          const custRes = await client.query(
            `SELECT * FROM whatsapp_campaign.customers WHERE opted_in = TRUE AND opted_out = FALSE;`
          );
          customerRows = custRes.rows.map(mapCustomer);
        }
      }
    } else if (campaign.audience.type === "manual_selection" && campaign.audience.customerIds?.length) {
      const custRes = await client.query(
        `SELECT * FROM whatsapp_campaign.customers WHERE id = ANY($1::varchar[]) AND opted_in = TRUE AND opted_out = FALSE;`,
        [campaign.audience.customerIds]
      );
      customerRows = custRes.rows.map(mapCustomer);
    } else {
      // all_opted_in
      const custRes = await client.query(
        `SELECT * FROM whatsapp_campaign.customers WHERE opted_in = TRUE AND opted_out = FALSE;`
      );
      customerRows = custRes.rows.map(mapCustomer);
    }

    const totalAudience = customerRows.length;

    // 2. Insert Campaign Row
    const evolutionInstance = campaign.evolutionInstance || env.EVOLUTION_INSTANCE_NAME;
    const evolutionApiUrl = campaign.evolutionApiUrl || env.EVOLUTION_API_URL;

    const insertCampaignSql = `
      INSERT INTO whatsapp_campaign.campaigns (
        id, name, description, status, template_id, template_name, audience_type, segment_id,
        variables, media, tracking, schedule, throttling, evolution_instance, evolution_api_url,
        total_audience, queued_count,
        sent_count, delivered_count, read_count, failed_count, opted_out_count,
        created_at, updated_at, started_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17,
        0, 0, 0, 0, 0, NOW(), NOW(), $18
      )
      RETURNING *;
    `;

    const campaignStatus = campaign.schedule?.type === "immediate" ? "Scheduled" : "Draft";
    const startedAt = campaign.schedule?.type === "immediate" ? new Date() : null;

    const campRes = await client.query(insertCampaignSql, [
      campaign.id,
      campaign.name,
      campaign.description || null,
      campaignStatus,
      campaign.templateId,
      campaign.templateName || "Standard Template",
      campaign.audience.type,
      campaign.audience.segmentId || null,
      JSON.stringify(campaign.variables || {}),
      campaign.media ? JSON.stringify(campaign.media) : null,
      campaign.tracking ? JSON.stringify(campaign.tracking) : null,
      JSON.stringify(campaign.schedule || { type: "immediate" }),
      JSON.stringify(campaign.throttling || { batchSize: 10, delaySeconds: 3, maxPerMinute: 60 }),
      evolutionInstance,
      evolutionApiUrl,
      totalAudience,
      totalAudience, // all initial audience queued
      startedAt,
    ]);

    // 3. Retrieve Template body text to format messages
    let templateText = "Hello {{customer_name}},\nSpecial offer for you!";
    const tplRes = await client.query(
      `SELECT body_text FROM whatsapp_campaign.templates WHERE id = $1 LIMIT 1;`,
      [campaign.templateId]
    );
    if (tplRes.rows.length > 0) {
      templateText = tplRes.rows[0].body_text;
    }

    // 4. Create Campaign Jobs for each customer
    for (const customer of customerRows) {
      // Build personalized message
      let personalized = templateText;
      const firstName = customer.name.split(" ")[0] || customer.name;
      personalized = personalized.replace(/\{\{\s*customer_name\s*\}\}/g, customer.name);
      personalized = personalized.replace(/\{\{\s*first_name\s*\}\}/g, firstName);

      // Replace campaign variables
      if (campaign.variables) {
        for (const [key, val] of Object.entries(campaign.variables)) {
          const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, "g");
          personalized = personalized.replace(regex, val);
        }
      }

      // Append tracking link if configured
      if (campaign.tracking && campaign.variables?.product_link) {
        const utmString = `utm_source=${campaign.tracking.utm_source}&utm_medium=${campaign.tracking.utm_medium}&utm_campaign=${campaign.tracking.utm_campaign}`;
        const separator = campaign.variables.product_link.includes("?") ? "&" : "?";
        const finalLink = `${campaign.variables.product_link}${separator}${utmString}`;
        personalized = personalized.replace(campaign.variables.product_link, finalLink);
      }

      const idempotencyKey = `${campaign.id}_${customer.id}_${campaign.templateId}`;

      await client.query(
        `
        INSERT INTO whatsapp_campaign.campaign_jobs (
          campaign_id, customer_id, customer_name, phone, message,
          media_url, media_type, evolution_instance, evolution_api_url,
          status, idempotency_key, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending', $10, NOW(), NOW()
        )
        ON CONFLICT (idempotency_key) DO NOTHING;
        `,
        [
          campaign.id,
          customer.id,
          customer.name,
          customer.phone,
          personalized,
          campaign.media?.url || null,
          campaign.media?.type || "none",
          evolutionInstance,
          evolutionApiUrl,
          idempotencyKey,
        ]
      );
    }

    await client.query("COMMIT");
    return mapCampaign(campRes.rows[0]);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function updateCampaignInDb(id: string, updates: Partial<Campaign>): Promise<Campaign | null> {
  const existing = await getCampaignByIdFromDb(id);
  if (!existing) return null;

  const merged = { ...existing, ...updates };
  const query = `
    UPDATE whatsapp_campaign.campaigns SET
      name = $1,
      description = $2,
      status = $3,
      template_id = $4,
      template_name = $5,
      variables = $6,
      media = $7,
      tracking = $8,
      schedule = $9,
      throttling = $10,
      evolution_instance = $11,
      evolution_api_url = $12,
      updated_at = NOW()
    WHERE id = $13
    RETURNING *;
  `;
  const values = [
    merged.name,
    merged.description || null,
    merged.status,
    merged.templateId,
    merged.templateName || null,
    JSON.stringify(merged.variables || {}),
    merged.media ? JSON.stringify(merged.media) : null,
    merged.tracking ? JSON.stringify(merged.tracking) : null,
    JSON.stringify(merged.schedule || {}),
    JSON.stringify(merged.throttling || {}),
    merged.evolutionInstance || env.EVOLUTION_INSTANCE_NAME,
    merged.evolutionApiUrl || env.EVOLUTION_API_URL,
    id,
  ];

  const result = await pool.query(query, values);
  return mapCampaign(result.rows[0]);
}

export async function deleteCampaignFromDb(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM whatsapp_campaign.campaigns WHERE id = $1;`,
    [id]
  );
  return (result.rowCount ?? 0) > 0;
}

export async function getCampaignLogsFromDb(campaignId: string): Promise<CampaignLog[]> {
  const result = await pool.query(
    `
    SELECT j.*, c.name as campaign_name
    FROM whatsapp_campaign.campaign_jobs j
    LEFT JOIN whatsapp_campaign.campaigns c ON j.campaign_id = c.id
    WHERE j.campaign_id = $1
    ORDER BY j.created_at DESC
    LIMIT 200;
    `,
    [campaignId]
  );
  return result.rows.map(mapJobToLog);
}

export async function setCampaignStatusInDb(id: string, status: Campaign["status"]): Promise<Campaign | null> {
  const now = new Date();
  const query = `
    UPDATE whatsapp_campaign.campaigns SET
      status = $1,
      started_at = CASE WHEN $1 IN ('Running', 'Scheduled') AND started_at IS NULL THEN $2 ELSE started_at END,
      completed_at = CASE WHEN $1 = 'Completed' THEN $2 ELSE completed_at END,
      updated_at = $2
    WHERE id = $3
    RETURNING *;
  `;
  const result = await pool.query(query, [status, now, id]);
  if (result.rows.length === 0) return null;
  return mapCampaign(result.rows[0]);
}

// ----------------------------------------------------
// Real Dashboard Stats
// ----------------------------------------------------

export async function getDashboardStatsFromDb(): Promise<DashboardStats> {
  // Aggregate real stats from customers and campaigns
  const custRes = await pool.query(`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE opted_in = TRUE AND opted_out = FALSE)::int AS opted_in,
      COUNT(*) FILTER (WHERE opted_out = TRUE)::int AS opted_out
    FROM whatsapp_campaign.customers;
  `);

  const campRes = await pool.query(`
    SELECT
      COUNT(*)::int AS campaigns_total,
      COALESCE(SUM(sent_count), 0)::int AS sent,
      COALESCE(SUM(delivered_count), 0)::int AS delivered,
      COALESCE(SUM(read_count), 0)::int AS read,
      COALESCE(SUM(failed_count), 0)::int AS failed,
      COALESCE(SUM(opted_out_count), 0)::int AS camp_opted_out
    FROM whatsapp_campaign.campaigns;
  `);

  const cStats = custRes.rows[0] || { total: 0, opted_in: 0, opted_out: 0 };
  const mStats = campRes.rows[0] || { campaigns_total: 0, sent: 0, delivered: 0, read: 0, failed: 0, camp_opted_out: 0 };

  const totalSent = mStats.sent > 0 ? mStats.sent : 1; // avoid division by zero
  const deliveryRate = mStats.sent > 0 ? Number((mStats.delivered / totalSent).toFixed(3)) : 0.95;
  const readRate = mStats.sent > 0 ? Number((mStats.read / totalSent).toFixed(3)) : 0.70;
  const failureRate = mStats.sent > 0 ? Number((mStats.failed / totalSent).toFixed(3)) : 0.03;
  const optOutRate = cStats.total > 0 ? Number((cStats.opted_out / cStats.total).toFixed(3)) : 0.01;

  return {
    totalCustomers: cStats.total,
    optedInCustomers: cStats.opted_in,
    campaignsSent: mStats.campaigns_total,
    messagesSent: mStats.sent,
    delivered: mStats.delivered,
    read: mStats.read,
    failed: mStats.failed,
    optedOut: cStats.opted_out,
    deliveryRate,
    readRate,
    failureRate,
    optOutRate,
  };
}

// ----------------------------------------------------
// Clients & Custom Client Templates Repository
// ----------------------------------------------------

function mapClient(row: any): Client {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone,
    company: row.company || undefined,
    serviceType: row.service_type || "General Service Maintenance",
    chargesAmount: Number(row.charges_amount) || 0,
    dueDate: row.due_date ? new Date(row.due_date).toISOString().split("T")[0] : null,
    notes: row.notes || undefined,
    status: row.status || "active",
    customTemplates: [],
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapClientTemplate(row: any): ClientTemplate {
  return {
    id: row.id,
    clientId: row.client_id,
    clientPhone: row.client_phone,
    title: row.title,
    category: row.category || "UTILITY",
    headerText: row.header_text || undefined,
    bodyText: row.body_text,
    footerText: row.footer_text || undefined,
    variables: typeof row.variables === "object" && row.variables !== null ? row.variables : {},
    mediaType: row.media_type || "none",
    mediaUrl: row.media_url || undefined,
    buttons: Array.isArray(row.buttons) ? row.buttons : [],
    lastSentAt: row.last_sent_at ? new Date(row.last_sent_at).toISOString() : null,
    sentCount: Number(row.sent_count) || 0,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };
}

function mapClientReminder(row: any): ClientReminder {
  return {
    id: String(row.id),
    clientId: row.client_id,
    clientTemplateId: row.client_template_id || null,
    phone: row.phone,
    clientName: row.client_name,
    renderedMessage: row.rendered_message,
    status: row.status || "sent",
    evolutionMessageId: row.evolution_message_id || null,
    errorMessage: row.error_message || null,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

export async function getClientsWithTemplatesFromDb(): Promise<Client[]> {
  const clientsRes = await pool.query(
    `SELECT * FROM whatsapp_campaign.clients ORDER BY created_at DESC;`
  );
  const clients = clientsRes.rows.map(mapClient);

  if (clients.length === 0) return [];

  const tplRes = await pool.query(
    `SELECT * FROM whatsapp_campaign.client_templates ORDER BY created_at DESC;`
  );
  const templates = tplRes.rows.map(mapClientTemplate);

  const tplMap = new Map<string, ClientTemplate[]>();
  for (const tpl of templates) {
    const list = tplMap.get(tpl.clientId) || [];
    list.push(tpl);
    tplMap.set(tpl.clientId, list);
  }

  return clients.map((c) => ({
    ...c,
    customTemplates: tplMap.get(c.id) || [],
  }));
}

export async function getClientByIdFromDb(id: string): Promise<Client | null> {
  const res = await pool.query(
    `SELECT * FROM whatsapp_campaign.clients WHERE id = $1 LIMIT 1;`,
    [id]
  );
  if (res.rows.length === 0) return null;
  const client = mapClient(res.rows[0]);

  const tplRes = await pool.query(
    `SELECT * FROM whatsapp_campaign.client_templates WHERE client_id = $1 ORDER BY created_at DESC;`,
    [id]
  );
  client.customTemplates = tplRes.rows.map(mapClientTemplate);
  return client;
}

export async function createClientInDb(data: Partial<Client>): Promise<Client> {
  const id = data.id || `cli_${Date.now()}`;
  const query = `
    INSERT INTO whatsapp_campaign.clients (
      id, name, phone, company, service_type, charges_amount, due_date, notes, status, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
    ON CONFLICT (phone) DO UPDATE SET
      name = EXCLUDED.name,
      company = EXCLUDED.company,
      service_type = EXCLUDED.service_type,
      charges_amount = EXCLUDED.charges_amount,
      due_date = EXCLUDED.due_date,
      notes = EXCLUDED.notes,
      status = EXCLUDED.status,
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [
    id,
    data.name,
    data.phone,
    data.company || null,
    data.serviceType || "General Service Maintenance",
    data.chargesAmount || 0,
    data.dueDate || null,
    data.notes || null,
    data.status || "active",
  ];
  const res = await pool.query(query, values);
  return mapClient(res.rows[0]);
}

export async function updateClientInDb(id: string, updates: Partial<Client>): Promise<Client | null> {
  const existing = await getClientByIdFromDb(id);
  if (!existing) return null;

  const query = `
    UPDATE whatsapp_campaign.clients SET
      name = $1,
      phone = $2,
      company = $3,
      service_type = $4,
      charges_amount = $5,
      due_date = $6,
      notes = $7,
      status = $8,
      updated_at = NOW()
    WHERE id = $9
    RETURNING *;
  `;
  const values = [
    updates.name ?? existing.name,
    updates.phone ?? existing.phone,
    updates.company ?? existing.company ?? null,
    updates.serviceType ?? existing.serviceType,
    updates.chargesAmount ?? existing.chargesAmount,
    updates.dueDate ?? existing.dueDate ?? null,
    updates.notes ?? existing.notes ?? null,
    updates.status ?? existing.status,
    id,
  ];
  const res = await pool.query(query, values);
  return mapClient(res.rows[0]);
}

export async function deleteClientFromDb(id: string): Promise<boolean> {
  const res = await pool.query(`DELETE FROM whatsapp_campaign.clients WHERE id = $1;`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function createClientTemplateInDb(template: Partial<ClientTemplate>): Promise<ClientTemplate> {
  const id = template.id || `ctpl_${Date.now()}`;
  const query = `
    INSERT INTO whatsapp_campaign.client_templates (
      id, client_id, client_phone, title, category,
      header_text, body_text, footer_text, variables,
      media_type, media_url, buttons, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      category = EXCLUDED.category,
      header_text = EXCLUDED.header_text,
      body_text = EXCLUDED.body_text,
      footer_text = EXCLUDED.footer_text,
      variables = EXCLUDED.variables,
      media_type = EXCLUDED.media_type,
      media_url = EXCLUDED.media_url,
      buttons = EXCLUDED.buttons,
      updated_at = NOW()
    RETURNING *;
  `;
  const values = [
    id,
    template.clientId,
    template.clientPhone,
    template.title,
    template.category || "UTILITY",
    template.headerText || null,
    template.bodyText,
    template.footerText || null,
    JSON.stringify(template.variables || {}),
    template.mediaType || "none",
    template.mediaUrl || null,
    JSON.stringify(template.buttons || []),
  ];
  const res = await pool.query(query, values);
  return mapClientTemplate(res.rows[0]);
}

export async function updateClientTemplateInDb(id: string, updates: Partial<ClientTemplate>): Promise<ClientTemplate | null> {
  const query = `
    UPDATE whatsapp_campaign.client_templates SET
      title = COALESCE($1, title),
      header_text = $2,
      body_text = COALESCE($3, body_text),
      footer_text = $4,
      variables = COALESCE($5, variables),
      media_type = COALESCE($6, media_type),
      media_url = $7,
      buttons = COALESCE($8, buttons),
      updated_at = NOW()
    WHERE id = $9
    RETURNING *;
  `;
  const values = [
    updates.title,
    updates.headerText || null,
    updates.bodyText,
    updates.footerText || null,
    updates.variables ? JSON.stringify(updates.variables) : null,
    updates.mediaType,
    updates.mediaUrl || null,
    updates.buttons ? JSON.stringify(updates.buttons) : null,
    id,
  ];
  const res = await pool.query(query, values);
  if (res.rows.length === 0) return null;
  return mapClientTemplate(res.rows[0]);
}

export async function deleteClientTemplateFromDb(id: string): Promise<boolean> {
  const res = await pool.query(`DELETE FROM whatsapp_campaign.client_templates WHERE id = $1;`, [id]);
  return (res.rowCount ?? 0) > 0;
}

export async function recordClientReminderInDb(reminder: {
  clientId: string;
  clientTemplateId?: string | null;
  phone: string;
  clientName: string;
  renderedMessage: string;
  status: string;
  evolutionMessageId?: string | null;
  errorMessage?: string | null;
}): Promise<ClientReminder> {
  const query = `
    INSERT INTO whatsapp_campaign.client_reminders (
      client_id, client_template_id, phone, client_name, rendered_message, status, evolution_message_id, error_message, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
    RETURNING *;
  `;
  const values = [
    reminder.clientId,
    reminder.clientTemplateId || null,
    reminder.phone,
    reminder.clientName,
    reminder.renderedMessage,
    reminder.status,
    reminder.evolutionMessageId || null,
    reminder.errorMessage || null,
  ];
  const res = await pool.query(query, values);

  if (reminder.clientTemplateId) {
    await pool.query(
      `UPDATE whatsapp_campaign.client_templates
       SET sent_count = sent_count + 1, last_sent_at = NOW(), updated_at = NOW()
       WHERE id = $1;`,
      [reminder.clientTemplateId]
    );
  }

  return mapClientReminder(res.rows[0]);
}

export async function getClientRemindersFromDb(clientId?: string): Promise<ClientReminder[]> {
  const query = clientId
    ? `SELECT * FROM whatsapp_campaign.client_reminders WHERE client_id = $1 ORDER BY created_at DESC LIMIT 50;`
    : `SELECT * FROM whatsapp_campaign.client_reminders ORDER BY created_at DESC LIMIT 100;`;
  const values = clientId ? [clientId] : [];
  const res = await pool.query(query, values);
  return res.rows.map(mapClientReminder);
}
