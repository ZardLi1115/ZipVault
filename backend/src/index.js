import "dotenv/config";
import express from "express";
import cors from "cors";
import multer from "multer";
import path from "node:path";
import crypto from "node:crypto";
import fs from "fs-extra";
import { asyncRoute, HttpError } from "./errors.js";
import { port, reposRoot, uploadRoot, tmpRoot, maxZipBytes } from "./config.js";
import {
  archiveVersion,
  checkoutBranch,
  commitZip,
  createBranch,
  createRepo,
  deleteBranch,
  getCommits,
  getConflicts,
  getDiffFiles,
  getFileDiff,
  hideCommit,
  listBranches,
  listRepos,
  mergeBranch,
  resolveConflicts,
  revertToVersion,
  updateCommitVersion,
  updateRepoDescription
} from "./gitService.js";

await fs.ensureDir(reposRoot);
await fs.ensureDir(uploadRoot);
await fs.ensureDir(tmpRoot);

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const upload = multer({
  dest: uploadRoot,
  limits: { fileSize: maxZipBytes },
  fileFilter(req, file, callback) {
    if (!file.originalname.toLowerCase().endsWith(".zip")) {
      callback(new HttpError(400, "仅支持上传 .zip 文件"));
      return;
    }
    callback(null, true);
  }
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

app.get(
  "/api/repos",
  asyncRoute(async (req, res) => {
    res.json(await listRepos());
  })
);

app.post(
  "/api/repos",
  asyncRoute(async (req, res) => {
    res.status(201).json(await createRepo(req.body?.name, req.body?.description));
  })
);

app.patch(
  "/api/repos/:id",
  asyncRoute(async (req, res) => {
    res.json(await updateRepoDescription(req.params.id, req.body?.description));
  })
);

app.post(
  "/api/repos/:id/commit",
  upload.single("file"),
  asyncRoute(async (req, res) => {
    if (!req.file) {
      throw new HttpError(400, "请上传 ZIP 文件");
    }
    res.status(201).json(await commitZip(req.params.id, req.file.path, req.body?.message, req.body?.version, req.body?.metric));
  })
);

app.get(
  "/api/repos/:id/commits",
  asyncRoute(async (req, res) => {
    res.json(await getCommits(req.params.id, req.query.branch));
  })
);

app.patch(
  "/api/repos/:id/commits/:hash/version",
  asyncRoute(async (req, res) => {
    res.json(await updateCommitVersion(req.params.id, req.params.hash, req.body?.version, req.body?.metric, req.body?.message));
  })
);

app.delete(
  "/api/repos/:id/commits/:hash",
  asyncRoute(async (req, res) => {
    res.json(await hideCommit(req.params.id, req.params.hash));
  })
);

app.get(
  "/api/repos/:id/diff",
  asyncRoute(async (req, res) => {
    res.json(await getDiffFiles(req.params.id, req.query.from, req.query.to));
  })
);

app.get(
  "/api/repos/:id/diff/file",
  asyncRoute(async (req, res) => {
    res.json(await getFileDiff(req.params.id, req.query.from, req.query.to, req.query.path));
  })
);

app.get(
  "/api/repos/:id/branches",
  asyncRoute(async (req, res) => {
    res.json(await listBranches(req.params.id));
  })
);

app.post(
  "/api/repos/:id/branches",
  asyncRoute(async (req, res) => {
    res.status(201).json(await createBranch(req.params.id, req.body?.name, req.body?.from));
  })
);

app.delete(
  "/api/repos/:id/branches/:branch",
  asyncRoute(async (req, res) => {
    res.json(await deleteBranch(req.params.id, req.params.branch));
  })
);

app.post(
  "/api/repos/:id/checkout",
  asyncRoute(async (req, res) => {
    res.json(await checkoutBranch(req.params.id, req.body?.branch));
  })
);

app.post(
  "/api/repos/:id/merge",
  asyncRoute(async (req, res) => {
    res.json(await mergeBranch(req.params.id, req.body?.source));
  })
);

app.get(
  "/api/repos/:id/conflicts",
  asyncRoute(async (req, res) => {
    res.json(await getConflicts(req.params.id));
  })
);

app.post(
  "/api/repos/:id/resolve",
  asyncRoute(async (req, res) => {
    res.json(await resolveConflicts(req.params.id, req.body?.files));
  })
);

app.get(
  "/api/repos/:id/download",
  asyncRoute(async (req, res) => {
    const outputPath = path.join(tmpRoot, `${crypto.randomUUID()}.zip`);
    await archiveVersion(req.params.id, req.query.hash, outputPath);
    res.download(outputPath, `zipvault-${String(req.query.hash).slice(0, 7)}.zip`, async () => {
      await fs.remove(outputPath).catch(() => {});
    });
  })
);

app.post(
  "/api/repos/:id/revert",
  asyncRoute(async (req, res) => {
    res.status(201).json(await revertToVersion(req.params.id, req.body?.hash));
  })
);

app.use((error, req, res, next) => {
  if (req.file?.path) {
    fs.remove(req.file.path).catch(() => {});
  }
  const status = error.status || 500;
  res.status(status).json({
    message: status === 500 ? "服务器内部错误" : error.message,
    details: error.details || null
  });
});

app.listen(port, () => {
  console.log(`ZipVault API listening on http://localhost:${port}`);
});
