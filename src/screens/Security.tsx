import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import type { FormEvent } from "react";
import { api } from "../api";
import { useAuthProfile } from "../auth";
import { ErrorMessage, Panel, PermissionNotice, StateBadge } from "../components/common";
import { formatDate } from "../utils";

export function Security() {
  const { canAdmin } = useAuthProfile();
  const queryClient = useQueryClient();
  const [name, setName] = useState("automation");
  const [subject, setSubject] = useState("ci");
  const [role, setRole] = useState("operator");

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: api.apiKeys,
    enabled: canAdmin,
    refetchInterval: 10000
  });
  const create = useMutation({
    mutationFn: () => api.createApiKey({ name, subject, role }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    }
  });
  const revoke = useMutation({
    mutationFn: (keyId: string) => api.revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    }
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !name.trim() || !subject.trim()) return;
    create.mutate();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
      <Panel title="Create API Key">
        <form className="space-y-4 p-5" onSubmit={submit}>
          {!canAdmin && (
            <PermissionNotice minimumRole="admin" action="Managing API keys" />
          )}
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Name
            </label>
            <input
              aria-label="API key name"
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
              value={name}
              onChange={(event) => setName(event.target.value)}
              disabled={!canAdmin}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Subject
            </label>
            <input
              aria-label="API key subject"
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              disabled={!canAdmin}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Role
            </label>
            <select
              aria-label="API key role"
              className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              disabled={!canAdmin}
            >
              <option value="operator">operator</option>
              <option value="viewer">viewer</option>
              <option value="admin">admin</option>
            </select>
          </div>
          {create.error && (
            <ErrorMessage error={create.error} fallback="API key creation failed." />
          )}
          <button
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition-colors hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600"
            disabled={!canAdmin || create.isPending || !name.trim() || !subject.trim()}
          >
            <Plus className="h-4 w-4" />
            Create Key
          </button>
        </form>
      </Panel>

      <div className="space-y-6">
        {create.data && (
          <Panel title="One-Time Secret">
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-xs text-amber-200">
                <KeyRound className="h-4 w-4" />
                <span className="font-semibold">{create.data.name}</span>
                <StateBadge state={create.data.role} />
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                <code className="break-all font-mono text-xs text-amber-100">
                  {create.data.secret}
                </code>
              </div>
            </div>
          </Panel>
        )}

        <Panel title="API Keys">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-800 bg-[#0b0f19]/80 text-[10px] uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Subject</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Prefix</th>
                  <th className="px-5 py-3">Last Used</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {(keys.data || []).map((item) => (
                  <tr key={item.key_id} className="hover:bg-slate-800/20">
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-200">{item.name}</div>
                      <div className="font-mono text-[10px] text-slate-500">
                        {item.key_id}
                      </div>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-300">
                      {item.subject}
                    </td>
                    <td className="px-5 py-3">
                      <StateBadge state={item.role} />
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-slate-500">
                      {item.secret_prefix}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-400">
                      {item.last_used_at ? formatDate(item.last_used_at) : "-"}
                    </td>
                    <td className="px-5 py-3">
                      <StateBadge state={item.revoked_at ? "revoked" : "active"} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                        disabled={!canAdmin || Boolean(item.revoked_at) || revoke.isPending}
                        onClick={() => revoke.mutate(item.key_id)}
                        title="Revoke API key"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
                {keys.data && keys.data.length === 0 && (
                  <tr>
                    <td className="px-5 py-8 text-center text-xs text-slate-500" colSpan={7}>
                      No API keys created
                    </td>
                  </tr>
                )}
                {!canAdmin && (
                  <tr>
                    <td className="px-5 py-8 text-center text-xs text-slate-500" colSpan={7}>
                      Admin role required
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {keys.error && (
            <div className="p-5">
              <ErrorMessage error={keys.error} fallback="Unable to load API keys." />
            </div>
          )}
          {revoke.error && (
            <div className="p-5">
              <ErrorMessage error={revoke.error} fallback="API key revoke failed." />
            </div>
          )}
        </Panel>

        <Panel title="Access Model">
          <div className="grid gap-3 p-5 md:grid-cols-3">
            <AccessRole title="viewer" body="Read workloads, runs, sessions, health, and artifacts." />
            <AccessRole title="operator" body="Submit runs, message agents, cancel work, and run operations." />
            <AccessRole title="admin" body="Create workloads, inspect secrets, and manage API keys." />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function AccessRole({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border border-slate-800 bg-[#090d16]/60 p-4">
      <div className="mb-2 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-emerald-400" />
        <StateBadge state={title} />
      </div>
      <p className="text-xs leading-relaxed text-slate-400">{body}</p>
    </div>
  );
}
