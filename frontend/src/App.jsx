import { NavLink, Route, Routes } from "react-router-dom";
import { Archive, GitBranch, Home, Split, History as HistoryIcon } from "lucide-react";
import HomePage from "./pages/HomePage.jsx";
import HistoryPage from "./pages/HistoryPage.jsx";
import DiffPage from "./pages/DiffPage.jsx";
import BranchesPage from "./pages/BranchesPage.jsx";
import ConflictsPage from "./pages/ConflictsPage.jsx";

function Shell() {
  return (
    <div className="min-h-screen bg-paper text-ink">
      <header className="border-b border-line bg-white/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-semibold">
            <Archive className="h-6 w-6 text-moss" />
            ZipVault
          </NavLink>
          <nav className="flex items-center gap-2 text-sm">
            <NavLink className="nav-link" to="/">
              <Home className="h-4 w-4" />
              仓库
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/repos/:repoId" element={<HistoryPage />} />
          <Route path="/repos/:repoId/diff" element={<DiffPage />} />
          <Route path="/repos/:repoId/branches" element={<BranchesPage />} />
          <Route path="/repos/:repoId/conflicts" element={<ConflictsPage />} />
        </Routes>
      </main>
    </div>
  );
}

export function RepoTabs({ repoId }) {
  const encoded = encodeURIComponent(repoId);
  return (
    <div className="mb-6 flex flex-wrap gap-2">
      <NavLink end className="tab-link" to={`/repos/${encoded}`}>
        <HistoryIcon className="h-4 w-4" />
        版本
      </NavLink>
      <NavLink className="tab-link" to={`/repos/${encoded}/diff`}>
        <Split className="h-4 w-4" />
        Diff
      </NavLink>
      <NavLink className="tab-link" to={`/repos/${encoded}/branches`}>
        <GitBranch className="h-4 w-4" />
        分支
      </NavLink>
    </div>
  );
}

export default function App() {
  return <Shell />;
}
