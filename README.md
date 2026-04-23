# ZipVault

**Local, visual Git version management for ZIP archives.**

**ZipVault 是一个本地运行的可视化 Git 版本管理工具，面向不想接触 Git 命令行的产品经理、设计师、运营和个人创作者。**

Upload a project folder as a ZIP file, write a version note, and ZipVault records it as a Git commit behind a clean web interface. Your data stays on your machine.

你只需要把项目文件夹打成 ZIP 上传，填写版本备注，ZipVault 会在背后用 Git 自动保存版本。所有数据默认只存储在本机。

## Highlights / 亮点

- **Local-first / 本地优先**: runs on `localhost`; project files and Git repositories stay on your disk.
- **Visual Git / 可视化 Git**: commit history, Diff, branch operations, rollback, and conflict resolution through a web UI.
- **ZIP workflow / ZIP 工作流**: version a folder by uploading ZIP archives instead of learning Git commands.
- **Safe rollback / 安全回滚**: rollback creates a new commit instead of deleting history.
- **Custom version labels / 自定义版本号**: attach and edit human-friendly version numbers without changing Git hashes.
- **Soft delete records / 删除版本记录**: hide a version from the UI without rewriting Git history.
- **Branch and merge support / 分支与合并**: create, switch, delete, and merge branches locally.
- **Conflict guidance / 冲突解决引导**: resolve merge conflicts with a structured interface instead of raw conflict markers.

## Screens / 页面

- Repository list / 仓库列表
- Version history / 版本历史
- ZIP upload and commit / ZIP 上传提交
- File-level and line-level Diff / 文件级与行级 Diff
- Branch management / 分支管理
- Conflict resolution / 冲突解决

## Tech Stack / 技术栈

- Frontend: React, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, simple-git, multer, unzipper, archiver
- Storage: local Git repositories under `repos/`

## Requirements / 环境要求

- Node.js 20 or newer / Node.js 20 或更高版本
- Git
- macOS, Linux, or Windows with Git installed / macOS、Linux，或安装了 Git 的 Windows

## Quick Start / 快速开始

Install dependencies and start both frontend and backend:

安装依赖并同时启动前后端：

```bash
npm install
npm run dev
```

Then open:

然后打开：

```text
http://localhost:3000
```

Backend API:

后端 API：

```text
http://localhost:3001/api
```

## One-click Start on macOS / macOS 一键启动

On macOS, double-click:

在 macOS 上可以直接双击：

```text
启动 ZipVault.command
```

The script installs dependencies if needed, starts the backend and frontend, then opens the browser automatically.

该脚本会在需要时安装依赖，启动前端和后端，并自动打开浏览器。

## How It Works / 工作原理

1. Create a local ZipVault repository.
2. Upload a ZIP archive and enter a version note.
3. The backend extracts the ZIP into a local Git worktree.
4. ZipVault runs `git add -A` and creates a commit.
5. The frontend renders history, Diff, rollback, branches, and conflict resolution.

---

1. 创建一个本地 ZipVault 仓库。
2. 上传 ZIP 压缩包并填写版本备注。
3. 后端将 ZIP 解压到本地 Git 工作区。
4. ZipVault 自动执行 `git add -A` 并创建提交。
5. 前端展示历史、Diff、回滚、分支和冲突解决界面。

## Project Structure / 项目结构

```text
ZipVault/
├── backend/             # Express API and Git operations
├── frontend/            # React + Vite web UI
├── repos/               # Local user repositories, ignored by Git
├── data/                # Local metadata, ignored by Git
├── tmp/                 # Temporary upload/extract files, ignored by Git
├── 启动 ZipVault.command # macOS one-click launcher
└── README.md
```

## Runtime Data / 运行时数据

ZipVault stores user repositories and metadata locally:

ZipVault 将用户仓库和元数据保存在本机：

```text
repos/
data/
tmp/
```

These folders are ignored by Git and are not part of this source repository.

这些目录已被 `.gitignore` 忽略，不会作为源码仓库内容上传。

## Scripts / 脚本

```bash
npm run dev          # Start frontend and backend
npm run dev:backend  # Start backend only
npm run dev:frontend # Start frontend only
npm run build        # Build frontend
npm start            # Start backend
```

## API Summary / API 概览

- `POST /api/repos` - create a local repository / 创建本地仓库
- `GET /api/repos` - list repositories / 列出仓库
- `POST /api/repos/:id/commit` - upload ZIP and create version / 上传 ZIP 并创建版本
- `GET /api/repos/:id/commits` - list version history / 查看版本历史
- `PATCH /api/repos/:id/commits/:hash/version` - edit custom version label / 修改自定义版本号
- `DELETE /api/repos/:id/commits/:hash` - hide a version record / 删除版本记录
- `GET /api/repos/:id/diff` - file-level Diff / 文件级 Diff
- `GET /api/repos/:id/diff/file` - line-level Diff / 行级 Diff
- `POST /api/repos/:id/revert` - safe rollback / 安全回滚
- `GET /api/repos/:id/download` - download version ZIP / 下载指定版本
- `GET /api/repos/:id/branches` - list branches / 列出分支
- `POST /api/repos/:id/branches` - create branch / 创建分支
- `POST /api/repos/:id/checkout` - switch branch / 切换分支
- `POST /api/repos/:id/merge` - merge branch / 合并分支
- `POST /api/repos/:id/resolve` - resolve conflicts / 提交冲突解决结果

## Notes / 说明

- ZipVault is designed for personal local use. It does not include authentication or remote Git sync.
- Binary files can be versioned and downloaded, but content-level Diff is only shown for text files.
- Deleting a version record only hides it from the UI; it does not rewrite Git history.

---

- ZipVault 面向个人本地使用，当前不包含登录鉴权或远程 Git 同步。
- 二进制文件可以纳入版本并下载，但内容级 Diff 仅支持文本文件。
- 删除版本记录只会从界面隐藏，不会重写 Git 历史。
