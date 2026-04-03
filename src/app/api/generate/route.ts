import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  initDatabase,
  checkDomainsExist,
  saveDomainsBatch,
  saveGenerationTask,
} from "@/lib/database";
import { generateDomains } from "@/lib/domainGenerator";
import { checkDomainsBatch } from "@/lib/domainChecker";
import { scoreDomains } from "@/lib/aiScorer";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    await initDatabase();
    const body = await req.json();
    const {
      startsWith = "",
      excludeLetters = [],
      minLength = 4,
      maxLength = 7,
      fixedLength = null,
      count = 20,
      enableAI = false,
    } = body;

    const logs: string[] = [];
    const log = (msg: string) => {
      logs.push(`[${new Date().toISOString()}] ${msg}`);
    };

    log(`开始生成域名 - 数量: ${count}, 长度: ${fixedLength || `${minLength}-${maxLength}`}`);

    // Generate domains
    const generated = generateDomains({
      startsWith,
      excludeLetters,
      minLength: fixedLength || minLength,
      maxLength: fixedLength || maxLength,
      count: count * 3,
    });
    log(`生成了 ${generated.length} 个候选域名`);

    // Filter existing (checker works on bare names, db stores with .com)
    const generatedWithExt = generated.map((d) => `${d}.com`);
    const existing = await checkDomainsExist(generatedWithExt);
    const newDomains = generated.filter((d) => !existing.has(`${d}.com`));
    log(`过滤已存在域名后剩余 ${newDomains.length} 个`);

    // Check availability
    log(`开始检查域名可用性...`);
    const toCheck = newDomains.slice(0, Math.min(count * 2, newDomains.length));
    const checked = await checkDomainsBatch(toCheck);
    const available = checked.filter((d) => d.isAvailable);
    log(`发现 ${available.length} 个可用域名`);

    // AI scoring (if enabled)
    let scored = available;
    if (enableAI && available.length > 0) {
      log(`开始AI评分 (${available.length} 个域名)...`);
      try {
        scored = await scoreDomains(available);
        log(`AI评分完成`);
      } catch (e) {
        log(`AI评分失败: ${e}`);
        scored = available;
      }
    }

    // Save to database
    const toSave = checked.map((d) => ({
      domain: d.domain,
      is_available: d.isAvailable ?? undefined,
      confidence: d.confidence,
      has_dns: d.hasDns,
      has_website: d.hasWebsite,
      ai_score: d.aiScore ?? null,
      pronunciation: d.pronunciation ?? null,
      memorability: d.memorability ?? null,
      brand_potential: d.brandPotential ?? null,
      visual_appeal: d.visualAppeal ?? null,
      length_score: d.lengthScore ?? null,
      ai_comment: d.aiComment ?? null,
    }));
    await saveDomainsBatch(toSave);
    log(`保存了 ${toSave.length} 条记录到数据库`);

    // Save generation task
    await saveGenerationTask({
      starts_with: startsWith,
      exclude_letters: Array.isArray(excludeLetters)
        ? excludeLetters.join(",")
        : excludeLetters,
      min_length: minLength,
      max_length: maxLength,
      fixed_length: fixedLength,
      count,
      total_generated: generated.length,
      total_available: available.length,
      ai_enabled: enableAI,
    });

    // Sort by AI score
    const topDomains = scored
      .sort((a, b) => (b.aiScore ?? 0) - (a.aiScore ?? 0))
      .slice(0, 10);

    log(`完成！返回前 ${topDomains.length} 个域名`);

    return NextResponse.json({
      success: true,
      stats: {
        generated: generated.length,
        checked: checked.length,
        available: available.length,
        scored: scored.filter((d) => d.aiScore != null).length,
      },
      topDomains,
      allAvailable: available,
      logs,
    });
  } catch (error) {
    console.error("Generate error:", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
