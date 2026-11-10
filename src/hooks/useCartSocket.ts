import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

import {
  buildCartSocketUrl,
  getCartSocketTicket,
} from "../lib/api";

export interface CartSocketSnapshot {
  type: "cart.snapshot";
  quantities: Record<string, number>;
  count: number;
  revision: string;
  reason?: string;
}

type SocketStatus =
  | "disabled"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "closed";

interface UseCartSocketOptions {
  enabled: boolean;
  onSnapshot: (
    snapshot: CartSocketSnapshot,
  ) => void;
}

export function useCartSocket({
  enabled,
  onSnapshot,
}: UseCartSocketOptions) {
  const [status, setStatus] =
    useState<SocketStatus>(
      enabled ? "connecting" : "disabled",
    );

  const socketRef =
    useRef<WebSocket | null>(null);

  const reconnectTimerRef =
    useRef<number | null>(null);

  const heartbeatTimerRef =
    useRef<number | null>(null);

  const reconnectAttemptRef =
    useRef(0);

  const snapshotHandlerRef =
    useRef(onSnapshot);

  useEffect(() => {
    snapshotHandlerRef.current =
      onSnapshot;
  }, [onSnapshot]);

  const clearTimers = useCallback(() => {
    if (
      reconnectTimerRef.current !== null
    ) {
      window.clearTimeout(
        reconnectTimerRef.current,
      );

      reconnectTimerRef.current = null;
    }

    if (
      heartbeatTimerRef.current !== null
    ) {
      window.clearInterval(
        heartbeatTimerRef.current,
      );

      heartbeatTimerRef.current = null;
    }
  }, []);

  const requestSync = useCallback(() => {
    const socket = socketRef.current;

    if (
      socket?.readyState ===
      WebSocket.OPEN
    ) {
      socket.send(
        JSON.stringify({
          type: "cart.sync",
        }),
      );
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      clearTimers();
      socketRef.current?.close(
        1000,
        "Cart socket disabled",
      );
      socketRef.current = null;

      const disabledStatusTimer =
        window.setTimeout(() => {
          setStatus("disabled");
        }, 0);

      return () => {
        window.clearTimeout(
          disabledStatusTimer,
        );
      };
    }

    let cancelled = false;

    async function connect() {
      if (cancelled) {
        return;
      }

      setStatus(
        reconnectAttemptRef.current > 0
          ? "reconnecting"
          : "connecting",
      );

      try {
        const ticketPayload =
          await getCartSocketTicket();

        if (cancelled) {
          return;
        }

        const socket = new WebSocket(
          buildCartSocketUrl(
            ticketPayload.websocket_path,
            ticketPayload.ticket,
          ),
        );

        socketRef.current = socket;

        socket.onopen = () => {
          if (cancelled) {
            socket.close();
            return;
          }

          reconnectAttemptRef.current = 0;
          setStatus("connected");

          socket.send(
            JSON.stringify({
              type: "cart.sync",
            }),
          );

          if (
            heartbeatTimerRef.current !==
            null
          ) {
            window.clearInterval(
              heartbeatTimerRef.current,
            );
          }

          heartbeatTimerRef.current =
            window.setInterval(() => {
              if (
                socket.readyState ===
                WebSocket.OPEN
              ) {
                socket.send(
                  JSON.stringify({
                    type: "ping",
                  }),
                );
              }
            }, 20000);
        };

        socket.onmessage = (event) => {
          try {
            const message = JSON.parse(
              String(event.data || "{}"),
            ) as Partial<CartSocketSnapshot> & {
              type?: string;
            };

            if (
              message.type ===
                "cart.snapshot" &&
              message.quantities &&
              typeof message.count ===
                "number"
            ) {
              snapshotHandlerRef.current({
                type: "cart.snapshot",
                quantities:
                  message.quantities,
                count: message.count,
                revision:
                  String(
                    message.revision ||
                      "",
                  ),
                reason:
                  message.reason,
              });
            }
          } catch {
            // Ignore malformed socket messages.
          }
        };

        socket.onerror = () => {
          // onclose performs reconnect.
        };

        socket.onclose = () => {
          if (cancelled) {
            return;
          }

          if (
            heartbeatTimerRef.current !==
            null
          ) {
            window.clearInterval(
              heartbeatTimerRef.current,
            );

            heartbeatTimerRef.current =
              null;
          }

          reconnectAttemptRef.current += 1;
          setStatus("reconnecting");

          const delay = Math.min(
            10000,
            750 *
              2 **
                Math.min(
                  reconnectAttemptRef.current,
                  4,
                ),
          );

          reconnectTimerRef.current =
            window.setTimeout(() => {
              void connect();
            }, delay);
        };
      } catch {
        if (cancelled) {
          return;
        }

        reconnectAttemptRef.current += 1;
        setStatus("reconnecting");

        const delay = Math.min(
          10000,
          1000 *
            2 **
              Math.min(
                reconnectAttemptRef.current,
                4,
              ),
        );

        reconnectTimerRef.current =
          window.setTimeout(() => {
            void connect();
          }, delay);
      }
    }

    void connect();

    return () => {
      cancelled = true;
      clearTimers();

      const socket = socketRef.current;
      socketRef.current = null;

      if (
        socket &&
        socket.readyState !==
          WebSocket.CLOSED
      ) {
        socket.close(
          1000,
          "Component unmounted",
        );
      }

    };
  }, [
    clearTimers,
    enabled,
  ]);

  return {
    status,
    requestSync,
  };
}
