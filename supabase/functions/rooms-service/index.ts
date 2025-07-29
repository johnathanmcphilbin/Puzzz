import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

// Environment variables for Upstash Redis
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});

// Safely parse JSON (returns null on failure)
function safeParse(raw: string | null): any | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

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
        let attempts = 0;
        while (await redis.exists([`room:${roomCode}`]) && attempts < 10) {
          roomCode = generateRoomCode();
          attempts++;
        }

        if (attempts >= 10) {
          return new Response(
            JSON.stringify({ error: "Failed to generate unique room code" }),
            { status: 500, headers: corsHeaders },
          );
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

        try {
          const setRes = await redis.set(
            `room:${roomCode}`,
            JSON.stringify(roomData),
            { ex: 28800 },
          );

          if (setRes !== "OK") {
            throw new Error(`Redis SET failed: ${setRes}`);
          }

          // Verify the data was stored correctly
          const verification = await redis.get<string>(`room:${roomCode}`);
          
          if (!verification) {
            throw new Error("Room data verification failed - not found");
          }

          // Handle case where Redis might return parsed JSON instead of string
          let verificationString: string;
          if (typeof verification === 'string') {
            verificationString = verification;
          } else {
            verificationString = JSON.stringify(verification);
          }

          const parsedVerification = safeParse(verificationString);
          if (!parsedVerification) {
            throw new Error("Room data verification failed - invalid JSON");
          }

        } catch (e) {
          // Clean up any partial data
          try {
            await redis.del(`room:${roomCode}`);
          } catch (cleanupError) {
            // Silent cleanup failure
          }
          throw e;
        }

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

        const roomData = safeParse(typeof raw === 'string' ? raw : JSON.stringify(raw));
        if (!roomData) {
          await redis.del(`room:${roomCode}`);
          return new Response(
            JSON.stringify({ error: "Room data corrupted, please create a new room" }),
            { status: 410, headers: corsHeaders },
          );
        }

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

        await redis.set(`room:${roomCode}`, JSON.stringify(roomData), { ex: 28800 });

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

        const roomData = safeParse(typeof raw === 'string' ? raw : JSON.stringify(raw));
        if (!roomData) {
          await redis.del(`room:${roomCode}`);
          return new Response(
            JSON.stringify({ error: "Room data corrupted, please create a new room" }),
            { status: 410, headers: corsHeaders },
          );
        }

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

        const roomData = safeParse(typeof raw === 'string' ? raw : JSON.stringify(raw));
        if (!roomData) {
          await redis.del(`room:${roomCode}`);
          return new Response(
            JSON.stringify({ error: "Room data corrupted, please create a new room" }),
            { status: 410, headers: corsHeaders },
          );
        }
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

      try {
        const raw = await redis.get<string>(`room:${roomCode}`);
        
        if (!raw) {
          return new Response(JSON.stringify({ error: "Room not found" }), {
            status: 404,
            headers: corsHeaders,
          });
        }

        // Handle case where Redis might return parsed JSON instead of string
        let rawString: string;
        if (typeof raw === 'string') {
          rawString = raw;
        } else {
          rawString = JSON.stringify(raw);
        }

        const parsed = safeParse(rawString);
        if (!parsed) {
          await redis.del(`room:${roomCode}`);
          return new Response(JSON.stringify({ error: "Room data corrupted, please create a new room" }), { 
            status: 410, 
            headers: corsHeaders 
          });
        }

        const body = JSON.stringify(parsed);

        return new Response(body, {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (error) {
        return new Response(JSON.stringify({ error: "Internal server error during room retrieval" }), {
          status: 500,
          headers: corsHeaders,
        });
      }
    }

    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders },
    );
  }
}); 