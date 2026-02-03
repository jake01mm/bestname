/**
 * AI域名评分系统
 * 使用OpenRouter API对域名进行智能评分
 */

import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

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
  },
  {
    "domain": "域名2.com",
    ...
  }
]

待评分的域名列表：
{DOMAIN_LIST}

只返回JSON数组，不要其他内容。`;

/**
 * 批量使用AI对域名评分（一次性提交所有域名）
 * @param {string[]} domains 域名列表（不含.com）
 * @returns {Promise<Object[]>} 评分结果
 */
export async function scoreDomainsBatch(domains) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  
  if (!apiKey) {
    throw new Error('未找到OPENROUTER_API_KEY环境变量');
  }
  
  if (domains.length === 0) {
    return [];
  }
  
  console.log(`[AI评分] 开始批量评分 ${domains.length} 个域名`);
  
  try {
    // 构建域名列表字符串
    const domainList = domains.map((d, i) => `${i + 1}. ${d}.com`).join('\n');
    
    const response = await axios.post(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        model: 'anthropic/claude-3.5-sonnet', // Claude 3.5 Sonnet（已测试可用）
        messages: [
          {
            role: 'user',
            content: BATCH_SCORING_PROMPT.replace('{DOMAIN_LIST}', domainList)
          }
        ],
        temperature: 0.3,
        max_tokens: 4000 // 增加token限制以支持批量返回
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Domain Name Generator'
        },
        timeout: 60000 // 增加超时时间
      }
    );
    
    const content = response.data.choices[0].message.content.trim();
    
    // 提取JSON（可能包含markdown代码块）
    let jsonStr = content;
    if (content.includes('```json')) {
      jsonStr = content.split('```json')[1].split('```')[0].trim();
    } else if (content.includes('```')) {
      jsonStr = content.split('```')[1].split('```')[0].trim();
    }
    
    const results = JSON.parse(jsonStr);
    
    // 确保返回的是数组
    if (!Array.isArray(results)) {
      throw new Error('AI返回的不是数组格式');
    }
    
    // 添加success标记
    const processedResults = results.map(r => ({
      ...r,
      success: true
    }));
    
    console.log(`[AI评分] 批量评分完成，成功评分 ${processedResults.length} 个域名`);
    processedResults.forEach(r => {
      console.log(`  ${r.domain}: ${r.score}分 - ${r.comment}`);
    });
    
    return processedResults;
    
  } catch (error) {
    console.error(`[AI评分] 批量评分失败:`, error.message);
    if (error.response) {
      console.error(`[AI评分] 状态码:`, error.response.status);
      console.error(`[AI评分] 错误信息:`, error.response.data);
    }
    
    // 返回失败结果
    return domains.map(domain => ({
      domain: `${domain}.com`,
      score: 0,
      pronunciation: 0,
      memorability: 0,
      brandPotential: 0,
      visualAppeal: 0,
      lengthScore: 0,
      comment: '评分失败',
      success: false,
      error: error.message
    }));
  }
}

/**
 * 批量评分（分组处理，每组最多20个域名）
 * @param {string[]} domains 域名列表
 * @param {number} batchSize 每批处理的数量
 * @returns {Promise<Object[]>} 评分结果
 */
export async function scoreDomainsInBatch(domains, batchSize = 20) {
  const results = [];
  
  console.log(`[AI评分] 开始批量评分 ${domains.length} 个域名`);
  
  // 如果域名数量较少，一次性处理
  if (domains.length <= batchSize) {
    return await scoreDomainsBatch(domains);
  }
  
  // 分批处理
  for (let i = 0; i < domains.length; i += batchSize) {
    const batch = domains.slice(i, i + batchSize);
    console.log(`[AI评分] 处理第 ${Math.floor(i / batchSize) + 1} 批，共 ${batch.length} 个域名`);
    
    const batchResults = await scoreDomainsBatch(batch);
    results.push(...batchResults);
    
    console.log(`[AI评分] 进度: ${Math.min(i + batchSize, domains.length)}/${domains.length}`);
    
    // 批次间等待，避免API限流
    if (i + batchSize < domains.length) {
      console.log('[AI评分] 等待5秒后继续...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`[AI评分] 完成所有评分`);
  return results;
}
