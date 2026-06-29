import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  KeyRound,
  Pencil,
  Plus,
  RotateCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserCog,
  UserPlus
} from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { api } from "../api";
import { useAuthProfile } from "../auth";
import {
  ErrorMessage,
  Panel,
  PermissionNotice,
  RowMessage,
  StateBadge
} from "../components/common";
import { formatDate } from "../utils";

const ROLE_OPTIONS = ["operator", "viewer", "admin"];
const MIN_RESET_PASSWORD_LENGTH = 12;

export function Security() {
  const { canAdmin } = useAuthProfile();
  const queryClient = useQueryClient();
  const [keyName, setKeyName] = useState("automation");
  const [keySubject, setKeySubject] = useState("ci");
  const [keyRole, setKeyRole] = useState("operator");
  const [keyTeamId, setKeyTeamId] = useState("");
  const [userSubject, setUserSubject] = useState("operator");
  const [userDisplayName, setUserDisplayName] = useState("");
  const [userPassword, setUserPassword] = useState("");
  const [userRole, setUserRole] = useState("operator");
  const [editUserSubject, setEditUserSubject] = useState("");
  const [editUserDisplayName, setEditUserDisplayName] = useState("");
  const [editUserRole, setEditUserRole] = useState("operator");
  const [resetSubject, setResetSubject] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [teamId, setTeamId] = useState("agents");
  const [teamName, setTeamName] = useState("Agent Operators");
  const [teamDescription, setTeamDescription] = useState("");
  const [editTeamId, setEditTeamId] = useState("");
  const [editTeamName, setEditTeamName] = useState("");
  const [editTeamDescription, setEditTeamDescription] = useState("");
  const [memberTeamId, setMemberTeamId] = useState("");
  const [memberSubject, setMemberSubject] = useState("");
  const [memberRole, setMemberRole] = useState("operator");

  const keys = useQuery({
    queryKey: ["api-keys"],
    queryFn: api.apiKeys,
    enabled: canAdmin,
    refetchInterval: 10000
  });
  const users = useQuery({
    queryKey: ["users"],
    queryFn: api.users,
    enabled: canAdmin,
    refetchInterval: 15000
  });
  const teams = useQuery({
    queryKey: ["teams"],
    queryFn: api.teams,
    enabled: canAdmin,
    refetchInterval: 15000
  });
  const teamOptions = teams.data || [];
  const selectedTeamId = memberTeamId || teamOptions[0]?.team_id || "";
  const teamMembers = useQuery({
    queryKey: ["team-members", selectedTeamId],
    queryFn: () => api.teamMembers(selectedTeamId),
    enabled: canAdmin && Boolean(selectedTeamId),
    refetchInterval: 15000
  });

  const createKey = useMutation({
    mutationFn: () =>
      api.createApiKey({
        name: keyName.trim(),
        subject: keySubject.trim(),
        role: keyRole,
        team_id: keyTeamId.trim() || null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    }
  });
  const rotateKey = useMutation({
    mutationFn: (keyId: string) => api.rotateApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    }
  });
  const revokeKey = useMutation({
    mutationFn: (keyId: string) => api.revokeApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    }
  });
  const createUser = useMutation({
    mutationFn: () =>
      api.createUser({
        subject: userSubject.trim(),
        password: userPassword,
        role: userRole,
        display_name: userDisplayName.trim() || null
      }),
    onSuccess: () => {
      setUserPassword("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
  const disableUser = useMutation({
    mutationFn: (subject: string) => api.disableUser(subject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
  const enableUser = useMutation({
    mutationFn: (subject: string) => api.enableUser(subject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
  const updateUser = useMutation({
    mutationFn: () =>
      api.updateUser(editUserSubject.trim(), {
        display_name: editUserDisplayName.trim() || null,
        role: editUserRole
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
  const resetUserPassword = useMutation({
    mutationFn: () =>
      api.resetUserPassword(resetSubject.trim(), resetPassword),
    onSuccess: () => {
      setResetPassword("");
      queryClient.invalidateQueries({ queryKey: ["users"] });
    }
  });
  const createTeam = useMutation({
    mutationFn: () =>
      api.createTeam({
        team_id: teamId.trim(),
        name: teamName.trim(),
        description: teamDescription.trim() || null
      }),
    onSuccess: (team) => {
      setMemberTeamId(team.team_id);
      setKeyTeamId(team.team_id);
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    }
  });
  const updateTeam = useMutation({
    mutationFn: () =>
      api.updateTeam(editTeamId.trim(), {
        name: editTeamName.trim(),
        description: editTeamDescription.trim() || null
      }),
    onSuccess: (team) => {
      setEditTeamName(team.name);
      setEditTeamDescription(team.description || "");
      queryClient.invalidateQueries({ queryKey: ["teams"] });
    }
  });
  const addMember = useMutation({
    mutationFn: () =>
      api.addTeamMember(selectedTeamId, {
        subject: memberSubject.trim(),
        role: memberRole
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    }
  });
  const removeMember = useMutation({
    mutationFn: (member: { teamId: string; subject: string }) =>
      api.removeTeamMember(member.teamId, member.subject),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-members"] });
    }
  });
  const oneTimeSecret = rotateKey.data || createKey.data;

  function submitKey(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !keyName.trim() || !keySubject.trim()) return;
    createKey.mutate();
  }

  function submitUser(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !userSubject.trim() || userPassword.length < 8) return;
    createUser.mutate();
  }

  function submitPasswordReset(event: FormEvent) {
    event.preventDefault();
    if (
      !canAdmin ||
      !resetSubject.trim() ||
      resetPassword.length < MIN_RESET_PASSWORD_LENGTH
    ) {
      return;
    }
    resetUserPassword.mutate();
  }

  function submitUserUpdate(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !editUserSubject.trim()) return;
    updateUser.mutate();
  }

  function submitTeam(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !teamId.trim() || !teamName.trim()) return;
    createTeam.mutate();
  }

  function submitTeamUpdate(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !editTeamId.trim() || !editTeamName.trim()) return;
    updateTeam.mutate();
  }

  function submitMember(event: FormEvent) {
    event.preventDefault();
    if (!canAdmin || !selectedTeamId || !memberSubject.trim()) return;
    addMember.mutate();
  }

  function selectUserForEdit(user: { subject: string; display_name?: string | null; role: string }) {
    setEditUserSubject(user.subject);
    setEditUserDisplayName(user.display_name || "");
    setEditUserRole(user.role);
  }

  function selectTeamForEdit(team: { team_id: string; name: string; description?: string | null }) {
    setEditTeamId(team.team_id);
    setEditTeamName(team.name);
    setEditTeamDescription(team.description || "");
    setMemberTeamId(team.team_id);
    setKeyTeamId(team.team_id);
  }

  return (
    <div className="space-y-6">
      {!canAdmin && (
        <PermissionNotice minimumRole="admin" action="Security administration" />
      )}

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <div className="space-y-6">
          <Panel title="Create User">
            <form className="space-y-4 p-5" onSubmit={submitUser}>
              <TextInput
                disabled={!canAdmin}
                label="Subject"
                value={userSubject}
                onChange={setUserSubject}
                ariaLabel="User subject"
              />
              <TextInput
                disabled={!canAdmin}
                label="Display Name"
                value={userDisplayName}
                onChange={setUserDisplayName}
                ariaLabel="User display name"
              />
              <TextInput
                disabled={!canAdmin}
                label="Password"
                type="password"
                value={userPassword}
                onChange={setUserPassword}
                ariaLabel="User password"
              />
              <RoleSelect
                disabled={!canAdmin}
                label="Role"
                value={userRole}
                onChange={setUserRole}
                ariaLabel="User role"
              />
              {createUser.error && (
                <ErrorMessage error={createUser.error} fallback="User creation failed." />
              )}
              <ActionButton
                disabled={!canAdmin || createUser.isPending || !userSubject.trim() || userPassword.length < 8}
                icon={<UserPlus className="h-4 w-4" />}
                label="Create User"
              />
            </form>
          </Panel>

          <Panel title="Create Team">
            <form className="space-y-4 p-5" onSubmit={submitTeam}>
              <TextInput
                disabled={!canAdmin}
                label="Team ID"
                value={teamId}
                onChange={setTeamId}
                ariaLabel="Team ID"
              />
              <TextInput
                disabled={!canAdmin}
                label="Name"
                value={teamName}
                onChange={setTeamName}
                ariaLabel="Team name"
              />
              <TextInput
                disabled={!canAdmin}
                label="Description"
                value={teamDescription}
                onChange={setTeamDescription}
                ariaLabel="Team description"
              />
              {createTeam.error && (
                <ErrorMessage error={createTeam.error} fallback="Team creation failed." />
              )}
              <ActionButton
                disabled={!canAdmin || createTeam.isPending || !teamId.trim() || !teamName.trim()}
                icon={<Building2 className="h-4 w-4" />}
                label="Create Team"
              />
            </form>
          </Panel>

          <Panel title="Update User">
            <form className="space-y-4 p-5" onSubmit={submitUserUpdate}>
              <TextInput
                disabled={!canAdmin}
                label="Subject"
                value={editUserSubject}
                onChange={setEditUserSubject}
                ariaLabel="Update user subject"
              />
              <TextInput
                disabled={!canAdmin}
                label="Display Name"
                value={editUserDisplayName}
                onChange={setEditUserDisplayName}
                ariaLabel="Update user display name"
              />
              <RoleSelect
                disabled={!canAdmin}
                label="Role"
                value={editUserRole}
                onChange={setEditUserRole}
                ariaLabel="Update user role"
              />
              {updateUser.isSuccess && (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  User metadata updated.
                </p>
              )}
              {updateUser.error && (
                <ErrorMessage error={updateUser.error} fallback="User update failed." />
              )}
              <ActionButton
                disabled={!canAdmin || updateUser.isPending || !editUserSubject.trim()}
                icon={<UserCog className="h-4 w-4" />}
                label="Update User"
              />
            </form>
          </Panel>

          <Panel title="Update Team">
            <form className="space-y-4 p-5" onSubmit={submitTeamUpdate}>
              <TextInput
                disabled={!canAdmin}
                label="Team ID"
                value={editTeamId}
                onChange={setEditTeamId}
                ariaLabel="Update team ID"
              />
              <TextInput
                disabled={!canAdmin}
                label="Name"
                value={editTeamName}
                onChange={setEditTeamName}
                ariaLabel="Update team name"
              />
              <TextInput
                disabled={!canAdmin}
                label="Description"
                value={editTeamDescription}
                onChange={setEditTeamDescription}
                ariaLabel="Update team description"
              />
              {updateTeam.isSuccess && (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  Team metadata updated.
                </p>
              )}
              {updateTeam.error && (
                <ErrorMessage error={updateTeam.error} fallback="Team update failed." />
              )}
              <ActionButton
                disabled={!canAdmin || updateTeam.isPending || !editTeamId.trim() || !editTeamName.trim()}
                icon={<Building2 className="h-4 w-4" />}
                label="Update Team"
              />
            </form>
          </Panel>

          <Panel title="Reset User Password">
            <form className="space-y-4 p-5" onSubmit={submitPasswordReset}>
              <TextInput
                disabled={!canAdmin}
                label="Subject"
                value={resetSubject}
                onChange={setResetSubject}
                ariaLabel="Reset subject"
              />
              <TextInput
                disabled={!canAdmin}
                label="Temporary Password"
                type="password"
                value={resetPassword}
                onChange={setResetPassword}
                ariaLabel="Temporary password"
              />
              {resetUserPassword.isSuccess && (
                <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-200">
                  Password reset applied. Share the temporary password out of band.
                </p>
              )}
              {resetUserPassword.error && (
                <ErrorMessage
                  error={resetUserPassword.error}
                  fallback="Password reset failed."
                />
              )}
              <ActionButton
                disabled={
                  !canAdmin ||
                  resetUserPassword.isPending ||
                  !resetSubject.trim() ||
                  resetPassword.length < MIN_RESET_PASSWORD_LENGTH
                }
                icon={<KeyRound className="h-4 w-4" />}
                label="Reset Password"
              />
            </form>
          </Panel>

          <Panel title="Add Team Member">
            <form className="space-y-4 p-5" onSubmit={submitMember}>
              <TeamSelect
                disabled={!canAdmin || !teamOptions.length}
                label="Team"
                value={selectedTeamId}
                teams={teamOptions}
                onChange={setMemberTeamId}
                ariaLabel="Member team"
              />
              <TextInput
                disabled={!canAdmin}
                label="Subject"
                value={memberSubject}
                onChange={setMemberSubject}
                ariaLabel="Member subject"
              />
              <RoleSelect
                disabled={!canAdmin}
                label="Role"
                value={memberRole}
                onChange={setMemberRole}
                ariaLabel="Member role"
              />
              {addMember.error && (
                <ErrorMessage error={addMember.error} fallback="Team member update failed." />
              )}
              <ActionButton
                disabled={!canAdmin || addMember.isPending || !selectedTeamId || !memberSubject.trim()}
                icon={<UserCog className="h-4 w-4" />}
                label="Add Member"
              />
            </form>
          </Panel>

          <Panel title="Create API Key">
            <form className="space-y-4 p-5" onSubmit={submitKey}>
              <TextInput
                disabled={!canAdmin}
                label="Name"
                value={keyName}
                onChange={setKeyName}
                ariaLabel="API key name"
              />
              <TextInput
                disabled={!canAdmin}
                label="Subject"
                value={keySubject}
                onChange={setKeySubject}
                ariaLabel="API key subject"
              />
              <RoleSelect
                disabled={!canAdmin}
                label="Role"
                value={keyRole}
                onChange={setKeyRole}
                ariaLabel="API key role"
              />
              <TeamSelect
                allowEmpty
                disabled={!canAdmin}
                label="Team"
                value={keyTeamId}
                teams={teamOptions}
                onChange={setKeyTeamId}
                ariaLabel="API key team"
              />
              {createKey.error && (
                <ErrorMessage error={createKey.error} fallback="API key creation failed." />
              )}
              <ActionButton
                disabled={!canAdmin || createKey.isPending || !keyName.trim() || !keySubject.trim()}
                icon={<Plus className="h-4 w-4" />}
                label="Create Key"
              />
            </form>
          </Panel>
        </div>

        <div className="space-y-6">
          {oneTimeSecret && (
            <Panel title="One-Time Secret">
              <div className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-2 text-xs text-amber-200">
                  <KeyRound className="h-4 w-4" />
                  <span className="font-semibold">{oneTimeSecret.name}</span>
                  <StateBadge state={oneTimeSecret.role} />
                  {oneTimeSecret.team_id && <StateBadge state={oneTimeSecret.team_id} />}
                </div>
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 p-3">
                  <code className="break-all font-mono text-xs text-amber-100">
                    {oneTimeSecret.secret}
                  </code>
                </div>
                <p className="text-xs leading-relaxed text-amber-100/80">
                  Store this value now. MoiraWeave keeps only the hashed key and
                  cannot show the secret again.
                </p>
              </div>
            </Panel>
          )}

          <Panel title="Users">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <TableHead columns={["Subject", "Role", "Created", "Status", "Actions"]} />
                <tbody className="divide-y divide-slate-800/70">
                  {(users.data || []).map((item) => (
                    <tr key={item.subject} className="hover:bg-slate-800/20">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-200">{item.subject}</div>
                        {item.display_name && (
                          <div className="text-xs text-slate-500">{item.display_name}</div>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <StateBadge state={item.role} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <StateBadge state={item.disabled_at ? "disabled" : "active"} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:opacity-40"
                            disabled={!canAdmin}
                            onClick={() => selectUserForEdit(item)}
                            title="Edit user"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 disabled:opacity-40"
                            disabled={!canAdmin || !item.disabled_at || enableUser.isPending}
                            onClick={() => enableUser.mutate(item.subject)}
                            title="Enable user"
                          >
                            <UserCheck className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                            disabled={!canAdmin || Boolean(item.disabled_at) || disableUser.isPending}
                            onClick={() => disableUser.mutate(item.subject)}
                            title="Disable user"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {users.data && users.data.length === 0 && !users.error && (
                    <RowMessage colSpan={5} text="No users created" />
                  )}
                  {!canAdmin && <RowMessage colSpan={5} text="Admin role required" />}
                </tbody>
              </table>
            </div>
            <PanelErrors errors={[users.error, disableUser.error, enableUser.error]} fallback="Unable to load users." />
          </Panel>

          <Panel title="Teams">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <TableHead columns={["Team", "Description", "Created", "Members"]} />
                <tbody className="divide-y divide-slate-800/70">
                  {(teams.data || []).map((item) => (
                    <tr key={item.team_id} className="hover:bg-slate-800/20">
                      <td className="px-5 py-3">
                        <div className="font-semibold text-slate-200">{item.name}</div>
                        <div className="font-mono text-[10px] text-slate-500">
                          {item.team_id}
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {item.description || "-"}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <button
                          className="rounded-lg border border-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:bg-slate-800/50"
                          onClick={() => selectTeamForEdit(item)}
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {teams.data && teams.data.length === 0 && !teams.error && (
                    <RowMessage colSpan={4} text="No teams created" />
                  )}
                  {!canAdmin && <RowMessage colSpan={4} text="Admin role required" />}
                </tbody>
              </table>
            </div>
            <PanelErrors errors={[teams.error]} fallback="Unable to load teams." />
          </Panel>

          <Panel title={`Team Members${selectedTeamId ? `: ${selectedTeamId}` : ""}`}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <TableHead columns={["Subject", "Role", "Created By", "Created", "Actions"]} />
                <tbody className="divide-y divide-slate-800/70">
                  {(teamMembers.data || []).map((item) => (
                    <tr
                      key={`${item.team_id}-${item.subject}`}
                      className="hover:bg-slate-800/20"
                    >
                      <td className="px-5 py-3 font-mono text-xs text-slate-300">
                        {item.subject}
                      </td>
                      <td className="px-5 py-3">
                        <StateBadge state={item.role} />
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {item.created_by}
                      </td>
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {formatDate(item.created_at)}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                          disabled={!canAdmin || removeMember.isPending}
                          onClick={() =>
                            removeMember.mutate({
                              teamId: item.team_id,
                              subject: item.subject
                            })
                          }
                          title="Remove team member"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {selectedTeamId && teamMembers.data?.length === 0 && !teamMembers.error && (
                    <RowMessage colSpan={5} text="No members in selected team" />
                  )}
                  {!selectedTeamId && !teams.error && !teamMembers.error && (
                    <RowMessage colSpan={5} text="Select a team" />
                  )}
                </tbody>
              </table>
            </div>
            <PanelErrors
              errors={[teamMembers.error, removeMember.error]}
              fallback="Unable to load team members."
            />
          </Panel>

          <Panel title="API Keys">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <TableHead
                  columns={[
                    "Name",
                    "Subject",
                    "Role",
                    "Team",
                    "Prefix",
                    "Last Used",
                    "Status",
                    "Actions"
                  ]}
                />
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
                      <td className="px-5 py-3 text-xs text-slate-400">
                        {item.team_id || "-"}
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
                      <td className="px-5 py-3">
                        <div className="flex justify-end gap-2">
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-500/20 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 disabled:opacity-40"
                            disabled={!canAdmin || Boolean(item.revoked_at) || rotateKey.isPending}
                            onClick={() => rotateKey.mutate(item.key_id)}
                            title="Rotate API key"
                          >
                            <RotateCw className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-500/20 bg-red-500/10 text-red-300 hover:bg-red-500/20 disabled:opacity-40"
                            disabled={!canAdmin || Boolean(item.revoked_at) || revokeKey.isPending}
                            onClick={() => revokeKey.mutate(item.key_id)}
                            title="Revoke API key"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {keys.data && keys.data.length === 0 && !keys.error && (
                    <RowMessage colSpan={8} text="No API keys created" />
                  )}
                  {!canAdmin && <RowMessage colSpan={8} text="Admin role required" />}
                </tbody>
              </table>
            </div>
            <PanelErrors
              errors={[keys.error, revokeKey.error, rotateKey.error]}
              fallback="Unable to load API keys."
            />
          </Panel>

          <Panel title="Access Model">
            <div className="grid gap-3 p-5 md:grid-cols-3">
              <AccessRole
                title="viewer"
                body="Read workloads, runs, sessions, health, and artifacts."
              />
              <AccessRole
                title="operator"
                body="Submit runs, message agents, cancel work, and run operations."
              />
              <AccessRole
                title="admin"
                body="Create workloads, inspect secrets, and manage identity."
              />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function TextInput({
  ariaLabel,
  disabled,
  label,
  onChange,
  type = "text",
  value
}: {
  ariaLabel: string;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <input
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      />
    </div>
  );
}

function RoleSelect({
  ariaLabel,
  disabled,
  label,
  onChange,
  value
}: {
  ariaLabel: string;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <select
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {ROLE_OPTIONS.map((role) => (
          <option key={role} value={role}>
            {role}
          </option>
        ))}
      </select>
    </div>
  );
}

function TeamSelect({
  allowEmpty = false,
  ariaLabel,
  disabled,
  label,
  onChange,
  teams,
  value
}: {
  allowEmpty?: boolean;
  ariaLabel: string;
  disabled: boolean;
  label: string;
  onChange: (value: string) => void;
  teams: Array<{ team_id: string; name: string }>;
  value: string;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </label>
      <select
        aria-label={ariaLabel}
        className="w-full rounded-lg border border-slate-800 bg-[#090d16] px-3.5 py-2 text-sm text-slate-200 outline-none focus:border-slate-700"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
      >
        {allowEmpty && <option value="">No team</option>}
        {teams.map((team) => (
          <option key={team.team_id} value={team.team_id}>
            {team.name} ({team.team_id})
          </option>
        ))}
      </select>
    </div>
  );
}

function ActionButton({
  disabled,
  icon,
  label
}: {
  disabled: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <button
      className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/10 transition-colors hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600"
      disabled={disabled}
    >
      {icon}
      {label}
    </button>
  );
}

function TableHead({ columns }: { columns: string[] }) {
  return (
    <thead className="border-b border-slate-800 bg-[#0b0f19]/80 text-[10px] uppercase tracking-wider text-slate-500">
      <tr>
        {columns.map((column) => (
          <th key={column} className="px-5 py-3">
            {column}
          </th>
        ))}
      </tr>
    </thead>
  );
}

function PanelErrors({
  errors,
  fallback
}: {
  errors: unknown[];
  fallback: string;
}) {
  const error = errors.find(Boolean);
  if (!error) return null;
  return (
    <div className="p-5">
      <ErrorMessage error={error} fallback={fallback} />
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
