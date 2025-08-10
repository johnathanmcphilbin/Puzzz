import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
}

interface Player {
  id: string;
  player_name: string;
  player_id: string;
  is_host: boolean;
  selected_character_id?: string;
}

interface ParanoiaQuestion {
  id: string;
  question: string;
  category?: string;
  spiciness_level?: number;
}

type GamePhase = 'waiting' | 'playing' | 'answering' | 'waiting_for_flip' | 'coin_flip' | 'revealed' | 'not_revealed' | 'ended';

interface GameState {
  phase: GamePhase;
  currentTurnIndex: number;
  playerOrder: string[];
  currentRound: number;
  currentQuestion: string | null;
  currentAnswer: string | null;
  targetPlayerId: string | null;
  usedAskers: string[];
  lastRevealResult: boolean | null;
  isFlipping: boolean;
}

export const useParanoiaGame = (room: Room, players: Player[], currentPlayer: Player, onUpdateRoom: (room: Room) => void) => {
  const { toast } = useToast();
  const [questions, setQuestions] = useState<ParanoiaQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const gameState: GameState = room.game_state || {
    phase: 'waiting',
    currentTurnIndex: 0,
    playerOrder: [],
    currentRound: 1,
    currentQuestion: null,
    currentAnswer: null,
    targetPlayerId: null,
    usedAskers: [],
    lastRevealResult: null,
    isFlipping: false
  };

  // Load questions when game starts
  useEffect(() => {
    if (gameState.phase === 'playing' && questions.length === 0) {
      loadQuestions();
    }
  }, [gameState.phase]);

  const loadQuestions = async () => {
    try {
      // Load questions from the paranoia_questions table
      const { data: questionsData } = await supabase
        .from("paranoia_questions")
        .select("*")
        .limit(20);
      
      // Convert to proper format with fallback for null values
      const formattedQuestions: ParanoiaQuestion[] = (questionsData || []).map(q => ({
        id: q.id,
        question: q.question,
        category: q.category || "general",
        spiciness_level: q.spiciness_level || 1
      }));
      
      setQuestions(formattedQuestions);
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const updateGameState = async (newState: Partial<GameState>) => {
    setIsLoading(true);
    try {
      const updatedState = { ...gameState, ...newState };
      
      // Update room state via Redis-based rooms-service
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: room.room_code, 
          updates: { gameState: updatedState },
          requestingPlayerId: currentPlayer.player_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to update game state');
      }

      onUpdateRoom({ ...room, game_state: updatedState });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update game state",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startGame = useCallback(async () => {
    if (players.length < 3) {
      toast({
        title: "Not Enough Players",
        description: "You need at least 3 players to start Paranoia.",
        variant: "destructive",
      });
      return;
    }

    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
    
    await updateGameState({
      phase: 'playing',
      currentTurnIndex: 0,
      playerOrder: shuffledPlayers.map(p => p.player_id),
      currentRound: 1,
      currentQuestion: null,
      currentAnswer: null,
      targetPlayerId: null,
      usedAskers: [],
      lastRevealResult: null,
      isFlipping: false
    });

    toast({
      title: "Game Started!",
      description: "Let the Paranoia begin!",
      className: "bg-success text-success-foreground",
    });
  }, [players]);

  const selectQuestion = useCallback(async () => {
    if (questions.length === 0) return;

    const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
    if (!randomQuestion) {
      console.error("No question found");
      return;
    }
    
    const questionText = randomQuestion.question;

    const currentAskerPlayerId = gameState.playerOrder[gameState.currentTurnIndex];
    if (!currentAskerPlayerId) {
      console.error("No current asker player found");
      return;
    }

    // Select next player (target)
    const availablePlayers = players.filter(p => p.player_id !== currentAskerPlayerId);
    if (availablePlayers.length === 0) {
      console.error("No available target players");
      return;
    }
    
    const targetPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
    if (!targetPlayer) {
      console.error("No target player found");
      return;
    }
    
    const nextPlayerId = targetPlayer.player_id;

    try {
      await updateGameState({
        phase: 'answering',
        currentQuestion: questionText,
        targetPlayerId: nextPlayerId,
        usedAskers: [...gameState.usedAskers, currentAskerPlayerId]
      });
    } catch (error) {
      console.error("Error selecting question:", error);
    }
  }, [questions, gameState, players, updateGameState]);

  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) {
      toast({
        title: "Empty Answer",
        description: "Please enter an answer.",
        variant: "destructive",
      });
      return;
    }

    await updateGameState({
      phase: 'waiting_for_flip',
      currentAnswer: answer.trim()
    });
  }, []);

  const flipCoin = useCallback(async () => {
    if (gameState.isFlipping) return;

    // Set flipping state
    await updateGameState({
      phase: 'coin_flip',
      isFlipping: true
    });

    // Simulate coin flip delay
    setTimeout(async () => {
      const willReveal = Math.random() < 0.5;
      const answererPlayerId = gameState.targetPlayerId;
      const nextAskerIndex = gameState.playerOrder.findIndex(id => id === answererPlayerId);

      await updateGameState({
        phase: willReveal ? 'revealed' : 'not_revealed',
        lastRevealResult: willReveal,
        currentTurnIndex: nextAskerIndex,
        targetPlayerId: null,
        isFlipping: false
      });

      toast({
        title: willReveal ? "🎉 Question Revealed!" : "🤫 Question Stays Secret",
        description: willReveal ? "Everyone can see the question and answer!" : "The question remains a secret.",
        className: willReveal ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground",
      });
    }, 2500);
  }, [gameState]);

  const nextTurn = useCallback(async () => {
    const allPlayersAsked = gameState.usedAskers.length === players.length;
    
    if (allPlayersAsked) {
      // Start new round
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      await updateGameState({
        phase: 'playing',
        currentQuestion: null,
        currentAnswer: null,
        lastRevealResult: null,
        targetPlayerId: null,
        playerOrder: shuffledPlayers.map(p => p.player_id),
        currentTurnIndex: 0,
        currentRound: gameState.currentRound + 1,
        usedAskers: []
      });
    } else {
      // Find next player who hasn't asked
      let nextIndex = 0;
      for (let i = 0; i < gameState.playerOrder.length; i++) {
        const candidatePlayerId = gameState.playerOrder[i];
        if (candidatePlayerId && !gameState.usedAskers.includes(candidatePlayerId)) {
          nextIndex = i;
          break;
        }
      }

      await updateGameState({
        phase: 'playing',
        currentQuestion: null,
        currentAnswer: null,
        lastRevealResult: null,
        targetPlayerId: null,
        currentTurnIndex: nextIndex
      });
    }
  }, [gameState, players]);

  const resetGame = useCallback(async () => {
    await updateGameState({
      phase: 'waiting',
      currentTurnIndex: 0,
      playerOrder: [],
      currentRound: 1,
      currentQuestion: null,
      currentAnswer: null,
      lastRevealResult: null,
      targetPlayerId: null,
      usedAskers: [],
      isFlipping: false
    });
  }, []);

  // Helper functions
  const getCurrentPlayerName = () => {
    if (!gameState.playerOrder || gameState.playerOrder.length === 0) return "Unknown";
    const currentPlayerId = gameState.playerOrder[gameState.currentTurnIndex];
    const player = players.find(p => p.player_id === currentPlayerId);
    return player?.player_name || "Unknown";
  };

  const getTargetPlayerName = () => {
    const targetPlayer = players.find(p => p.player_id === gameState.targetPlayerId);
    return targetPlayer?.player_name || "Unknown";
  };

  const isCurrentPlayerTurn = () => {
    if (!gameState.playerOrder || gameState.playerOrder.length === 0) {
      return false;
    }
    if (gameState.currentTurnIndex >= gameState.playerOrder.length) {
      return false;
    }
    return gameState.playerOrder[gameState.currentTurnIndex] === currentPlayer.player_id;
  };

  const isTargetPlayer = () => {
    return gameState.targetPlayerId === currentPlayer.player_id;
  };

  return {
    gameState,
    questions,
    isLoading,
    startGame,
    selectQuestion,
    submitAnswer,
    flipCoin,
    nextTurn,
    resetGame,
    getCurrentPlayerName,
    getTargetPlayerName,
    isCurrentPlayerTurn,
    isTargetPlayer
  };
};