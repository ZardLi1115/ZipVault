import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { GitMerge, Plus, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import { RepoTabs } from "../App.jsx";
import { checkoutBranch, createBranch, deleteBranch, listBranches, listCommits, mergeBranch } from "../api/client.js";

export default function BranchesPage() {
  const { repoId } = useParams();
  const navigate = useNavigate();
  const [branches, setBranches] = useState({ current: "", all: [] });
  const [commits, setCommits] = useState([]);
  const [name, setName] = useState("");
  const [from, setFrom] = useState("HEAD");
  const [source, setSource] = useState("");

  const load = useCallback(async () => {
    try {
      const branchInfo = await listBranches(repoId);
      setBranches(branchInfo);
      setSource(branchInfo.all.find((branch) => branch !== branchInfo.current) || "");
      setCommits(await listCommits(repoId, branchInfo.current));
    } catch (error) {
      toast.error(error.message);
    }
  }, [repoId]);

  useEffect(() => {
    load();
  }, [load]);

  async function create(event) {
    event.preventDefault();
    try {
      await createBranch(repoId, name, from);
      setName("");
      setFrom("HEAD");
      toast.success("分支已创建");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function checkout(branch) {
    try {
      await checkoutBranch(repoId, branch);
      toast.success("已切换分支");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function remove(branch) {
    if (!window.confirm(`确认删除分支 ${branch}？`)) return;
    try {
      await deleteBranch(repoId, branch);
      toast.success("分支已删除");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  async function merge(event) {
    event.preventDefault();
    if (!source) return;
    try {
      const result = await mergeBranch(repoId, source);
      if (result.status === "conflict") {
        toast.error("合并产生冲突");
        navigate(`/repos/${encodeURIComponent(repoId)}/conflicts`);
        return;
      }
      toast.success("合并完成");
      await load();
    } catch (error) {
      toast.error(error.message);
    }
  }

  return (
    <div>
      <RepoTabs repoId={repoId} />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">分支管理</h1>
          <p className="mt-1 text-sm text-stone-600">当前分支：{branches.current}</p>
        </div>
        <Link className="btn-secondary" to={`/repos/${encodeURIComponent(repoId)}/conflicts`}>
          冲突解决
        </Link>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        <section className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <div className="mb-4 text-sm font-semibold">分支图</div>
          <div className="space-y-3">
            {branches.all.map((branch, index) => (
              <div key={branch} className="flex items-center gap-3">
                <div className={`h-3 w-3 rounded-full ${branch === branches.current ? "bg-moss" : "bg-clay"}`} />
                <div className="h-px w-8 bg-line" />
                <div className="flex flex-1 flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2">
                  <div>
                    <div className="font-medium">{branch}</div>
                    <div className="text-xs text-stone-500">{branch === branches.current ? "当前" : `分支 ${index + 1}`}</div>
                  </div>
                  <div className="flex gap-2">
                    {branch !== branches.current ? (
                      <button className="btn-secondary" onClick={() => checkout(branch)}>
                        切换
                      </button>
                    ) : null}
                    {branch !== branches.current ? (
                      <button className="btn-danger" onClick={() => remove(branch)}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <aside className="space-y-4">
          <form onSubmit={create} className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <Plus className="h-4 w-4" />
              新建分支
            </div>
            <label className="label">名称</label>
            <input className="input mt-2" value={name} onChange={(event) => setName(event.target.value)} />
            <label className="label mt-4 block">起点</label>
            <select className="input mt-2" value={from} onChange={(event) => setFrom(event.target.value)}>
              <option value="HEAD">当前 HEAD</option>
              {commits.map((commit) => (
                <option key={commit.hash} value={commit.hash}>
                  {commit.shortHash} - {commit.message}
                </option>
              ))}
            </select>
            <button className="btn-primary mt-4 w-full" disabled={!name.trim()}>
              创建
            </button>
          </form>

          <form onSubmit={merge} className="rounded-lg border border-line bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center gap-2 font-semibold">
              <GitMerge className="h-4 w-4" />
              合并到当前分支
            </div>
            <select className="input" value={source} onChange={(event) => setSource(event.target.value)}>
              <option value="">选择来源分支</option>
              {branches.all
                .filter((branch) => branch !== branches.current)
                .map((branch) => (
                  <option key={branch} value={branch}>
                    {branch}
                  </option>
                ))}
            </select>
            <button className="btn-primary mt-4 w-full" disabled={!source}>
              合并
            </button>
          </form>
        </aside>
      </div>
    </div>
  );
}
