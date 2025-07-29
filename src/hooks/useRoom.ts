import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';
import { useNavigate } from 'react-router-dom';

export interface Room {
  roomCode: string;
  name: string;
  hostId: string;
  currentGame: string;
  gameState: any;
  players: Player[];
  createdAt: number;
}

export interface Player {
  playerId: string;
  playerName: string;
  isHost: boolean;
  joinedAt: number;
  selectedCharacterId?: string;
}

export const useRoom = (roomCode: string) => {
  const [room, setRoom] = useState<Room | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { toast } = useToast();
  const navigate = useNavigate();

  const loadRoom = useCallback(async () => {
    if (!roomCode) return;
    
    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading room:', roomCode);
      
      // Add retry logic for room loading
      let attempts = 0;
      const maxAttempts = 3;
      let response;
      let roomData;

      while (attempts < maxAttempts) {
        try {
          if (attempts > 0) {
            console.log(`Room load attempt ${attempts + 1}/${maxAttempts}`);
            // Small delay before retry
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

          response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service?roomCode=${roomCode}`, { 
            headers: { 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` } 
          });

          if (response.ok) {
            roomData = await response.json();
            console.log('Room loaded successfully:', roomCode);
            break;
          } else {
            const errorData = await response.json().catch(() => ({}));
            console.warn(`Room load attempt ${attempts + 1} failed:`, response.status, errorData.error);
            
            // If it's a 410 (corrupted data) or 404 (not found), don't retry
            if (response.status === 410 || response.status === 404) {
              setError(errorData.error || 'Room not found');
              return;
            }
          }
        } catch (fetchError) {
          console.warn(`Room load attempt ${attempts + 1} error:`, fetchError);
        }
        
        attempts++;
      }

      if (!response || !response.ok || !roomData) {
        const finalError = await response?.json().catch(() => ({}));
        setError(finalError.error || 'Failed to load room after multiple attempts');
        return;
      }

      // compatibility: add legacy field names expected by components
      const playersWithLegacy = (roomData.players || []).map((p: any) => ({
        ...p,
        player_id: p.playerId,
        player_name: p.playerName,
        is_host: p.isHost,
        selected_character_id: p.selectedCharacterId,
        joined_at: p.joinedAt,
        id: p.playerId // alias for keying in maps
      }));

      setRoom({
        ...roomData,
        room_code: roomData.roomCode,
        host_id: roomData.hostId,
        current_game: roomData.currentGame,
        game_state: roomData.gameState,
        is_active: true,
        id: roomData.roomCode // placeholder
      } as any);
      setPlayers(playersWithLegacy);

      // Find current player
      const playerId = localStorage.getItem('puzzz_player_id');
      if (playerId) {
        const currentPlayerData = playersWithLegacy.find((p: any) => p.player_id === playerId);
        if (currentPlayerData) {
          setCurrentPlayer(currentPlayerData);
        } else {
          setError('You are not a member of this room');
          return;
        }
      }

    } catch (err) {
      console.error('Error loading room:', err);
      setError('Failed to load room data');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  const updateRoom = useCallback(async (updates: Partial<Room>) => {
    if (!room) return;

    try {
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'update', roomCode: room.roomCode, updates }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Update failed');
      }

      setRoom(prevRoom => prevRoom ? { ...prevRoom, ...updates } : null);
    } catch (err) {
      console.error('Error updating room:', err);
      toast({
        title: 'Error',
        description: 'Failed to update room',
        variant: 'destructive',
      });
    }
  }, [room, toast]);

  const kickPlayer = useCallback(async (playerIdToKick: string) => {
    if (!room || !currentPlayer?.isHost) return;

    try {
      await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ action: 'kick', roomCode: room.roomCode, targetPlayerId: playerIdToKick, hostId: currentPlayer?.playerId }),
      });

      toast({
        title: 'Player Removed',
        description: 'Player has been removed from the room',
      });
    } catch (err) {
      console.error('Error kicking player:', err);
      toast({
        title: 'Error',
        description: 'Failed to remove player',
        variant: 'destructive',
      });
    }
  }, [room, currentPlayer, toast]);

  // If you still want periodic refresh, uncomment the block below and
  // set a suitable interval (e.g. 30 000 ms). By default we rely on
  // user-initiated actions to fetch fresh data, preventing constant re-renders.
  /*
  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(() => {
      loadRoom();
    }, 30000); // 30-second refresh

    return () => clearInterval(interval);
  }, [roomCode, loadRoom]);
  */

  // Initial load - only run once when component mounts
  useEffect(() => {
    if (!roomCode) return;
    
    const playerId = localStorage.getItem('puzzz_player_id');
    const playerName = localStorage.getItem('puzzz_player_name');

    if (!playerId || !playerName) {
      setError('Please join the room properly');
      return;
    }

    loadRoom();
  }, [roomCode, loadRoom]);

  return {
    room,
    players,
    currentPlayer,
    loading,
    error,
    updateRoom,
    kickPlayer,
    reload: loadRoom,
  };
};