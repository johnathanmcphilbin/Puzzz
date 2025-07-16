import { WouldYouRatherHostScreen } from "./host-screens/WouldYouRatherHostScreen";
import { ParanoiaHostScreen } from "./host-screens/ParanoiaHostScreen";
import { FormsHostScreen } from "./host-screens/FormsHostScreen";
import { LobbyHostScreen } from "./host-screens/LobbyHostScreen";

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

interface HostScreenProps {
  room: Room;
  players: Player[];
}

export const HostScreen = ({ room, players }: HostScreenProps) => {
  const currentGame = room.current_game;
  const gameState = room.game_state || {};

  // Show lobby screen if no game is selected or game hasn't started
  if (!currentGame || gameState.phase === "lobby") {
    return <LobbyHostScreen room={room} players={players} />;
  }

  // Show game-specific host screen
  switch (currentGame) {
    case "would_you_rather":
      return <WouldYouRatherHostScreen room={room} players={players} />;
    case "paranoia":
      return <ParanoiaHostScreen room={room} players={players} />;
    case "forms":
      return <FormsHostScreen room={room} players={players} />;
    default:
      return <LobbyHostScreen room={room} players={players} />;
  }
};