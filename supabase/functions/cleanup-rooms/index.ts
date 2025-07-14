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
    const supabase = createClient(
      "https://heqqjpxlithgoswwyjoi.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhlcXFqcHhsaXRoZ29zd3d5am9pIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MjQ4NjM5MSwiZXhwIjoyMDY4MDYyMzkxfQ.qCRCqUE7AwlQkLMWGnUORAp0X9uNcxrJOBGpHhj6E7Y"
    );

    console.log('Starting room cleanup...');

    // Find rooms that are either:
    // 1. Inactive
    // 2. Have no players
    // 3. Have players who joined more than 10 minutes ago and room hasn't been updated recently
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();

    // Get all active rooms
    const { data: rooms, error: roomsError } = await supabase
      .from('rooms')
      .select('id, updated_at, is_active')
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

      // If no players, mark for deletion
      if (!players || players.length === 0) {
        console.log(`Room ${room.id} has no players, marking for deletion`);
        roomsToDelete.push(room.id);
        continue;
      }

      // Check if room is stale (no activity for 10+ minutes)
      const roomUpdatedAt = new Date(room.updated_at);
      const oldestPlayerJoinedAt = new Date(Math.min(...players.map(p => new Date(p.joined_at).getTime())));
      
      if (roomUpdatedAt < new Date(tenMinutesAgo) && oldestPlayerJoinedAt < new Date(tenMinutesAgo)) {
        console.log(`Room ${room.id} is stale (no activity for 10+ minutes), marking for deletion`);
        roomsToDelete.push(room.id);
      }
    }

    console.log(`Deleting ${roomsToDelete.length} stale rooms`);

    // Delete stale rooms and their associated data
    for (const roomId of roomsToDelete) {
      try {
        // Delete game votes first
        await supabase
          .from('game_votes')
          .delete()
          .eq('room_id', roomId);

        // Delete players
        await supabase
          .from('players')
          .delete()
          .eq('room_id', roomId);

        // Delete room
        await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);

        console.log(`Successfully deleted room ${roomId}`);
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