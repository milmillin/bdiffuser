import { DurableObject } from "cloudflare:workers";

interface RoomEntry {
  players: number;
  updatedAt: number;
}

const STALE_THRESHOLD_MS = 5 * 60 * 1000;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export class StatsServer extends DurableObject {
  private rooms = new Map<string, RoomEntry>();

  async fetch(request: Request): Promise<Response> {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method === "POST") {
      const body = (await request.json()) as { roomId: string; players: number };
      if (body.players <= 0) {
        this.rooms.delete(body.roomId);
      } else {
        this.rooms.set(body.roomId, { players: body.players, updatedAt: Date.now() });
      }
      return new Response("ok", { headers: CORS_HEADERS });
    }

    // GET — prune stale entries and return aggregated stats
    const now = Date.now();
    for (const [id, entry] of this.rooms) {
      if (now - entry.updatedAt > STALE_THRESHOLD_MS) {
        this.rooms.delete(id);
      }
    }

    let totalPlayers = 0;
    for (const entry of this.rooms.values()) {
      totalPlayers += entry.players;
    }

    return new Response(
      JSON.stringify({ rooms: this.rooms.size, players: totalPlayers }),
      { headers: { "Content-Type": "application/json", ...CORS_HEADERS } },
    );
  }
}
