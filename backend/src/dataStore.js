import fs from "fs-extra";
import path from "node:path";
import { dataRoot } from "./config.js";

const repoIndexPath = path.join(dataRoot, "repos.json");

export async function readRepoIndex() {
  if (!(await fs.pathExists(repoIndexPath))) {
    return [];
  }
  return fs.readJson(repoIndexPath);
}

export async function writeRepoIndex(repos) {
  await fs.ensureDir(dataRoot);
  await fs.writeJson(repoIndexPath, repos, { spaces: 2 });
}

export async function upsertRepo(repo) {
  const repos = await readRepoIndex();
  const next = [repo, ...repos.filter((item) => item.id !== repo.id)];
  await writeRepoIndex(next);
  return repo;
}

export async function updateRepo(repoId, fields) {
  const repos = await readRepoIndex();
  const index = repos.findIndex((repo) => repo.id === repoId);
  if (index === -1) {
    return null;
  }

  const nextRepo = {
    ...repos[index],
    ...fields,
    updatedAt: new Date().toISOString()
  };
  const next = [...repos];
  next[index] = nextRepo;
  await writeRepoIndex(next);
  return nextRepo;
}
