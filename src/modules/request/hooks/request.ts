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

      if (data.success && data.requestRun) {
        useRequestPlaygroundStore.getState().setIsAuditing(true);
        try {
          const auditResult = await auditRequestAction({
            method: variables.method,
            url: variables.url,
            requestHeaders: JSON.stringify(variables.headers),
            requestBody: variables.body,
            responseStatus: data.requestRun.status,
            responseHeaders: JSON.stringify(data.requestRun.headers),
            responseBody: data.requestRun.body || "",
          });

          if (auditResult.success) {
            useRequestPlaygroundStore.getState().setResponseAuditData(auditResult.data);
          }
        } catch (error) {
          console.error("AI Audit failed:", error);
        } finally {
          useRequestPlaygroundStore.getState().setIsAuditing(false);
        }
      }
    },
  });
}
