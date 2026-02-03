// 域名库页面逻辑

let currentPage = 1;
const pageSize = 50;
let totalDomains = 0;

// 加载统计信息
async function loadStats() {
  try {
    const response = await fetch('/api/stats');
    const result = await response.json();
    
    if (result.success) {
      const stats = result.data;
      document.getElementById('totalDomains').textContent = stats.available_domains || 0;
      document.getElementById('scoredDomains').textContent = stats.scored_domains || 0;
      document.getElementById('avgScore').textContent = stats.avg_score ? Math.round(stats.avg_score) : '-';
    }
  } catch (error) {
    console.error('加载统计失败:', error);
  }
}

// 加载域名列表
async function loadDomains() {
  const searchInput = document.getElementById('searchInput').value;
  const minScore = document.getElementById('minScoreFilter').value;
  const sortBy = document.getElementById('sortBy').value;
  const sortOrder = document.getElementById('sortOrder').value;
  
  const offset = (currentPage - 1) * pageSize;
  
  try {
    const params = new URLSearchParams({
      limit: pageSize,
      offset: offset,
      minScore: minScore,
      orderBy: sortBy,
      order: sortOrder,
      search: searchInput
    });
    
    const response = await fetch(`/api/domains?${params}`);
    const result = await response.json();
    
    if (result.success) {
      totalDomains = result.data.total;
      displayDomains(result.data.domains);
      updatePagination();
    }
  } catch (error) {
    console.error('加载域名失败:', error);
    document.getElementById('domainTableBody').innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #f44336;">
          加载失败: ${error.message}
        </td>
      </tr>
    `;
  }
}

// 显示域名列表
function displayDomains(domains) {
  const tbody = document.getElementById('domainTableBody');
  
  if (domains.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
          没有找到域名
        </td>
      </tr>
    `;
    return;
  }
  
  tbody.innerHTML = domains.map(domain => {
    const score = domain.ai_score || 0;
    const scoreClass = score >= 85 ? 'score-high' :
                      score >= 75 ? 'score-good' :
                      score >= 65 ? 'score-medium' :
                      score > 0 ? 'score-low' : 'score-none';
    
    const confidenceClass = domain.confidence === 'high' ? 'confidence-high' :
                           domain.confidence === 'medium' ? 'confidence-medium' :
                           'confidence-low';
    
    const checkedDate = new Date(domain.checked_at).toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
    
    return `
      <tr>
        <td><span class="domain-name">${domain.domain}</span></td>
        <td>
          ${score > 0 ? `<span class="score-badge ${scoreClass}">${score}分</span>` : '-'}
        </td>
        <td>
          <span class="confidence-badge ${confidenceClass}">
            ${domain.confidence || 'unknown'}
          </span>
        </td>
        <td>${domain.pronunciation || '-'}</td>
        <td>${domain.memorability || '-'}</td>
        <td>${domain.brand_potential || '-'}</td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          ${domain.ai_comment || '-'}
        </td>
        <td style="font-size: 0.85em; color: #666;">${checkedDate}</td>
      </tr>
    `;
  }).join('');
}

// 更新分页
function updatePagination() {
  const totalPages = Math.ceil(totalDomains / pageSize);
  
  document.getElementById('prevBtn').disabled = currentPage === 1;
  document.getElementById('nextBtn').disabled = currentPage >= totalPages;
  document.getElementById('pageInfo').textContent = `第 ${currentPage} / ${totalPages} 页 (共 ${totalDomains} 个域名)`;
}

// 事件监听
document.getElementById('prevBtn').addEventListener('click', () => {
  if (currentPage > 1) {
    currentPage--;
    loadDomains();
  }
});

document.getElementById('nextBtn').addEventListener('click', () => {
  const totalPages = Math.ceil(totalDomains / pageSize);
  if (currentPage < totalPages) {
    currentPage++;
    loadDomains();
  }
});

// 搜索和筛选
let searchTimeout;
document.getElementById('searchInput').addEventListener('input', () => {
  clearTimeout(searchTimeout);
  searchTimeout = setTimeout(() => {
    currentPage = 1;
    loadDomains();
  }, 500);
});

document.getElementById('minScoreFilter').addEventListener('change', () => {
  currentPage = 1;
  loadDomains();
});

document.getElementById('sortBy').addEventListener('change', () => {
  currentPage = 1;
  loadDomains();
});

document.getElementById('sortOrder').addEventListener('change', () => {
  currentPage = 1;
  loadDomains();
});

// 初始化
loadStats();
loadDomains();
