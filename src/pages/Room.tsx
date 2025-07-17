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
  
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!roomCode) {
      console.log("❌ No room code provided");
      navigate("/");
      return;
    }

    console.log("🔍 Room component loaded for code:", roomCode);
    loadRoomData();
  }, [roomCode, navigate]);

  const loadRoomData = async () => {
    try {
      console.log("📊 Starting room data loading process...");
      
      // Check session data
      const playerId = localStorage.getItem("puzzz_player_id");
      const playerName = localStorage.getItem("puzzz_player_name");
      
      console.log("💾 Session data check:");
      console.log("- Player ID:", playerId);
      console.log("- Player Name:", playerName);

      if (!playerId || !playerName) {
        console.log("❌ Missing session data - redirecting to home");
        toast({
          title: "Access Denied",
          description: "Please join the room properly.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      // Step 1: Load room data
      console.log("🏠 Loading room data...");
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("*")
        .eq("room_code", roomCode)
        .eq("is_active", true);

      console.log("🏠 Room query result:");
      console.log("- Data:", roomData);
      console.log("- Error:", roomError);

      if (roomError) {
        console.error("❌ Room loading error:", roomError);
        throw new Error(`Failed to load room: ${roomError.message}`);
      }

      if (!roomData || roomData.length === 0) {
        console.log("❌ No room found with code:", roomCode);
        
        // Check if room exists but is inactive
        const { data: inactiveRoom } = await supabase
          .from("rooms")
          .select("*")
          .eq("room_code", roomCode);
          
        console.log("🔍 Checking for inactive room:", inactiveRoom);

        toast({
          title: "Room Not Found",
          description: "This room doesn't exist or has been closed.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      const room = roomData[0];
      console.log("✅ Room loaded successfully:", room);
      setRoom(room);

      // Step 2: Load players
      console.log("👥 Loading players...");
      const { data: playersData, error: playersError } = await supabase
        .from("players")
        .select("*")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true });

      console.log("👥 Players query result:");
      console.log("- Data:", playersData);
      console.log("- Error:", playersError);

      if (playersError) {
        console.error("❌ Players loading error:", playersError);
        throw new Error(`Failed to load players: ${playersError.message}`);
      }

      console.log("✅ Players loaded successfully:", playersData);
      setPlayers(playersData || []);

      // Step 3: Find current player
      console.log("🔍 Finding current player...");
      const currentPlayerData = playersData?.find(p => p.player_id === playerId);
      
      if (!currentPlayerData) {
        console.log("❌ Current player not found in room");
        toast({
          title: "Player Not Found",
          description: "You are not a member of this room.",
          variant: "destructive",
        });
        navigate("/");
        return;
      }

      console.log("✅ Current player found:", currentPlayerData);
      setCurrentPlayer(currentPlayerData);

      // Step 4: Set up real-time subscriptions
      console.log("📡 Setting up real-time subscriptions...");
      setupRealtimeSubscriptions(room);

      console.log("🎉 Room loading complete!");

    } catch (error) {
      console.error("💥 Room loading process failed:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to load room data.",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = (roomData: Room) => {
    console.log("📡 Setting up subscriptions for room:", roomData.id);
    
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
          console.log("📡 Room update received:", payload);
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
          console.log("📡 Player update received:", payload);
          loadPlayers(roomData.id);
        }
      )
      .subscribe();

    // Clean up subscription when component unmounts
    return () => {
      console.log("🧹 Cleaning up subscriptions");
      supabase.removeChannel(roomChannel);
    };
  };

  const loadPlayers = async (roomId: string) => {
    console.log("👥 Reloading players for room:", roomId);
    const { data: playersData } = await supabase
      .from("players")
      .select("*")
      .eq("room_id", roomId)
      .order("joined_at", { ascending: true });

    console.log("👥 Players reloaded:", playersData);
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
    console.log("❌ Room or current player missing - should not reach here");
    return null;
  }

  const gamePhase = room.game_state?.phase || "lobby";
  const currentGame = room.current_game || "would_you_rather";

  console.log("🎮 Rendering room with:");
  console.log("- Game phase:", gamePhase);
  console.log("- Current game:", currentGame);
  console.log("- Players count:", players.length);

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