import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { RepoTabs } from "../App.jsx";
import { listConflicts, resolveConflicts } from "../api/client.js";

function buildResolvedContent(file, choices) {
  return file.segments
    .map((segment, index) => {
      if (segment.type === "text") return segment.content;
      const choice = choices[index] || { mode: "ours", content: segment.ours };
      return choice.content;
    })
    .join("\n");
}

export default function ConflictsPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [selected, setSelected] = useState("");
  const [choices, setChoices] = useState({});

  const load = useCallback(async () => {
    try {
      const data = await listConflicts(repoId);
      setFiles(data);
      setSelected(data[0]?.path || "");
    } catch (error) {
      toast.error(error.message);
    }
  }, [repoId]);

  useEffect(() => {
    load();
  }, [load]);

  const current = useMemo(() => files.find((file) => file.path === selected), [files, selected]);

  function setChoice(filePath, segmentIndex, mode, content) {
    setChoices((currentChoices) => ({
      ...currentChoices,
      [filePath]: {
        ...(currentChoices[filePath] || {}),
        [segmentIndex]: { mode, content }
      }
    }));
  }

  const allResolved = files.every((file) =>
    file.segments.every((segment, index) => segment.type !== "conflict" || choices[file.path]?.[index]?.content !== undefined)
  );

  async function finish() {
    if (!allResolved) return;
    try {
      const resolved = files.map((file) => ({
        path: file.path,
        content: buildResolvedContent(file, choices[file.path] || {})
      }));
      await resolveConflicts(repoId, resolved);
      toast.success("冲突已解决");
      navigate(`/repos/${encodeURIComponent(repoId)}/branches`);
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div>
      <RepoTabs repoId={repoId} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">冲突解决</h1>
          <p className="mt-1 text-sm text-stone-600">{files.length} 个冲突文件</p>
        </div>
        <button className="btn-primary" disabled={!allResolved || files.length === 0} onClick={finish}>
          完成合并
        </button>
      </div>

      {files.length === 0 ? <div className="empty">暂无冲突</div> : null}

      {files.length > 0 ? (
        <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-lg border border-line bg-white p-3">
            <div className="space-y-2">
              {files.map((file) => (
                <button
                  key={file.path}
                  className={`file-row ${selected === file.path ? "file-row-active" : ""}`}
                  onClick={() => setSelected(file.path)}
                >
                  <span className="min-w-0 flex-1 truncate text-left">{file.path}</span>
                </button>
              ))}
            </div>
          </aside>

          <section className="space-y-4">
            {current?.segments.map((segment, index) => {
              if (segment.type === "text") {
                return (
                  <pre key={index} className="overflow-auto rounded-md border border-line bg-white p-3 text-xs text-stone-600">
                    {segment.content}
                  </pre>
                );
              }
              const choice = choices[current.path]?.[index];
              return (
                <div key={index} className="rounded-lg border border-line bg-white p-4 shadow-soft">
                  <div className="mb-3 flex flex-wrap gap-2">
                    <button className="btn-secondary" onClick={() => setChoice(current.path, index, "ours", segment.ours)}>
                      保留左侧
                    </button>
                    <button className="btn-secondary" onClick={() => setChoice(current.path, index, "theirs", segment.theirs)}>
                      保留右侧
                    </button>
                  </div>
                  <div className="grid gap-3 lg:grid-cols-2">
                    <div>
                      <div className="mb-2 text-sm font-semibold">我的版本</div>
                      <pre className="conflict-pane">{segment.ours}</pre>
                    </div>
                    <div>
                      <div className="mb-2 text-sm font-semibold">要合入的版本</div>
                      <pre className="conflict-pane">{segment.theirs}</pre>
                    </div>
                  </div>
                  <label className="label mt-4 block">手动编辑</label>
                  <textarea
                    className="input mt-2 min-h-32 font-mono text-sm"
                    value={choice?.content ?? ""}
                    onChange={(event) => setChoice(current.path, index, "manual", event.target.value)}
                  />
                </div>
              );
            })}
          </section>
        </div>
      ) : null}
    </div>
  );
}
