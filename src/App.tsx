import logoUrl from "./logo.svg";
import { useMutation } from "@tanstack/react-query";
import {
  Activity,
  Archive,
  Bot,
  Box,
  LogIn,
  LogOut,
  Server,
  XCircle,
  KeyRound,
  ShieldCheck
} from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { NavLink, Route, Routes } from "react-router-dom";
import {
  api,
  clearToken,
  getToken,
  setToken
} from "./api";
import { useAuthProfile } from "./auth";
import { Panel } from "./components/common";
import { AgentConsole } from "./screens/Agents";
import { Artifacts } from "./screens/Artifacts";
import { Health } from "./screens/Health";
import { RunDetail } from "./screens/RunDetail";
import { Runs } from "./screens/Runs";
import { Security } from "./screens/Security";
import { Workloads } from "./screens/Workloads";

function Shell() {
  const [token, updateToken] = useState(getToken());
  const auth = useAuthProfile();
  const nav = [
    { to: "/", label: "Workloads", icon: Box },
    { to: "/runs", label: "Runs", icon: Activity },
    { to: "/agents", label: "Agents", icon: Bot },
    { to: "/artifacts", label: "Artifacts", icon: Archive },
    { to: "/operations", label: "Operations", icon: Server },
    { to: "/security", label: "Security", icon: KeyRound }
  ];

  function onTokenChange(next: string) {
    updateToken(next);
    setToken(next);
  }

  function logout() {
    clearToken();
    updateToken("");
  }

  return (
    <div className="min-h-screen bg-[#070a13] text-slate-100 selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-slate-800/80 bg-[#090d16]/80 backdrop-blur-md md:block z-30">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6">
          <img src={logoUrl} className="h-8 w-8 object-contain" alt="MoiraWeave Logo" />
          <div>
            <span className="block text-sm font-bold tracking-wider text-white">MoiraWeave</span>
            <span className="block text-[10px] text-slate-400 font-medium tracking-tight uppercase">Control Plane</span>
          </div>
        </div>
        <nav className="space-y-1.5 p-4">
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? "bg-gradient-to-r from-emerald-500/15 to-teal-500/5 border-l-2 border-emerald-500 text-emerald-400 shadow-glow"
                    : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                }`
              }
            >
              <item.icon className="h-4.5 w-4.5" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main Container */}
      <main className="md:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-20 flex min-h-16 flex-wrap items-center justify-between gap-4 border-b border-slate-800/60 bg-[#070a13]/80 px-6 py-3 backdrop-blur-md">
          <div>
            <div className="flex items-center gap-2 md:hidden">
              <img src={logoUrl} className="h-7 w-7 object-contain" alt="MoiraWeave Logo" />
              <span className="font-bold text-white">MoiraWeave</span>
            </div>
            <div className="hidden text-xs font-medium text-slate-400 md:block">
              Self-hosted AI workload and agent operations platform
            </div>
          </div>
          <div className="flex min-w-0 flex-1 items-center justify-end gap-3">
            {token && (
              <div className="hidden min-w-0 items-center gap-2 rounded-lg border border-slate-800 bg-[#0e1322] px-3 py-1.5 text-xs text-slate-300 sm:flex">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="truncate font-semibold text-slate-200">
                  {auth.subject || "Checking token"}
                </span>
                <span className="rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                  {auth.role || "..."}
                </span>
                {auth.profile.data?.credential_type === "api_key" && (
                  <KeyRound className="h-3.5 w-3.5 text-sky-400" />
                )}
              </div>
            )}
            <div className="relative flex min-w-0 max-w-xl flex-1 items-center md:flex-none md:w-80">
              <input
                className="w-full rounded-lg border border-slate-800 bg-[#0e1322] px-3.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
                value={token}
                onChange={(event) => onTokenChange(event.target.value)}
                placeholder="Bearer token"
              />
            </div>
            <button
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-800 bg-[#0e1322] text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
              onClick={logout}
              title="Clear token"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="mx-auto max-w-7xl p-6">
          {!token ? (
            <Login onLogin={onTokenChange} />
          ) : auth.profile.error ? (
            <Panel title="Invalid Credential">
              <div className="space-y-3 p-6 text-sm text-slate-300">
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-300">
                  <XCircle className="h-4 w-4 shrink-0" />
                  <span>The current bearer token could not be resolved. Sign in again or paste a valid API key.</span>
                </div>
              </div>
            </Panel>
          ) : (
            <Routes>
              <Route path="/" element={<Workloads />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:runId" element={<RunDetail />} />
              <Route path="/agents" element={<AgentConsole />} />
              <Route path="/artifacts" element={<Artifacts />} />
              <Route path="/operations" element={<Health />} />
              <Route path="/security" element={<Security />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
}

function Login({ onLogin }: { onLogin: (token: string) => void }) {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const login = useMutation({
    mutationFn: () => api.login(username, password),
    onSuccess: (token) => onLogin(token.access_token)
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    login.mutate();
  }

  return (
    <div className="mx-auto max-w-md mt-12">
      <Panel title="Sign In to MoiraWeave">
        <form className="space-y-4 p-6" onSubmit={submit}>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Username</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              placeholder="Username"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">Password</label>
            <input
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none transition-all focus:border-slate-700 focus:ring-1 focus:ring-slate-700"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
            />
          </div>
          {login.error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 border border-red-500/20 p-3 text-xs text-red-400">
              <XCircle className="h-4 w-4 shrink-0" />
              <span>Login failed. Please check credentials.</span>
            </div>
          )}
          <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition-all shadow-lg shadow-emerald-500/10">
            <LogIn className="h-4 w-4" />
            Sign in
          </button>
        </form>
      </Panel>
    </div>
  );
}

export default function App() {
  return <Shell />;
}
