# 🌐 智能域名生成器

AI驱动的域名生成、检测和评分工具，帮助你快速找到完美的域名。

## ✨ 功能特点

- 🎯 **智能生成**：基于音节和字母组合的域名生成算法
- 🔍 **精准检测**：使用RDAP协议准确检测域名可用性
- 🤖 **AI评分**：Claude AI对域名进行多维度评分（发音、记忆度、品牌潜力等）
- 💾 **数据库存储**：PostgreSQL存储所有域名数据，避免重复检测
- 📚 **域名库**：可视化浏览所有可用域名，支持搜索、筛选、排序
- 🎨 **现代UI**：赛博朋克风格的厚涂UI设计

## 🛠️ 技术栈

- **后端**：Node.js + Express
- **数据库**：PostgreSQL (Neon)
- **AI**：OpenRouter API (Claude 3.5 Sonnet)
- **前端**：原生 HTML/CSS/JavaScript

## 📦 安装

```bash
# 克隆仓库
git clone <your-repo-url>
cd bestname

# 安装依赖
npm install

# 配置环境变量
cp .env.example .env
# 编辑 .env 文件，填入你的配置
```

## ⚙️ 环境变量

创建 `.env` 文件并配置以下变量：

```env
# OpenRouter API Key (用于AI评分)
OPENROUTER_API_KEY=your_openrouter_api_key

# PostgreSQL 数据库连接
DATABASE_URL=your_postgresql_connection_string

# 服务器端口 (可选，默认3000)
PORT=3000
```

## 🚀 运行

```bash
# 开发模式
npm run dev

# 生产模式
npm start
```

访问 http://localhost:3000

## 📖 使用说明

1. **配置生成规则**
   - 设置起始字母
   - 排除不想要的字母
   - 设置域名长度范围
   - 选择生成数量

2. **启用AI评分**（可选）
   - 勾选"启用AI评分"
   - AI会对前20个可用域名进行评分
   - 评分维度：发音、记忆度、品牌潜力、视觉吸引力、长度

3. **查看结果**
   - 实时查看生成进度
   - 查看AI推荐的Top域名
   - 在域名库中浏览所有历史记录

## 📁 项目结构

```
bestname/
├── public/              # 前端文件
│   ├── index.html      # 主页
│   ├── library.html    # 域名库页面
│   ├── app.js          # 主页逻辑
│   ├── library.js      # 域名库逻辑
│   └── style.css       # 样式文件
├── server.js           # Express服务器
├── domainGenerator.js  # 域名生成算法
├── domainChecker.js    # 域名可用性检测
├── aiScorer.js         # AI评分模块
├── database.js         # 数据库操作
├── package.json        # 项目配置
└── .env               # 环境变量（不提交到git）
```

## 🌍 部署到 Railway

详见 [DEPLOY.md](./DEPLOY.md)

## 📝 API 接口

### POST /api/generate
生成域名并检测可用性

**请求体：**
```json
{
  "startsWith": "n",
  "excludeLetters": ["l", "z", "x"],
  "minLength": 4,
  "maxLength": 8,
  "count": 30,
  "enableAI": true
}
```

### GET /api/domains
获取域名列表

**查询参数：**
- `limit`: 每页数量
- `offset`: 偏移量
- `minScore`: 最低评分
- `orderBy`: 排序字段
- `order`: 排序方向
- `search`: 搜索关键词

### GET /api/stats
获取统计信息

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 许可证

MIT License

## 🙏 致谢

- [OpenRouter](https://openrouter.ai/) - AI API服务
- [Neon](https://neon.tech/) - PostgreSQL云数据库
- [Anthropic Claude](https://www.anthropic.com/) - AI评分模型
