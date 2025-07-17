
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { RoomLobby } from "@/components/RoomLobby";
import { WouldYouRatherGame } from "@/components/WouldYouRatherGame";
import { FormsGame } from "@/components/FormsGame";
import { ParanoiaGame } from "@/components/ParanoiaGame";
import AIChatbot from "@/components/AIChatbot";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
}

interface Player {
  id: string;
  player_name: string;
  player_id: string;
  is_host: boolean;
}

export const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, playerId, playerName, clearSession } = useAuth();
  
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      navigate("/");
      return;
    }

    // Check authentication
    if (!isAuthenticated || !playerId || !playerName) {
      toast({
        title: "Access Denied",
        description: "Please join the room properly.",
        variant: "destructive",
      });
      navigate("/");
      return;
    }

    loadRoomData();
  }, [roomCode, navigate, toast, isAuthenticated, playerId, playerName]);

  const loadRoomData = async () => {
    try {
      console.log("Loading room data for code:", roomCode);
      
      // Load room data - RLS will now restrict access to rooms the player is in
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .eq("is_active", true)
        .maybeSingle();

      if (roomError) {
        console.error("Room loading error:", roomError);
        
        // If access is denied due to RLS, the player is not in the room
        if (roomError.code === 'PGRST116' || roomError.message?.includes('RLS')) {
          toast({
            title: "Access Denied",
            description: "You are not a member of this room.",
            variant: "destructive",
          });
          clearSession();
          navigate("/");
          return;
        }
        
        throw new Error("Failed to load room");
      }

      if (!roomData) {
        toast({
          title: "Room Not Found",
          description: "This room doesn't exist or has been closed.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      console.log("Room loaded successfully:", roomData);
      setRoom(roomData);

      // Load players - RLS will restrict to players in the same room
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", roomData.id)
        .order("joined_at", { ascending: true });

      if (playersError) {
        console.error("Players loading error:", playersError);
        
        // If RLS blocks access, the player is not in this room
        if (playersError.code === 'PGRST116' || playersError.message?.includes('RLS')) {
          toast({
            title: "Access Denied",
            description: "You are not a member of this room.",
            variant: "destructive",
          });
          clearSession();
          navigate("/");
          return;
        }
        
        throw new Error("Failed to load players");
      }

      console.log("Players loaded successfully:", playersData);
      setPlayers(playersData || []);

      // Find current player
      const currentPlayerData = playersData?.find(p => p.player_id === playerId);
      
      if (!currentPlayerData) {
        toast({
          title: "Player Not Found",
          description: "You are not a member of this room.",
          variant: "destructive",
        });
        clearSession();
        navigate("/");
        return;
      }

      console.log("Current player found:", currentPlayerData);
      setCurrentPlayer(currentPlayerData);

      // Set up real-time subscriptions
      setupRealtimeSubscriptions(roomData);

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

  const setupRealtimeSubscriptions = (roomData: Room) => {
    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room_${roomCode}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "rooms",
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          console.log("Room update received:", payload);
          setRoom(payload.new as Room);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "players",
          filter: `room_id=eq.${roomData.id}`,
        },
        (payload) => {
          console.log("Player update received:", payload);
          loadPlayers(roomData.id);
        }
      )
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      supabase.removeChannel(roomChannel);
    };
  };

  const loadPlayers = async (roomId: string) => {
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    setPlayers(playersData || []);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-lg text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (!room || !currentPlayer) {
    return null;
  }

  const gamePhase = room.game_state?.phase || "lobby";
  const currentGame = room.current_game || "would_you_rather";

  return (
    <div className="min-h-screen gradient-bg">
      {gamePhase === "lobby" ? (
        <RoomLobby 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={setRoom}
        />
      ) : currentGame === "forms_game" ? (
        <FormsGame 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={setRoom}
        />
      ) : currentGame === "paranoia" ? (
        <ParanoiaGame 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={setRoom}
        />
      ) : (
        <WouldYouRatherGame 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={setRoom}
        />
      )}
      
      <AIChatbot 
        roomCode={roomCode} 
        currentGame={currentGame}
        currentPlayer={currentPlayer}
      />
    </div>
  );
};
