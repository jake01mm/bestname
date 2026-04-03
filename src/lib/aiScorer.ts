/**
 * AI域名评分系统 - TypeScript 版本
 * 使用OpenRouter API对域名进行智能评分
 */

import axios from "axios";
import type { DomainCheckResult } from "./domainChecker";

const BATCH_SCORING_PROMPT = `你是一个专业的域名评估专家。请对以下所有域名进行评分（0-100分）。

评分维度：
1. 发音流畅度 (25分): 域名是否容易发音，是否有良好的音节节奏
2. 记忆度 (25分): 域名是否容易记忆，是否有独特性
3. 品牌潜力 (20分): 域名是否适合作为品牌名称，是否有商业价值
4. 视觉美感 (15分): 字母组合是否美观，是否有视觉吸引力
5. 长度适中 (15分): 域名长度是否合适（5-8个字符最佳）

请以JSON数组格式返回所有域名的评分结果，格式如下：
[
  {
    "domain": "域名1.com",
    "score": 总分(0-100),
    "pronunciation": 发音流畅度分数,
    "memorability": 记忆度分数,
    "brandPotential": 品牌潜力分数,
    "visualAppeal": 视觉美感分数,
    "lengthScore": 长度分数,
    "comment": "简短评价（30字以内）"
  }
]

待评分的域名列表：
{DOMAIN_LIST}

只返回JSON数组，不要其他内容。`;

interface AiScoreResult {
  domain: string;
  score: number;
  pronunciation: number;
  memorability: number;
  brandPotential: number;
  visualAppeal: number;
  lengthScore: number;
  comment: string;
  success: boolean;
  error?: string;
}

/**
 * 批量使用AI对域名评分（一次性提交所有域名）
 */
async function scoreDomainsBatch(domains: string[]): Promise<AiScoreResult[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;

  if (!apiKey) {
    throw new Error("未找到OPENROUTER_API_KEY环境变量");
  }

  if (domains.length === 0) {
    return [];
  }

  try {
    const domainList = domains.map((d, i) => `${i + 1}. ${d}.com`).join("\n");

    const response = await axios.post(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: BATCH_SCORING_PROMPT.replace("{DOMAIN_LIST}", domainList),
          },
        ],
        temperature: 0.3,
        max_tokens: 4000,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": "http://localhost:3000",
          "X-Title": "Domain Name Generator",
        },
        timeout: 60000,
      }
    );

    const content = response.data.choices[0].message.content.trim();

    // 提取JSON（可能包含markdown代码块）
    let jsonStr = content;
    if (content.includes("```json")) {
      jsonStr = content.split("```json")[1].split("```")[0].trim();
    } else if (content.includes("```")) {
      jsonStr = content.split("```")[1].split("```")[0].trim();
    }

    const results = JSON.parse(jsonStr);

    if (!Array.isArray(results)) {
      throw new Error("AI返回的不是数组格式");
    }

    return results.map((r: Omit<AiScoreResult, "success">) => ({
      ...r,
      success: true,
    }));
  } catch (error: unknown) {
    const err = error as Error & { response?: { status?: number; data?: unknown } };
    console.error("[AI评分] 批量评分失败:", err.message);

    return domains.map((domain) => ({
      domain: `${domain}.com`,
      score: 0,
      pronunciation: 0,
      memorability: 0,
      brandPotential: 0,
      visualAppeal: 0,
      lengthScore: 0,
      comment: "评分失败",
      success: false,
      error: err.message,
    }));
  }
}

/**
 * 批量评分（分组处理，每组最多20个域名）
 */
async function scoreDomainsInBatch(
  domains: string[],
  batchSize = 20
): Promise<AiScoreResult[]> {
  const results: AiScoreResult[] = [];

  if (domains.length <= batchSize) {
    return await scoreDomainsBatch(domains);
  }

  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    const batchResults = await scoreDomainsBatch(batch);
    results.push(...batchResults);

    if (i + batchSize < domains.length) {
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }

  return results;
}

/**
 * 对域名检测结果进行AI评分，返回带评分的结果
 */
export async function scoreDomains(
  domains: DomainCheckResult[]
): Promise<DomainCheckResult[]> {
  const domainNames = domains.map((d) => d.domain.replace(".com", ""));
  const scores = await scoreDomainsInBatch(domainNames, 20);

  return domains.map((d) => {
    const scored = scores.find((s) => s.domain === d.domain);
    if (scored && scored.success) {
      return {
        ...d,
        aiScore: scored.score,
        pronunciation: scored.pronunciation,
        memorability: scored.memorability,
        brandPotential: scored.brandPotential,
        visualAppeal: scored.visualAppeal,
        lengthScore: scored.lengthScore,
        aiComment: scored.comment,
      };
    }
    return d;
  });
}
