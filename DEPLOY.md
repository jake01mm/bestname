# 🚀 Railway 部署教程

本教程将指导你如何将智能域名生成器部署到 Railway。

## 📋 前置准备

1. **GitHub 账号**：用于托管代码
2. **Railway 账号**：访问 [railway.app](https://railway.app/) 注册
3. **OpenRouter API Key**：访问 [openrouter.ai](https://openrouter.ai/) 获取
4. **Neon 数据库**：已经配置好（或使用 Railway 自带的 PostgreSQL）

## 🎯 部署步骤

### 步骤 1：推送代码到 GitHub

代码已经推送到你的 GitHub 仓库。

### 步骤 2：登录 Railway

1. 访问 [railway.app](https://railway.app/)
2. 点击 "Login" 使用 GitHub 账号登录
3. 授权 Railway 访问你的 GitHub 仓库

### 步骤 3：创建新项目

1. 点击 "New Project"
2. 选择 "Deploy from GitHub repo"
3. 选择你的 `bestname` 仓库
4. Railway 会自动检测到 Node.js 项目并开始部署

### 步骤 4：配置环境变量

1. 在项目页面，点击你的服务
2. 切换到 "Variables" 标签
3. 添加以下环境变量：

```
OPENROUTER_API_KEY=你的OpenRouter API Key
DATABASE_URL=你的PostgreSQL连接字符串
PORT=3000
```

**获取 DATABASE_URL：**
- 如果使用 Neon：复制你的连接字符串
- 如果使用 Railway PostgreSQL：
  1. 点击 "New" → "Database" → "Add PostgreSQL"
  2. Railway 会自动创建 `DATABASE_URL` 变量

### 步骤 5：配置部署设置（可选）

1. 切换到 "Settings" 标签
2. 在 "Deploy" 部分：
   - **Start Command**: `npm start`（Railway 会自动检测）
   - **Build Command**: `npm install`（Railway 会自动检测）

### 步骤 6：生成公开域名

1. 在 "Settings" 标签中
2. 找到 "Networking" 部分
3. 点击 "Generate Domain"
4. Railway 会生成一个类似 `your-app.up.railway.app` 的域名

### 步骤 7：初始化数据库

部署完成后，数据库表会在第一次访问时自动创建（通过 `database.js` 中的 `initDatabase()` 函数）。

### 步骤 8：访问应用

1. 复制生成的域名
2. 在浏览器中访问
3. 开始使用你的域名生成器！

## 🔧 常见问题

### Q: 部署失败怎么办？

**A:** 检查以下几点：
1. 环境变量是否正确配置
2. 查看 "Deployments" 标签中的日志
3. 确保 `package.json` 中有正确的 `start` 脚本

### Q: 数据库连接失败？

**A:** 
1. 检查 `DATABASE_URL` 格式是否正确
2. 确保包含 `?sslmode=require` 参数
3. 如果使用 Neon，确保数据库没有暂停

### Q: 如何查看日志？

**A:** 
1. 在项目页面点击你的服务
2. 切换到 "Deployments" 标签
3. 点击最新的部署查看实时日志

### Q: 如何更新代码？

**A:** 
1. 推送代码到 GitHub
2. Railway 会自动检测并重新部署
3. 或者在 Railway 中手动点击 "Deploy"

### Q: 免费额度够用吗？

**A:** 
- Railway 提供 $5/月 的免费额度
- 对于小型项目完全够用
- 可以在 "Usage" 标签中查看使用情况

## 💰 费用说明

- **Railway**：$5/月 免费额度，超出按使用量计费
- **Neon**：免费套餐包含 0.5GB 存储
- **OpenRouter**：按 API 调用计费，Claude 3.5 Sonnet 约 $3/百万 tokens

## 🎉 部署成功！

现在你的域名生成器已经在线运行了！

**下一步：**
- 分享你的应用链接
- 监控使用情况和日志
- 根据需要调整配置

## 🔗 有用的链接

- [Railway 文档](https://docs.railway.app/)
- [Railway 社区](https://discord.gg/railway)
- [Neon 文档](https://neon.tech/docs)
- [OpenRouter 文档](https://openrouter.ai/docs)

## 📞 需要帮助？

如果遇到问题，可以：
1. 查看 Railway 的部署日志
2. 检查环境变量配置
3. 参考 Railway 官方文档
4. 在项目 Issues 中提问
