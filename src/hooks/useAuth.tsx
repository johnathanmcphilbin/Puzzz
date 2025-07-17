
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AuthState {
  isAuthenticated: boolean;
  playerId: string | null;
  playerName: string | null;
  sessionToken: string | null;
}

export const useAuth = () => {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    playerId: null,
    playerName: null,
    sessionToken: null,
  });

  useEffect(() => {
    // Check for existing session
    const checkSession = async () => {
      const playerId = localStorage.getItem('puzzz_player_id');
      const playerName = localStorage.getItem('puzzz_player_name');

      if (playerId && playerName) {
        // Verify player still exists in database
        try {
          const { data: playerData, error: playerError } = await supabase
            .from('players')
            .select('id')
            .eq('player_id', playerId)
            .maybeSingle();

          if (playerData && !playerError) {
            setAuthState({
              isAuthenticated: true,
              playerId,
              playerName,
              sessionToken: playerId, // Use playerId as session token for simplicity
            });
          } else {
            // Player doesn't exist anymore, clear session
            clearSession();
          }
        } catch (error) {
          console.error('Session validation error:', error);
          clearSession();
        }
      }
    };

    checkSession();
  }, []);


  const createSession = async (playerId: string, playerName: string, roomId?: string) => {
    localStorage.setItem('puzzz_player_id', playerId);
    localStorage.setItem('puzzz_player_name', playerName);

    setAuthState({
      isAuthenticated: true,
      playerId,
      playerName,
      sessionToken: playerId, // Use playerId as session token for simplicity
    });

    return playerId;
  };

  const clearSession = async () => {
    localStorage.removeItem('puzzz_player_id');
    localStorage.removeItem('puzzz_player_name');

    setAuthState({
      isAuthenticated: false,
      playerId: null,
      playerName: null,
      sessionToken: null,
    });
  };

  const getAuthHeaders = () => {
    if (!authState.sessionToken || !authState.playerId) {
      return {};
    }

    return {
      'Authorization': `Bearer ${authState.sessionToken}`,
      'X-Player-ID': authState.playerId,
    };
  };

  return {
    ...authState,
    createSession,
    clearSession,
    getAuthHeaders,
  };
};
