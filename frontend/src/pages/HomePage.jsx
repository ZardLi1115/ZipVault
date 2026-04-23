import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { FolderGit2, Pencil, Plus } from "lucide-react";
import toast from "react-hot-toast";
import { createRepo, listRepos, updateRepoDescription } from "../api/client.js";

export default function HomePage() {
  const [repos, setRepos] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [editingRepoId, setEditingRepoId] = useState("");
  const [editingDescription, setEditingDescription] = useState("");

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
      const repo = await createRepo(name, description);
      setRepos((current) => [repo, ...current]);
      setName("");
      setDescription("");
      toast.success("仓库已创建");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setCreating(false);
    }
  }

  async function saveDescription(repoId) {
    try {
      const repo = await updateRepoDescription(repoId, editingDescription);
      setRepos((current) => current.map((item) => (item.id === repo.id ? repo : item)));
      setEditingRepoId("");
      setEditingDescription("");
      toast.success("描述已更新");
    } catch (error) {
      toast.error(error.message);
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
          <textarea
            className="input mt-3 min-h-24"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="仓库描述，可选"
          />
        </form>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {loading ? <div className="empty">加载中</div> : null}
        {!loading && repos.length === 0 ? <div className="empty">暂无仓库</div> : null}
        {repos.map((repo) => (
          <article key={repo.id} className="card group">
            <div className="flex items-start justify-between gap-3">
              <FolderGit2 className="h-7 w-7 text-moss" />
              <span className="rounded-full bg-stone-100 px-2 py-1 text-xs text-stone-600">
                {new Date(repo.createdAt).toLocaleDateString()}
              </span>
            </div>
            <Link to={`/repos/${encodeURIComponent(repo.id)}`}>
              <h2 className="mt-4 break-words text-xl font-semibold group-hover:text-moss">{repo.name}</h2>
            </Link>
            <p className="mt-2 break-all text-sm text-stone-500">{repo.id}</p>
            <div className="mt-4 border-t border-line pt-4">
              {editingRepoId === repo.id ? (
                <div className="space-y-2">
                  <textarea
                    className="input min-h-24"
                    value={editingDescription}
                    onChange={(event) => setEditingDescription(event.target.value)}
                    placeholder="填写这个仓库的用途、内容或状态"
                  />
                  <div className="flex flex-wrap gap-2">
                    <button className="btn-primary" onClick={() => saveDescription(repo.id)}>
                      保存
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => {
                        setEditingRepoId("");
                        setEditingDescription("");
                      }}
                    >
                      取消
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="min-h-10 whitespace-pre-wrap break-words text-sm text-stone-600">
                    {repo.description || "暂无描述"}
                  </p>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      setEditingRepoId(repo.id);
                      setEditingDescription(repo.description || "");
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    修改描述
                  </button>
                </div>
              )}
            </div>
          </article>
        ))}
      </section>
    </div>
  );
}
