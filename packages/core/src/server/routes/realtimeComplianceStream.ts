import type { Request, Response } from "express";
import EventEmitter from "events";
import { runComplianceHealthCheck } from "../../lib/compliance-monitor";

// Global event bus for real-time compliance updates
export const complianceEventBus = new EventEmitter();
complianceEventBus.setMaxListeners(100);

export function broadcastComplianceEvent(clientId: number, eventType: string, payload: any) {
  complianceEventBus.emit(`client:${clientId}`, {
    eventType,
    payload,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Express SSE Handler for Real-time Compliance Updates
 * GET /api/v1/compliance/stream?clientId=1
 */
export async function realtimeComplianceStreamHandler(req: Request, res: Response) {
  const clientIdRaw = req.query.clientId as string;
  const clientId = parseInt(clientIdRaw, 10);

  if (isNaN(clientId)) {
    res.status(400).json({ error: "Missing or invalid query parameter 'clientId'" });
    return;
  }

  // Set SSE Headers
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // Disable proxy buffering

  res.flushHeaders?.();

  // Helper to format and send SSE message
  const sendSSE = (event: string, data: any) => {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  };

  // 1. Initial State Transmission
  try {
    const healthResult = await runComplianceHealthCheck(clientId);
    sendSSE("init", {
      clientId,
      health: healthResult,
      connectedAt: new Date().toISOString(),
    });
  } catch (err: any) {
    sendSSE("error", { message: "Failed to load initial compliance health state", error: err.message });
  }

  // 2. Event Listener for Live Updates
  const eventChannel = `client:${clientId}`;
  const onComplianceEvent = (data: any) => {
    sendSSE(data.eventType || "update", data);
  };

  complianceEventBus.on(eventChannel, onComplianceEvent);

  // 3. Heartbeat Ping (15s interval)
  const heartbeatTimer = setInterval(() => {
    res.write(": heartbeat ping\n\n");
  }, 15000);

  // 4. Cleanup on disconnect
  req.on("close", () => {
    clearInterval(heartbeatTimer);
    complianceEventBus.removeListener(eventChannel, onComplianceEvent);
    res.end();
  });
}
