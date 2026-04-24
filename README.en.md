# ZipVault

**Local, visual Git version management for ZIP archives.**

ZipVault is a local visual Git version management tool for product managers, designers, operators, and individual creators who do not want to work with Git commands.

Upload a project folder as a ZIP file, write a version note, and ZipVault records it as a Git commit behind a clean web interface. Your data stays on your machine.

Publisher: **ZardLi1115**

## Highlights

- **Local-first**: runs on `localhost`; project files and Git repositories stay on your disk.
- **Visual Git**: commit history, Diff, branch operations, rollback, and conflict resolution through a web UI.
- **ZIP workflow**: version a folder by uploading ZIP archives instead of learning Git commands.
- **Safe rollback**: rollback creates a new commit instead of deleting history.
- **Custom version labels**: attach and edit human-friendly version numbers without changing Git hashes.
- **Repository descriptions**: add and edit descriptions for each local Git repository.
- **Soft delete records**: hide a version from the UI without rewriting Git history.
- **Branch and merge support**: create, switch, delete, and merge branches locally.
- **Conflict guidance**: resolve merge conflicts with a structured interface instead of raw conflict markers.

## Screens

- Repository list
- Version history
- ZIP upload and commit
- File-level and line-level Diff
- Branch management
- Conflict resolution

## Tech Stack

- Frontend: React, Vite, React Router, Tailwind CSS
- Backend: Node.js, Express, simple-git, multer, unzipper, archiver
- Storage: local Git repositories under `repos/`

## Requirements

- Node.js 20 or newer
- Git
- macOS, Linux, or Windows with Git installed

## Quick Start

Install dependencies and start both frontend and backend:

```bash
npm install
npm run dev
```

Then open:

```text
http://localhost:3000
```

Backend API:

```text
http://localhost:3001/api
```

## One-click Start on macOS

On macOS, double-click:

```text
启动 ZipVault.command
```

The script installs dependencies if needed, starts the backend and frontend, then opens the browser automatically.

## How It Works

1. Create a local ZipVault repository.
2. Upload a ZIP archive and enter a version note.
3. The backend extracts the ZIP into a local Git worktree.
4. ZipVault runs `git add -A` and creates a commit.
5. The frontend renders history, Diff, rollback, branches, and conflict resolution.

## Project Structure

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

## Runtime Data

ZipVault stores user repositories and metadata locally:

```text
repos/
data/
tmp/
```

These folders are ignored by Git and are not part of this source repository.

## Scripts

```bash
npm run dev          # Start frontend and backend
npm run dev:backend  # Start backend only
npm run dev:frontend # Start frontend only
npm run build        # Build frontend
npm start            # Start backend
```

## API Summary

- `POST /api/repos` - create a local repository
- `GET /api/repos` - list repositories
- `PATCH /api/repos/:id` - edit repository description
- `POST /api/repos/:id/commit` - upload ZIP and create version
- `GET /api/repos/:id/commits` - list version history
- `PATCH /api/repos/:id/commits/:hash/version` - edit custom version label
- `DELETE /api/repos/:id/commits/:hash` - hide a version record
- `GET /api/repos/:id/diff` - file-level Diff
- `GET /api/repos/:id/diff/file` - line-level Diff
- `POST /api/repos/:id/revert` - safe rollback
- `GET /api/repos/:id/download` - download version ZIP
- `GET /api/repos/:id/branches` - list branches
- `POST /api/repos/:id/branches` - create branch
- `POST /api/repos/:id/checkout` - switch branch
- `POST /api/repos/:id/merge` - merge branch
- `POST /api/repos/:id/resolve` - resolve conflicts

## Notes

- ZipVault is designed for personal local use. It does not include authentication or remote Git sync.
- Binary files can be versioned and downloaded, but content-level Diff is only shown for text files.
- Deleting a version record only hides it from the UI; it does not rewrite Git history.
