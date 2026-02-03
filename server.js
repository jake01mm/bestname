/**
 * Web服务器
 * 提供可视化界面和API接口
 */

import express from 'express';
import { generateDomains } from './domainGenerator.js';
import { checkDomainsInBatch } from './domainChecker.js';
import { scoreDomainsInBatch } from './aiScorer.js';
import { 
  initDatabase, 
  checkDomainsExist, 
  saveDomainsBatch, 
  saveGenerationTask,
  getStats,
  getAvailableDomains
} from './database.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static('public'));

// 初始化数据库
await initDatabase();

// 获取统计信息API
app.get('/api/stats', async (req, res) => {
  try {
    const stats = await getStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 获取可用域名列表API
app.get('/api/domains', async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      minScore = 0,
      orderBy = 'ai_score',
      order = 'DESC',
      search = ''
    } = req.query;
    
    const domains = await getAvailableDomains({
      limit: parseInt(limit),
      offset: parseInt(offset),
      minScore: parseInt(minScore),
      orderBy,
      order,
      search
    });
    
    res.json({ success: true, data: domains });
  } catch (error) {
    console.error('获取域名列表失败:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 生成域名API
app.post('/api/generate', async (req, res) => {
  try {
    const {
      startsWith = 'n',
      excludeLetters = ['l', 'z', 'x', 'y', 'g', 'p', 'q'],
      minLength = 2,
      maxLength = 15,
      fixedLength = null,
      count = 50,
      enableAI = false
    } = req.body;

    console.log('\n========== 开始新的域名生成任务 ==========');
    console.log(`时间: ${new Date().toLocaleString('zh-CN')}`);
    console.log(`配置: 起始=${startsWith}, 排除=${excludeLetters.join(',')}, 长度=${fixedLength || `${minLength}-${maxLength}`}, 数量=${count}, AI=${enableAI ? '启用' : '关闭'}`);
    
    // 1. 生成域名
    console.log('\n[步骤1/5] 生成域名...');
    const domains = generateDomains({
      startsWith,
      excludeLetters,
      minLength,
      maxLength,
      fixedLength,
      count
    });
    console.log(`✓ 已生成 ${domains.length} 个域名`);

    // 2. 检查数据库中是否已存在
    console.log('\n[步骤2/5] 检查数据库...');
    const fullDomains = domains.map(d => `${d}.com`);
    const { existing, new: newDomains } = await checkDomainsExist(fullDomains);
    console.log(`✓ 数据库检查: ${existing.length}个已存在, ${newDomains.length}个新域名`);
    
    // 只检测新域名
    const domainsToCheck = newDomains.map(d => d.replace('.com', ''));

    // 3. 检查可用性
    console.log('\n[步骤3/5] 检查域名可用性...');
    const checkResults = await checkDomainsInBatch(domainsToCheck);
    const availableDomains = checkResults.filter(r => r.available);
    const registeredDomains = checkResults.filter(r => !r.available && r.checked);
    
    console.log(`✓ 检查完成: ${availableDomains.length}个可用, ${registeredDomains.length}个已注册`);

    // 4. AI评分（如果启用且有可用域名）
    let scoredResults = [];
    if (enableAI && availableDomains.length > 0) {
      console.log('\n[步骤4/5] AI批量评分...');
      console.log(`准备评分 ${availableDomains.length} 个可用域名`);
      
      const domainsToScore = availableDomains.map(r => r.domain.replace('.com', ''));
      scoredResults = await scoreDomainsInBatch(domainsToScore, 20);
      
      const successfulScores = scoredResults.filter(r => r.success);
      successfulScores.sort((a, b) => b.score - a.score);
      
      console.log(`✓ AI评分完成: ${successfulScores.length}个成功, ${scoredResults.length - successfulScores.length}个失败`);
      
      if (successfulScores.length > 0) {
        console.log(`\n🏆 Top 3 推荐:`);
        successfulScores.slice(0, 3).forEach((r, i) => {
          console.log(`  ${i + 1}. ${r.domain} - ${r.score}分 (${r.comment})`);
        });
      }
    } else if (enableAI) {
      console.log('\n[步骤4/5] 跳过AI评分（无可用域名）');
    } else {
      console.log('\n[步骤4/5] 跳过AI评分（未启用）');
    }

    // 5. 保存到数据库
    console.log('\n[步骤5/5] 保存到数据库...');
    const domainsToSave = checkResults.map(r => {
      const scored = scoredResults.find(s => s.domain === r.domain);
      return {
        domain: r.domain,
        available: r.available,
        confidence: r.confidence,
        hasDNS: r.details?.hasDNS,
        hasWebsite: r.details?.hasWebsite,
        aiScore: scored?.score || null,
        pronunciation: scored?.pronunciation || null,
        memorability: scored?.memorability || null,
        brandPotential: scored?.brandPotential || null,
        visualAppeal: scored?.visualAppeal || null,
        lengthScore: scored?.lengthScore || null,
        aiComment: scored?.comment || null
      };
    });
    
    await saveDomainsBatch(domainsToSave);
    
    // 保存任务记录
    await saveGenerationTask({
      startsWith,
      excludeLetters,
      minLength,
      maxLength,
      fixedLength,
      count,
      totalGenerated: domains.length,
      totalAvailable: availableDomains.length,
      aiEnabled: enableAI
    });
    
    console.log(`✓ 已保存 ${domainsToSave.length} 个域名到数据库`);

    console.log('\n========== 任务完成 ==========\n');

    res.json({
      success: true,
      data: {
        totalGenerated: domains.length,
        totalAvailable: availableDomains.length,
        scored: scoredResults.length,
        topDomains: scoredResults.slice(0, 10)
      }
    });

  } catch (error) {
    console.error('生成失败:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// 初始化数据库
await initDatabase();

app.listen(PORT, () => {
  console.log(`\n🚀 域名生成器已启动`);
  console.log(`📱 访问地址: http://localhost:${PORT}`);
  console.log(`⚙️  API端点: http://localhost:${PORT}/api/generate\n`);
});
