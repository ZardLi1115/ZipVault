import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Download, Pencil, RotateCcw, Split, Trash2, UploadCloud } from "lucide-react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import { RepoTabs } from "../App.jsx";
import {
  deleteCommitRecord,
  downloadUrl,
  listBranches,
  listCommits,
  revertToVersion,
  updateCommitVersion,
  uploadCommit
} from "../api/client.js";

function formatSummary(summary) {
  return `新增 ${summary.added} / 修改 ${summary.modified} / 删除 ${summary.deleted}`;
}

function formatMetricDelta(delta) {
  if (delta === null || delta === undefined) {
    return "";
  }
  return delta > 0 ? `+${delta}` : String(delta);
}

export default function HistoryPage() {
  const { repoId } = useParams();
  const [commits, setCommits] = useState([]);
  const [branches, setBranches] = useState(null);
  const [version, setVersion] = useState("");
  const [metric, setMetric] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [editingHash, setEditingHash] = useState("");
  const [editingVersion, setEditingVersion] = useState("");
  const [editingMetric, setEditingMetric] = useState("");
  const [editingMessage, setEditingMessage] = useState("");

  const load = useCallback(async () => {
    try {
      const branchInfo = await listBranches(repoId);
      setBranches(branchInfo);
      setCommits(await listCommits(repoId, branchInfo.current));
    } catch (error) {
      toast.error(error.message);
    }
  }, [repoId]);

  useEffect(() => {
    load();
  }, [load]);

  const onDrop = useCallback((accepted) => {
    setFile(accepted[0] || null);
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: { "application/zip": [".zip"] },
    multiple: false
  });

  async function submitVersion(event) {
    event.preventDefault();
    if (!file || !message.trim()) return;
    setUploading(true);
    try {
      await uploadCommit(repoId, file, message, version, metric);
      setFile(null);
      setVersion("");
      setMetric("");
      setMessage("");
      toast.success("版本已提交");
      await load();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setUploading(false);
    }
  }

  async function revert(hash) {
    if (!window.confirm("确认回滚到该版本？系统会创建一条新的回滚提交。")) return;
    try {
      await revertToVersion(repoId, hash);
      toast.success("回滚提交已创建");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function saveVersion(hash) {
    try {
      await updateCommitVersion(repoId, hash, editingVersion, editingMetric, editingMessage);
      setEditingHash("");
      setEditingVersion("");
      setEditingMetric("");
      setEditingMessage("");
      toast.success("版本信息已更新");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function deleteRecord(hash) {
    if (!window.confirm("确认从版本历史中删除这条记录？Git 底层历史不会被改写。")) return;
    try {
      await deleteCommitRecord(repoId, hash);
      toast.success("版本记录已删除");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  const pairs = useMemo(() => {
    const map = new Map();
    commits.forEach((commit, index) => {
      if (commits[index + 1]) {
        map.set(commit.hash, commits[index + 1].hash);
      }
    });
    return map;
  }, [commits]);

  return (
    <div>
      <RepoTabs repoId={repoId} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">版本历史</h1>
          <p className="mt-1 text-sm text-stone-600">当前分支：{branches?.current || "main"}</p>
        </div>
      </div>

      <form onSubmit={submitVersion} className="mb-8 rounded-lg border border-line bg-white p-4 shadow-soft">
        <div
          {...dropzone.getRootProps()}
          className={`flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-md border border-dashed p-5 text-center ${
            dropzone.isDragActive ? "border-moss bg-emerald-50" : "border-line bg-stone-50"
          }`}
        >
          <input {...dropzone.getInputProps()} />
          <UploadCloud className="h-8 w-8 text-moss" />
          <div className="mt-2 text-sm font-medium">{file ? file.name : "拖拽或点击选择 ZIP"}</div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[160px_160px_1fr_160px]">
          <input
            className="input"
            value={version}
            onChange={(event) => setVersion(event.target.value)}
            placeholder="版本号，如 v1.2"
          />
          <input
            className="input"
            type="number"
            step="any"
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
            placeholder="准确率，可不填"
          />
          <textarea
            className="input min-h-24 resize-y"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="版本备注"
          />
          <button className="btn-primary" disabled={!file || !message.trim() || uploading}>
            提交版本
          </button>
        </div>
      </form>

      <div className="space-y-3">
        {commits.map((commit) => {
          const previous = pairs.get(commit.hash);
          return (
            <article key={commit.hash} className="card">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-stone-500">{new Date(commit.time).toLocaleString()}</div>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {editingHash === commit.hash ? (
                      <>
                        <input
                          className="input max-w-48"
                          value={editingVersion}
                          onChange={(event) => setEditingVersion(event.target.value)}
                          placeholder="版本号"
                        />
                        <input
                          className="input max-w-48"
                          type="number"
                          step="any"
                          value={editingMetric}
                          onChange={(event) => setEditingMetric(event.target.value)}
                          placeholder="准确率"
                        />
                        <button className="btn-primary" onClick={() => saveVersion(commit.hash)}>
                          保存
                        </button>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setEditingHash("");
                            setEditingMetric("");
                            setEditingMessage("");
                          }}
                        >
                          取消
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="badge bg-emerald-50 text-moss">{commit.version || "未设置版本号"}</span>
                        <button
                          className="btn-secondary"
                          onClick={() => {
                            setEditingHash(commit.hash);
                            setEditingVersion(commit.version || "");
                            setEditingMetric(commit.metric ?? "");
                            setEditingMessage(commit.message || "");
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                          修改版本信息
                        </button>
                      </>
                    )}
                  </div>
                  {editingHash === commit.hash ? (
                    <textarea
                      className="input mt-3 min-h-32 resize-y whitespace-pre-wrap text-lg font-semibold leading-relaxed"
                      value={editingMessage}
                      onChange={(event) => setEditingMessage(event.target.value)}
                      placeholder="版本备注"
                    />
                  ) : (
                    <h2 className="mt-1 whitespace-pre-wrap break-words text-lg font-semibold leading-relaxed">{commit.message}</h2>
                  )}
                  <div className="mt-2 flex flex-wrap gap-2 text-sm">
                    <span className="badge">{formatSummary(commit.summary)}</span>
                    <span className="badge">
                      准确率 {commit.metric === null ? "未设置" : commit.metric}
                      {commit.metric === null ? "" : `（较上次 ${formatMetricDelta(commit.metricDelta)}）`}
                    </span>
                    <button
                      className="badge font-mono"
                      onClick={() => navigator.clipboard.writeText(commit.hash)}
                      title="复制完整 hash"
                    >
                      {commit.shortHash}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {previous ? (
                    <Link className="btn-secondary" to={`/repos/${encodeURIComponent(repoId)}/diff?from=${previous}&to=${commit.hash}`}>
                      <Split className="h-4 w-4" />
                      Diff
                    </Link>
                  ) : null}
                  <a className="btn-secondary" href={downloadUrl(repoId, commit.hash)}>
                    <Download className="h-4 w-4" />
                    下载
                  </a>
                  <button className="btn-danger" onClick={() => revert(commit.hash)}>
                    <RotateCcw className="h-4 w-4" />
                    回滚
                  </button>
                  <button className="btn-danger" onClick={() => deleteRecord(commit.hash)}>
                    <Trash2 className="h-4 w-4" />
                    删除记录
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
