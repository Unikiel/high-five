import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const QUERY_KEY = ["appConfig"];

async function fetchAppConfig() {
  const res = await base44.functions.invoke("getAppConfig", {});
  const data = res?.data ?? res;
  return {
    require_invitation: Boolean(data?.require_invitation),
    updated_at: data?.updated_at || null,
    id: data?.id || null,
  };
}

export function useAppConfig() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: fetchAppConfig,
    staleTime: 60_000,
    retry: 1,
  });
}

export function useSetAppConfig() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (require_invitation) => {
      const res = await base44.functions.invoke("setAppConfig", { require_invitation });
      const data = res?.data ?? res;
      if (data?.error) throw new Error(data.error);
      return {
        require_invitation: Boolean(data?.require_invitation),
        updated_at: data?.updated_at || null,
        id: data?.id || null,
      };
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
  });
}

export async function checkInvitationAllowed(email) {
  const res = await base44.functions.invoke("checkInvitation", {
    email: String(email || "").trim().toLowerCase(),
  });
  const data = res?.data ?? res;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function acceptInvitation(email) {
  const res = await base44.functions.invoke("acceptInvitation", {
    email: String(email || "").trim().toLowerCase(),
  });
  return res?.data ?? res;
}
