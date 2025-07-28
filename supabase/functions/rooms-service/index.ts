import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

// Environment variables for Upstash Redis
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

interface CreateRoomBody {
  action: "create";
  playerName: string;
  selectedGame: string;
}

interface JoinRoomBody {
  action: "join";
  roomCode: string;
  playerName: string;
}

interface GetRoomQuery {
  roomCode: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper to generate a 6-char room code
function generateRoomCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method === "POST") {
      const body = await req.json();

      // CREATE ROOM
      if (body.action === "create") {
        const { playerName, selectedGame } = body as CreateRoomBody;
        if (!playerName || !selectedGame) {
          return new Response(
            JSON.stringify({ error: "Missing parameters" }),
            { status: 400, headers: corsHeaders },
          );
        }

        // Ensure unique room code
        let roomCode = generateRoomCode();
        while (await redis.exists([`room:${roomCode}`])) {
          roomCode = generateRoomCode();
        }

        const hostId = crypto.randomUUID();
        const createdAt = Date.now();

        const roomData = {
          roomCode,
          name: `${playerName}'s Room`,
          hostId,
          currentGame: selectedGame,
          players: [
            {
              playerId: hostId,
              playerName,
              isHost: true,
              joinedAt: createdAt,
            },
          ],
          createdAt,
          gameState: { phase: "lobby", votes: {}, currentQuestion: null },
        };

        // Store with TTL of 8 hours (28800 seconds)
        await redis.set(`room:${roomCode}`, JSON.stringify(roomData), {
          ex: 28800,
        });

        return new Response(
          JSON.stringify({ success: true, room: roomData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // JOIN ROOM
      if (body.action === "join") {
        const { roomCode, playerName } = body as JoinRoomBody;
        if (!roomCode || !playerName) {
          return new Response(
            JSON.stringify({ error: "Missing parameters" }),
            { status: 400, headers: corsHeaders },
          );
        }

        const raw = await redis.get<string>(`room:${roomCode}`);
        if (!raw) {
          return new Response(
            JSON.stringify({ error: "Room not found" }),
            { status: 404, headers: corsHeaders },
          );
        }

        const roomData = JSON.parse(raw);

        // Check name taken
        if (roomData.players.some((p: any) => p.playerName === playerName)) {
          return new Response(
            JSON.stringify({ error: "Player name already taken" }),
            { status: 409, headers: corsHeaders },
          );
        }

        const playerId = crypto.randomUUID();
        const joinedAt = Date.now();
        roomData.players.push({
          playerId,
          playerName,
          isHost: false,
          joinedAt,
        });

        // Extend TTL & save back
        await redis.set(`room:${roomCode}`, JSON.stringify(roomData), {
          ex: 28800,
        });

        return new Response(
          JSON.stringify({ success: true, room: roomData, playerId }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // KICK PLAYER (host only)
      if (body.action === "kick") {
        const { roomCode, targetPlayerId, hostId } = body;
        if (!roomCode || !targetPlayerId || !hostId) {
          return new Response(
            JSON.stringify({ error: "Missing parameters" }),
            { status: 400, headers: corsHeaders },
          );
        }

        const raw = await redis.get<string>(`room:${roomCode}`);
        if (!raw) {
          return new Response(
            JSON.stringify({ error: "Room not found" }),
            { status: 404, headers: corsHeaders },
          );
        }

        const roomData = JSON.parse(raw);

        if (roomData.hostId !== hostId) {
          return new Response(
            JSON.stringify({ error: "Only host can kick players" }),
            { status: 403, headers: corsHeaders },
          );
        }

        const initialCount = roomData.players.length;
        roomData.players = roomData.players.filter((p: any) => p.playerId !== targetPlayerId);

        if (roomData.players.length === initialCount) {
          return new Response(
            JSON.stringify({ error: "Player not found" }),
            { status: 404, headers: corsHeaders },
          );
        }

        await redis.set(`room:${roomCode}`, JSON.stringify(roomData), { ex: 28800 });

        return new Response(
          JSON.stringify({ success: true, room: roomData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      // UPDATE ROOM (generic)
      if (body.action === "update") {
        const { roomCode, updates } = body;
        if (!roomCode || !updates) {
          return new Response(
            JSON.stringify({ error: "Missing parameters" }),
            { status: 400, headers: corsHeaders },
          );
        }

        const raw = await redis.get<string>(`room:${roomCode}`);
        if (!raw) {
          return new Response(
            JSON.stringify({ error: "Room not found" }),
            { status: 404, headers: corsHeaders },
          );
        }

        const roomData = JSON.parse(raw);
        Object.assign(roomData, updates);

        await redis.set(`room:${roomCode}`, JSON.stringify(roomData), { ex: 28800 });

        return new Response(
          JSON.stringify({ success: true, room: roomData }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(JSON.stringify({ error: "Unknown action" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    // GET ROOM via query param
    if (req.method === "GET") {
      const url = new URL(req.url);
      const roomCode = url.searchParams.get("roomCode");
      if (!roomCode) {
        return new Response(
          JSON.stringify({ error: "roomCode required" }),
          { status: 400, headers: corsHeaders },
        );
      }

      const raw = await redis.get<string>(`room:${roomCode}`);
      if (!raw) {
        return new Response(JSON.stringify({ error: "Room not found" }), {
          status: 404,
          headers: corsHeaders,
        });
      }

      let body = raw;
      try {
        // If raw is something like "[object Object]" or an object was stored
        // incorrectly, attempt to fix it by JSON-stringifying the parsed value.
        const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
        body = JSON.stringify(parsed);
      } catch {
        // raw wasn’t valid JSON – still return it so caller can see the error
      }

      return new Response(body, {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error("rooms-service error", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders },
    );
  }
}); 