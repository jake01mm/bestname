# 🚂 Railway CLI 部署指南

使用 Railway CLI 可以直接从命令行部署和管理你的项目。

## ✅ 已安装

Railway CLI 版本: 4.27.6

## 🚀 快速部署步骤

### 1. 登录 Railway

```bash
railway login
```

这会打开浏览器，使用 GitHub 账号登录 Railway。

### 2. 初始化项目

在项目目录中运行：

```bash
railway init
```

选择：
- **Create a new project** (创建新项目)
- 输入项目名称（如：`bestname`）

### 3. 链接到现有项目（可选）

如果你已经在 Railway 网页上创建了项目：

```bash
railway link
```

选择你的项目。

### 4. 设置环境变量

```bash
# 设置 OpenRouter API Key
railway variables set OPENROUTER_API_KEY=你的API密钥

# 设置数据库连接
railway variables set DATABASE_URL=你的数据库连接字符串

# 设置端口（可选）
railway variables set PORT=3000
```

或者一次性设置多个：

```bash
railway variables set \
  OPENROUTER_API_KEY=sk-or-v1-xxx \
  DATABASE_URL=postgresql://xxx \
  PORT=3000
```

### 5. 部署项目

```bash
railway up
```

Railway 会：
- 上传你的代码
- 安装依赖
- 构建项目
- 启动服务

### 6. 查看部署状态

```bash
# 查看部署日志
railway logs

# 查看最近的日志
railway logs --tail

# 查看实时日志
railway logs --follow
```

### 7. 生成公开域名

```bash
railway domain
```

这会生成一个公开访问的域名。

### 8. 打开项目

```bash
# 在浏览器中打开项目
railway open

# 在浏览器中打开 Railway 控制台
railway dashboard
```

## 📋 常用命令

### 项目管理

```bash
# 查看项目状态
railway status

# 查看项目信息
railway whoami

# 列出所有项目
railway list

# 切换项目
railway link
```

### 环境变量

```bash
# 查看所有环境变量
railway variables

# 设置环境变量
railway variables set KEY=VALUE

# 删除环境变量
railway variables delete KEY
```

### 部署管理

```bash
# 部署项目
railway up

# 部署并跟踪日志
railway up --detach=false

# 重新部署
railway redeploy
```

### 日志查看

```bash
# 查看日志
railway logs

# 实时查看日志
railway logs --follow

# 查看最近100行日志
railway logs --tail 100
```

### 数据库管理

```bash
# 添加 PostgreSQL 数据库
railway add --database postgres

# 连接到数据库
railway connect postgres
```

### 域名管理

```bash
# 生成域名
railway domain

# 查看域名
railway domain list
```

## 🎯 完整部署流程

```bash
# 1. 登录
railway login

# 2. 初始化项目
railway init

# 3. 设置环境变量
railway variables set OPENROUTER_API_KEY=你的密钥
railway variables set DATABASE_URL=你的数据库连接

# 4. 部署
railway up

# 5. 生成域名
railway domain

# 6. 查看日志
railway logs --follow

# 7. 在浏览器中打开
railway open
```

## 💡 高级用法

### 使用 .env 文件批量设置变量

```bash
# 从 .env 文件导入变量（Railway 会自动读取）
railway up
```

### 多环境管理

```bash
# 创建新环境
railway environment

# 切换环境
railway environment switch production
```

### 本地开发

```bash
# 使用 Railway 环境变量运行本地服务
railway run npm run dev

# 这会自动加载 Railway 的环境变量到本地
```

### 回滚部署

```bash
# 查看部署历史
railway deployments

# 回滚到指定部署
railway rollback <deployment-id>
```

## 🔧 故障排查

### 登录失败

```bash
# 清除登录状态重新登录
railway logout
railway login
```

### 部署失败

```bash
# 查看详细日志
railway logs --tail 200

# 检查环境变量
railway variables

# 重新部署
railway redeploy
```

### 环境变量未生效

```bash
# 确认变量已设置
railway variables

# 重新部署以应用变量
railway up
```

## 📚 有用的资源

- **Railway CLI 文档**: https://docs.railway.app/develop/cli
- **Railway 文档**: https://docs.railway.app/
- **Railway Discord**: https://discord.gg/railway
- **GitHub 仓库**: https://github.com/railwayapp/cli

## 🎉 快捷命令速查

```bash
railway login          # 登录
railway init           # 初始化项目
railway up             # 部署
railway logs -f        # 实时日志
railway open           # 打开应用
railway dashboard      # 打开控制台
railway variables      # 查看变量
railway status         # 查看状态
railway domain         # 生成域名
```

## 💰 费用提醒

- Railway 提供 $5/月 免费额度
- 使用 `railway status` 查看资源使用情况
- 在 Railway 控制台的 Usage 标签查看详细费用

---

**现在你可以开始部署了！运行 `railway login` 开始。** 🚀
