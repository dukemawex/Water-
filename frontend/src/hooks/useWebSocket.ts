import { useEffect, useRef, useCallback } from 'react';

type WSCallback = (event: { type: string; payload: unknown; timestamp: string }) => void;

export function useWebSocket(onMessage: WSCallback, rooms: string[] = []) {
  const wsRef = useRef<WebSocket | null>(null);
  const callbackRef = useRef(onMessage);
  callbackRef.current = onMessage;

  const connect = useCallback(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      rooms.forEach((room) => ws.send(JSON.stringify({ action: 'subscribe', room })));
    };

    ws.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data as string) as { type: string; payload: unknown; timestamp: string };
        callbackRef.current(event);
      } catch { /* ignore parse errors */ }
    };

    ws.onclose = () => {
      setTimeout(connect, 3000);
    };

    wsRef.current = ws;
  }, [rooms]);

  useEffect(() => {
    connect();
    return () => {
      wsRef.current?.close();
    };
  }, [connect]);
}
