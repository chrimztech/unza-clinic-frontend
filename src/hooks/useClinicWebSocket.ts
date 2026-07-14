import { useEffect, useRef, useState, useCallback } from "react";
import { Client, type IMessage } from "@stomp/stompjs";

const WS_URL = (import.meta.env.VITE_WS_URL as string) ||
  (window.location.protocol === "https:" ? "wss://" : "ws://") +
  window.location.host + "/ws-raw";

export type WsStatus = "connecting" | "connected" | "disconnected";

export interface ClinicWsOptions {
  onNotification?: (data: any) => void;
  onWardStatus?: (data: any) => void;
  onVitalAlert?: (data: any) => void;
  onLabResult?: (data: any) => void;
  onQueueUpdate?: (data: any) => void;
  enabled?: boolean;
}

export function useClinicWebSocket(options: ClinicWsOptions = {}) {
  const [status, setStatus] = useState<WsStatus>("disconnected");
  const clientRef = useRef<Client | null>(null);
  const optsRef = useRef(options);
  optsRef.current = options;

  const connect = useCallback(() => {
    if (clientRef.current?.active) return;

    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 5000,
      onConnect: () => {
        setStatus("connected");

        client.subscribe("/topic/notifications", (msg: IMessage) => {
          try { optsRef.current.onNotification?.(JSON.parse(msg.body)); } catch {}
        });
        client.subscribe("/topic/ward-status", (msg: IMessage) => {
          try { optsRef.current.onWardStatus?.(JSON.parse(msg.body)); } catch {}
        });
        client.subscribe("/topic/vital-alerts", (msg: IMessage) => {
          try { optsRef.current.onVitalAlert?.(JSON.parse(msg.body)); } catch {}
        });
        client.subscribe("/topic/lab-results", (msg: IMessage) => {
          try { optsRef.current.onLabResult?.(JSON.parse(msg.body)); } catch {}
        });
        client.subscribe("/topic/queue", (msg: IMessage) => {
          try { optsRef.current.onQueueUpdate?.(JSON.parse(msg.body)); } catch {}
        });
      },
      onDisconnect: () => setStatus("disconnected"),
      onStompError: () => setStatus("disconnected"),
      onWebSocketError: () => setStatus("disconnected"),
    });

    setStatus("connecting");
    client.activate();
    clientRef.current = client;
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.deactivate();
    clientRef.current = null;
    setStatus("disconnected");
  }, []);

  useEffect(() => {
    if (options.enabled === false) return;
    connect();
    return () => { clientRef.current?.deactivate(); };
  }, [connect, options.enabled]);

  return { status, connect, disconnect };
}
