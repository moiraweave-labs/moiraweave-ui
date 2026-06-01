import { useQuery } from "@tanstack/react-query";
import { api, getToken } from "./api";

type Role = "viewer" | "operator" | "admin";

const ROLE_RANK: Record<Role, number> = { viewer: 0, operator: 1, admin: 2 };

export function roleAllows(
  role: string | undefined,
  minimumRole: Role
): boolean {
  return (ROLE_RANK[role as Role] ?? -1) >= ROLE_RANK[minimumRole];
}

export function useAuthProfile() {
  const token = getToken();
  const profile = useQuery({
    queryKey: ["auth-profile", token],
    queryFn: api.me,
    enabled: Boolean(token),
    retry: false,
    staleTime: 30_000
  });
  return {
    profile,
    subject: profile.data?.subject,
    role: profile.data?.role,
    canOperate: roleAllows(profile.data?.role, "operator"),
    canAdmin: roleAllows(profile.data?.role, "admin")
  };
}
