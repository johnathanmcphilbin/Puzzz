import { useParams, useNavigate } from "react-router-dom";
import { useRoom } from "@/hooks/useRoom";
import { RoomLobby } from "@/components/RoomLobby";
import { WouldYouRatherGame } from "@/components/WouldYouRatherGame";
import { ParanoiaGame } from "@/components/ParanoiaGame";
import { OddOneOutGame } from "@/components/OddOneOutGame";
import AIChatbot from "@/components/AIChatbot";
import { Loader2 } from "lucide-react";

export const Room = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  
  // Redirect if no room code
  if (!roomCode) {
    navigate("/");
    return null;
  }

  const { room, players, currentPlayer, loading, error, updateRoom } = useRoom(roomCode);

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

  if (error || !room || !currentPlayer) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-bg">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-destructive">
            {error || "Room not found"}
          </h2>
          <p className="text-muted-foreground mb-4">
            Unable to access this room. Please check the room code or try again.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90"
          >
            Go Home
          </button>
        </div>
      </div>
    );
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
          onUpdateRoom={updateRoom}
        />
      ) : currentGame === "paranoia" ? (
        <ParanoiaGame 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={updateRoom}
        />
      ) : (currentGame === "odd_one_out" || currentGame === "odd-one-out") ? (
        <OddOneOutGame 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={updateRoom}
        />
      ) : (
        <WouldYouRatherGame 
          room={room} 
          players={players} 
          currentPlayer={currentPlayer}
          onUpdateRoom={updateRoom}
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
