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
