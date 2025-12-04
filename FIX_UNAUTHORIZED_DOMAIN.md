# 修复 Firebase 未授权域名错误

## 🔴 错误信息
```
Firebase: Error (auth/unauthorized-domain)
```

这个错误表示您当前访问的域名没有在 Firebase 控制台的授权域名列表中。

## ✅ 解决方案

### 步骤 1：访问 Firebase 控制台

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 选择您的项目：**mystical-moon-470013-v2**
3. 点击左侧菜单的 **Authentication（身份验证）**
4. 点击 **Settings（设置）** 标签页
5. 向下滚动到 **Authorized domains（授权域名）** 部分

### 步骤 2：添加授权域名

根据您的情况，添加以下域名：

#### 如果是本地开发：
- `localhost`
- `127.0.0.1`（如果需要）

#### 如果是部署后的域名：
- 您的完整域名，例如：`your-app.zeabur.app`
- 或者：`your-custom-domain.com`

### 步骤 3：添加域名

1. 在 **Authorized domains** 列表中，点击 **Add domain（添加域名）**
2. 输入域名（例如：`localhost` 或您的部署域名）
3. 点击 **Add（添加）**
4. 等待几秒钟让更改生效

### 步骤 4：重新测试

1. 刷新您的应用页面
2. 再次尝试 Google 登录
3. 应该可以正常工作了

## 📝 常见域名列表

根据您的使用场景，可能需要添加：

### 本地开发
```
localhost
127.0.0.1
```

### Zeabur 部署
```
your-app.zeabur.app
```

### 自定义域名
```
your-custom-domain.com
www.your-custom-domain.com
```

## ⚠️ 注意事项

1. **不要添加通配符**：Firebase 不支持 `*.example.com` 这样的通配符
2. **每个子域名都需要单独添加**：`www.example.com` 和 `example.com` 需要分别添加
3. **更改可能需要几分钟生效**：添加域名后，等待 1-2 分钟再测试
4. **默认已包含的域名**：
   - `mystical-moon-470013-v2.firebaseapp.com`（Firebase 托管域名）
   - `mystical-moon-470013-v2.web.app`（Firebase 托管域名）

## 🔍 如何确认当前域名

在浏览器控制台运行：
```javascript
console.log(window.location.hostname);
```

这会显示您当前访问的域名，确保在 Firebase 控制台中添加了这个域名。

## 🚀 快速检查清单

- [ ] 已访问 Firebase 控制台
- [ ] 已选择正确的项目（mystical-moon-470013-v2）
- [ ] 已打开 Authentication > Settings
- [ ] 已找到 Authorized domains 部分
- [ ] 已添加当前使用的域名
- [ ] 已等待 1-2 分钟让更改生效
- [ ] 已刷新应用页面
- [ ] 已重新尝试登录










