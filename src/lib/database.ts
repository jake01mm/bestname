import { Pool } from "pg";

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
    });
  }
  return pool;
}

export async function initDatabase(): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS domains (
        id SERIAL PRIMARY KEY,
        domain VARCHAR(255) UNIQUE NOT NULL,
        is_available BOOLEAN,
        confidence VARCHAR(20),
        has_dns BOOLEAN,
        has_website BOOLEAN,
        ai_score INTEGER,
        pronunciation INTEGER,
        memorability INTEGER,
        brand_potential INTEGER,
        visual_appeal INTEGER,
        length_score INTEGER,
        ai_comment TEXT,
        checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_domains_domain ON domains(domain)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_domains_available ON domains(is_available)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_domains_ai_score ON domains(ai_score)`);
    await client.query(`
      CREATE TABLE IF NOT EXISTS generation_tasks (
        id SERIAL PRIMARY KEY,
        starts_with VARCHAR(10),
        exclude_letters TEXT,
        min_length INTEGER,
        max_length INTEGER,
        fixed_length INTEGER,
        count INTEGER,
        total_generated INTEGER,
        total_available INTEGER,
        ai_enabled BOOLEAN,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
  } finally {
    client.release();
  }
}

export async function checkDomainsExist(domains: string[]): Promise<Set<string>> {
  if (domains.length === 0) return new Set();
  const client = await getPool().connect();
  try {
    const result = await client.query(
      "SELECT domain FROM domains WHERE domain = ANY($1)",
      [domains]
    );
    return new Set(result.rows.map((r: { domain: string }) => r.domain));
  } finally {
    client.release();
  }
}

export interface DomainRecord {
  domain: string;
  is_available?: boolean;
  confidence?: string;
  has_dns?: boolean;
  has_website?: boolean;
  ai_score?: number | null;
  pronunciation?: number | null;
  memorability?: number | null;
  brand_potential?: number | null;
  visual_appeal?: number | null;
  length_score?: number | null;
  ai_comment?: string | null;
}

export async function saveDomainsBatch(domains: DomainRecord[]): Promise<void> {
  if (domains.length === 0) return;
  const client = await getPool().connect();
  try {
    for (const d of domains) {
      await client.query(
        `INSERT INTO domains (domain, is_available, confidence, has_dns, has_website, ai_score, pronunciation, memorability, brand_potential, visual_appeal, length_score, ai_comment, checked_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW())
         ON CONFLICT (domain) DO UPDATE SET
           is_available = EXCLUDED.is_available,
           confidence = EXCLUDED.confidence,
           has_dns = EXCLUDED.has_dns,
           has_website = EXCLUDED.has_website,
           ai_score = COALESCE(EXCLUDED.ai_score, domains.ai_score),
           pronunciation = COALESCE(EXCLUDED.pronunciation, domains.pronunciation),
           memorability = COALESCE(EXCLUDED.memorability, domains.memorability),
           brand_potential = COALESCE(EXCLUDED.brand_potential, domains.brand_potential),
           visual_appeal = COALESCE(EXCLUDED.visual_appeal, domains.visual_appeal),
           length_score = COALESCE(EXCLUDED.length_score, domains.length_score),
           ai_comment = COALESCE(EXCLUDED.ai_comment, domains.ai_comment),
           checked_at = NOW()`,
        [
          d.domain,
          d.is_available,
          d.confidence,
          d.has_dns,
          d.has_website,
          d.ai_score ?? null,
          d.pronunciation ?? null,
          d.memorability ?? null,
          d.brand_potential ?? null,
          d.visual_appeal ?? null,
          d.length_score ?? null,
          d.ai_comment ?? null,
        ]
      );
    }
  } finally {
    client.release();
  }
}

export interface GetDomainsOptions {
  search?: string;
  minScore?: number;
  sortBy?: string;
  sortOrder?: string;
  page?: number;
  limit?: number;
}

export async function getAvailableDomains(options: GetDomainsOptions = {}) {
  const {
    search = "",
    minScore = 0,
    sortBy = "ai_score",
    sortOrder = "DESC",
    page = 1,
    limit = 50,
  } = options;
  const client = await getPool().connect();
  try {
    const conditions: string[] = ["is_available = true"];
    const params: (string | number)[] = [];
    let paramIdx = 1;
    if (search) {
      conditions.push(`domain ILIKE $${paramIdx++}`);
      params.push(`%${search}%`);
    }
    if (minScore > 0) {
      conditions.push(`ai_score >= $${paramIdx++}`);
      params.push(minScore);
    }
    const where = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const validSortBy: Record<string, string> = {
      ai_score: "ai_score",
      checked_at: "checked_at",
      domain: "domain",
    };
    const validOrder: Record<string, string> = { ASC: "ASC", DESC: "DESC" };
    const orderBy = `${validSortBy[sortBy] || "ai_score"} ${
      validOrder[sortOrder] || "DESC"
    } NULLS LAST`;
    const offset = (page - 1) * limit;
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM domains ${where}`,
      params
    );
    const dataResult = await client.query(
      `SELECT * FROM domains ${where} ORDER BY ${orderBy} LIMIT $${paramIdx} OFFSET $${
        paramIdx + 1
      }`,
      [...params, limit, offset]
    );
    return {
      domains: dataResult.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  } finally {
    client.release();
  }
}

export async function getStats() {
  const client = await getPool().connect();
  try {
    const result = await client.query(`
      SELECT
        COUNT(*) FILTER (WHERE is_available = true) as total_available,
        COUNT(*) FILTER (WHERE ai_score IS NOT NULL) as total_scored,
        ROUND(AVG(ai_score) FILTER (WHERE ai_score IS NOT NULL), 1) as avg_score
      FROM domains
    `);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function saveGenerationTask(task: {
  starts_with?: string;
  exclude_letters?: string;
  min_length?: number;
  max_length?: number;
  fixed_length?: number | null;
  count?: number;
  total_generated?: number;
  total_available?: number;
  ai_enabled?: boolean;
}): Promise<void> {
  const client = await getPool().connect();
  try {
    await client.query(
      `INSERT INTO generation_tasks (starts_with, exclude_letters, min_length, max_length, fixed_length, count, total_generated, total_available, ai_enabled)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
      [
        task.starts_with,
        task.exclude_letters,
        task.min_length,
        task.max_length,
        task.fixed_length,
        task.count,
        task.total_generated,
        task.total_available,
        task.ai_enabled,
      ]
    );
  } finally {
    client.release();
  }
}
