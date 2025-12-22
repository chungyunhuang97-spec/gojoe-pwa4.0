# Cursor Git 使用指南

## ✅ Cursor 的 Git 集成

Cursor 基于 VS Code，内置了完整的 Git 支持。您可以在 Cursor 中直接使用 Git，无需额外配置。

## 🎯 在 Cursor 中使用 Git

### 1. 查看 Git 状态

**方法一：使用侧边栏**
- 点击左侧边栏的 **源代码管理** 图标（分支图标）
- 或使用快捷键：`Ctrl+Shift+G` (Windows/Linux) 或 `Cmd+Shift+G` (Mac)

**方法二：使用命令面板**
- 按 `Cmd+Shift+P` (Mac) 或 `Ctrl+Shift+P` (Windows/Linux)
- 输入 "Git" 查看所有 Git 命令

### 2. 提交更改

1. 在源代码管理面板中，您会看到所有更改的文件
2. 点击文件旁边的 **+** 号来暂存文件（或点击 "暂存所有更改"）
3. 在上方输入框输入提交信息
4. 点击 **✓** 提交按钮（或按 `Cmd+Enter`）

### 3. 查看更改

- 点击文件可以查看具体的更改内容
- 绿色表示新增，蓝色表示修改，红色表示删除

### 4. 创建分支

- 点击左下角的分支名称
- 选择 "创建新分支"
- 输入分支名称

## 🔗 连接到 GitHub

### 方法一：使用 Cursor 内置功能

1. **首次推送**
   - 在源代码管理面板，点击 **"..."** 菜单
   - 选择 **"推送"** 或 **"发布分支"**
   - 如果还没有远程仓库，Cursor 会提示您创建

2. **添加远程仓库**
   - 打开终端（`` Ctrl+` `` 或 `Cmd+`）
   - 运行以下命令：
     ```bash
     git remote add origin https://github.com/你的用户名/你的仓库名.git
     ```

### 方法二：使用终端命令

```bash
# 1. 添加所有文件
git add .

# 2. 提交更改
git commit -m "初始提交：准备部署到 Zeabur"

# 3. 添加远程仓库（在 GitHub 创建仓库后）
git remote add origin https://github.com/你的用户名/你的仓库名.git

# 4. 推送到 GitHub
git branch -M main
git push -u origin main
```

## 📋 常用 Git 命令（在 Cursor 终端中）

```bash
# 查看状态
git status

# 查看更改
git diff

# 查看提交历史
git log

# 拉取最新更改
git pull

# 推送到远程
git push

# 切换分支
git checkout 分支名

# 创建并切换到新分支
git checkout -b 新分支名
```

## 🔐 配置 Git 用户信息（首次使用）

如果这是您第一次使用 Git，需要配置用户信息：

```bash
git config --global user.name "您的姓名"
git config --global user.email "您的邮箱"
```

## 💡 提示

1. **提交前检查**：提交前务必检查 `.gitignore` 确保敏感文件（如 `.env`）不会被提交
2. **提交信息**：写清晰的提交信息，例如：
   - "修复：修复 build 错误"
   - "功能：添加 Zeabur 部署配置"
   - "文档：更新部署指南"
3. **定期提交**：建议经常提交，保持代码历史清晰
4. **分支管理**：对于重要功能，建议创建新分支开发

## 🚨 常见问题

### Q: 如何撤销更改？
A: 在源代码管理面板，右键点击文件，选择 "丢弃更改"

### Q: 如何查看提交历史？
A: 使用命令面板（`Cmd+Shift+P`），输入 "Git: View History"

### Q: 如何解决冲突？
A: Cursor 会高亮显示冲突，您可以手动选择保留哪个版本

### Q: 如何忽略文件？
A: 编辑 `.gitignore` 文件，添加要忽略的文件或文件夹名称

## 📚 下一步

现在您的项目已经初始化了 Git，可以：
1. 在 Cursor 中提交更改
2. 在 GitHub 创建仓库
3. 推送到 GitHub
4. 在 Zeabur 中连接 GitHub 仓库进行部署

