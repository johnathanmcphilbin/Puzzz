import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Player {
  id: string;
  room_id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  joined_at: string;
  selected_character_id?: string;
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
    try {
      setLoading(true);
      setError(null);
      
      // Get room data
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('room_code', roomCode)
        .eq('is_active', true)
        .single();

      if (roomError || !roomData) {
        setError('Room not found or inactive');
        return;
      }

      setRoom(roomData);

      // Get players
      const { data: playersData, error: playersError } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomData.id)
        .order('joined_at', { ascending: true });

      if (playersError) {
        setError('Failed to load players');
        return;
      }

      setPlayers(playersData || []);

      // Find current player
      const playerId = localStorage.getItem('puzzz_player_id');
      if (playerId) {
        const currentPlayerData = playersData?.find(p => p.player_id === playerId);
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
      const { error } = await supabase
        .from('rooms')
        .update(updates)
        .eq('id', room.id);

      if (error) throw error;

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
    if (!room || !currentPlayer?.is_host) return;

    try {
      const { error } = await supabase
        .from('players')
        .delete()
        .eq('room_id', room.id)
        .eq('player_id', playerIdToKick);

      if (error) throw error;

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

  // Real-time subscriptions
  useEffect(() => {
    if (!roomCode) return;

    // Subscribe to room changes
    const roomChannel = supabase
      .channel(`room_${roomCode}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `room_code=eq.${roomCode}`,
        },
        (payload) => {
          console.log('Room updated:', payload.new);
          setRoom(payload.new as Room);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomCode]);

  // Separate subscription for players (only after room is loaded)
  useEffect(() => {
    if (!room) return;

    const playersChannel = supabase
      .channel(`players_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          console.log('Players updated:', payload);
          
          // Handle player kick detection
          if (payload.eventType === 'DELETE') {
            const deletedPlayer = payload.old;
            const currentPlayerId = localStorage.getItem('puzzz_player_id');
            
            if (deletedPlayer && currentPlayerId && deletedPlayer.player_id === currentPlayerId) {
              localStorage.removeItem('puzzz_player_id');
              localStorage.removeItem('puzzz_player_name');
              
              toast({
                title: 'Removed from Room',
                description: 'You have been removed from the room by the host.',
                variant: 'destructive',
              });
              
              navigate('/');
              return;
            }
          }
          
          // Update players state directly instead of reloading entire room
          if (payload.eventType === 'INSERT') {
            setPlayers(prev => [...prev, payload.new as Player]);
          } else if (payload.eventType === 'UPDATE') {
            setPlayers(prev => prev.map(p => p.id === payload.new.id ? payload.new as Player : p));
            // Update current player if it's the one being updated
            const currentPlayerId = localStorage.getItem('puzzz_player_id');
            if (currentPlayerId && payload.new.player_id === currentPlayerId) {
              setCurrentPlayer(payload.new as Player);
            }
          } else if (payload.eventType === 'DELETE') {
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [room, toast, navigate]);

  // Initial load
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