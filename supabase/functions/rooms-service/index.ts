<<<<<<< HEAD
// @ts-nocheck
// This is a Deno Edge Function - TypeScript errors for Deno imports are expected in Node.js environment
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Redis } from "https://deno.land/x/upstash_redis@v1.22.0/mod.ts";

console.log("🚨 rooms-service deployed and running 🚨");

// Environment variables for Upstash Redis
const redis = new Redis({
  url: Deno.env.get("UPSTASH_REDIS_REST_URL")!,
  token: Deno.env.get("UPSTASH_REDIS_REST_TOKEN")!,
});
console.log("REDIS URL", Deno.env.get("UPSTASH_REDIS_REST_URL"));
console.log("REDIS TOKEN", Deno.env.get("UPSTASH_REDIS_REST_TOKEN"));
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
=======
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
>>>>>>> ad725670e024c460ee96b97cd483c3febb35e22b

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
}

interface Room {
  roomCode: string;
  name: string;
  hostId: string;
  currentGame: string;
  gameState: any;
  players: Player[];
  createdAt: number;
}

interface Player {
  playerId: string;
  playerName: string;
  isHost: boolean;
  joinedAt: number;
  selectedCharacterId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      status: 200,
      headers: corsHeaders 
    });
  }

  try {
    const REDIS_URL = Deno.env.get('UPSTASH_REDIS_REST_URL');
    const REDIS_TOKEN = Deno.env.get('UPSTASH_REDIS_REST_TOKEN');

    if (!REDIS_URL || !REDIS_TOKEN) {
      console.error('Missing Redis configuration');
      return new Response(
        JSON.stringify({ error: 'Redis configuration missing' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const url = new URL(req.url);
    const roomCode = url.searchParams.get('roomCode');

    // GET request - fetch room data
    if (req.method === 'GET' && roomCode) {
      console.log('Fetching room data for:', roomCode);
      
      const response = await fetch(`${REDIS_URL}/get/room:${roomCode}`, {
        headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
      });

      if (!response.ok) {
        console.error('Redis GET failed:', response.status);
        return new Response(
          JSON.stringify({ error: 'Room not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const data = await response.json();
      
      if (!data.result) {
        return new Response(
          JSON.stringify({ error: 'Room not found' }),
          { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      const roomData = JSON.parse(data.result);
      console.log('Room data retrieved:', roomData);
      
      return new Response(
        JSON.stringify(roomData),
        { 
          status: 200, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // POST request - handle room operations
    if (req.method === 'POST') {
      const body = await req.json();
      const { action, roomCode, playerName, selectedGame, updates, targetPlayerId, hostId } = body;

      console.log('POST action:', action, 'roomCode:', roomCode);

      if (action === 'create') {
        // Generate room code
        const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const playerId = crypto.randomUUID();

        const roomData: Room = {
          roomCode: newRoomCode,
          name: `${playerName}'s Room`,
          hostId: playerId,
          currentGame: selectedGame,
          gameState: { phase: 'lobby' },
          players: [{
            playerId,
            playerName,
            isHost: true,
            joinedAt: Date.now()
          }],
          createdAt: Date.now()
        };

        // Store in Redis with 8 hour expiration
        const setResponse = await fetch(`${REDIS_URL}/setex/room:${newRoomCode}/28800`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${REDIS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roomData)
        });

        if (!setResponse.ok) {
          console.error('Redis SET failed:', setResponse.status);
          return new Response(
            JSON.stringify({ error: 'Failed to create room' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        console.log('Room created:', newRoomCode);
        return new Response(
          JSON.stringify({ roomCode: newRoomCode, playerId }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (action === 'join') {
        // Get existing room
        const getResponse = await fetch(`${REDIS_URL}/get/room:${roomCode}`, {
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
        });

        if (!getResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const getData = await getResponse.json();
        if (!getData.result) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const roomData: Room = JSON.parse(getData.result);
        const playerId = crypto.randomUUID();

        // Check if player name already exists
        const existingPlayer = roomData.players.find(p => p.playerName === playerName);
        if (existingPlayer) {
          return new Response(
            JSON.stringify({ error: 'A player with this name already exists in the room' }),
            { 
              status: 400, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Add new player
        roomData.players.push({
          playerId,
          playerName,
          isHost: false,
          joinedAt: Date.now()
        });

        // Update room in Redis
        const setResponse = await fetch(`${REDIS_URL}/setex/room:${roomCode}/28800`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${REDIS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roomData)
        });

        if (!setResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to join room' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({ roomCode, playerId }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (action === 'update') {
        // Get existing room
        const getResponse = await fetch(`${REDIS_URL}/get/room:${roomCode}`, {
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
        });

        if (!getResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const getData = await getResponse.json();
        if (!getData.result) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const roomData: Room = JSON.parse(getData.result);
        
        // Apply updates
        Object.assign(roomData, updates);

        // Update room in Redis
        const setResponse = await fetch(`${REDIS_URL}/setex/room:${roomCode}/28800`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${REDIS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roomData)
        });

        if (!setResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to update room' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }

      if (action === 'kick') {
        // Get existing room
        const getResponse = await fetch(`${REDIS_URL}/get/room:${roomCode}`, {
          headers: { 'Authorization': `Bearer ${REDIS_TOKEN}` }
        });

        if (!getResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const getData = await getResponse.json();
        if (!getData.result) {
          return new Response(
            JSON.stringify({ error: 'Room not found' }),
            { 
              status: 404, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        const roomData: Room = JSON.parse(getData.result);
        
        // Verify host permission
        const requestingPlayer = roomData.players.find(p => p.playerId === hostId);
        if (!requestingPlayer?.isHost) {
          return new Response(
            JSON.stringify({ error: 'Only the host can kick players' }),
            { 
              status: 403, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        // Remove target player
        roomData.players = roomData.players.filter(p => p.playerId !== targetPlayerId);

        // Update room in Redis
        const setResponse = await fetch(`${REDIS_URL}/setex/room:${roomCode}/28800`, {
          method: 'POST',
          headers: { 
            'Authorization': `Bearer ${REDIS_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(roomData)
        });

        if (!setResponse.ok) {
          return new Response(
            JSON.stringify({ error: 'Failed to kick player' }),
            { 
              status: 500, 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
            }
          );
        }

        return new Response(
          JSON.stringify({ success: true }),
          { 
            status: 200, 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
          }
        );
      }
    }

      return new Response(
        JSON.stringify({ error: 'Invalid request' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );

    } catch (error) {
      console.error('Edge function error:', error);
      return new Response(
        JSON.stringify({ error: 'Internal server error' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  });