"use client";
import { useState } from "react";
import { NavBar } from "@/components/NavBar";

interface DomainResult {
  domain: string;
  isAvailable: boolean | null;
  confidence: string;
  aiScore?: number | null;
  pronunciation?: number | null;
  memorability?: number | null;
  brandPotential?: number | null;
  visualAppeal?: number | null;
  lengthScore?: number | null;
  aiComment?: string | null;
}

interface GenerateStats {
  generated: number;
  checked: number;
  available: number;
  scored: number;
}

interface GenerateResult {
  success: boolean;
  stats: GenerateStats;
  topDomains: DomainResult[];
  allAvailable: DomainResult[];
  logs: string[];
  error?: string;
}

export default function GeneratorPage() {
  const [startsWith, setStartsWith] = useState("");
  const [excludeLetters, setExcludeLetters] = useState("");
  const [minLength, setMinLength] = useState(4);
  const [maxLength, setMaxLength] = useState(7);
  const [fixedLength, setFixedLength] = useState("");
  const [count, setCount] = useState(20);
  const [enableAI, setEnableAI] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startsWith: startsWith.trim().toLowerCase(),
          excludeLetters: excludeLetters
            .split(",")
            .map((l) => l.trim().toLowerCase())
            .filter(Boolean),
          minLength,
          maxLength,
          fixedLength: fixedLength ? parseInt(fixedLength) : null,
          count,
          enableAI,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setResult({
        success: false,
        error: String(err),
        stats: { generated: 0, checked: 0, available: 0, scored: 0 },
        topDomains: [],
        allAvailable: [],
        logs: [],
      });
    }
    setLoading(false);
  };

  const getScoreClass = (score?: number | null) => {
    if (!score) return "";
    if (score >= 85) return "score-excellent";
    if (score >= 75) return "score-good";
    if (score >= 65) return "score-fair";
    return "score-poor";
  };

  return (
    <>
      <NavBar />
      <div className="container">
        <div className="hero">
          <h1 className="title">域名生成器</h1>
          <p className="subtitle">AI 驱动 · 实时可用性检测 · 智能评分</p>
        </div>

        <div className="card">
          <form onSubmit={handleGenerate}>
            <div className="form-grid">
              <div className="form-group">
                <label>起始字母</label>
                <input
                  type="text"
                  maxLength={1}
                  value={startsWith}
                  onChange={(e) =>
                    setStartsWith(
                      e.target.value.toLowerCase().replace(/[^a-z]/g, "").slice(0, 1)
                    )
                  }
                  placeholder="留空不限制"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>排除字母</label>
                <input
                  type="text"
                  value={excludeLetters}
                  onChange={(e) =>
                    setExcludeLetters(
                      e.target.value.toLowerCase().replace(/[^a-z,]/g, "")
                    )
                  }
                  placeholder="如: q,x,z"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>最小长度</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={minLength}
                  onChange={(e) => setMinLength(parseInt(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>最大长度</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxLength}
                  onChange={(e) => setMaxLength(parseInt(e.target.value))}
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>固定长度 (可选)</label>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={fixedLength}
                  onChange={(e) => setFixedLength(e.target.value)}
                  placeholder="留空不限制"
                  className="form-input"
                />
              </div>
              <div className="form-group">
                <label>生成数量</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => setCount(parseInt(e.target.value))}
                  className="form-input"
                />
              </div>
            </div>

            <div className="form-group toggle-group">
              <label className="toggle-label">
                <input
                  type="checkbox"
                  checked={enableAI}
                  onChange={(e) => setEnableAI(e.target.checked)}
                  className="toggle-input"
                />
                <span className="toggle-text">启用 AI 评分</span>
              </label>
            </div>

            <button
              type="submit"
              className={`btn btn-primary btn-large${loading ? " loading" : ""}`}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  生成中...
                </>
              ) : (
                "生成域名"
              )}
            </button>
          </form>
        </div>

        {result && (
          <div className="results-section">
            {result.error && (
              <div className="card error-card">
                <p className="error-text">错误: {result.error}</p>
              </div>
            )}
            {result.success && (
              <>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-value">{result.stats.generated}</div>
                    <div className="stat-label">生成域名</div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-value">{result.stats.checked}</div>
                    <div className="stat-label">已检测</div>
                  </div>
                  <div className="stat-card stat-highlight">
                    <div className="stat-value">{result.stats.available}</div>
                    <div className="stat-label">可用域名</div>
                  </div>
                  {result.stats.scored > 0 && (
                    <div className="stat-card">
                      <div className="stat-value">{result.stats.scored}</div>
                      <div className="stat-label">AI 评分</div>
                    </div>
                  )}
                </div>

                {result.topDomains.length > 0 && (
                  <div className="card">
                    <h2 className="section-title">推荐域名</h2>
                    <div className="domain-list">
                      {result.topDomains.map((d, i) => (
                        <div key={d.domain} className="domain-item">
                          <span className="domain-rank">#{i + 1}</span>
                          <span className="domain-name">{d.domain}</span>
                          <span className={`confidence confidence-${d.confidence}`}>
                            {d.confidence}
                          </span>
                          {d.aiScore != null && (
                            <span className={`score-badge ${getScoreClass(d.aiScore)}`}>
                              {d.aiScore}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.logs.length > 0 && (
                  <div className="card log-card">
                    <h3 className="section-title">执行日志</h3>
                    <div className="log-panel">
                      {result.logs.map((log, i) => (
                        <div key={i} className="log-line">
                          {log}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </>
  );
}
