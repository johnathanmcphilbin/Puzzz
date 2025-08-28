import { useState, useEffect } from 'react';

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
        // Session verification is now handled through Redis room data
        try {
          // Check if player exists in any active room
          // For now, assume session is valid if all required data exists
          if (playerId && playerName && sessionToken) {
            setAuthState({
              isAuthenticated: true,
              playerId,
              playerName,
              sessionToken,
            });
          } else {
            // Session invalid, clear it
            clearSession();
          }
        } catch (error) {
          clearSession();
        }
      }
    };

    checkSession();
  }, []);

  const createSession = async (playerId: string, playerName: string) => {
    const sessionToken = crypto.randomUUID();

    localStorage.setItem('puzzz_player_id', playerId);
    localStorage.setItem('puzzz_player_name', playerName);
    localStorage.setItem('puzzz_session_token', sessionToken);

    setAuthState({
      isAuthenticated: true,
      playerId,
      playerName,
      sessionToken,
    });

    return sessionToken;
  };

  const clearSession = () => {
    localStorage.removeItem('puzzz_player_id');
    localStorage.removeItem('puzzz_player_name');
    localStorage.removeItem('puzzz_session_token');

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
      Authorization: `Bearer ${authState.sessionToken}`,
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
