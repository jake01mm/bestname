/**
 * 数据库管理模块
 * 使用PostgreSQL存储域名数据，避免重复生成
 */

import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

/**
 * 初始化数据库表
 */
export async function initDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('[数据库] 开始初始化...');
    
    // 创建域名表
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
    
    // 创建索引
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_domain ON domains(domain);
      CREATE INDEX IF NOT EXISTS idx_available ON domains(is_available);
      CREATE INDEX IF NOT EXISTS idx_score ON domains(ai_score);
    `);
    
    // 创建生成任务表
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
    
    console.log('[数据库] 初始化完成');
  } catch (error) {
    console.error('[数据库] 初始化失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 检查域名是否已存在
 * @param {string} domain 域名
 * @returns {Promise<Object|null>} 域名记录或null
 */
export async function getDomain(domain) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT * FROM domains WHERE domain = $1',
      [domain]
    );
    
    return result.rows[0] || null;
  } finally {
    client.release();
  }
}

/**
 * 批量检查域名是否已存在
 * @param {string[]} domains 域名列表
 * @returns {Promise<Object>} { existing: [], new: [] }
 */
export async function checkDomainsExist(domains) {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT domain FROM domains WHERE domain = ANY($1)',
      [domains]
    );
    
    const existingDomains = new Set(result.rows.map(r => r.domain));
    const existing = domains.filter(d => existingDomains.has(d));
    const newDomains = domains.filter(d => !existingDomains.has(d));
    
    return { existing, new: newDomains };
  } finally {
    client.release();
  }
}

/**
 * 保存域名检测结果
 * @param {Object} domainData 域名数据
 */
export async function saveDomain(domainData) {
  const client = await pool.connect();
  
  try {
    const {
      domain,
      available,
      confidence,
      hasDNS,
      hasWebsite,
      aiScore,
      pronunciation,
      memorability,
      brandPotential,
      visualAppeal,
      lengthScore,
      aiComment
    } = domainData;
    
    await client.query(`
      INSERT INTO domains (
        domain, is_available, confidence, has_dns, has_website,
        ai_score, pronunciation, memorability, brand_potential,
        visual_appeal, length_score, ai_comment
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (domain) 
      DO UPDATE SET
        is_available = EXCLUDED.is_available,
        confidence = EXCLUDED.confidence,
        has_dns = EXCLUDED.has_dns,
        has_website = EXCLUDED.has_website,
        ai_score = EXCLUDED.ai_score,
        pronunciation = EXCLUDED.pronunciation,
        memorability = EXCLUDED.memorability,
        brand_potential = EXCLUDED.brand_potential,
        visual_appeal = EXCLUDED.visual_appeal,
        length_score = EXCLUDED.length_score,
        ai_comment = EXCLUDED.ai_comment,
        checked_at = CURRENT_TIMESTAMP
    `, [
      domain, available, confidence, hasDNS, hasWebsite,
      aiScore, pronunciation, memorability, brandPotential,
      visualAppeal, lengthScore, aiComment
    ]);
  } finally {
    client.release();
  }
}

/**
 * 批量保存域名
 * @param {Array} domainsData 域名数据数组
 */
export async function saveDomainsBatch(domainsData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (const data of domainsData) {
      await saveDomain(data);
    }
    
    await client.query('COMMIT');
    console.log(`[数据库] 已保存 ${domainsData.length} 个域名`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[数据库] 批量保存失败:', error.message);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * 保存生成任务记录
 * @param {Object} taskData 任务数据
 * @returns {Promise<number>} 任务ID
 */
export async function saveGenerationTask(taskData) {
  const client = await pool.connect();
  
  try {
    const {
      startsWith,
      excludeLetters,
      minLength,
      maxLength,
      fixedLength,
      count,
      totalGenerated,
      totalAvailable,
      aiEnabled
    } = taskData;
    
    const result = await client.query(`
      INSERT INTO generation_tasks (
        starts_with, exclude_letters, min_length, max_length,
        fixed_length, count, total_generated, total_available, ai_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `, [
      startsWith,
      excludeLetters.join(','),
      minLength,
      maxLength,
      fixedLength,
      count,
      totalGenerated,
      totalAvailable,
      aiEnabled
    ]);
    
    return result.rows[0].id;
  } finally {
    client.release();
  }
}

/**
 * 获取可用域名列表
 * @param {Object} options 查询选项
 * @returns {Promise<Object>} 域名列表和总数
 */
export async function getAvailableDomains(options = {}) {
  const client = await pool.connect();
  
  try {
    const {
      limit = 100,
      offset = 0,
      minScore = 0,
      orderBy = 'ai_score',
      order = 'DESC',
      search = ''
    } = options;
    
    // 构建查询条件
    let whereClause = 'WHERE is_available = true';
    const params = [];
    let paramIndex = 1;
    
    if (minScore > 0) {
      whereClause += ` AND ai_score >= $${paramIndex}`;
      params.push(minScore);
      paramIndex++;
    }
    
    if (search) {
      whereClause += ` AND domain LIKE $${paramIndex}`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    
    // 验证排序字段
    const validOrderBy = ['ai_score', 'checked_at', 'created_at', 'domain'];
    const safeOrderBy = validOrderBy.includes(orderBy) ? orderBy : 'ai_score';
    const safeOrder = order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    
    // 获取总数
    const countResult = await client.query(
      `SELECT COUNT(*) as total FROM domains ${whereClause}`,
      params
    );
    
    // 获取数据
    params.push(limit, offset);
    const result = await client.query(`
      SELECT 
        domain,
        is_available,
        confidence,
        has_dns,
        has_website,
        ai_score,
        pronunciation,
        memorability,
        brand_potential,
        visual_appeal,
        length_score,
        ai_comment,
        checked_at,
        created_at
      FROM domains
      ${whereClause}
      ORDER BY ${safeOrderBy} ${safeOrder} NULLS LAST, domain ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `, params);
    
    return {
      domains: result.rows,
      total: parseInt(countResult.rows[0].total),
      limit,
      offset
    };
  } finally {
    client.release();
  }
}

/**
 * 获取统计信息
 * @returns {Promise<Object>} 统计数据
 */
export async function getStats() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(`
      SELECT
        COUNT(*) as total_domains,
        COUNT(*) FILTER (WHERE is_available = true) as available_domains,
        COUNT(*) FILTER (WHERE is_available = false) as registered_domains,
        COUNT(*) FILTER (WHERE ai_score IS NOT NULL) as scored_domains,
        AVG(ai_score) FILTER (WHERE ai_score IS NOT NULL) as avg_score,
        MAX(ai_score) as max_score
      FROM domains
    `);
    
    const taskResult = await client.query(`
      SELECT COUNT(*) as total_tasks FROM generation_tasks
    `);
    
    return {
      ...result.rows[0],
      total_tasks: taskResult.rows[0].total_tasks
    };
  } finally {
    client.release();
  }
}

/**
 * 关闭数据库连接
 */
export async function closeDatabase() {
  await pool.end();
  console.log('[数据库] 连接已关闭');
}

// 导出连接池供其他模块使用
export { pool };
