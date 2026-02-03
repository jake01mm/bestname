# ▲ Vercel CLI 部署指南

使用 Vercel CLI 可以快速部署你的项目到全球 CDN。

## ✅ 已安装

Vercel CLI 版本: 50.9.6

## ⚠️ 重要提示

Vercel 的 Serverless 函数有 **10秒超时限制**（免费版），这可能不适合域名检测功能（因为需要检查多个域名）。

**推荐使用 Railway** 进行部署，因为：
- ✅ 无超时限制
- ✅ 支持长时间运行的任务
- ✅ 更适合域名检测场景

但如果你想尝试 Vercel，可以按照以下步骤操作。

## 🚀 快速部署步骤

### 1. 登录 Vercel

```bash
vercel login
```

选择登录方式：
- GitHub
- GitLab
- Bitbucket
- Email

### 2. 部署项目

在项目目录中运行：

```bash
vercel
```

首次部署会询问：
- **Set up and deploy?** → Yes
- **Which scope?** → 选择你的账号
- **Link to existing project?** → No
- **What's your project's name?** → bestname
- **In which directory is your code located?** → ./
- **Want to override the settings?** → No

### 3. 设置环境变量

```bash
# 添加 OpenRouter API Key
vercel env add OPENROUTER_API_KEY

# 添加数据库连接
vercel env add DATABASE_URL

# 选择环境：Production, Preview, Development
# 建议选择 Production
```

或者使用 Vercel 网页控制台：
1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. Settings → Environment Variables
4. 添加变量

### 4. 重新部署（应用环境变量）

```bash
vercel --prod
```

### 5. 查看部署

```bash
# 在浏览器中打开项目
vercel open

# 查看部署列表
vercel ls

# 查看部署日志
vercel logs
```

## 📋 常用命令

### 部署管理

```bash
# 部署到预览环境
vercel

# 部署到生产环境
vercel --prod

# 查看部署列表
vercel ls

# 查看部署详情
vercel inspect <deployment-url>

# 删除部署
vercel rm <deployment-name>
```

### 环境变量

```bash
# 添加环境变量
vercel env add <name>

# 列出环境变量
vercel env ls

# 删除环境变量
vercel env rm <name>

# 拉取环境变量到本地
vercel env pull
```

### 项目管理

```bash
# 查看项目信息
vercel project ls

# 链接到现有项目
vercel link

# 在浏览器中打开项目
vercel open

# 查看域名
vercel domains ls
```

### 日志查看

```bash
# 查看实时日志
vercel logs <deployment-url>

# 查看最近的日志
vercel logs <deployment-url> --follow
```

### 本地开发

```bash
# 使用 Vercel 环境运行本地服务
vercel dev

# 指定端口
vercel dev --listen 3000
```

## 🎯 完整部署流程

```bash
# 1. 登录
vercel login

# 2. 首次部署
vercel

# 3. 设置环境变量
vercel env add OPENROUTER_API_KEY
vercel env add DATABASE_URL

# 4. 部署到生产环境
vercel --prod

# 5. 在浏览器中打开
vercel open
```

## ⚙️ 配置文件说明

项目已包含 `vercel.json` 配置文件：

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    },
    {
      "src": "public/**",
      "use": "@vercel/static"
    }
  ],
  "routes": [
    {
      "src": "/api/(.*)",
      "dest": "server.js"
    },
    {
      "src": "/(.*\\.(js|css|html))",
      "dest": "public/$1"
    },
    {
      "src": "/(.*)",
      "dest": "server.js"
    }
  ]
}
```

## ⚠️ Vercel 限制

### 免费版限制

- ⏱️ **函数超时**: 10秒（Hobby）/ 60秒（Pro）
- 💾 **函数大小**: 50MB
- 🔄 **并发执行**: 1000个函数
- 📊 **带宽**: 100GB/月

### 对本项目的影响

由于域名检测需要：
1. 生成多个域名
2. 逐个检查可用性（DNS + HTTP）
3. AI 批量评分

**可能会超过10秒超时限制**，导致部署失败或功能异常。

## 💡 优化建议

如果坚持使用 Vercel，可以：

1. **减少生成数量**
   - 限制每次生成 5-10 个域名
   - 分批处理

2. **优化检测速度**
   - 减少超时时间
   - 并发检测

3. **禁用 AI 评分**
   - AI 评分耗时较长
   - 可以后续手动评分

4. **使用 Vercel Edge Functions**
   - 更快的响应时间
   - 但功能有限

## 🔄 从 Vercel 迁移到 Railway

如果 Vercel 不适合，可以轻松迁移到 Railway：

```bash
# 1. 安装 Railway CLI
brew install railway

# 2. 登录
railway login

# 3. 初始化项目
railway init

# 4. 设置环境变量
railway variables set OPENROUTER_API_KEY=你的密钥
railway variables set DATABASE_URL=你的数据库连接

# 5. 部署
railway up
```

## 🔧 故障排查

### 部署超时

```bash
# 查看日志
vercel logs <deployment-url>

# 检查函数执行时间
# 如果超过10秒，考虑：
# 1. 减少生成数量
# 2. 优化代码
# 3. 使用 Railway
```

### 环境变量未生效

```bash
# 确认变量已设置
vercel env ls

# 拉取到本地测试
vercel env pull

# 重新部署
vercel --prod
```

### 函数错误

```bash
# 查看详细日志
vercel logs <deployment-url> --follow

# 本地测试
vercel dev
```

## 📚 有用的资源

- **Vercel CLI 文档**: https://vercel.com/docs/cli
- **Vercel 文档**: https://vercel.com/docs
- **Vercel 社区**: https://github.com/vercel/vercel/discussions
- **Vercel 状态**: https://www.vercel-status.com/

## 🎉 快捷命令速查

```bash
vercel login           # 登录
vercel                 # 部署到预览
vercel --prod          # 部署到生产
vercel logs            # 查看日志
vercel open            # 打开项目
vercel dev             # 本地开发
vercel env ls          # 查看变量
vercel ls              # 查看部署
vercel domains ls      # 查看域名
```

## 🆚 Vercel vs Railway

| 特性 | Vercel | Railway |
|------|--------|---------|
| 超时限制 | 10秒（免费） | 无限制 |
| 适合场景 | 静态网站、API | 长时间任务 |
| 部署速度 | 极快 | 快 |
| 全球 CDN | ✅ | ❌ |
| 数据库 | 需外部 | 内置支持 |
| 价格 | 免费 | $5/月免费额度 |
| **推荐度** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## 🎯 建议

**对于本项目，强烈推荐使用 Railway**，因为：
- ✅ 无超时限制
- ✅ 更适合域名检测场景
- ✅ 支持长时间运行的任务
- ✅ 内置数据库支持

如果你想要极快的静态资源加载，可以考虑：
- 前端部署到 Vercel
- 后端 API 部署到 Railway

---

**现在你可以选择部署平台了！** 🚀

- **推荐**: `railway login` → `railway up`
- **尝试**: `vercel login` → `vercel --prod`
