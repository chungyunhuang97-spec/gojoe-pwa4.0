# Zeabur 部署指南

本指南将帮助您将 Go Joe 应用部署到 Zeabur 平台。

## 📋 前置要求

1. **GitHub 账户** - 需要将代码推送到 GitHub
2. **Zeabur 账户** - 访问 [zeabur.com](https://zeabur.com) 注册
3. **Firebase 项目** - 确保您有 Firebase 配置信息
4. **Gemini API Key** - 从 Google AI Studio 获取

## 🚀 部署步骤

### 1. 将代码推送到 GitHub

```bash
# 如果还没有初始化 git
git init
git add .
git commit -m "Initial commit"

# 在 GitHub 创建新仓库，然后推送
git remote add origin <你的GitHub仓库URL>
git branch -M main
git push -u origin main
```

### 2. 在 Zeabur 上创建新服务

1. 登录 [Zeabur 控制台](https://dash.zeabur.com)
2. 点击 **"Deploy New Service"** 或 **"Add new service"**
3. 选择 **"Deploy your source code"**
4. 连接您的 GitHub 账户（如果还没连接）
5. 选择您的仓库并点击 **"Import"**

### 3. 配置环境变量

在 Zeabur 服务设置中，添加以下环境变量：

#### Firebase 配置（必需）
```
VITE_FIREBASE_API_KEY=你的Firebase_API_Key
VITE_FIREBASE_AUTH_DOMAIN=你的Firebase_Auth_Domain
VITE_FIREBASE_PROJECT_ID=你的Firebase_Project_ID
VITE_FIREBASE_STORAGE_BUCKET=你的Firebase_Storage_Bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=你的Firebase_Messaging_Sender_ID
VITE_FIREBASE_APP_ID=你的Firebase_App_ID
```

#### Gemini API Key（可选，但推荐）
```
VITE_GEMINI_API_KEY=你的Gemini_API_Key
```

**注意：** 如果未设置 `VITE_GEMINI_API_KEY`，用户需要在应用中手动输入 API Key。

### 4. 部署配置

项目已包含 `zbpack.json` 配置文件，Zeabur 会自动识别：
- **构建命令**: `npm run build`
- **输出目录**: `dist`

无需额外配置，Zeabur 会自动：
1. 安装依赖 (`npm install`)
2. 执行构建 (`npm run build`)
3. 部署 `dist` 文件夹中的静态文件

### 5. 开始部署

完成配置后，Zeabur 会自动开始部署。您可以在控制台查看部署日志。

### 6. 访问应用

部署完成后，Zeabur 会提供一个自动生成的域名（例如：`your-app.zeabur.app`）。您也可以：
- 在服务设置中配置自定义域名
- 启用 HTTPS（Zeabur 自动提供）

## 🔧 故障排除

### 构建失败

1. **检查 Node.js 版本**：确保 Zeabur 使用 Node.js 18+ 版本
   - 可以在项目根目录创建 `.nvmrc` 文件指定版本：
     ```
     18
     ```

2. **检查环境变量**：确保所有必需的环境变量都已设置

3. **查看构建日志**：在 Zeabur 控制台的部署日志中查看详细错误信息

### 运行时错误

1. **检查 Firebase 配置**：确保所有 Firebase 环境变量正确设置
2. **检查 API Key**：确保 Gemini API Key 有效（如果设置了）
3. **检查浏览器控制台**：查看是否有 JavaScript 错误

## 📝 注意事项

1. **静态文件部署**：这是一个 Vite 构建的静态网站，Zeabur 会自动配置为静态文件托管
2. **环境变量**：所有以 `VITE_` 开头的环境变量会在构建时注入到代码中
3. **Firebase Functions**：如果使用 Firebase Functions，需要单独部署到 Firebase，而不是 Zeabur
4. **API Key 安全**：虽然 `VITE_` 前缀的环境变量会暴露在前端代码中，但这是 Vite 的标准做法。对于敏感信息，建议使用后端 API

## 🔄 更新部署

每次推送到 GitHub 的 main 分支，Zeabur 会自动触发重新部署。您也可以：
- 在 Zeabur 控制台手动触发重新部署
- 配置特定分支自动部署

## 📚 相关资源

- [Zeabur 官方文档](https://zeabur.com/docs)
- [Vite 部署指南](https://vitejs.dev/guide/static-deploy.html)
- [Firebase 配置文档](https://firebase.google.com/docs/web/setup)

