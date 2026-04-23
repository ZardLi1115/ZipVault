import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderGit2, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { createRepo, listRepos } from "../api/client.js";

export default function HomePage() {
  const [repos, setRepos] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  async function loadRepos() {
    setLoading(true);
    try {
      setRepos(await listRepos());
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRepos();
  }, []);

  async function onCreate(event) {
    event.preventDefault();
    setCreating(true);
    try {
      const repo = await createRepo(name);
      setRepos((current) => [repo, ...current]);
      setName("");
      toast.success("仓库已创建");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div>
          <h1 className="text-3xl font-semibold tracking-normal">本地版本仓库</h1>
          <p className="mt-3 max-w-2xl text-base text-stone-600">
            上传 ZIP 包形成版本记录，历史、Diff、分支和冲突处理都保存在本机。
          </p>
        </div>
        <form onSubmit={onCreate} className="rounded-lg border border-line bg-white p-4 shadow-soft">
          <label className="label" htmlFor="repo-name">
            新仓库名称
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="repo-name"
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="产品原型"
            />
            <button className="btn-primary shrink-0" disabled={creating || !name.trim()}>
              <Plus className="h-4 w-4" />
              创建
            </button>
          </div>
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="empty">加载中</div> : null}
        {!loading && repos.length === 0 ? <div className="empty">暂无仓库</div> : null}
        {repos.map((repo) => (
          <Link key={repo.id} to={`/repos/${encodeURIComponent(repo.id)}`} className="card group">
            <div className="flex items-start justify-between gap-3">
              <FolderGit2 className="h-7 w-7 text-moss" />
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                {new Date(repo.createdAt).toLocaleDateString()}
              </span>
            </div>
            <h2 className="mt-4 break-words text-xl font-semibold group-hover:text-moss">{repo.name}</h2>
            <p className="mt-2 break-all text-sm text-stone-500">{repo.id}</p>
          </Link>
        ))}
      </section>
    </div>
  );
}
