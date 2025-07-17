
import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { HostScreen as HostScreenComponent } from "@/components/HostScreen";
import { Loader2 } from "lucide-react";

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string | null;
  game_state: any;
  is_active: boolean;
}

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  joined_at: string;
}

export const HostScreen = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      navigate("/");
      return;
    }

    const loadRoomData = async () => {
      try {
        // Load room data - Note: Host screen is public access for display purposes
        const { data: roomData, error: roomError } = await supabase
          .from("rooms")
          .select("*")
          .eq("room_code", roomCode.toUpperCase())
          .eq("is_active", true)
          .single();

        if (roomError || !roomData) {
          toast({
            title: "Room Not Found",
            description: "The room code you entered doesn't exist or is inactive.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        // Check if host screen is enabled
        const gameState = roomData.game_state as any;
        if (!gameState?.hostOnScreen) {
          toast({
            title: "Host Screen Disabled",
            description: "Host screen is not enabled for this room.",
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        setRoom(roomData);

        // Load players - For host screen, we need to bypass RLS temporarily
        // This is acceptable since host screen is meant for public display
        const { data: playersData, error: playersError } = await supabase
          .from("players")
          .select("*")
          .eq("room_id", roomData.id)
          .order("joined_at", { ascending: true });

        if (playersError) {
          console.error("Error loading players:", playersError);
          // Host screen should still work even if we can't load all players
          // This might happen due to RLS restrictions
          console.warn("Could not load all players for host screen due to access restrictions");
        } else {
          setPlayers(playersData || []);
        }

      } catch (error) {
        console.error("Error loading room data:", error);
        toast({
          title: "Error",
          description: "Failed to load room data.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    loadRoomData();

    // Set up real-time subscriptions for host screen
    const roomChannel = supabase
      .channel(`host-room-${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `room_code=eq.${roomCode.toUpperCase()}`
        },
        (payload) => {
          console.log('Room update:', payload);
          if (payload.eventType === 'UPDATE') {
            setRoom(payload.new as Room);
          } else if (payload.eventType === 'DELETE') {
            toast({
              title: "Room Closed",
              description: "The room has been closed by the host.",
            });
            navigate("/");
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room?.id}`
        },
        async (payload) => {
          console.log('Players update:', payload);
          // Reload players when changes occur
          if (room) {
            try {
              const { data } = await supabase
                .from("players")
                .select("*")
                .eq("room_id", room.id)
                .order("joined_at", { ascending: true });
              
              if (data) setPlayers(data);
            } catch (err) {
              console.warn("Could not reload players for host screen:", err);
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomCode, navigate, toast, room?.id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-muted-foreground">Loading host screen...</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <HostScreenComponent room={room} players={players} />
    </div>
  );
};
