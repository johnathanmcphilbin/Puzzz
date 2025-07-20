import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Crown, Coins, MessageSquare, Play, StopCircle } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);
  const [availableQuestions, setAvailableQuestions] = useState<ParanoiaQuestion[]>([]);
  const [customQuestion, setCustomQuestion] = useState<string>("");
  const [playerAnswer, setPlayerAnswer] = useState<string>("");
  const [isFlipping, setIsFlipping] = useState(false);

  const gameState = room.game_state || {};
  const phase = gameState.phase || "waiting";
  const currentTurnIndex = gameState.currentTurnIndex || 0;
  const playerOrder = gameState.playerOrder || [];
  const currentRound = gameState.currentRound || 1;
  const currentQuestion = gameState.currentQuestion || null;
  const currentAnswer = gameState.currentAnswer || null;

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
        targetPlayerId: null
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
        targetPlayerId: null
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
      
      const newGameState = {
        ...gameState,
        phase: "answering",
        currentQuestion: customQuestion.trim(),
        targetPlayerId: nextPlayerId
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

  const useRandomQuestion = async () => {
    if (availableQuestions.length === 0) {
      toast({
        title: "No Questions Available",
        description: "Please enter a custom question.",
        variant: "destructive",
      });
      return;
    }

    const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
    setIsLoading(true);
    
    try {
      const nextPlayerIndex = getNextPlayerIndex();
      const nextPlayerId = playerOrder[nextPlayerIndex];
      
      const newGameState = {
        ...gameState,
        phase: "answering",
        currentQuestion: randomQuestion.question,
        targetPlayerId: nextPlayerId
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      
    } catch (error) {
      console.error("Error using random question:", error);
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
        phase: "coin_flip",
        currentAnswer: playerAnswer.trim()
      };

      await supabase
        .from("rooms")
        .update({ game_state: newGameState })
        .eq("id", room.id);

      onUpdateRoom({ ...room, game_state: newGameState });
      setPlayerAnswer("");
      
      setTimeout(() => {
        flipCoin();
      }, 1500);
      
    } catch (error) {
      console.error("Error submitting answer:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const flipCoin = async () => {
    setIsFlipping(true);
    
    setTimeout(async () => {
      const willReveal = Math.random() < 0.5;
      setIsFlipping(false);
      
      try {
        const newGameState = {
          ...gameState,
          phase: willReveal ? "revealed" : "playing",
          lastRevealResult: willReveal,
          currentTurnIndex: (currentTurnIndex + 1) % playerOrder.length,
          currentQuestion: null,
          currentAnswer: null,
          targetPlayerId: null
        };

        if (willReveal) {
          setTimeout(() => {
            nextTurn();
          }, 5000);
        }

        await supabase
          .from("rooms")
          .update({ game_state: newGameState })
          .eq("id", room.id);

        onUpdateRoom({ ...room, game_state: newGameState });
        
        toast({
          title: willReveal ? "Question Revealed!" : "Question Stays Secret",
          description: willReveal ? "Everyone can see the question and answer!" : "The question remains a secret.",
          className: willReveal ? "bg-success text-success-foreground" : "bg-primary text-primary-foreground",
        });
        
      } catch (error) {
        console.error("Error processing coin flip:", error);
      }
    }, 2000);
  };

  const nextTurn = async () => {
    try {
      const newGameState = {
        ...gameState,
        phase: "playing",
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

  // Player Circle Component
  const PlayerCircle = () => (
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
                
                <div className="flex gap-2">
                  <Button 
                    onClick={submitQuestion}
                    disabled={isLoading || !customQuestion.trim()}
                    className="flex-1"
                  >
                    Send Question
                  </Button>
                  
                  <Button 
                    onClick={useRandomQuestion}
                    disabled={isLoading}
                    variant="outline"
                    className="flex-1"
                  >
                    Use Random Question
                  </Button>
                </div>
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
            
            <div className="text-center space-y-2">
              <p className="text-lg font-medium">
                {isMyTurnToAnswer ? "It's your turn to answer!" : `${getTargetPlayerName()} is answering...`}
              </p>
              {currentQuestion && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="font-medium">Question:</p>
                  <p className="text-muted-foreground">{currentQuestion}</p>
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

  if (phase === "coin_flip") {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5" />
              Coin Flip
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <PlayerCircle />
            
            <div className="text-center space-y-4">
              <p className="text-lg font-medium">Flipping coin to decide...</p>
              <p className="text-muted-foreground">Will the question be revealed?</p>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">Answer:</p>
                <p className="text-lg">{currentAnswer}</p>
              </div>
              
              <div className="flex justify-center">
                <Coins className={`h-16 w-16 text-primary ${isFlipping ? 'animate-spin' : ''}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (phase === "revealed") {
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
            <PlayerCircle />
            
            <div className="text-center space-y-4">
              <div className="bg-primary/10 border border-primary/20 p-4 rounded-lg">
                <p className="font-medium mb-2">The question was:</p>
                <p className="text-lg text-primary">{currentQuestion}</p>
              </div>
              
              <div className="bg-muted p-4 rounded-lg">
                <p className="font-medium mb-2">Answer:</p>
                <p className="text-lg">{currentAnswer}</p>
              </div>
              
              <p className="text-muted-foreground">Moving to next turn...</p>
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