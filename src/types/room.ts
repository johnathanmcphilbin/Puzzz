// Global room type definitions to ensure consistency across the app

export interface RoomData {
  roomCode: string;
  name: string;
  hostId: string;
  currentGame: string;
  gameState: any;
  players: PlayerData[];
  createdAt: number;
}

export interface PlayerData {
  playerId: string;
  playerName: string;
  isHost: boolean;
  joinedAt: number;
  selectedCharacterId?: string;
}

// Legacy component interface that includes backwards compatibility fields
export interface Room extends RoomData {
  id: string;
  room_code: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
}

export interface Player extends PlayerData {
  id: string;
  player_name: string;
  player_id: string;
  is_host: boolean;
  selected_character_id?: string;
}