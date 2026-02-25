import { DurableObject } from "cloudflare:workers";

/**
 * Stub kept only so Cloudflare accepts the deleted_classes migration.
 * No longer used — stats are handled by the BombBustersServer __stats__ room.
 */
export class StatsServer extends DurableObject {
  async fetch(): Promise<Response> {
    return new Response("gone", { status: 410 });
  }
}
