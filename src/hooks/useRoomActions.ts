import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

export const useRoomActions = () => {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateRoomCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let result = "";
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
      const roomCode = generateRoomCode();
      const hostId = crypto.randomUUID();

      console.log('Creating room with code:', roomCode);
      console.log('Host ID:', hostId);

      // Use the atomic function to create room and player
      const { data: result, error } = await supabase
        .rpc('create_room_with_host', {
          p_room_code: roomCode,
          p_room_name: `${playerName.trim()}'s Room`,
          p_host_id: hostId,
          p_player_name: playerName.trim(),
          p_current_game: selectedGame,
        })
        .single();

      if (error) {
        console.error('Room creation error:', error);
        throw error;
      }

      if (!result?.success) {
        console.error('Room creation failed:', result?.error_message);
        throw new Error(result?.error_message || 'Failed to create room');
      }

      console.log('Room created successfully:', result);

      // Store player info in localStorage
      localStorage.setItem('puzzz_player_id', hostId);
      localStorage.setItem('puzzz_player_name', playerName.trim());

      toast({
        title: 'Room Created!',
        description: `Room ${roomCode} has been created successfully`,
        className: 'bg-success text-success-foreground',
      });

      // Navigate to room
      navigate(`/room/${roomCode}`);
      return roomCode;

    } catch (error: any) {
      console.error('Error creating room:', error);
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
      const playerId = crypto.randomUUID();

      console.log('Joining room:', cleanedRoomCode);
      console.log('Player ID:', playerId);

      // Use the atomic function to join room
      const { data: result, error } = await supabase
        .rpc('join_room_as_player', {
          p_room_code: cleanedRoomCode,
          p_player_id: playerId,
          p_player_name: playerName.trim(),
        })
        .single();

      if (error) {
        console.error('Join room error:', error);
        throw error;
      }

      if (!result?.success) {
        console.error('Join room failed:', result?.error_message);
        toast({
          title: 'Failed to Join',
          description: result?.error_message || 'Failed to join room',
          variant: 'destructive',
        });
        return false;
      }

      console.log('Successfully joined room:', result);

      // Store player info in localStorage
      localStorage.setItem('puzzz_player_id', playerId);
      localStorage.setItem('puzzz_player_name', playerName.trim());

      toast({
        title: 'Joined Room!',
        description: `Successfully joined room ${cleanedRoomCode}`,
        className: 'bg-success text-success-foreground',
      });

      // Navigate to room
      navigate(`/room/${cleanedRoomCode}`);
      return true;

    } catch (error: any) {
      console.error('Error joining room:', error);
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