import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  FUNCTIONS_BASE_URL,
  SUPABASE_ANON_KEY,
  safeDeepMerge,
} from '@/utils/functions';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

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

      const response = await fetch(
        `${FUNCTIONS_BASE_URL}/rooms-service?roomCode=${roomCode}`,
        {
          headers: {
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Room not found');
        return;
      }

      const roomData = await response.json();

      // compatibility: add legacy field names expected by components
      const playersWithLegacy = (roomData.players || []).map((p: any) => ({
        ...p,
        player_id: p.playerId,
        player_name: p.playerName,
        is_host: p.isHost,
        selected_character_id: p.selectedCharacterId,
        joined_at: p.joinedAt,
        id: p.playerId, // alias for keying in maps
      }));

      setRoom({
        ...roomData,
        room_code: roomData.roomCode,
        host_id: roomData.hostId,
        current_game: roomData.currentGame,
        game_state: roomData.gameState,
        is_active: true,
        id: roomData.roomCode, // placeholder
      } as any);
      setPlayers(playersWithLegacy);

      // Find current player
      const playerId = localStorage.getItem('puzzz_player_id');
      if (playerId) {
        const foundPlayer = playersWithLegacy.find(
          (p: any) => p.player_id === playerId
        );

        if (foundPlayer) {
          setCurrentPlayer(foundPlayer);
        } else {
          // Player not found in room - they might have been kicked or room data is corrupted
          setError('You are no longer a member of this room. Please rejoin.');
          return;
        }
      } else {
        setError('Please join the room properly');
        return;
      }
    } catch (err) {
      setError('Failed to load room data');
    } finally {
      setLoading(false);
    }
  }, [roomCode]);

  const updateRoom = useCallback(
    async (updates: Partial<Room>) => {
      if (!room) return;

      try {
        const requesterId =
          currentPlayer?.playerId || localStorage.getItem('puzzz_player_id');
        const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'update',
            roomCode: room.roomCode,
            updates,
            requestingPlayerId: requesterId,
          }),
        });

        if (!response.ok) {
          const data = await response.json().catch(() => ({}));
          throw new Error(data.error || 'Update failed');
        }

        setRoom(prevRoom => {
          if (!prevRoom) return prevRoom;
          const mergedGameState = updates.gameState
            ? safeDeepMerge(prevRoom.gameState || {}, updates.gameState as any)
            : prevRoom.gameState;
          const { gameState: _ignored, ...other } = updates as any;
          return { ...prevRoom, ...other, gameState: mergedGameState } as Room;
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to update room',
          variant: 'destructive',
        });
      }
    },
    [room, currentPlayer, toast]
  );

  const kickPlayer = useCallback(
    async (playerIdToKick: string) => {
      if (!room || !currentPlayer?.isHost) return;

      try {
        await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: SUPABASE_ANON_KEY,
            Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({
            action: 'kick',
            roomCode: room.roomCode,
            targetPlayerId: playerIdToKick,
            hostId: currentPlayer?.playerId,
          }),
        });

        toast({
          title: 'Player Removed',
          description: 'Player has been removed from the room',
        });
      } catch (err) {
        toast({
          title: 'Error',
          description: 'Failed to remove player',
          variant: 'destructive',
        });
      }
    },
    [room, currentPlayer, toast]
  );

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
  }, [roomCode]); // Removed loadRoom from dependencies to prevent re-render loop

  // Real-time updates using Supabase channel for room changes
  useEffect(() => {
    if (!roomCode || !room) return;

    const channel = supabase
      .channel(`room_${roomCode}`)
      .on('broadcast', { event: 'room_update' }, payload => {
        const newRoomData = payload.payload;

        // compatibility: add legacy field names expected by components
        const playersWithLegacy = (newRoomData.players || []).map((p: any) => ({
          ...p,
          player_id: p.playerId,
          player_name: p.playerName,
          is_host: p.isHost,
          selected_character_id: p.selectedCharacterId,
          joined_at: p.joinedAt,
          id: p.playerId, // alias for keying in maps
        }));

        setRoom({
          ...newRoomData,
          room_code: newRoomData.roomCode,
          host_id: newRoomData.hostId,
          current_game: newRoomData.currentGame,
          game_state: newRoomData.gameState,
          is_active: true,
          id: newRoomData.roomCode, // placeholder
        } as any);
        setPlayers(playersWithLegacy);

        // Update current player if needed
        const playerId = localStorage.getItem('puzzz_player_id');
        if (playerId) {
          const foundPlayer = playersWithLegacy.find(
            (p: any) => p.player_id === playerId
          );
          if (foundPlayer) {
            setCurrentPlayer(foundPlayer);
          }
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      console.log('[Room] unsubscribed channel room_' + roomCode);
    };
  }, [roomCode, room?.roomCode]); // Only depend on roomCode to avoid re-subscriptions

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
