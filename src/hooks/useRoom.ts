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
    if (!roomCode) return;
    
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
  }, []);

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

  // Setup real-time subscription after room is loaded
  useEffect(() => {
    if (!roomCode || !room?.id) return;

    console.log('Setting up real-time subscriptions for room:', roomCode, 'room ID:', room.id);

    const channel = supabase
      .channel(`room_${roomCode}_${room.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`,
        },
        (payload) => {
          console.log('Room update detected:', payload);
          setRoom(prev => {
            if (!prev) return payload.new as Room;
            const newRoom = payload.new as Room;
            console.log('Applying room update');
            return newRoom;
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          console.log('Player change detected:', payload.eventType, payload);
          
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
              
              console.log('Player was kicked, navigating to home');
              navigate('/');
              return;
            }
            
            console.log('Removing player from list:', deletedPlayer);
            setPlayers(prev => prev.filter(p => p.id !== payload.old.id));
          } else if (payload.eventType === 'INSERT') {
            console.log('Adding new player:', payload.new);
            setPlayers(prev => {
              if (prev.some(p => p.id === payload.new.id)) {
                console.log('Player already exists, not adding duplicate');
                return prev;
              }
              console.log('Adding new player to list');
              return [...prev, payload.new as Player].sort((a, b) => 
                new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
              );
            });
          } else if (payload.eventType === 'UPDATE') {
            const updatedPlayer = payload.new as Player;
            console.log('Updating player:', updatedPlayer);
            setPlayers(prev => prev.map(p => p.id === updatedPlayer.id ? updatedPlayer : p));
            
            const currentPlayerId = localStorage.getItem('puzzz_player_id');
            if (currentPlayerId && updatedPlayer.player_id === currentPlayerId) {
              console.log('Updating current player');
              setCurrentPlayer(updatedPlayer);
            }
          }
        }
      )
      .subscribe((status) => {
        console.log('Subscription status:', status);
      });

    return () => {
      console.log('Cleaning up real-time subscriptions');
      supabase.removeChannel(channel);
    };
  }, [roomCode, room?.id]);

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