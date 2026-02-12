import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";

type ConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "error"
  | "reconnecting";

type WsMessage = {
  id: string;
  type: "sent" | "received";
  data: any;
  timestamp: Date;
  raw?: string;
};

type WsOptions = {
  onOpen?: (ev: Event) => void;
  onMessage?: (ev: MessageEvent) => void;
  onClose?: (ev: CloseEvent) => void;
  onError?: (ev: Event | Error) => void;
  autoReconnect?: boolean;
  reconnectDelay?: number;
};

interface WsStore {
  ws: WebSocket | null;
  url: string | null;
  status: ConnectionStatus;
  error: string | null;
  messages: WsMessage[];
  options: WsOptions;

  reconnectAttempts: number;
  maxReconnectAttempts: number;
  reconnectTimeoutId: number | null;

  draftMessage: string;

  // computed
  isConnected: boolean;
  isConnecting: boolean;
  isReconnecting: boolean;

  connect: (url: string, options?: WsOptions) => void;
  disconnect: (code?: number, reason?: string) => void;
  send: (data: string | object) => boolean;
  clearMessages: () => void;
  setError: (error: string | null) => void;
  setDraftMessage: (message: string) => void;

  addMessage: (message: Omit<WsMessage, "id" | "timestamp">) => void;
  handleReconnect: () => void;
  getReadyState: () => number;
}

const getInitialState = () => ({
  ws: null,
  url: null,
  status: "disconnected" as ConnectionStatus,
  error: null,
  messages: [],
  options: {},
  reconnectAttempts: 0,
  maxReconnectAttempts: 5,
  reconnectTimeoutId: null,
  draftMessage: "",
});

export const useWsStore = create<WsStore>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialState(),

    // Computed (no state drift)
    get isConnected() {
      return get().status === "connected";
    },
    get isConnecting() {
      return get().status === "connecting";
    },
    get isReconnecting() {
      return get().status === "reconnecting";
    },

    connect: (url: string, options: WsOptions = {}) => {
      if (typeof window === "undefined") return;

      const state = get();

      // clear old timeout
      if (state.reconnectTimeoutId) {
        clearTimeout(state.reconnectTimeoutId);
        set({ reconnectTimeoutId: null });
      }

      // close old socket
      if (state.ws) {
        state.ws.close();
      }

      set({
        url,
        options,
        status: "connecting",
        error: null,
        reconnectAttempts: 0,
      });

      try {
        const ws = new WebSocket(url);

        ws.onopen = (event) => {
          set({
            ws,
            status: "connected",
            error: null,
            reconnectAttempts: 0,
          });
          options.onOpen?.(event);
        };

        ws.onmessage = (event) => {
          get().addMessage({
            type: "received",
            data: event.data,
            raw: event.data,
          });
          options.onMessage?.(event);
        };

        ws.onclose = (event) => {
          set({ ws: null });
          options.onClose?.(event);

          if (options.autoReconnect && event.code !== 1000) {
            get().handleReconnect();
          } else {
            set({ status: "disconnected" });
          }
        };

        ws.onerror = (event) => {
          set({
            status: "error",
            error: "Connection error occurred",
          });
          options.onError?.(event);
        };
      } catch (error) {
        set({
          status: "error",
          error:
            error instanceof Error
              ? error.message
              : "Failed to create WebSocket",
        });
        options.onError?.(error as Error);
      }
    },

    disconnect: (code = 1000, reason = "") => {
      const state = get();

      if (state.reconnectTimeoutId) {
        clearTimeout(state.reconnectTimeoutId);
      }

      if (state.ws) {
        state.ws.close(code, reason);
      }

      set({
        ws: null,
        status: "disconnected",
        reconnectTimeoutId: null,
        reconnectAttempts: 0,
      });
    },

    send: (data: string | object) => {
      const state = get();

      if (!state.ws || state.ws.readyState !== WebSocket.OPEN) {
        return false;
      }

      try {
        const message = typeof data === "string" ? data : JSON.stringify(data);

        state.ws.send(message);

        get().addMessage({
          type: "sent",
          data,
          raw: message,
        });

        return true;
      } catch {
        set({ error: "Failed to send message" });
        return false;
      }
    },

    clearMessages: () => set({ messages: [] }),
    setDraftMessage: (message: string) => set({ draftMessage: message }),
    setError: (error: string | null) => set({ error }),

    addMessage: (message) => {
      const newMessage: WsMessage = {
        ...message,
        id: crypto.randomUUID(),
        timestamp: new Date(),
      };

      set((state) => ({
        messages: [...state.messages, newMessage].slice(-100),
      }));
    },

    handleReconnect: () => {
      const state = get();

      if (state.reconnectAttempts >= state.maxReconnectAttempts) {
        set({
          status: "error",
          error: "Max reconnection attempts reached",
        });
        return;
      }

      const delay =
        (state.options.reconnectDelay || 3000) *
        Math.pow(1.5, state.reconnectAttempts);

      set({
        status: "reconnecting",
        reconnectAttempts: state.reconnectAttempts + 1,
      });

      const timeoutId = window.setTimeout(() => {
        const fresh = get(); // no stale state
        if (fresh.url) {
          fresh.connect(fresh.url, fresh.options);
        }
      }, delay);

      set({ reconnectTimeoutId: timeoutId });
    },

    getReadyState: () => {
      const ws = get().ws;
      return ws ? ws.readyState : WebSocket.CLOSED;
    },
  })),
);
