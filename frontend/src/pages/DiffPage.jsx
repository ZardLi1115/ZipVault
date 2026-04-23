import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { RepoTabs } from "../App.jsx";
import { getFileDiff, listBranches, listCommits, listDiffFiles } from "../api/client.js";

const statusLabel = {
  A: "新增",
  D: "删除",
  M: "修改",
  R: "重命名",
  C: "复制"
};

function splitLines(value) {
  return value ? value.replace(/\r\n/g, "\n").split("\n") : [];
}

function buildLineDiff(oldValue, newValue) {
  const oldLines = splitLines(oldValue);
  const newLines = splitLines(newValue);
  const matrix = Array.from({ length: oldLines.length + 1 }, () => Array(newLines.length + 1).fill(0));

  for (let oldIndex = oldLines.length - 1; oldIndex >= 0; oldIndex -= 1) {
    for (let newIndex = newLines.length - 1; newIndex >= 0; newIndex -= 1) {
      matrix[oldIndex][newIndex] =
        oldLines[oldIndex] === newLines[newIndex]
          ? matrix[oldIndex + 1][newIndex + 1] + 1
          : Math.max(matrix[oldIndex + 1][newIndex], matrix[oldIndex][newIndex + 1]);
    }
  }

  const rows = [];
  let oldIndex = 0;
  let newIndex = 0;
  let oldLine = 1;
  let newLine = 1;

  while (oldIndex < oldLines.length || newIndex < newLines.length) {
    if (oldIndex < oldLines.length && newIndex < newLines.length && oldLines[oldIndex] === newLines[newIndex]) {
      rows.push({ type: "same", oldLine, newLine, oldText: oldLines[oldIndex], newText: newLines[newIndex] });
      oldIndex += 1;
      newIndex += 1;
      oldLine += 1;
      newLine += 1;
    } else if (newIndex < newLines.length && (oldIndex === oldLines.length || matrix[oldIndex][newIndex + 1] >= matrix[oldIndex + 1][newIndex])) {
      rows.push({ type: "added", oldLine: "", newLine, oldText: "", newText: newLines[newIndex] });
      newIndex += 1;
      newLine += 1;
    } else {
      rows.push({ type: "removed", oldLine, newLine: "", oldText: oldLines[oldIndex], newText: "" });
      oldIndex += 1;
      oldLine += 1;
    }
  }

  return rows;
}

function SimpleDiffViewer({ oldValue, newValue }) {
  const rows = useMemo(() => buildLineDiff(oldValue, newValue), [oldValue, newValue]);

  return (
    <div className="overflow-auto rounded-md border border-line">
      <table className="w-full min-w-[760px] border-collapse font-mono text-xs">
        <tbody>
          {rows.map((row, index) => (
            <tr key={index} className={row.type === "added" ? "bg-emerald-50" : row.type === "removed" ? "bg-red-50" : "bg-white"}>
              <td className="diff-line-number">{row.oldLine}</td>
              <td className={`diff-code-cell ${row.type === "removed" ? "text-red-800" : "text-stone-700"}`}>
                {row.oldText || " "}
              </td>
              <td className="diff-line-number border-l border-line">{row.newLine}</td>
              <td className={`diff-code-cell ${row.type === "added" ? "text-emerald-800" : "text-stone-700"}`}>
                {row.newText || " "}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DiffPage() {
  const { repoId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [commits, setCommits] = useState([]);
  const [from, setFrom] = useState(searchParams.get("from") || "");
  const [to, setTo] = useState(searchParams.get("to") || "");
  const [files, setFiles] = useState([]);
  const [selectedPath, setSelectedPath] = useState("");
  const [fileDiff, setFileDiff] = useState(null);

  useEffect(() => {
    async function loadCommits() {
      try {
        const branches = await listBranches(repoId);
        const data = await listCommits(repoId, branches.current);
        setCommits(data);
        if (!from && !to && data.length >= 2) {
          setFrom(data[1].hash);
          setTo(data[0].hash);
        }
      } catch (error) {
        toast.error(error.message);
      }
    }
    loadCommits();
  }, [repoId]);

  const loadDiff = useCallback(async () => {
    if (!from || !to) return;
    try {
      setSearchParams({ from, to });
      const data = await listDiffFiles(repoId, from, to);
      setFiles(data);
      setSelectedPath(data[0]?.path || "");
      setFileDiff(null);
    } catch (error) {
      toast.error(error.message);
    }
  }, [from, repoId, setSearchParams, to]);

  useEffect(() => {
    loadDiff();
  }, [loadDiff]);

  useEffect(() => {
    async function loadFile() {
      if (!selectedPath || !from || !to) return;
      try {
        setFileDiff(await getFileDiff(repoId, from, to, selectedPath));
      } catch (error) {
        toast.error(error.message);
      }
    }
    loadFile();
  }, [from, repoId, selectedPath, to]);

  const commitOptions = useMemo(
    () =>
      commits.map((commit) => (
        <option key={commit.hash} value={commit.hash}>
          {commit.shortHash} - {commit.message}
        </option>
      )),
    [commits]
  );

  return (
    <div>
      <RepoTabs repoId={repoId} />
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Diff 对比</h1>
      </div>

      <div className="mb-6 grid gap-3 rounded-lg border border-line bg-white p-4 shadow-soft md:grid-cols-2">
        <label className="block">
          <span className="label">From</span>
          <select className="input mt-2" value={from} onChange={(event) => setFrom(event.target.value)}>
            <option value="">选择版本</option>
            {commitOptions}
          </select>
        </label>
        <label className="block">
          <span className="label">To</span>
          <select className="input mt-2" value={to} onChange={(event) => setTo(event.target.value)}>
            <option value="">选择版本</option>
            {commitOptions}
          </select>
        </label>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-lg border border-line bg-white p-3">
          <div className="mb-2 text-sm font-semibold">文件变更</div>
          <div className="space-y-2">
            {files.length === 0 ? <div className="empty">暂无差异</div> : null}
            {files.map((file) => (
              <button
                key={`${file.status}:${file.path}`}
                className={`file-row ${selectedPath === file.path ? "file-row-active" : ""}`}
                onClick={() => setSelectedPath(file.path)}
              >
                <span className={`status-dot status-${file.status}`}>{statusLabel[file.status] || file.status}</span>
                <span className="min-w-0 flex-1 truncate text-left" title={file.path}>
                  {file.path}
                </span>
              </button>
            ))}
          </div>
        </aside>

        <section className="min-w-0 rounded-lg border border-line bg-white p-3">
          {!fileDiff ? <div className="empty">选择文件</div> : null}
          {fileDiff?.binary ? <div className="empty">文件已变更，无法对比内容</div> : null}
          {fileDiff && !fileDiff.binary ? (
            <SimpleDiffViewer oldValue={fileDiff.oldContent} newValue={fileDiff.newContent} />
          ) : null}
        </section>
      </div>
    </div>
  );
}
