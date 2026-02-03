// 前端应用逻辑 - 改进版

const generateBtn = document.getElementById('generateBtn');
const resultsPanel = document.getElementById('results');
const logContent = document.getElementById('logContent');

let isGenerating = false;

// 添加日志
function addLog(message, type = 'info') {
  const logEntry = document.createElement('div');
  logEntry.className = `log-entry ${type}`;
  logEntry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  logContent.appendChild(logEntry);
  logContent.scrollTop = logContent.scrollHeight;
}

// 更新按钮状态
function setButtonLoading(loading, text = '生成中...') {
  if (loading) {
    generateBtn.disabled = true;
    generateBtn.innerHTML = `
      <span class="btn-spinner"></span>
      <span class="btn-text">${text}</span>
    `;
    generateBtn.classList.add('loading');
  } else {
    generateBtn.disabled = false;
    generateBtn.innerHTML = '<span class="btn-text">🚀 开始生成</span>';
    generateBtn.classList.remove('loading');
  }
}

// 输入验证和实时反馈
function setupInputValidation() {
  const startsWithInput = document.getElementById('startsWith');
  const excludeInput = document.getElementById('excludeLetters');
  const minLengthInput = document.getElementById('minLength');
  const maxLengthInput = document.getElementById('maxLength');
  const countInput = document.getElementById('count');
  
  // 起始字母验证
  startsWithInput.addEventListener('input', (e) => {
    e.target.value = e.target.value.toLowerCase().replace(/[^a-z]/g, '').slice(0, 1);
  });
  
  // 排除字母验证
  excludeInput.addEventListener('input', (e) => {
    const letters = e.target.value.toLowerCase().replace(/[^a-z,]/g, '');
    e.target.value = letters;
  });
  
  // 长度验证
  minLengthInput.addEventListener('change', () => {
    const min = parseInt(minLengthInput.value) || 2;
    const max = parseInt(maxLengthInput.value) || 15;
    if (min > max) {
      maxLengthInput.value = min;
    }
  });
  
  maxLengthInput.addEventListener('change', () => {
    const min = parseInt(minLengthInput.value) || 2;
    const max = parseInt(maxLengthInput.value) || 15;
    if (max < min) {
      minLengthInput.value = max;
    }
  });
  
  // 数量限制
  countInput.addEventListener('change', () => {
    const count = parseInt(countInput.value) || 30;
    if (count < 1) countInput.value = 1;
    if (count > 100) countInput.value = 100;
  });
}

// 生成域名
generateBtn.addEventListener('click', async () => {
  if (isGenerating) {
    addLog('请等待当前任务完成', 'warning');
    return;
  }
  
  try {
    isGenerating = true;
    
    // 获取配置
    const startsWith = document.getElementById('startsWith').value.trim() || 'n';
    const excludeLetters = document.getElementById('excludeLetters').value
      .split(',')
      .map(l => l.trim())
      .filter(l => l);
    const minLength = parseInt(document.getElementById('minLength').value) || 2;
    const maxLength = parseInt(document.getElementById('maxLength').value) || 15;
    const fixedLengthInput = document.getElementById('fixedLength').value.trim();
    const fixedLength = fixedLengthInput ? parseInt(fixedLengthInput) : null;
    const count = parseInt(document.getElementById('count').value) || 50;
    const enableAI = document.getElementById('enableAI').checked;

    // 验证
    if (startsWith.length !== 1) {
      alert('起始字母必须是单个字母');
      return;
    }

    if (minLength > maxLength) {
      alert('最小长度不能大于最大长度');
      return;
    }

    // 清空日志和结果
    logContent.innerHTML = '';
    document.getElementById('topDomains').innerHTML = '';
    resultsPanel.style.display = 'block';
    
    addLog('🚀 开始生成域名...', 'info');
    addLog(`配置: 起始=${startsWith}, 排除=${excludeLetters.join(',')}, 长度=${fixedLength || `${minLength}-${maxLength}`}, 数量=${count}`, 'info');
    
    if (enableAI) {
      addLog('⚠️ AI评分已启用，将消耗API额度', 'warning');
    }

    // 设置按钮加载状态
    setButtonLoading(true, '正在生成...');

    // 发送请求（设置超时）
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 120000); // 2分钟超时
    
    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          startsWith,
          excludeLetters,
          minLength,
          maxLength,
          fixedLength,
          count,
          enableAI
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error);
      }

      addLog(`✓ 生成完成: ${result.data.totalGenerated}个域名`, 'success');
      addLog(`✓ 可用域名: ${result.data.totalAvailable}个`, 'success');
      
      if (result.data.scored > 0) {
        addLog(`✓ AI评分完成: ${result.data.scored}个域名`, 'success');
      }

      // 显示结果
      displayResults(result.data);
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    console.error('生成失败:', error);
    
    // 更详细的错误信息
    let errorMessage = '生成失败';
    if (error.message === 'Failed to fetch') {
      errorMessage = '网络连接失败，请检查网络连接后重试';
    } else if (error.message.includes('timeout')) {
      errorMessage = '请求超时，请稍后重试';
    } else {
      errorMessage = `生成失败: ${error.message}`;
    }
    
    addLog(`✗ ${errorMessage}`, 'error');
    alert(errorMessage);
  } finally {
    isGenerating = false;
    setButtonLoading(false);
  }
});

// 显示结果
function displayResults(data) {
  document.getElementById('totalGenerated').textContent = data.totalGenerated;
  document.getElementById('totalAvailable').textContent = data.totalAvailable;

  // 显示AI评分
  if (data.scored > 0) {
    document.getElementById('scoredCard').style.display = 'block';
    document.getElementById('totalScored').textContent = data.scored;

    // 显示Top域名
    const topDomainsDiv = document.getElementById('topDomains');
    topDomainsDiv.innerHTML = '<h3>🏆 AI推荐域名（Top 10）</h3>';

    data.topDomains.forEach((domain, index) => {
      if (domain.success) {
        const card = document.createElement('div');
        card.className = 'domain-card';
        
        // 根据分数设置颜色
        const scoreColor = domain.score >= 85 ? '#4caf50' : 
                          domain.score >= 75 ? '#2196f3' : 
                          domain.score >= 65 ? '#ff9800' : '#f44336';
        
        card.innerHTML = `
          <h3 style="color: ${scoreColor}">${index + 1}. ${domain.domain} - ${domain.score}分</h3>
          <div class="domain-score">
            <span>发音: ${domain.pronunciation}/25</span>
            <span>记忆度: ${domain.memorability}/25</span>
            <span>品牌: ${domain.brandPotential}/20</span>
            <span>视觉: ${domain.visualAppeal}/15</span>
            <span>长度: ${domain.lengthScore}/15</span>
          </div>
          <div class="domain-comment">${domain.comment}</div>
        `;
        topDomainsDiv.appendChild(card);
      }
    });
  } else {
    document.getElementById('scoredCard').style.display = 'none';
    document.getElementById('topDomains').innerHTML = '';
  }

  resultsPanel.style.display = 'block';
  resultsPanel.scrollIntoView({ behavior: 'smooth' });
}

// 初始化
setupInputValidation();
addLog('✓ 系统就绪，等待生成任务...', 'success');

// 键盘快捷键
document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 'Enter') {
    generateBtn.click();
  }
});
