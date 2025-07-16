import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authorization check
    const authHeader = req.headers.get('authorization');
    const cleanupSecret = Deno.env.get('CLEANUP_SECRET');
    
    // Check if request has the cleanup secret (for cron jobs)
    const body = await req.text();
    let requestData;
    try {
      requestData = body ? JSON.parse(body) : {};
    } catch {
      requestData = {};
    }
    
    const hasValidSecret = requestData.secret === cleanupSecret;
    
    // Check if request is from authenticated user with service role
    const hasValidAuth = authHeader && authHeader.startsWith('Bearer ') && authHeader.includes('service_role');
    
    // More secure validation - both checks must be more robust
    if (!hasValidSecret && !hasValidAuth) {
      console.error('Unauthorized cleanup attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Starting room cleanup...');

    // Find rooms that are either:
    // 1. Have no players AND were created more than 2 hours ago (grace period)
    // 2. Have players who joined more than 4 hours ago and room hasn't been updated recently
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();

    // Get all active rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, created_at, updated_at, is_active')
      .eq('is_active', true);

    if (roomsError) {
      console.error('Error fetching rooms:', roomsError);
      throw roomsError;
    }

    console.log(`Found ${rooms?.length || 0} active rooms`);

    const roomsToDelete = [];

    for (const room of rooms || []) {
      // Check if room has any players
      const { data: players, error: playersError } = await supabase
        .from('players')
        .select('id, joined_at')
        .eq('room_id', room.id);

      if (playersError) {
        console.error(`Error fetching players for room ${room.id}:`, playersError);
        continue;
      }

      const roomCreatedAt = new Date(room.created_at);
      const roomUpdatedAt = new Date(room.updated_at);

      // If no players, only delete if room was created more than 2 hours ago (grace period)
      if (!players || players.length === 0) {
        if (roomCreatedAt < new Date(twoHoursAgo)) {
          console.log(`Room ${room.id} has no players and is older than 2 hours, marking for deletion`);
          roomsToDelete.push(room.id);
        } else {
          console.log(`Room ${room.id} has no players but is still within grace period, keeping it`);
        }
        continue;
      }

      // Check if room is stale (no activity for 4+ hours)
      const oldestPlayerJoinedAt = new Date(Math.min(...players.map(p => new Date(p.joined_at).getTime())));
      
      if (roomUpdatedAt < new Date(fourHoursAgo) && oldestPlayerJoinedAt < new Date(fourHoursAgo)) {
        console.log(`Room ${room.id} is stale (no activity for 4+ hours), marking for deletion`);
        roomsToDelete.push(room.id);
      }
    }

    console.log(`Deleting ${roomsToDelete.length} stale rooms`);

    // Delete stale rooms and their associated data
    for (const roomId of roomsToDelete) {
      try {
        console.log(`Cleaning up room ${roomId}...`);
        
        // Delete all related data in correct order to avoid foreign key constraints
        
        // Delete AI chat customizations
        await supabase
          .from('ai_chat_customizations')
          .delete()
          .eq('room_id', roomId);
        
        // Delete paranoia rounds
        await supabase
          .from('paranoia_rounds')
          .delete()
          .eq('room_id', roomId);

        // Delete forms responses
        await supabase
          .from('forms_responses')
          .delete()
          .eq('room_id', roomId);

        // Delete game votes
        await supabase
          .from('game_votes')
          .delete()
          .eq('room_id', roomId);

        // Delete game requests
        await supabase
          .from('game_requests')
          .delete()
          .eq('room_id', roomId);

        // Delete players
        await supabase
          .from('players')
          .delete()
          .eq('room_id', roomId);

        // Finally delete the room itself
        await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);

        console.log(`Successfully deleted room ${roomId} and all related data`);
      } catch (error) {
        console.error(`Error deleting room ${roomId}:`, error);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        deletedRooms: roomsToDelete.length,
        message: `Cleaned up ${roomsToDelete.length} stale rooms`
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Cleanup error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});