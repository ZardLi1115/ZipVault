# ZipVault

**面向 ZIP 压缩包的本地可视化 Git 版本管理工具。**

ZipVault 是一个本地运行的可视化 Git 版本管理工具，面向不想接触 Git 命令行的产品经理、设计师、运营和个人创作者。

你只需要把项目文件夹打成 ZIP 上传，填写版本备注，ZipVault 会在背后用 Git 自动保存版本。所有数据默认只存储在本机。

发布者：**ZardLi1115**

## 亮点

- **本地优先**：运行在 `localhost`，项目文件和 Git 仓库都保存在你的磁盘上。
- **可视化 Git**：通过网页界面查看提交历史、Diff、分支操作、回滚和冲突解决。
- **ZIP 工作流**：通过上传 ZIP 压缩包管理文件夹版本，不需要学习 Git 命令。
- **安全回滚**：回滚会创建新的提交，不会删除历史记录。
- **自定义版本号**：可以为提交添加和修改易读的版本标签，不影响 Git 哈希。
- **仓库描述**：可以为每个本地 Git 仓库添加和编辑说明。
- **删除版本记录**：从界面隐藏某个版本记录，不重写 Git 历史。
- **分支与合并**：在本地创建、切换、删除和合并分支。
- **冲突解决引导**：用结构化界面处理合并冲突，不必直接面对原始冲突标记。

## 页面

- 仓库列表
- 版本历史
- ZIP 上传提交
- 文件级与行级 Diff
- 分支管理
- 冲突解决

## 技术栈

- 前端：React、Vite、React Router、Tailwind CSS
- 后端：Node.js、Express、simple-git、multer、unzipper、archiver
- 存储：`repos/` 下的本地 Git 仓库

## 环境要求

- Node.js 20 或更高版本
- Git
- macOS、Linux，或安装了 Git 的 Windows

## 快速开始

安装依赖并同时启动前后端：

```bash
npm install
npm run dev
```

然后打开：

```text
http://localhost:3000
```

后端 API：

```text
http://localhost:3001/api
```

## macOS 一键启动

在 macOS 上可以直接双击：

```text
启动 ZipVault.command
```

该脚本会在需要时安装依赖，启动前端和后端，并自动打开浏览器。

## 工作原理

1. 创建一个本地 ZipVault 仓库。
2. 上传 ZIP 压缩包并填写版本备注。
3. 后端将 ZIP 解压到本地 Git 工作区。
4. ZipVault 自动执行 `git add -A` 并创建提交。
5. 前端展示历史、Diff、回滚、分支和冲突解决界面。

## 项目结构

```text
ZipVault/
├── backend/             # Express API 和 Git 操作
├── frontend/            # React + Vite Web 界面
├── repos/               # 本地用户仓库，已被 Git 忽略
├── data/                # 本地元数据，已被 Git 忽略
├── tmp/                 # 临时上传和解压目录，已被 Git 忽略
├── 启动 ZipVault.command # macOS 一键启动脚本
└── README.md
```

## 运行时数据

ZipVault 将用户仓库和元数据保存在本机：

```text
repos/
data/
tmp/
```

这些目录已被 `.gitignore` 忽略，不会作为源码仓库内容上传。

## 脚本

```bash
npm run dev          # 启动前端和后端
npm run dev:backend  # 只启动后端
npm run dev:frontend # 只启动前端
npm run build        # 构建前端
npm start            # 启动后端
```

## API 概览

- `POST /api/repos` - 创建本地仓库
- `GET /api/repos` - 列出仓库
- `PATCH /api/repos/:id` - 修改仓库描述
- `POST /api/repos/:id/commit` - 上传 ZIP 并创建版本
- `GET /api/repos/:id/commits` - 查看版本历史
- `PATCH /api/repos/:id/commits/:hash/version` - 修改自定义版本号
- `DELETE /api/repos/:id/commits/:hash` - 删除版本记录
- `GET /api/repos/:id/diff` - 文件级 Diff
- `GET /api/repos/:id/diff/file` - 行级 Diff
- `POST /api/repos/:id/revert` - 安全回滚
- `GET /api/repos/:id/download` - 下载指定版本
- `GET /api/repos/:id/branches` - 列出分支
- `POST /api/repos/:id/branches` - 创建分支
- `POST /api/repos/:id/checkout` - 切换分支
- `POST /api/repos/:id/merge` - 合并分支
- `POST /api/repos/:id/resolve` - 提交冲突解决结果

## 说明

- ZipVault 面向个人本地使用，当前不包含登录鉴权或远程 Git 同步。
- 二进制文件可以纳入版本并下载，但内容级 Diff 仅支持文本文件。
- 删除版本记录只会从界面隐藏，不会重写 Git 历史。
