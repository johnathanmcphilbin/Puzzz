
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
      const sessionToken = localStorage.getItem('puzzz_session_token');

      if (playerId && playerName && sessionToken) {
        // Verify the session is still valid using the new validation function
        try {
          const { data, error } = await supabase.rpc('validate_session', {
            p_player_id: playerId,
            p_session_token: sessionToken
          });

          if (data && !error) {
            // Also verify player still exists in database
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
                sessionToken,
              });
              
              // Set up RLS context by configuring the session
              await configureSession(playerId, sessionToken);
            } else {
              // Player doesn't exist anymore, clear session
              clearSession();
            }
          } else {
            // Session invalid, clear it
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

  const configureSession = async (playerId: string, sessionToken: string) => {
    // Configure Supabase to send the player_id in requests for RLS
    // This is a workaround since we're using custom auth instead of Supabase auth
    const customClaims = {
      player_id: playerId,
      session_token: sessionToken
    };
    
    // Store claims in a format that our database functions can access
    localStorage.setItem('puzzz_rls_claims', JSON.stringify(customClaims));
  };

  const createSession = async (playerId: string, playerName: string, roomId?: string) => {
    const sessionToken = crypto.randomUUID();
    
    // Create session in database if roomId is provided
    if (roomId) {
      try {
        const { error } = await supabase
          .from('player_sessions')
          .insert({
            player_id: playerId,
            session_token: sessionToken,
            room_id: roomId,
            is_active: true
          });

        if (error) {
          console.error('Failed to create database session:', error);
        }
      } catch (error) {
        console.error('Session creation error:', error);
      }
    }
    
    localStorage.setItem('puzzz_player_id', playerId);
    localStorage.setItem('puzzz_player_name', playerName);
    localStorage.setItem('puzzz_session_token', sessionToken);

    setAuthState({
      isAuthenticated: true,
      playerId,
      playerName,
      sessionToken,
    });

    // Configure RLS context
    await configureSession(playerId, sessionToken);

    return sessionToken;
  };

  const clearSession = async () => {
    const sessionToken = localStorage.getItem('puzzz_session_token');
    const playerId = localStorage.getItem('puzzz_player_id');

    // Mark session as inactive in database
    if (sessionToken && playerId) {
      try {
        await supabase
          .from('player_sessions')
          .update({ is_active: false })
          .eq('player_id', playerId)
          .eq('session_token', sessionToken);
      } catch (error) {
        console.error('Failed to deactivate session:', error);
      }
    }

    localStorage.removeItem('puzzz_player_id');
    localStorage.removeItem('puzzz_player_name');
    localStorage.removeItem('puzzz_session_token');
    localStorage.removeItem('puzzz_rls_claims');

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
