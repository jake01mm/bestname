/**
 * 域名可用性检测 - TypeScript 版本
 * 使用RDAP协议进行准确检测
 */

import axios from "axios";

// 检测结果缓存（避免重复检测）
const checkCache = new Map<string, { result: DomainCheckResult; timestamp: number }>();
const CACHE_DURATION = 3600000; // 1小时

export interface DomainCheckResult {
  domain: string;
  isAvailable: boolean | null;
  checked: boolean;
  confidence: string;
  method: string;
  hasDns?: boolean;
  hasWebsite?: boolean;
  aiScore?: number | null;
  pronunciation?: number | null;
  memorability?: number | null;
  brandPotential?: number | null;
  visualAppeal?: number | null;
  lengthScore?: number | null;
  aiComment?: string | null;
  error?: string;
}

interface RdapResult {
  registered: boolean;
  method: string;
  confidence: string;
  details?: {
    registrar?: string;
    status?: string[];
    hasDNS?: boolean;
    hasWebsite?: boolean;
  };
}

/**
 * 使用RDAP检查域名（最准确的方法）
 */
async function checkWithRDAP(domain: string): Promise<RdapResult | null> {
  try {
    const response = await axios.get(
      `https://rdap.verisign.com/com/v1/domain/${domain}`,
      {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      }
    );

    if (response.status === 200) {
      return {
        registered: true,
        method: "RDAP",
        confidence: "high",
        details: {
          registrar:
            response.data.entities?.[0]?.vcardArray?.[1]?.[1]?.[3] || "Unknown",
          status: response.data.status || [],
        },
      };
    }

    if (response.status === 404) {
      return {
        registered: false,
        method: "RDAP",
        confidence: "high",
      };
    }

    return null;
  } catch (error: unknown) {
    const axiosError = error as { response?: { status?: number } };
    if (axiosError.response?.status === 404) {
      return {
        registered: false,
        method: "RDAP",
        confidence: "high",
      };
    }
    return null;
  }
}

/**
 * 使用DNS检查（备用方法）
 */
async function checkWithDNS(domain: string): Promise<RdapResult | null> {
  try {
    const response = await axios.get(
      `https://dns.google/resolve?name=${domain}&type=A`,
      { timeout: 5000 }
    );

    const hasARecord =
      response.data.Answer && response.data.Answer.length > 0;

    return {
      registered: hasARecord,
      method: "DNS",
      confidence: hasARecord ? "medium" : "low",
      details: {
        hasDNS: hasARecord,
      },
    };
  } catch {
    return null;
  }
}

/**
 * 使用HTTP检查（备用方法）
 */
async function checkWithHTTP(domain: string): Promise<RdapResult | null> {
  try {
    await axios.head(`http://${domain}`, {
      timeout: 3000,
      maxRedirects: 0,
    });

    return {
      registered: true,
      method: "HTTP",
      confidence: "medium",
      details: {
        hasWebsite: true,
      },
    };
  } catch {
    return {
      registered: false,
      method: "HTTP",
      confidence: "low",
      details: {
        hasWebsite: false,
      },
    };
  }
}

/**
 * 检查域名是否可用（多重检测）
 */
export async function checkDomainAvailability(domain: string): Promise<DomainCheckResult> {
  const fullDomain = `${domain}.com`;

  // 检查缓存
  const cached = checkCache.get(fullDomain);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.result;
  }

  try {
    // 优先使用RDAP（最准确）
    const rdapResult = await checkWithRDAP(fullDomain);

    if (rdapResult) {
      const result: DomainCheckResult = {
        domain: fullDomain,
        isAvailable: !rdapResult.registered,
        checked: true,
        confidence: rdapResult.confidence,
        method: rdapResult.method,
        hasDns: rdapResult.details?.hasDNS,
        hasWebsite: rdapResult.details?.hasWebsite,
      };

      checkCache.set(fullDomain, { result, timestamp: Date.now() });
      return result;
    }

    // RDAP失败，使用DNS+HTTP双重检测
    const [dnsResult, httpResult] = await Promise.all([
      checkWithDNS(fullDomain),
      checkWithHTTP(fullDomain),
    ]);

    const isRegistered = dnsResult?.registered || httpResult?.registered || false;
    const confidence = isRegistered ? "medium" : "low";

    const result: DomainCheckResult = {
      domain: fullDomain,
      isAvailable: !isRegistered,
      checked: true,
      confidence: confidence,
      method: "DNS+HTTP",
      hasDns: dnsResult?.details?.hasDNS || false,
      hasWebsite: httpResult?.details?.hasWebsite || false,
    };

    checkCache.set(fullDomain, { result, timestamp: Date.now() });
    return result;
  } catch (error: unknown) {
    const err = error as Error;
    return {
      domain: fullDomain,
      isAvailable: null,
      checked: false,
      confidence: "none",
      method: "failed",
      error: err.message,
    };
  }
}

/**
 * 带重试机制的检测
 */
async function checkWithRetry(domain: string, maxRetries = 2): Promise<DomainCheckResult> {
  let lastError: string | undefined;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      const result = await checkDomainAvailability(domain);
      if (result.checked) {
        return result;
      }
      lastError = result.error;
    } catch (error: unknown) {
      lastError = (error as Error).message;
    }

    if (i < maxRetries) {
      await new Promise((resolve) => setTimeout(resolve, 2000 * (i + 1)));
    }
  }

  return {
    domain: `${domain}.com`,
    isAvailable: null,
    checked: false,
    confidence: "none",
    method: "failed",
    error: lastError,
  };
}

/**
 * 批量检查域名（并发控制 + 重试机制）
 */
export async function checkDomainsBatch(
  domains: string[],
  concurrency = 3
): Promise<DomainCheckResult[]> {
  const results: DomainCheckResult[] = [];

  for (let i = 0; i < domains.length; i += concurrency) {
    const batch = domains.slice(i, i + concurrency);

    const batchResults = await Promise.all(
      batch.map((domain) => checkWithRetry(domain, 2))
    );

    results.push(...batchResults);

    // 避免请求过快（RDAP有速率限制）
    if (i + concurrency < domains.length) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * 清除缓存
 */
export function clearCache(): void {
  checkCache.clear();
}
