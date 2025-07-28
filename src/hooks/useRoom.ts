import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
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
      
      const response = await fetch(`/functions/v1/rooms-service?roomCode=${roomCode}`);
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        setError(data.error || 'Room not found');
        return;
      }

      const roomData = await response.json();

      setRoom(roomData);
      setPlayers(roomData.players || []);

      // Find current player
      const playerId = localStorage.getItem('puzzz_player_id');
      if (playerId) {
        const currentPlayerData = roomData.players?.find((p: Player) => p.playerId === playerId);
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
  }, []);

  const updateRoom = useCallback(async (updates: Partial<Room>) => {
    if (!room) return;

    try {
      const response = await fetch('/functions/v1/rooms-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      await fetch('/functions/v1/rooms-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

  // Polling for updates every 5 seconds (simple replacement for realtime)
  useEffect(() => {
    if (!roomCode) return;

    const interval = setInterval(() => {
      loadRoom();
    }, 5000);

    return () => clearInterval(interval);
  }, [roomCode, loadRoom]);

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
  }, [roomCode]);

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