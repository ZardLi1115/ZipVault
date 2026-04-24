import axios from "axios";

const api = axios.create({
  baseURL: "/api"
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || "请求失败";
    return Promise.reject(new Error(message));
  }
);

export async function listRepos() {
  const { data } = await api.get("/repos");
  return data;
}

export async function createRepo(name, description) {
  const { data } = await api.post("/repos", { name, description });
  return data;
}

export async function updateRepoDescription(repoId, description) {
  const { data } = await api.patch(`/repos/${encodeURIComponent(repoId)}`, { description });
  return data;
}

export async function uploadCommit(repoId, file, message, version, metric) {
  const form = new FormData();
  form.append("file", file);
  form.append("message", message);
  form.append("version", version);
  form.append("metric", metric);
  const { data } = await api.post(`/repos/${encodeURIComponent(repoId)}/commit`, form);
  return data;
}

export async function listCommits(repoId, branch) {
  const { data } = await api.get(`/repos/${encodeURIComponent(repoId)}/commits`, { params: { branch } });
  return data;
}

export async function updateCommitVersion(repoId, hash, version, metric, message) {
  const { data } = await api.patch(`/repos/${encodeURIComponent(repoId)}/commits/${encodeURIComponent(hash)}/version`, { version, metric, message });
  return data;
}

export async function deleteCommitRecord(repoId, hash) {
  const { data } = await api.delete(`/repos/${encodeURIComponent(repoId)}/commits/${encodeURIComponent(hash)}`);
  return data;
}

export async function listDiffFiles(repoId, from, to) {
  const { data } = await api.get(`/repos/${encodeURIComponent(repoId)}/diff`, { params: { from, to } });
  return data;
}

export async function getFileDiff(repoId, from, to, path) {
  const { data } = await api.get(`/repos/${encodeURIComponent(repoId)}/diff/file`, { params: { from, to, path } });
  return data;
}

export async function listBranches(repoId) {
  const { data } = await api.get(`/repos/${encodeURIComponent(repoId)}/branches`);
  return data;
}

export async function createBranch(repoId, name, from) {
  const { data } = await api.post(`/repos/${encodeURIComponent(repoId)}/branches`, { name, from });
  return data;
}

export async function deleteBranch(repoId, branch) {
  const { data } = await api.delete(`/repos/${encodeURIComponent(repoId)}/branches/${encodeURIComponent(branch)}`);
  return data;
}

export async function checkoutBranch(repoId, branch) {
  const { data } = await api.post(`/repos/${encodeURIComponent(repoId)}/checkout`, { branch });
  return data;
}

export async function mergeBranch(repoId, source) {
  const { data } = await api.post(`/repos/${encodeURIComponent(repoId)}/merge`, { source });
  return data;
}

export async function listConflicts(repoId) {
  const { data } = await api.get(`/repos/${encodeURIComponent(repoId)}/conflicts`);
  return data;
}

export async function resolveConflicts(repoId, files) {
  const { data } = await api.post(`/repos/${encodeURIComponent(repoId)}/resolve`, { files });
  return data;
}

export async function revertToVersion(repoId, hash) {
  const { data } = await api.post(`/repos/${encodeURIComponent(repoId)}/revert`, { hash });
  return data;
}

export function downloadUrl(repoId, hash) {
  return `/api/repos/${encodeURIComponent(repoId)}/download?hash=${encodeURIComponent(hash)}`;
}
