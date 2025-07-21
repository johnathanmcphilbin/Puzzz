import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useTimer } from "@/hooks/useTimer";
import { Users, Crown, Coins, MessageSquare, Play, StopCircle, Clock, ArrowLeft, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";

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
}

interface ParanoiaGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

interface ParanoiaQuestion {
  id: string;
  question: string;
  category: string;
  spiciness_level: number;
}

export function ParanoiaGame({ room, players, currentPlayer, onUpdateRoom }: ParanoiaGameProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<ParanoiaQuestion[]>([]);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [playerAnswer, setPlayerAnswer] = useState<string>("");
  const [isFlipping, setIsFlipping] = useState(false);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);

  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting";
  const currentTurnIndex = gameState.currentTurnIndex || 0;
  const playerOrder = gameState.playerOrder || [];
  const currentRound = gameState.currentRound || 1;
  const currentQuestion = gameState.currentQuestion || null;
  const currentAnswer = gameState.currentAnswer || null;

  // Timer for question asking phase
  const questionTimer = useTimer({
    initialTime: 30,
    onTimeUp: () => {
      if (phase === "playing" && isCurrentPlayerTurn()) {
        toast({
          title: "Time's up!",
          description: "Question selection time expired",
          variant: "destructive",
        });
        // Auto-advance to next player
        nextTurn();
      }
    }
  });

  // Timer for answering phase
  const answerTimer = useTimer({
    initialTime: 30,
    onTimeUp: () => {
      if (phase === "answering" && isTargetPlayer()) {
        toast({
          title: "Time's up!",
          description: "Answer time expired",
          variant: "destructive",
        });
        // Auto-submit random answer
        const availablePlayers = players.filter(p => p.player_id !== currentPlayer.player_id);
        if (availablePlayers.length > 0) {
          const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
          setPlayerAnswer(randomPlayer.player_name);
          setTimeout(() => submitAnswer(), 500);
        }
      }
    }
  });

  // Timer for coin flip decision
  const flipTimer = useTimer({
    initialTime: 30,
    onTimeUp: () => {
      if (phase === "waiting_for_flip" && isTargetPlayer()) {
        toast({
          title: "Time's up!",
          description: "Coin flip time expired - auto flipping",
          variant: "destructive",
        });
        flipCoin();
      }
    }
  });

  // Timer management effects
  useEffect(() => {
    if (phase === "playing" && isCurrentPlayerTurn()) {
      questionTimer.restart();
    } else {
      questionTimer.stop();
    }
  }, [phase, currentTurnIndex, playerOrder]);

  useEffect(() => {
    if (phase === "answering" && isTargetPlayer()) {
      answerTimer.restart();
    } else {
      answerTimer.stop();
    }
  }, [phase, gameState.targetPlayerId]);

  useEffect(() => {
    if (phase === "waiting_for_flip" && isTargetPlayer()) {
      flipTimer.restart();
    } else {
      flipTimer.stop();
    }
  }, [phase, gameState.targetPlayerId]);

  // Real-time subscription for game state changes
  useEffect(() => {
    const channel = supabase
      .channel('paranoia-game-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${room.id}`
        },
        (payload) => {
          if (payload.new) {
            onUpdateRoom(payload.new as Room);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [room.id]);

  // Load questions when game starts
  useEffect(() => {
    if (phase === "playing" && availableQuestions.length === 0) {
      loadQuestions();
    }
  }, [phase]);

  // Auto-initialize game if it's in playing phase but not properly set up
  useEffect(() => {
    if (phase === "playing" && (!playerOrder || playerOrder.length === 0) && players.length >= 3) {
      console.log("Auto-initializing Paranoia game...");
      initializeGame();
    }
  }, [phase, playerOrder, players.length]);

  const initializeGame = async () => {
    if (players.length < 3) return;
    
    setIsLoading(true);
    try {
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      const newGameState = {
        phase: "playing",
        currentTurnIndex: 0,
        playerOrder: shuffledPlayers.map(p => p.player_id),
        currentRound: 1,
        currentQuestion: null,
        currentAnswer: null,
        lastRevealResult: null,
        targetPlayerId: null,
        usedAskers: [] // Track who has asked in current round
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
      console.log("Paranoia game initialized with player order:", shuffledPlayers.map(p => p.player_name));
      
    } catch (error) {
      console.error("Error initializing game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadQuestions = async () => {
    try {
      // First try to get room-specific AI generated questions
      const { data: roomQuestions, error: roomQuestionsError } = await supabase
        .from("room_questions")
        .select("question_data")
        .eq("room_id", room.room_code)
        .eq("game_type", "paranoia");

      if (!roomQuestionsError && roomQuestions && roomQuestions.length > 0) {
        const aiQuestions = roomQuestions.map((rq: any, index: number) => ({
          id: `ai-${index}`,
          question: rq.question_data.question,
          category: rq.question_data.category || "general",
          spiciness_level: rq.question_data.spiciness_level || 1
        }));
        setAvailableQuestions(aiQuestions);
        return;
      }

      // Fallback to default questions if no AI questions available
      const { data: questionsData } = await supabase
        .from("paranoia_questions")
        .select("*")
        .eq("category", "general")
        .limit(20);
      
      setAvailableQuestions(questionsData || []);
    } catch (error) {
      console.error("Error loading questions:", error);
    }
  };

  const getPlayerCirclePosition = (index: number, total: number) => {
    const angle = (index * 2 * Math.PI) / total - Math.PI / 2;
    const radius = 120;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    return { x, y };
  };

  const getNextPlayerIndex = () => {
    return (currentTurnIndex + 1) % playerOrder.length;
  };

  const startGame = async () => {
    if (players.length < 3) {
      toast({
        title: "Not Enough Players",
        description: "You need at least 3 players to start Paranoia.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      
      const newGameState = {
        phase: "playing",
        currentTurnIndex: 0,
        playerOrder: shuffledPlayers.map(p => p.player_id),
        currentRound: 1,
        currentQuestion: null,
        currentAnswer: null,
        targetPlayerId: null,
        usedAskers: []
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
      toast({
        title: "Game Started!",
        description: "Let the Paranoia begin!",
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error starting game:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const submitQuestion = async () => {
    if (!customQuestion.trim()) {
      toast({
        title: "Empty Question",
        description: "Please enter a question.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const nextPlayerIndex = getNextPlayerIndex();
      const nextPlayerId = playerOrder[nextPlayerIndex];
      const currentAskerPlayerId = playerOrder[currentTurnIndex];
      const usedAskers = gameState.usedAskers || [];
      
      const newGameState = {
        ...gameState,
        phase: "answering",
        currentQuestion: customQuestion.trim(),
        targetPlayerId: nextPlayerId,
        selectedQuestion: customQuestion.trim(),
        currentQuestionAsker: currentAskerPlayerId,
        usedAskers: [...usedAskers, currentAskerPlayerId]
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      setCustomQuestion("");
      
    } catch (error) {
      console.error("Error submitting question:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const useSelectedQuestion = async (questionText: string) => {
    if (isLoading) {
      console.log("Already loading, skipping question selection");
      return;
    }
    
    setIsLoading(true);
    console.log("Using selected question:", questionText);
    
    try {
      const nextPlayerIndex = getNextPlayerIndex();
      const nextPlayerId = playerOrder[nextPlayerIndex];
      const currentAskerPlayerId = playerOrder[currentTurnIndex];
      const usedAskers = gameState.usedAskers || [];
      
      console.log("Question selection - next player:", nextPlayerId, "current asker:", currentAskerPlayerId);
      
      const newGameState = {
        ...gameState,
        phase: "answering",
        currentQuestion: questionText,
        targetPlayerId: nextPlayerId,
        selectedQuestion: questionText,
        currentQuestionAsker: currentAskerPlayerId,
        usedAskers: [...usedAskers, currentAskerPlayerId]
      };

      const { error } = await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      if (error) {
        console.error("Supabase error:", error);
        throw error;
      }

      onUpdateRoom({ ...room, game_state: newGameState });
      setSelectedQuestionId(null);
      
      toast({
        title: "Question Selected!",
        description: "Waiting for the answer...",
        className: "bg-success text-success-foreground",
      });
      
    } catch (error) {
      console.error("Error using selected question:", error);
      toast({
        title: "Error",
        description: "Failed to select question. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!playerAnswer.trim()) {
      toast({
        title: "Empty Answer",
        description: "Please enter an answer.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const newGameState = {
        ...gameState,
        phase: "waiting_for_flip",
        currentAnswer: playerAnswer.trim()
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      setPlayerAnswer("");
      
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const flipCoin = async () => {
    if (isFlipping || gameState.isFlipping) {
      console.log("Coin already flipping, skipping");
      return;
    }
    
    setIsFlipping(true);
    console.log("Starting coin flip...");
    
    // Update game state to show all players that coin is flipping
    const flippingGameState = {
      ...gameState,
      phase: "coin_flip",
      isFlipping: true
    };

    try {
      await supabase
        .from("rooms")
        .update({ game_state: flippingGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: flippingGameState });
    } catch (error) {
      console.error("Error updating flip state:", error);
    }
    
    // Create suspenseful delay with multiple visual states
    setTimeout(() => {
      // Add some extra suspense with a longer animation
      setTimeout(async () => {
        const willReveal = Math.random() < 0.5;
        console.log("Coin flip result:", willReveal ? "REVEAL" : "KEEP SECRET");
        
        try {
          // Get the next asker - rotation logic: the person who answered becomes the next asker
          const nextAskerIndex = playerOrder.findIndex(id => id === gameState.targetPlayerId);
          const answererPlayerId = gameState.targetPlayerId;
          
          const newGameState = {
            ...gameState,
            phase: willReveal ? "revealed" : "not_revealed",
            lastRevealResult: willReveal,
            currentTurnIndex: nextAskerIndex,
            currentQuestion: willReveal ? currentQuestion : null,
            currentAnswer: currentAnswer,
            targetPlayerId: null,
            answererPlayerId: answererPlayerId,
            isFlipping: false
          };

          const { error } = await supabase
            .from("rooms")
            .update({ game_state: newGameState })
            .eq("id", room.id);

          if (error) {
            console.error("Supabase error during coin flip:", error);
            throw error;
          }

          onUpdateRoom({ ...room, game_state: newGameState });
          
          toast({
            title: willReveal ? "🎉 Question Revealed!" : "🤫 Question Stays Secret",
            description: willReveal ? "Everyone can see the question and answer!" : "The question remains a secret.",
            className: willReveal ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground",
          });
          
        } catch (error) {
          console.error("Error processing coin flip:", error);
          toast({
            title: "Error",
            description: "Failed to process coin flip. Please try again.",
            variant: "destructive",
          });
        } finally {
          setIsFlipping(false);
        }
      }, 2000); // Extra delay for suspense
    }, 1000); // Initial delay
  };

  const nextTurn = async () => {
    try {
      const usedAskers = gameState.usedAskers || [];
      
      // Check if all players have asked a question (complete round)
      const allPlayersAsked = usedAskers.length === players.length;
      
      if (allPlayersAsked) {
        // Complete round - randomize order and start new round
        const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
        const newPlayerOrder = shuffledPlayers.map(p => p.player_id);
        
        const newGameState = {
          ...gameState,
          phase: "playing",
          currentQuestion: null,
          currentAnswer: null,
          lastRevealResult: null,
          targetPlayerId: null,
          selectedQuestion: null,
          answererPlayerId: null,
          playerOrder: newPlayerOrder,
          currentTurnIndex: 0,
          currentRound: currentRound + 1,
          usedAskers: [] // Reset for new round
        };

        await supabase
          .from("rooms")
          .update({ game_state: newGameState })
          .eq("id", room.id);

        onUpdateRoom({ ...room, game_state: newGameState });
      } else {
        // Find next player who hasn't asked yet in this round
        let nextIndex = 0;
        let attempts = 0;
        
        // Find a player who hasn't asked yet
        for (let i = 0; i < playerOrder.length && attempts < playerOrder.length; i++) {
          const candidatePlayerId = playerOrder[i];
          if (!usedAskers.includes(candidatePlayerId)) {
            nextIndex = i;
            break;
          }
          attempts++;
        }
        
        const newGameState = {
          ...gameState,
          phase: "playing",
          currentQuestion: null,
          currentAnswer: null,
          lastRevealResult: null,
          targetPlayerId: null,
          selectedQuestion: null,
          answererPlayerId: null,
          currentTurnIndex: nextIndex
        };

        await supabase
          .from("rooms")
          .update({ game_state: newGameState })
          .eq("id", room.id);

        onUpdateRoom({ ...room, game_state: newGameState });
      }
      
    } catch (error) {
      console.error("Error proceeding to next turn:", error);
    }
  };

  const endGame = async () => {
    try {
      const newGameState = {
        ...gameState,
        phase: "ended"
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
    } catch (error) {
      console.error("Error ending game:", error);
    }
  };

  const resetGame = async () => {
    try {
      const newGameState = {
        phase: "waiting",
        currentTurnIndex: 0,
        playerOrder: [],
        currentRound: 1,
        currentQuestion: null,
        currentAnswer: null,
        lastRevealResult: null,
        targetPlayerId: null
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
    } catch (error) {
      console.error("Error resetting game:", error);
    }
  };

  const backToLobby = async () => {
    const newGameState = { phase: "lobby", currentQuestion: null, votes: {} };
    
    const { error } = await supabase
      .from("rooms")
      .update({
        game_state: newGameState
      })
      .eq("id", room.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to return to lobby",
        variant: "destructive",
      });
    } else {
      // Update the room state immediately
      const updatedRoom = {
        ...room,
        game_state: newGameState
      };
      onUpdateRoom(updatedRoom);
    }
  };

  const transferHostAndLeave = async () => {
    try {
      // Find next player to be host (first non-current player)
      const nextHost = players.find(p => p.player_id !== currentPlayer.player_id);
      
      if (nextHost) {
        // Update all players - make next player host, remove current player
        await supabase
          .from("players")
          .update({ is_host: true })
          .eq("room_id", room.id)
          .eq("player_id", nextHost.player_id);

        // Update room host
        await supabase
          .from("rooms")
          .update({ host_id: nextHost.player_id })
          .eq("id", room.id);
      }

      // Remove current player
      await supabase
        .from("players")
        .delete()
        .eq("room_id", room.id)
        .eq("player_id", currentPlayer.player_id);

      // If only one player left or no next host, deactivate room
      if (players.length <= 1 || !nextHost) {
        await supabase
          .from("rooms")
          .update({ is_active: false })
          .eq("id", room.id);
      }

      // Clear local storage
      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

      toast({
        title: "Left Game",
        description: nextHost ? `${nextHost.player_name} is now the host` : "Game ended",
      });

      navigate("/");
    } catch (error) {
      console.error("Error leaving game:", error);
      toast({
        title: "Error",
        description: "Failed to leave game",
        variant: "destructive",
      });
    }
  };

  const playerLeave = async () => {
    try {
      // Remove current player
      await supabase
        .from("players")
        .delete()
        .eq("room_id", room.id)
        .eq("player_id", currentPlayer.player_id);

      // Clear local storage
      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

      toast({
        title: "Left Game",
        description: "You have left the game",
      });

      navigate("/");
    } catch (error) {
      console.error("Error leaving game:", error);
      toast({
        title: "Error",
        description: "Failed to leave game",
        variant: "destructive",
      });
    }
  };

  const getCurrentPlayerName = () => {
    if (!playerOrder || playerOrder.length === 0) return "Unknown";
    const currentPlayerId = playerOrder[currentTurnIndex];
    if (!currentPlayerId) return "Unknown";
    const player = players.find(p => p.player_id === currentPlayerId);
    return player?.player_name || "Unknown";
  };

  const getTargetPlayerName = () => {
    const targetPlayer = players.find(p => p.player_id === gameState.targetPlayerId);
    return targetPlayer?.player_name || "Unknown";
  };

  const isCurrentPlayerTurn = () => {
    return playerOrder[currentTurnIndex] === currentPlayer.player_id;
  };

  const isTargetPlayer = () => {
    return gameState.targetPlayerId === currentPlayer.player_id;
  };

  const isAnswererPlayer = () => {
    return gameState.answererPlayerId === currentPlayer.player_id;
  };

  // Player Circle Component
  const PlayerCircle = ({ showSpeechBubbles = false }: { showSpeechBubbles?: boolean }) => {
    const questionAskerIndex = currentTurnIndex;
    const answerPlayerIndex = playerOrder.findIndex(id => {
      const player = players.find(p => p.player_name === currentAnswer);
      return player?.player_id === id;
    });

    return (
      <div className="relative w-80 h-80 mx-auto">
        <svg width="320" height="320" className="absolute inset-0">
          <circle
            cx="160"
            cy="160"
            r="120"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {playerOrder.map((playerId, index) => {
            const player = players.find(p => p.player_id === playerId);
            const { x, y } = getPlayerCirclePosition(index, playerOrder.length);
            const isCurrentTurn = index === currentTurnIndex;
            const isTarget = playerId === gameState.targetPlayerId;
            const isQuestionAsker = showSpeechBubbles && index === questionAskerIndex;
            const isAnswerTarget = showSpeechBubbles && index === answerPlayerIndex;
            
            return (
              <g key={playerId}>
                <circle
                  cx={160 + x}
                  cy={160 + y}
                  r="20"
                  fill={isCurrentTurn ? "hsl(var(--primary))" : isTarget ? "hsl(var(--destructive))" : "hsl(var(--muted))"}
                  stroke={isCurrentTurn || isTarget ? "hsl(var(--background))" : "hsl(var(--border))"}
                  strokeWidth="2"
                  className={`transition-all duration-500 ${isCurrentTurn ? 'animate-pulse' : ''}`}
                />
                
                <text
                  x={160 + x}
                  y={160 + y + 40}
                  textAnchor="middle"
                  className="text-xs font-medium fill-foreground"
                >
                  {player?.player_name}
                </text>
                
                {isCurrentTurn && phase === "playing" && (
                  <path
                    d={`M ${160 + x + 25} ${160 + y} L ${160 + x + 35} ${160 + y - 5} L ${160 + x + 35} ${160 + y + 5} Z`}
                    fill="hsl(var(--primary))"
                    className="animate-pulse"
                  />
                )}

                {/* Speech bubble for question asker */}
                {isQuestionAsker && (
                  <g className="animate-fade-in">
                    <rect
                      x={160 + x - 40}
                      y={160 + y - 55}
                      width="80"
                      height="25"
                      rx="12"
                      fill="hsl(var(--primary))"
                      stroke="hsl(var(--primary))"
                      strokeWidth="1"
                    />
                    <polygon
                      points={`${160 + x - 5},${160 + y - 30} ${160 + x + 5},${160 + y - 30} ${160 + x},${160 + y - 20}`}
                      fill="hsl(var(--primary))"
                    />
                    <text
                      x={160 + x}
                      y={160 + y - 38}
                      textAnchor="middle"
                      className="text-xs font-medium fill-primary-foreground"
                    >
                      Asked!
                    </text>
                  </g>
                )}

                {/* Speech bubble for answer target */}
                {isAnswerTarget && (
                  <g className="animate-fade-in">
                    <rect
                      x={160 + x - 40}
                      y={160 + y + 30}
                      width="80"
                      height="25"
                      rx="12"
                      fill="hsl(var(--destructive))"
                      stroke="hsl(var(--destructive))"
                      strokeWidth="1"
                    />
                    <polygon
                      points={`${160 + x - 5},${160 + y + 30} ${160 + x + 5},${160 + y + 30} ${160 + x},${160 + y + 20}`}
                      fill="hsl(var(--destructive))"
                    />
                    <text
                      x={160 + x}
                      y={160 + y + 47}
                      textAnchor="middle"
                      className="text-xs font-medium fill-destructive-foreground"
                    >
                      Chosen!
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
        
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-sm font-medium text-muted-foreground">Round {currentRound}</div>
            {phase === "coin_flip" && (
              <div className="mt-2">
                <Coins className={`h-8 w-8 text-primary mx-auto ${isFlipping ? 'animate-spin' : ''}`} />
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Minimum players check
  if (phase === "waiting") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Paranoia Game Lobby
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-muted-foreground mb-4">
                Welcome to Paranoia! A game of secrets, questions, and revelations.
              </p>
              <p className="text-sm text-muted-foreground mb-6">
                Players: {players.length} | Minimum required: 3
              </p>
              
              {players.length < 3 && (
                <div className="bg-yellow-100 border border-yellow-300 rounded-lg p-4 mb-4">
                  <p className="text-yellow-800 text-sm">
                    You need at least 3 players to start Paranoia. Invite more friends!
                  </p>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2 mb-6">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center gap-2 p-2 bg-muted rounded">
                    {player.is_host && <Crown className="h-4 w-4 text-yellow-500" />}
                    <span className="text-sm">{player.player_name}</span>
                  </div>
                ))}
              </div>
            </div>

            {currentPlayer.is_host && (
              <Button 
                onClick={startGame}
                disabled={isLoading || players.length < 3}
                className="w-full"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Paranoia Game
              </Button>
            )}
            
            {!currentPlayer.is_host && (
              <div className="text-center text-muted-foreground">
                Waiting for the host to start the game...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Game phases
  if (phase === "playing") {
    const isMyTurn = isCurrentPlayerTurn();
    
    return (
      <div className="space-y-6">
        {/* Host Controls */}
        {currentPlayer.is_host && (
          <div className="fixed top-4 left-16 z-50 flex gap-2">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Lobby
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Return to Lobby</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to return everyone to the lobby? This will end the current game.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button onClick={backToLobby} size="sm">Yes, Return to Lobby</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Leave Game
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Game</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to leave? Another player will become the new host.
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button onClick={transferHostAndLeave} variant="destructive" size="sm">Yes, Leave Game</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Regular Player Controls */}
        {!currentPlayer.is_host && (
          <div className="fixed top-4 left-16 z-50">
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <LogOut className="h-4 w-4" />
                  Leave Game
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Leave Game</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Are you sure you want to leave the game?
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" size="sm">Cancel</Button>
                    <Button onClick={playerLeave} variant="destructive" size="sm">Yes, Leave Game</Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Paranoia Game
              </div>
              {currentPlayer.is_host && (
                <Button onClick={endGame} variant="outline" size="sm">
                  <StopCircle className="h-4 w-4 mr-2" />
                  End Game
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerCircle />
            
            {/* Timer for question asking */}
            {isMyTurn && questionTimer.isRunning && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{questionTimer.formatTime}</span>
                </div>
                <Progress value={(questionTimer.time / 30) * 100} className="h-2" />
              </div>
            )}
            
            <div className="text-center">
              <p className="text-lg font-medium">
                {isMyTurn ? "Your turn!" : playerOrder.length > 0 ? `${getCurrentPlayerName()}'s turn` : "Setting up game..."}
              </p>
              <p className="text-muted-foreground">
                {isMyTurn ? "Choose a question for the next player" : playerOrder.length > 0 ? "Waiting for question..." : "Please wait while we set up the game"}
              </p>
            </div>

            {isMyTurn && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="custom-question">Write your own question</Label>
                  <Textarea
                    id="custom-question"
                    placeholder="Enter a paranoia question..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <Button 
                  onClick={submitQuestion}
                  disabled={isLoading || !customQuestion.trim()}
                  className="w-full"
                >
                  Send Custom Question
                </Button>

                {availableQuestions.length > 0 && (
                  <div className="space-y-3">
                    <Label>Or choose from AI-generated questions:</Label>
                     <div className="max-h-60 overflow-y-auto space-y-2 border rounded-lg p-3">
                       {availableQuestions.map((question) => (
                         <Card 
                           key={question.id} 
                           className={`cursor-pointer transition-all hover:bg-muted/50 hover:scale-[1.02] ${
                             selectedQuestionId === question.id ? 'ring-2 ring-primary bg-primary/5' : ''
                           } ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}
                           onClick={() => {
                             if (!isLoading) {
                               console.log("Question clicked:", question.id, question.question);
                               setSelectedQuestionId(question.id);
                             }
                           }}
                         >
                           <CardContent className="p-3">
                             <p className="text-sm">{question.question}</p>
                             <div className="flex justify-between items-center mt-2">
                               <Badge variant="secondary" className="text-xs">
                                 {question.category}
                               </Badge>
                               <div className="flex">
                                 {Array.from({ length: question.spiciness_level }, (_, i) => (
                                   <span key={i} className="text-orange-500">🌶️</span>
                                 ))}
                               </div>
                             </div>
                           </CardContent>
                         </Card>
                       ))}
                     </div>
                    
                     {selectedQuestionId && (
                       <Button 
                         onClick={() => {
                           const selectedQuestion = availableQuestions.find(q => q.id === selectedQuestionId);
                           if (selectedQuestion && !isLoading) {
                             console.log("Using selected question button clicked");
                             useSelectedQuestion(selectedQuestion.question);
                           } else {
                             console.log("No question found or already loading");
                           }
                         }}
                         disabled={isLoading || !selectedQuestionId}
                         className="w-full"
                         variant="default"
                       >
                         {isLoading ? "Selecting..." : "Use Selected Question"}
                       </Button>
                     )}
                  </div>
                )}
              </div>
            )}
            
            {/* Show the current question to the person who asked it */}
            {currentQuestion && gameState.currentQuestionAsker === currentPlayer.player_id && (phase === "answering" || phase === "waiting_for_flip") && (
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="font-medium mb-2">Your question (only you can see this):</p>
                <p className="text-primary">{currentQuestion}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "answering") {
    const isMyTurnToAnswer = isTargetPlayer();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Answer Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerCircle />
            
            {/* Timer for answering */}
            {isMyTurnToAnswer && answerTimer.isRunning && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{answerTimer.formatTime}</span>
                </div>
                <Progress value={(answerTimer.time / 30) * 100} className="h-2" />
              </div>
            )}
            
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {isMyTurnToAnswer ? "It's your turn to answer!" : `${getTargetPlayerName()} is answering...`}
              </p>
              {currentQuestion && isMyTurnToAnswer && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">Question (only you can see this):</p>
                  <p className="text-muted-foreground">{currentQuestion}</p>
                </div>
              )}
              {!isMyTurnToAnswer && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">Question asked privately</p>
                  <p className="text-muted-foreground">Only {getTargetPlayerName()} can see the question</p>
                </div>
              )}
            </div>

            {isMyTurnToAnswer && (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="answer">Select a Player</Label>
                  <p className="text-sm text-muted-foreground mb-2">
                    Choose someone from the room (you cannot select yourself)
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {players
                      .filter(p => p.player_id !== currentPlayer.player_id)
                      .map((player) => (
                        <Button
                          key={player.id}
                          variant={playerAnswer === player.player_name ? "default" : "outline"}
                          onClick={() => setPlayerAnswer(player.player_name)}
                          className="text-left justify-start"
                        >
                          {player.is_host && <Crown className="h-4 w-4 mr-2" />}
                          {player.player_name}
                        </Button>
                      ))}
                  </div>
                </div>
                
                <Button 
                  onClick={submitAnswer}
                  disabled={isLoading || !playerAnswer.trim()}
                  className="w-full"
                >
                  Submit Answer: {playerAnswer}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "waiting_for_flip") {
    const isMyTurnToFlip = isTargetPlayer();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Decision Time
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerCircle />
            
            {/* Timer for coin flip decision */}
            {isMyTurnToFlip && flipTimer.isRunning && (
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">{flipTimer.formatTime}</span>
                </div>
                <Progress value={(flipTimer.time / 30) * 100} className="h-2" />
              </div>
            )}
            
            <div className="text-center space-y-4">
              <p className="text-lg font-medium">
                {isMyTurnToFlip ? "Your turn to flip the coin!" : `${getTargetPlayerName()} is deciding...`}
              </p>
              <p className="text-muted-foreground">
                Will the question be revealed to everyone?
              </p>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">Answer:</p>
                <p className="text-lg">{currentAnswer}</p>
              </div>

               {isMyTurnToFlip && (
                 <Button 
                   onClick={flipCoin}
                   disabled={isLoading || isFlipping}
                   className={`w-full transition-all duration-300 ${
                     isFlipping ? 'animate-pulse' : 'hover:scale-105'
                   }`}
                   size="lg"
                 >
                   <Coins className={`h-5 w-5 mr-2 ${isFlipping ? 'animate-spin' : ''}`} />
                   {isFlipping ? "🪙 Flipping the coin..." : "🎲 Flip the Coin of Fate"}
                 </Button>
               )}
               
               {!isMyTurnToFlip && (
                 <div className="flex flex-col items-center space-y-2">
                   <div className="relative">
                     <Coins className="h-16 w-16 text-primary animate-pulse" />
                     <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" />
                   </div>
                   <p className="text-sm text-muted-foreground">Waiting for the coin flip...</p>
                 </div>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "coin_flip") {
    const isCurrentlyFlipping = isFlipping || gameState.isFlipping;
    
    return (
      <div className="space-y-6">
        <Card className="relative overflow-hidden">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Coin Flip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <PlayerCircle />
            
            <div className="text-center space-y-6">
              <div className="space-y-2">
                <p className="text-xl font-bold animate-pulse">🎲 FATE IS DECIDING... 🎲</p>
                <p className="text-muted-foreground">Will the question be revealed to everyone?</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">Answer:</p>
                <p className="text-lg">{currentAnswer}</p>
              </div>
              
              {/* Enhanced Coin Animation */}
              <div className="relative py-8">
                {/* Background spotlight effect */}
                <div className={`absolute inset-0 transition-all duration-1000 ${
                  isCurrentlyFlipping 
                    ? 'bg-gradient-to-r from-primary/5 via-primary/20 to-primary/5 animate-pulse' 
                    : 'bg-transparent'
                }`} />
                
                {/* Main coin container */}
                <div className="relative flex justify-center">
                  <div className={`
                    relative w-24 h-24 rounded-full transition-all duration-1000
                    ${isCurrentlyFlipping 
                      ? 'animate-[spin_0.8s_ease-in-out_infinite] scale-125' 
                      : 'scale-100'
                    }
                  `}>
                    {/* Coin face */}
                    <div className={`
                      absolute inset-0 rounded-full border-4 border-primary
                      bg-gradient-to-br from-yellow-300 via-yellow-400 to-yellow-600
                      shadow-lg transition-all duration-500
                      ${isCurrentlyFlipping ? 'shadow-2xl shadow-primary/50' : ''}
                    `}>
                      {/* Coin design */}
                      <div className="absolute inset-2 rounded-full border-2 border-yellow-600/30 flex items-center justify-center">
                        <div className="text-2xl font-bold text-yellow-800">
                          {isCurrentlyFlipping ? '⚡' : '🪙'}
                        </div>
                      </div>
                    </div>
                    
                    {/* Spinning particles */}
                    {isCurrentlyFlipping && (
                      <>
                        <div className="absolute -inset-4 rounded-full border border-primary/30 animate-ping" />
                        <div className="absolute -inset-8 rounded-full border border-primary/20 animate-ping animation-delay-200" />
                        <div className="absolute -inset-12 rounded-full border border-primary/10 animate-ping animation-delay-400" />
                      </>
                    )}
                  </div>
                </div>
                
                {/* Dramatic text */}
                {isCurrentlyFlipping && (
                  <div className="mt-6 space-y-2">
                    <p className="text-lg font-bold text-primary animate-bounce">
                      ✨ THE COIN IS SPINNING! ✨
                    </p>
                    <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                      <span className="animate-pulse">Heads = Reveal</span>
                      <span>•</span>
                      <span className="animate-pulse animation-delay-500">Tails = Secret</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
          
          {/* Background effect overlay */}
          {isCurrentlyFlipping && (
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/20 to-transparent transform -translate-x-1/2 animate-pulse" />
              <div className="absolute left-0 top-1/2 w-full h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent transform -translate-y-1/2 animate-pulse animation-delay-300" />
            </div>
          )}
        </Card>
      </div>
    );
  }

  if (phase === "revealed") {
    const canContinue = isAnswererPlayer();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Question Revealed!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerCircle showSpeechBubbles={true} />
            
            <div className="text-center space-y-4">
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="font-medium mb-2">The question was:</p>
                <p className="text-lg text-primary">{currentQuestion}</p>
              </div>
              
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <p className="font-medium mb-2">
                  <span className="text-primary">{getCurrentPlayerName()}</span> asked and 
                  <span className="text-destructive"> {currentAnswer}</span> was chosen!
                </p>
              </div>

              {canContinue && (
                <Button 
                  onClick={nextTurn}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Continue to Next Turn
                </Button>
              )}
              
              {!canContinue && (
                <p className="text-muted-foreground">Waiting for {players.find(p => p.player_id === gameState.answererPlayerId)?.player_name} to continue...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "not_revealed") {
    const canContinue = isAnswererPlayer();
    
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Question Stays Secret
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerCircle showSpeechBubbles={true} />
            
            <div className="text-center space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">The question remains secret!</p>
                <p className="text-lg text-muted-foreground">Only the answerer knows what was asked</p>
              </div>
              
              <div className="bg-destructive/10 border border-destructive/20 p-4 rounded-lg">
                <p className="font-medium mb-2">
                  <span className="text-primary">{getCurrentPlayerName()}</span> asked and 
                  <span className="text-destructive"> {currentAnswer}</span> was chosen!
                </p>
              </div>

              {canContinue && (
                <Button 
                  onClick={nextTurn}
                  disabled={isLoading}
                  className="w-full"
                  size="lg"
                >
                  Continue to Next Turn
                </Button>
              )}
              
              {!canContinue && (
                <p className="text-muted-foreground">Waiting for {players.find(p => p.player_id === gameState.answererPlayerId)?.player_name} to continue...</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "ended") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Game Complete!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-lg font-medium mb-4">Thanks for playing Paranoia!</p>
              <p className="text-muted-foreground mb-6">
                Hope you enjoyed those secrets and revelations! 😉
              </p>
            </div>

            {currentPlayer.is_host && (
              <Button onClick={resetGame} className="w-full">
                Start New Game
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
