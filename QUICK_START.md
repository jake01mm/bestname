# ⚡ 快速开始 - Railway 部署

## 🎯 一键部署（最简单）

1. **访问 Railway**
   - 打开 https://railway.app/
   - 使用 GitHub 登录

2. **导入项目**
   - 点击 "New Project"
   - 选择 "Deploy from GitHub repo"
   - 选择 `jake01mm/bestname`

3. **配置环境变量**
   
   点击项目 → Variables → 添加以下变量：
   
   ```
   OPENROUTER_API_KEY=你的API密钥
   DATABASE_URL=你的数据库连接字符串
   ```

4. **生成域名**
   
   Settings → Networking → Generate Domain

5. **完成！**
   
   访问生成的域名，开始使用！

---

## 📝 详细说明

### 获取 OpenRouter API Key

1. 访问 https://openrouter.ai/
2. 注册/登录账号
3. 进入 Keys 页面
4. 创建新的 API Key
5. 复制密钥（格式：`sk-or-v1-...`）

### 数据库选项

**选项 1：使用现有的 Neon 数据库**
```
DATABASE_URL=你的Neon数据库连接字符串
```

**选项 2：创建新的 Railway PostgreSQL**
1. 在 Railway 项目中点击 "New"
2. 选择 "Database" → "Add PostgreSQL"
3. Railway 会自动创建 `DATABASE_URL` 变量

### 验证部署

部署成功后，访问你的域名：
- 主页：`https://your-app.up.railway.app/`
- 域名库：`https://your-app.up.railway.app/library.html`

---

## 🔧 故障排查

### 部署失败？

1. 检查 Deployments 标签的日志
2. 确认环境变量格式正确
3. 确保 GitHub 仓库已同步

### 数据库连接失败？

1. 检查 `DATABASE_URL` 是否包含 `?sslmode=require`
2. 测试数据库连接是否正常
3. 查看 Railway 日志中的错误信息

### 页面无法访问？

1. 确认域名已生成
2. 等待 1-2 分钟让部署完成
3. 检查 Railway 服务状态

---

## 💡 提示

- Railway 免费提供 $5/月 额度
- 可以在 Usage 标签查看使用情况
- 推送代码到 GitHub 会自动重新部署
- 建议启用 GitHub Actions 进行 CI/CD

---

## 📞 需要帮助？

- GitHub Issues: https://github.com/jake01mm/bestname/issues
- Railway 文档: https://docs.railway.app/
- Railway Discord: https://discord.gg/railway

---

**🎉 祝你部署顺利！**
