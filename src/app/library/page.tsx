"use client";
import { useState, useEffect, useCallback } from "react";
import { NavBar } from "@/components/NavBar";

interface Domain {
  id: number;
  domain: string;
  is_available: boolean;
  confidence: string;
  ai_score: number | null;
  pronunciation: number | null;
  memorability: number | null;
  brand_potential: number | null;
  visual_appeal: number | null;
  length_score: number | null;
  ai_comment: string | null;
  checked_at: string;
}

interface DomainsResponse {
  domains: Domain[];
  total: number;
  page: number;
  limit: number;
}

interface Stats {
  total_available: string;
  total_scored: string;
  avg_score: string | null;
}

export default function LibraryPage() {
  const [domains, setDomains] = useState<Domain[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [minScore, setMinScore] = useState(0);
  const [sortBy, setSortBy] = useState("ai_score");
  const [sortOrder, setSortOrder] = useState("DESC");
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const limit = 50;

  const fetchDomains = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search,
        minScore: String(minScore),
        sortBy,
        sortOrder,
        page: String(page),
        limit: String(limit),
      });
      const res = await fetch(`/api/domains?${params}`);
      const data: DomainsResponse = await res.json();
      setDomains(data.domains);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [search, minScore, sortBy, sortOrder, page]);

  const fetchStats = useCallback(async () => {
    const res = await fetch("/api/stats");
    setStats(await res.json());
  }, []);

  useEffect(() => {
    fetchDomains();
  }, [fetchDomains]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const totalPages = Math.ceil(total / limit);

  const getScoreClass = (score: number | null) => {
    if (!score) return "score-none";
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
          <h1 className="title">域名库</h1>
          <p className="subtitle">已发现的可用域名</p>
        </div>

        {stats && (
          <div className="stats-grid">
            <div className="stat-card stat-highlight">
              <div className="stat-value">{stats.total_available}</div>
              <div className="stat-label">可用域名</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.total_scored}</div>
              <div className="stat-label">AI 评分</div>
            </div>
            <div className="stat-card">
              <div className="stat-value">{stats.avg_score || "—"}</div>
              <div className="stat-label">平均分</div>
            </div>
          </div>
        )}

        <div className="card">
          <div className="filter-bar">
            <input
              type="text"
              placeholder="搜索域名..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="form-input filter-search"
            />
            <select
              value={minScore}
              onChange={(e) => {
                setMinScore(parseInt(e.target.value));
                setPage(1);
              }}
              className="form-select"
            >
              <option value={0}>全部分数</option>
              <option value={60}>60+ 分</option>
              <option value={70}>70+ 分</option>
              <option value={80}>80+ 分</option>
            </select>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              className="form-select"
            >
              <option value="ai_score">按 AI 分数</option>
              <option value="checked_at">按检测时间</option>
              <option value="domain">按域名</option>
            </select>
            <button
              onClick={() => setSortOrder((o) => (o === "DESC" ? "ASC" : "DESC"))}
              className="btn btn-secondary btn-sm"
            >
              {sortOrder === "DESC" ? "↓ 降序" : "↑ 升序"}
            </button>
          </div>

          {loading ? (
            <div className="loading-state">加载中...</div>
          ) : domains.length === 0 ? (
            <div className="empty-state">暂无数据</div>
          ) : (
            <>
              <div className="library-list">
                {domains.map((d) => (
                  <div key={d.id} className="library-item">
                    <div className="library-domain">{d.domain}</div>
                    <div className="library-meta">
                      <span className={`confidence confidence-${d.confidence}`}>
                        {d.confidence}
                      </span>
                      {d.ai_score != null && (
                        <span className={`score-badge ${getScoreClass(d.ai_score)}`}>
                          {d.ai_score}
                        </span>
                      )}
                      <span className="library-date">
                        {new Date(d.checked_at).toLocaleDateString("zh-CN")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="btn btn-secondary btn-sm"
                  >
                    上一页
                  </button>
                  <span className="page-info">
                    {page} / {totalPages} 页 ({total} 条)
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="btn btn-secondary btn-sm"
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
