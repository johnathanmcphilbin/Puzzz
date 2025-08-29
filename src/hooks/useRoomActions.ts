import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useToast } from '@/hooks/use-toast';
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';

export const useRoomActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateRoomCode = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createRoom = async (playerName: string, selectedGame: string) => {
    if (!playerName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter your name',
        variant: 'destructive',
      });
      return null;
    }

    setLoading(true);
    try {
      // Call the rooms-service edge function
      const url = `${FUNCTIONS_BASE_URL}/rooms-service`;
      console.log('Creating room with URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'create',
          playerName: playerName.trim(),
          selectedGame,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to create room');
      }

      const { room } = await response.json();

      // Store player info
      localStorage.setItem('puzzz_player_id', room.hostId);
      localStorage.setItem('puzzz_player_name', playerName.trim());

      toast({
        title: 'Room Created!',
        description: `Room ${room.roomCode} has been created successfully`,
        className: 'bg-success text-success-foreground',
      });

      navigate(`/room/${room.roomCode}`);
      return room.roomCode;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create room',
        variant: 'destructive',
      });
      return null;
    } finally {
      setLoading(false);
    }
  };

  const joinRoom = async (roomCode: string, playerName: string) => {
    if (!roomCode.trim() || !playerName.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return false;
    }

    const cleanedRoomCode = roomCode.trim().toUpperCase();

    if (cleanedRoomCode.length !== 6) {
      toast({
        title: 'Invalid Room Code',
        description: 'Room code must be 6 characters long',
        variant: 'destructive',
      });
      return false;
    }

    setLoading(true);
    try {
      const url = `${FUNCTIONS_BASE_URL}/rooms-service`;
      console.log('Joining room with URL:', url);
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'join',
          roomCode: cleanedRoomCode,
          playerName: playerName.trim(),
        }),
      });

      const json = await response.json();

      if (!response.ok) {
        toast({
          title: 'Failed to Join',
          description: json.error || 'Failed to join room',
          variant: 'destructive',
        });
        return false;
      }

      const { playerId } = json;

      localStorage.setItem('puzzz_player_id', playerId);
      localStorage.setItem('puzzz_player_name', playerName.trim());

      toast({
        title: 'Joined Room!',
        description: `Successfully joined room ${cleanedRoomCode}`,
        className: 'bg-success text-success-foreground',
      });

      navigate(`/room/${cleanedRoomCode}`);
      return true;
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to join room',
        variant: 'destructive',
      });
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    createRoom,
    joinRoom,
    loading,
  };
};
