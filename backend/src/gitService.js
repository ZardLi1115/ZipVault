import { execFile } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { promisify } from "node:util";
import fs from "fs-extra";
import simpleGit from "simple-git";
import unzipper from "unzipper";
import { pipeline } from "node:stream/promises";
import { dataRoot, reposRoot, tmpRoot } from "./config.js";
import { HttpError } from "./errors.js";
import { readRepoIndex, updateRepo, upsertRepo } from "./dataStore.js";

const execFileAsync = promisify(execFile);

function git(repoPath) {
  return simpleGit(repoPath);
}

function safeRepoId(id) {
  if (!id || id.includes("/") || id.includes("\\") || id.includes("..")) {
    throw new HttpError(400, "仓库 ID 不合法");
  }
  return id;
}

function repoPathFor(id) {
  return path.join(reposRoot, safeRepoId(id));
}

function versionMetaPath(id) {
  return path.join(dataRoot, "versions", `${safeRepoId(id)}.json`);
}

async function ensureRepo(id) {
  const repoPath = repoPathFor(id);
  if (!(await fs.pathExists(path.join(repoPath, ".git")))) {
    throw new HttpError(404, "仓库不存在");
  }
  return repoPath;
}

function slugifyName(name) {
  const slug = String(name || "")
    .trim()
    .replace(/[^\p{L}\p{N}._-]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return slug || "repo";
}

function assertMessage(message) {
  const value = String(message || "").trim();
  if (!value) {
    throw new HttpError(400, "版本备注不能为空");
  }
  return value;
}

function cleanVersionLabel(version) {
  return String(version || "").trim().slice(0, 80);
}

function cleanVersionMetric(metric) {
  const value = String(metric ?? "").trim();
  if (!value) {
    return null;
  }
  const number = Number(value);
  if (!Number.isFinite(number)) {
    throw new HttpError(400, "指标项必须是数字");
  }
  return number;
}

function cleanRepoDescription(description) {
  return String(description || "").trim().slice(0, 500);
}

async function readVersionMeta(id) {
  const metaPath = versionMetaPath(id);
  if (!(await fs.pathExists(metaPath))) {
    return { labels: {}, hidden: [] };
  }
  const raw = await fs.readJson(metaPath);
  if (raw.labels || raw.hidden) {
    return {
      labels: raw.labels || {},
      metrics: raw.metrics || {},
      hidden: raw.hidden || []
    };
  }
  return { labels: raw, metrics: {}, hidden: [] };
}

async function writeVersionMeta(id, meta) {
  const metaPath = versionMetaPath(id);
  await fs.ensureDir(path.dirname(metaPath));
  await fs.writeJson(metaPath, meta, { spaces: 2 });
}

async function createCommit(repoPath, message, allowEmpty = false) {
  const messagePath = path.join(tmpRoot, "commit-messages", `${crypto.randomUUID()}.txt`);
  await fs.ensureDir(path.dirname(messagePath));
  await fs.writeFile(messagePath, message, "utf8");
  try {
    const args = ["-C", repoPath, "commit", "-F", messagePath];
    if (allowEmpty) {
      args.splice(3, 0, "--allow-empty");
    }
    await execFileAsync("git", args);
  } finally {
    await fs.remove(messagePath).catch(() => {});
  }
}

async function setVersionLabel(id, hash, version) {
  const label = cleanVersionLabel(version);
  const meta = await readVersionMeta(id);
  if (label) {
    meta.labels[hash] = label;
  } else {
    delete meta.labels[hash];
  }
  await writeVersionMeta(id, meta);
  return label;
}

async function setVersionMetric(id, hash, metric) {
  const value = cleanVersionMetric(metric);
  const meta = await readVersionMeta(id);
  if (value === null) {
    delete meta.metrics[hash];
  } else {
    meta.metrics[hash] = value;
  }
  await writeVersionMeta(id, meta);
  return value;
}

async function updateVersionMeta(id, hash, version, metric) {
  const label = cleanVersionLabel(version);
  const metricValue = cleanVersionMetric(metric);
  const meta = await readVersionMeta(id);
  if (label) {
    meta.labels[hash] = label;
  } else {
    delete meta.labels[hash];
  }
  if (metricValue === null) {
    delete meta.metrics[hash];
  } else {
    meta.metrics[hash] = metricValue;
  }
  await writeVersionMeta(id, meta);
  return { version: label, metric: metricValue };
}

async function assertCommitExists(repoPath, hash) {
  if (!hash) {
    throw new HttpError(400, "hash 参数不能为空");
  }
  await git(repoPath).raw(["cat-file", "-e", `${hash}^{commit}`]);
}

async function assertCleanForOperation(repoPath) {
  const conflicts = await getConflictFiles(repoPath);
  if (conflicts.length > 0) {
    throw new HttpError(409, "当前仓库存在未解决冲突", { conflicts });
  }
}

async function assertBranchName(repoPath, name) {
  const branch = String(name || "").trim();
  if (!branch) {
    throw new HttpError(400, "分支名称不能为空");
  }
  try {
    await execFileAsync("git", ["-C", repoPath, "check-ref-format", "--branch", branch]);
  } catch {
    throw new HttpError(400, "分支名称不合法");
  }
  return branch;
}

function parseNameStatus(raw) {
  return raw
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split("\t");
      const code = parts[0];
      const status = code[0];
      if (status === "R" || status === "C") {
        return { status, score: code.slice(1), oldPath: parts[1], path: parts[2] };
      }
      return { status, path: parts[1] };
    });
}

function summarizeChanges(files) {
  return files.reduce(
    (summary, file) => {
      if (file.status === "A") summary.added += 1;
      else if (file.status === "D") summary.deleted += 1;
      else summary.modified += 1;
      return summary;
    },
    { added: 0, modified: 0, deleted: 0 }
  );
}

async function commitSummary(repoPath, hash) {
  const raw = await git(repoPath).raw(["diff-tree", "--root", "--no-commit-id", "--name-status", "-r", hash]);
  return summarizeChanges(parseNameStatus(raw));
}

async function safeExtractZip(zipPath, destination) {
  await fs.ensureDir(destination);
  const archive = await unzipper.Open.file(zipPath);
  for (const entry of archive.files) {
    const normalized = path.normalize(entry.path).replace(/^(\.\.(\/|\\|$))+/, "");
    const parts = normalized.split(path.sep);
    if (!normalized || parts.includes(".git") || parts.includes("__MACOSX")) {
      continue;
    }

    const outputPath = path.resolve(destination, normalized);
    if (!outputPath.startsWith(path.resolve(destination) + path.sep) && outputPath !== path.resolve(destination)) {
      throw new HttpError(400, "ZIP 包内包含不安全路径");
    }

    if (entry.type === "Directory") {
      await fs.ensureDir(outputPath);
      continue;
    }

    await fs.ensureDir(path.dirname(outputPath));
    await pipeline(entry.stream(), fs.createWriteStream(outputPath));
  }
}

async function payloadRoot(extractedRoot) {
  const entries = (await fs.readdir(extractedRoot)).filter((name) => name !== "__MACOSX");
  if (entries.length !== 1) {
    return extractedRoot;
  }

  const onlyPath = path.join(extractedRoot, entries[0]);
  const stats = await fs.stat(onlyPath);
  return stats.isDirectory() ? onlyPath : extractedRoot;
}

async function clearWorktree(repoPath) {
  const entries = await fs.readdir(repoPath);
  await Promise.all(entries.filter((name) => name !== ".git").map((name) => fs.remove(path.join(repoPath, name))));
}

async function copyPayloadToRepo(sourceRoot, repoPath) {
  await clearWorktree(repoPath);
  await fs.copy(sourceRoot, repoPath, {
    filter: (source) => {
      const relative = path.relative(sourceRoot, source);
      return !relative.split(path.sep).includes(".git");
    }
  });
}

function hasBinaryBytes(buffer) {
  return buffer.includes(0);
}

async function gitShow(repoPath, hash, filePath) {
  try {
    const { stdout } = await execFileAsync("git", ["-C", repoPath, "show", `${hash}:${filePath}`], {
      encoding: "buffer",
      maxBuffer: 50 * 1024 * 1024
    });
    return stdout;
  } catch {
    return Buffer.alloc(0);
  }
}

export async function createRepo(name, description) {
  const cleanName = String(name || "").trim();
  if (!cleanName) {
    throw new HttpError(400, "仓库名称不能为空");
  }

  const id = `${slugifyName(cleanName)}-${crypto.randomUUID().slice(0, 8)}`;
  const repoPath = repoPathFor(id);
  await fs.ensureDir(repoPath);
  await execFileAsync("git", ["-C", repoPath, "init", "-b", "main"]);
  const repoGit = git(repoPath);
  await repoGit.addConfig("user.name", "ZipVault");
  await repoGit.addConfig("user.email", "zipvault@local");
  await repoGit.raw(["commit", "--allow-empty", "-m", "初始化仓库"]);

  return upsertRepo({
    id,
    name: cleanName,
    description: cleanRepoDescription(description),
    createdAt: new Date().toISOString()
  });
}

export async function listRepos() {
  const indexed = await readRepoIndex();
  const existing = [];
  for (const repo of indexed) {
    if (await fs.pathExists(path.join(repoPathFor(repo.id), ".git"))) {
      existing.push(repo);
    }
  }
  return existing;
}

export async function updateRepoDescription(id, description) {
  await ensureRepo(id);
  const repo = await updateRepo(id, { description: cleanRepoDescription(description) });
  if (!repo) {
    throw new HttpError(404, "仓库不存在");
  }
  return repo;
}

export async function commitZip(id, zipPath, message, version, metric) {
  const repoPath = await ensureRepo(id);
  await assertCleanForOperation(repoPath);
  const commitMessage = assertMessage(message);
  const workId = crypto.randomUUID();
  const extractRoot = path.join(tmpRoot, "extract", workId);

  try {
    await safeExtractZip(zipPath, extractRoot);
    const sourceRoot = await payloadRoot(extractRoot);
    await copyPayloadToRepo(sourceRoot, repoPath);

    const repoGit = git(repoPath);
    await repoGit.add(["-A"]);
    const status = await repoGit.status();
    await createCommit(repoPath, commitMessage, status.isClean());
    const hash = (await repoGit.revparse(["HEAD"])).trim();
    const versionLabel = await setVersionLabel(id, hash, version);
    const metricValue = await setVersionMetric(id, hash, metric);
    return { hash, version: versionLabel, metric: metricValue };
  } finally {
    await fs.remove(extractRoot);
    await fs.remove(zipPath).catch(() => {});
  }
}

export async function getCommits(id, branch = "HEAD") {
  const repoPath = await ensureRepo(id);
  const ref = branch || "HEAD";
  const versionMeta = await readVersionMeta(id);
  const hidden = new Set(versionMeta.hidden);
  const raw = await git(repoPath).raw(["log", ref, "--pretty=format:%H%x1f%h%x1f%ct%x1f%B%x1e"]);
  const records = raw.split("\x1e").filter((record) => record.trim());
  const commits = [];

  for (const record of records) {
    const [hash, shortHash, timestamp, ...messageParts] = record.replace(/^\n+|\n+$/g, "").split("\x1f");
    if (hidden.has(hash)) {
      continue;
    }
    commits.push({
      hash,
      shortHash,
      version: versionMeta.labels[hash] || "",
      metric: versionMeta.metrics[hash] ?? null,
      metricDelta: null,
      message: messageParts.join("\x1f"),
      time: new Date(Number(timestamp) * 1000).toISOString(),
      summary: await commitSummary(repoPath, hash)
    });
  }

  let previousMetric = 0;
  for (const commit of commits.slice().reverse()) {
    if (commit.metric === null) {
      continue;
    }
    commit.metricDelta = commit.metric - previousMetric;
    previousMetric = commit.metric;
  }

  return commits;
}

export async function updateCommitVersion(id, hash, version, metric) {
  const repoPath = await ensureRepo(id);
  await assertCommitExists(repoPath, hash);
  const meta = await updateVersionMeta(id, hash, version, metric);
  return { hash, ...meta };
}

export async function hideCommit(id, hash) {
  const repoPath = await ensureRepo(id);
  await assertCommitExists(repoPath, hash);
  const meta = await readVersionMeta(id);
  if (!meta.hidden.includes(hash)) {
    meta.hidden.push(hash);
    await writeVersionMeta(id, meta);
  }
  return { hash, hidden: true };
}

export async function getDiffFiles(id, from, to) {
  if (!from || !to) {
    throw new HttpError(400, "from 和 to 参数不能为空");
  }
  const repoPath = await ensureRepo(id);
  const raw = await git(repoPath).raw(["-c", "core.quotePath=false", "diff", "--name-status", from, to]);
  return parseNameStatus(raw);
}

export async function getFileDiff(id, from, to, filePath) {
  if (!from || !to || !filePath) {
    throw new HttpError(400, "from、to 和 path 参数不能为空");
  }
  const repoPath = await ensureRepo(id);
  const oldContent = await gitShow(repoPath, from, filePath);
  const newContent = await gitShow(repoPath, to, filePath);

  if (hasBinaryBytes(oldContent) || hasBinaryBytes(newContent)) {
    return { path: filePath, binary: true, oldContent: "", newContent: "" };
  }

  return {
    path: filePath,
    binary: false,
    oldContent: oldContent.toString("utf8"),
    newContent: newContent.toString("utf8")
  };
}

export async function listBranches(id) {
  const repoPath = await ensureRepo(id);
  const branches = await git(repoPath).branchLocal();
  return {
    current: branches.current,
    all: branches.all
  };
}

export async function createBranch(id, name, from = "HEAD") {
  const repoPath = await ensureRepo(id);
  await assertCleanForOperation(repoPath);
  const branch = await assertBranchName(repoPath, name);
  await git(repoPath).raw(["branch", branch, from || "HEAD"]);
  return listBranches(id);
}

export async function checkoutBranch(id, branch) {
  const repoPath = await ensureRepo(id);
  await assertCleanForOperation(repoPath);
  const target = await assertBranchName(repoPath, branch);
  await git(repoPath).checkout(target);
  return listBranches(id);
}

export async function deleteBranch(id, branch) {
  const repoPath = await ensureRepo(id);
  await assertCleanForOperation(repoPath);
  const target = await assertBranchName(repoPath, branch);
  const branches = await listBranches(id);
  if (branches.current === target) {
    throw new HttpError(400, "不能删除当前分支");
  }
  await git(repoPath).deleteLocalBranch(target);
  return listBranches(id);
}

export async function mergeBranch(id, source) {
  const repoPath = await ensureRepo(id);
  await assertCleanForOperation(repoPath);
  const sourceBranch = await assertBranchName(repoPath, source);
  try {
    await git(repoPath).raw(["merge", sourceBranch]);
    const conflicts = await getConflictDetails(repoPath);
    if (conflicts.length > 0) {
      return { status: "conflict", conflicts };
    }
    return { status: "merged", branches: await listBranches(id) };
  } catch (error) {
    const conflicts = await getConflictDetails(repoPath);
    if (conflicts.length > 0) {
      return { status: "conflict", conflicts };
    }
    throw error;
  }
}

export async function getConflictFiles(repoPath) {
  const raw = await git(repoPath).raw(["diff", "--name-only", "--diff-filter=U"]);
  return raw.split("\n").map((line) => line.trim()).filter(Boolean);
}

function parseConflictSegments(content) {
  const lines = content.split(/\r?\n/);
  const segments = [];
  let text = [];
  let i = 0;

  const flushText = () => {
    if (text.length > 0) {
      segments.push({ type: "text", content: text.join("\n") });
      text = [];
    }
  };

  while (i < lines.length) {
    if (lines[i].startsWith("<<<<<<<")) {
      flushText();
      const labelOurs = lines[i].replace(/^<<<<<<<\s*/, "") || "HEAD";
      const ours = [];
      i += 1;
      while (i < lines.length && !lines[i].startsWith("=======")) {
        ours.push(lines[i]);
        i += 1;
      }
      i += 1;
      const theirs = [];
      while (i < lines.length && !lines[i].startsWith(">>>>>>>")) {
        theirs.push(lines[i]);
        i += 1;
      }
      const labelTheirs = lines[i]?.replace(/^>>>>>>>\s*/, "") || "MERGE";
      segments.push({
        type: "conflict",
        labelOurs,
        labelTheirs,
        ours: ours.join("\n"),
        theirs: theirs.join("\n")
      });
      i += 1;
      continue;
    }

    text.push(lines[i]);
    i += 1;
  }

  flushText();
  return segments;
}

async function getConflictDetails(repoPath) {
  const files = await getConflictFiles(repoPath);
  const details = [];
  for (const file of files) {
    const content = await fs.readFile(path.join(repoPath, file), "utf8");
    details.push({ path: file, content, segments: parseConflictSegments(content) });
  }
  return details;
}

export async function getConflicts(id) {
  const repoPath = await ensureRepo(id);
  return getConflictDetails(repoPath);
}

export async function resolveConflicts(id, files) {
  const repoPath = await ensureRepo(id);
  if (!Array.isArray(files) || files.length === 0) {
    throw new HttpError(400, "需要提交已解决的文件");
  }

  for (const file of files) {
    if (!file.path || typeof file.content !== "string") {
      throw new HttpError(400, "冲突文件格式不合法");
    }
    const outputPath = path.resolve(repoPath, file.path);
    if (!outputPath.startsWith(path.resolve(repoPath) + path.sep)) {
      throw new HttpError(400, "文件路径不合法");
    }
    await fs.outputFile(outputPath, file.content, "utf8");
    await git(repoPath).add(file.path);
  }

  await git(repoPath).raw(["commit", "--no-edit"]);
  return { status: "resolved", branches: await listBranches(id) };
}

export async function archiveVersion(id, hash, outputPath) {
  if (!hash) {
    throw new HttpError(400, "hash 参数不能为空");
  }
  const repoPath = await ensureRepo(id);
  await execFileAsync("git", ["-C", repoPath, "archive", "--format=zip", hash, "-o", outputPath]);
  return outputPath;
}

export async function revertToVersion(id, hash) {
  if (!hash) {
    throw new HttpError(400, "hash 参数不能为空");
  }
  const repoPath = await ensureRepo(id);
  await assertCleanForOperation(repoPath);
  const archivePath = path.join(tmpRoot, `${crypto.randomUUID()}.zip`);
  const extractRoot = path.join(tmpRoot, "revert", crypto.randomUUID());

  try {
    await archiveVersion(id, hash, archivePath);
    await safeExtractZip(archivePath, extractRoot);
    await copyPayloadToRepo(extractRoot, repoPath);
    const repoGit = git(repoPath);
    await repoGit.add(["-A"]);
    const short = hash.slice(0, 7);
    const status = await repoGit.status();
    if (status.isClean()) {
      await repoGit.raw(["commit", "--allow-empty", "-m", `回滚到 ${short}`]);
    } else {
      await repoGit.commit(`回滚到 ${short}`);
    }
    return { hash: (await repoGit.revparse(["HEAD"])).trim() };
  } finally {
    await fs.remove(archivePath).catch(() => {});
    await fs.remove(extractRoot).catch(() => {});
  }
}
