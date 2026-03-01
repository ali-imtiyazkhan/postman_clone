import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  addRequestToCollection,
  getAllRequestFromCollection,
  Request,
  run,
  runDirect,
  saveRequest,
  auditRequestAction,
} from "../actions";
import { ResponseAuditParams } from "@/lib/ai-agents";
import { useRequestPlaygroundStore } from "../store/useRequestStore";

export function useAddRequestToCollection(collectionId: string) {
  const queryClient = useQueryClient();
  const { updateTabFromSavedRequest, activeTabId } =
    useRequestPlaygroundStore();
  return useMutation({
    mutationFn: async (value: Request) =>
      addRequestToCollection(collectionId, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests", collectionId] });
      {/*@ts-expect-error -- explain why this is safe */ }
      updateTabFromSavedRequest(activeTabId!, data);
    },
  });
}

export function useGetAllRequestFromCollection(collectionId: string) {
  return useQuery({
    queryKey: ["requests", collectionId],
    queryFn: async () => getAllRequestFromCollection(collectionId),
  });
}

export function useSaveRequest(id: string) {
  const { updateTabFromSavedRequest, activeTabId } =
    useRequestPlaygroundStore();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (value: Request) => saveRequest(id, value),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });

      {/*@ts-expect-error -- explain why this is safe */ }
      updateTabFromSavedRequest(activeTabId!, data);
    },
  });
}

export function useRunRequest() {
  const { setResponseViewerData } = useRequestPlaygroundStore();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tab: any) =>
      await runDirect({
        id: tab.requestId,
        method: tab.method,
        url: tab.url,
        headers: tab.headers,
        parameters: tab.parameters,
        body: tab.body,
      }),
    onSuccess: async (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["requests"] });
      setResponseViewerData(data);
      // Removed automatic AI audit to conserve quota
    },
  });
}

export function useAuditResponse() {
  return useMutation({
    mutationFn: async (params: ResponseAuditParams) =>
      await auditRequestAction(params),
    onMutate: () => {
      useRequestPlaygroundStore.getState().setIsAuditing(true);
      useRequestPlaygroundStore.getState().setResponseAuditData(null);
    },
    onSuccess: (data) => {
      if (data.success) {
        useRequestPlaygroundStore.getState().setResponseAuditData(data.data);
      }
    },
    onError: (error) => {
      console.error("AI Audit failed:", error);
    },
    onSettled: () => {
      useRequestPlaygroundStore.getState().setIsAuditing(false);
    },
  });
}
