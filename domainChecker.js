/**
 * 域名可用性检测 - 改进版
 * 使用RDAP协议进行准确检测
 */

import axios from 'axios';

// 检测结果缓存（避免重复检测）
const checkCache = new Map();
const CACHE_DURATION = 3600000; // 1小时

/**
 * 使用RDAP检查域名（最准确的方法）
 * @param {string} domain 完整域名
 * @returns {Promise<Object>} 检查结果
 */
async function checkWithRDAP(domain) {
  try {
    // 使用RDAP协议查询（.com域名使用Verisign的RDAP服务器）
    const response = await axios.get(`https://rdap.verisign.com/com/v1/domain/${domain}`, {
      timeout: 5000,
      validateStatus: (status) => status < 500 // 404表示域名未注册
    });
    
    // 如果返回200，说明域名已注册
    if (response.status === 200) {
      return {
        registered: true,
        method: 'RDAP',
        confidence: 'high',
        details: {
          registrar: response.data.entities?.[0]?.vcardArray?.[1]?.[1]?.[3] || 'Unknown',
          status: response.data.status || []
        }
      };
    }
    
    // 404表示域名未注册
    if (response.status === 404) {
      return {
        registered: false,
        method: 'RDAP',
        confidence: 'high'
      };
    }
    
    return null;
  } catch (error) {
    // 404错误表示域名未注册
    if (error.response?.status === 404) {
      return {
        registered: false,
        method: 'RDAP',
        confidence: 'high'
      };
    }
    return null;
  }
}

/**
 * 使用DNS检查（备用方法）
 * @param {string} domain 完整域名
 * @returns {Promise<Object>} 检查结果
 */
async function checkWithDNS(domain) {
  try {
    const response = await axios.get(`https://dns.google/resolve?name=${domain}&type=A`, {
      timeout: 5000
    });
    
    const hasARecord = response.data.Answer && response.data.Answer.length > 0;
    
    return {
      registered: hasARecord,
      method: 'DNS',
      confidence: hasARecord ? 'medium' : 'low',
      details: {
        hasDNS: hasARecord
      }
    };
  } catch (error) {
    return null;
  }
}

/**
 * 使用HTTP检查（备用方法）
 * @param {string} domain 完整域名
 * @returns {Promise<Object>} 检查结果
 */
async function checkWithHTTP(domain) {
  try {
    await axios.head(`http://${domain}`, { 
      timeout: 3000,
      maxRedirects: 0
    });
    
    return {
      registered: true,
      method: 'HTTP',
      confidence: 'medium',
      details: {
        hasWebsite: true
      }
    };
  } catch (error) {
    return {
      registered: false,
      method: 'HTTP',
      confidence: 'low',
      details: {
        hasWebsite: false
      }
    };
  }
}

/**
 * 检查域名是否可用（多重检测）
 * @param {string} domain 域名（不含.com）
 * @returns {Promise<Object>} 检查结果
 */
export async function checkDomainAvailability(domain) {
  const fullDomain = `${domain}.com`;
  
  // 检查缓存
  const cached = checkCache.get(fullDomain);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    console.log(`[检测] ${fullDomain}: 使用缓存结果`);
    return cached.result;
  }
  
  try {
    // 优先使用RDAP（最准确）
    const rdapResult = await checkWithRDAP(fullDomain);
    
    if (rdapResult) {
      const result = {
        domain: fullDomain,
        available: !rdapResult.registered,
        checked: true,
        confidence: rdapResult.confidence,
        method: rdapResult.method,
        details: rdapResult.details || {}
      };
      
      // 缓存结果
      checkCache.set(fullDomain, {
        result,
        timestamp: Date.now()
      });
      
      console.log(`[检测] ${fullDomain}: ${rdapResult.registered ? '已注册' : '可用'} (${rdapResult.method}, 置信度:${rdapResult.confidence})`);
      
      return result;
    }
    
    // RDAP失败，使用DNS+HTTP双重检测
    console.log(`[检测] ${fullDomain}: RDAP失败，使用备用方法`);
    
    const [dnsResult, httpResult] = await Promise.all([
      checkWithDNS(fullDomain),
      checkWithHTTP(fullDomain)
    ]);
    
    // 综合判断
    const isRegistered = (dnsResult?.registered || httpResult?.registered);
    const confidence = isRegistered ? 'medium' : 'low';
    
    const result = {
      domain: fullDomain,
      available: !isRegistered,
      checked: true,
      confidence: confidence,
      method: 'DNS+HTTP',
      details: {
        hasDNS: dnsResult?.details?.hasDNS || false,
        hasWebsite: httpResult?.details?.hasWebsite || false
      }
    };
    
    // 缓存结果
    checkCache.set(fullDomain, {
      result,
      timestamp: Date.now()
    });
    
    console.log(`[检测] ${fullDomain}: ${isRegistered ? '已注册' : '可能可用'} (备用方法, 置信度:${confidence})`);
    
    return result;
    
  } catch (error) {
    console.log(`[检测] ${fullDomain}: 检测失败 - ${error.message}`);
    return {
      domain: fullDomain,
      available: null,
      checked: false,
      confidence: 'none',
      method: 'failed',
      error: error.message
    };
  }
}

/**
 * 批量检查域名（改进版 - 并发控制 + 重试机制）
 * @param {string[]} domains 域名列表
 * @param {number} concurrency 并发数
 * @returns {Promise<Object[]>} 检查结果列表
 */
export async function checkDomainsInBatch(domains, concurrency = 3) {
  const results = [];
  
  console.log(`[检测] 开始批量检查 ${domains.length} 个域名 (并发:${concurrency})`);
  
  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);
    
    // 并发检测，带重试机制
    const batchResults = await Promise.all(
      batch.map(domain => checkWithRetry(domain, 2))
    );
    
    results.push(...batchResults);
    
    // 避免请求过快（RDAP有速率限制）
    if (i + concurrency < domains.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  const availableCount = results.filter(r => r.available).length;
  const highConfidence = results.filter(r => r.confidence === 'high').length;
  
  console.log(`[检测] 完成检查，可用域名: ${availableCount}/${domains.length} (高置信度:${highConfidence})`);
  
  return results;
}

/**
 * 带重试机制的检测
 */
async function checkWithRetry(domain, maxRetries = 2) {
  let lastError;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await checkDomainAvailability(domain);
      if (result.checked) {
        return result;
      }
      lastError = result.error;
    } catch (error) {
      lastError = error.message;
    }
    
    // 重试前等待
    if (i < maxRetries) {
      await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
    }
  }
  
  // 所有重试都失败
  return {
    domain: `${domain}.com`,
    available: null,
    checked: false,
    confidence: 'none',
    method: 'failed',
    error: lastError
  };
}

/**
 * 清除缓存
 */
export function clearCache() {
  checkCache.clear();
  console.log('[检测] 缓存已清除');
}
