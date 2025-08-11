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
import { Users, Crown, Play, Clock, ArrowLeft, LogOut } from "lucide-react";
import { CoinFlip3D } from "./CoinFlip3D";
import { useNavigate } from "react-router-dom";
import { ParanoiaPlayerCircle } from "./ParanoiaPlayerCircle";
import { useParanoiaGame } from "@/hooks/useParanoiaGame";
import { useParanoiaTimer } from "@/hooks/useParanoiaTimer";
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

interface ParanoiaGameV2Props {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

export function ParanoiaGameV2({ room, players, currentPlayer, onUpdateRoom }: ParanoiaGameV2Props) {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [customQuestion, setCustomQuestion] = useState("");
  const [playerAnswer, setPlayerAnswer] = useState("");

  const {
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
  } = useParanoiaGame(room, players, currentPlayer, onUpdateRoom);

  // Question selection timer
  const questionTimer = useParanoiaTimer({
    duration: 30,
    isActive: gameState.phase === "playing" && isCurrentPlayerTurn(),
    onTimeUp: () => {
      toast({
        title: "Time's up!",
        description: "Auto-submitting question...",
        variant: "destructive",
      });
      
      // Auto-submit custom question if there's text, otherwise use a random question
      if (customQuestion.trim()) {
        selectQuestion();
        setCustomQuestion("");
      } else if (questions.length > 0) {
        // Use a random question from available questions
        const randomQuestion = questions[Math.floor(Math.random() * questions.length)];
        if (randomQuestion) {
          selectQuestion();
        }
      } else {
        // Fallback to a default question if no questions are available
        selectQuestion();
      }
    }
  });

  // Answer timer
  const answerTimer = useParanoiaTimer({
    duration: 30,
    isActive: gameState.phase === "answering" && isTargetPlayer(),
    onTimeUp: () => {
      toast({
        title: "Time's up!",
        description: "Answer time expired",
        variant: "destructive",
      });
      const availablePlayers = players.filter(p => p.player_id !== currentPlayer.player_id);
      if (availablePlayers.length > 0) {
        const randomPlayer = availablePlayers[Math.floor(Math.random() * availablePlayers.length)];
        if (randomPlayer) {
          submitAnswer(randomPlayer.player_name);
        }
      }
    }
  });

  // Coin flip timer
  const flipTimer = useParanoiaTimer({
    duration: 30,
    isActive: gameState.phase === "waiting_for_flip" && isTargetPlayer(),
    onTimeUp: () => {
      toast({
        title: "Time's up!",
        description: "Coin flip time expired - auto flipping",
        variant: "destructive",
      });
      flipCoin();
    }
  });

// Removed stale DB subscription; live updates come via useRoom broadcast


  const handleCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      toast({
        title: "Empty Question",
        description: "Please enter a question.",
        variant: "destructive",
      });
      return;
    }

    // Persist custom question and move to answering with deterministic target
    const askerId = gameState.playerOrder?.[gameState.currentTurnIndex];
    const eligibleTargets = players.filter(p => p.player_id !== askerId);
    const target = eligibleTargets[Math.floor(Math.random() * eligibleTargets.length)];

    const newCustom = { id: `custom-${Date.now()}`, question: customQuestion.trim(), category: 'custom' };

    await onUpdateRoom({
      gameState: {
        customQuestions: [...(((gameState as any).customQuestions) || []), newCustom],
        currentQuestion: customQuestion.trim(),
        targetPlayerId: target?.player_id || null,
        phase: 'answering'
      }
    } as any);

    setCustomQuestion("");
  };

  const handleAnswer = async () => {
    await submitAnswer(playerAnswer);
    setPlayerAnswer("");
  };

  const backToLobby = async () => {
    try {
      const newGameState = { phase: "lobby", currentQuestion: null, votes: {} };
      
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ 
            action: 'update', 
            roomCode: room.room_code, 
            updates: { gameState: newGameState } 
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || 'Failed to update game state');
        }

        onUpdateRoom({ gameState: newGameState } as any);
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to return to lobby",
        variant: "destructive",
      });
    }
  };

  const leaveGame = async () => {
    try {
      if (currentPlayer.is_host) {
        // Transfer host to next player
        const nextHost = players.find(p => p.player_id !== currentPlayer.player_id);
        
        if (nextHost) {
          // Player updates are now handled through Redis room data
          toast({
            title: "Left Game",
            description: `${nextHost.player_name} is now the host`,
          });
        }
      }

      // Remove current player
      // Player removal is now handled through Redis room data

      // If only one player left, room cleanup is handled through Redis

      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

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

  // Game phases rendering
  if (gameState.phase === "waiting") {
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
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs">
                      {player.player_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm">{player.player_name}</span>
                    {player.is_host && <Crown className="h-4 w-4 text-yellow-500" />}
                  </div>
                ))}
              </div>
              
              {currentPlayer.is_host && (
                <div className="space-y-4">
                  <Button 
                    onClick={startGame}
                    disabled={players.length < 3 || isLoading}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Paranoia Game
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="outline" onClick={backToLobby} className="flex-1">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Lobby
          </Button>
          <Button variant="destructive" onClick={leaveGame}>
            <LogOut className="h-4 w-4 mr-2" />
            Leave Game
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Player Circle */}
      <Card>
        <CardContent className="p-6">
          <ParanoiaPlayerCircle
            players={players}
            playerOrder={gameState.playerOrder}
            currentTurnIndex={gameState.currentTurnIndex}
            targetPlayerId={gameState.targetPlayerId}
            currentRound={gameState.currentRound}
            phase={gameState.phase}
            isFlipping={gameState.isFlipping}
            currentAnswer={gameState.currentAnswer}
          />
        </CardContent>
      </Card>

      {/* Game Content */}
      {gameState.phase === "playing" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Question Selection</span>
              {isCurrentPlayerTurn() && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{questionTimer.timeLeft}s</span>
                  <Progress value={(questionTimer.timeLeft / 30) * 100} className="w-20" />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isCurrentPlayerTurn() ? (
              <div className="space-y-4">
                <p className="text-center text-lg font-medium">It's your turn to ask a question!</p>
                <p className="text-center text-sm text-muted-foreground">
                  The question will be asked to: <strong>{players.find(p => p.player_id === gameState.playerOrder[(gameState.currentTurnIndex + 1) % gameState.playerOrder.length])?.player_name}</strong>
                </p>
                
                {/* Predefined Questions */}
                {questions.length > 0 && (
                  <div className="space-y-2">
                    <Label>Choose a question:</Label>
                    <div className="grid gap-2 max-h-40 overflow-y-auto">
                      {questions.slice(0, 5).map((q, index) => (
                        <Button
                          key={`${q.id}-${index}`}
                          variant="outline"
                          onClick={() => selectQuestion()}
                          disabled={isLoading}
                          className="text-left justify-start h-auto whitespace-normal p-3"
                        >
                          {q.question}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Custom Question */}
                <div className="space-y-2">
                  <Label htmlFor="custom-question">Or write your own question:</Label>
                  <Textarea
                    id="custom-question"
                    placeholder="Who is most likely to..."
                    value={customQuestion}
                    onChange={(e) => setCustomQuestion(e.target.value)}
                    disabled={isLoading}
                  />
                  <Button 
                    onClick={handleCustomQuestion}
                    disabled={!customQuestion.trim() || isLoading}
                    className="w-full"
                  >
                    Ask This Question
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-medium mb-2">
                  <strong>{getCurrentPlayerName()}</strong> is selecting a question...
                </p>
                <p className="text-sm text-muted-foreground">Please wait for your turn</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {gameState.phase === "answering" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Answer the Question</span>
              {isTargetPlayer() && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{answerTimer.timeLeft}s</span>
                  <Progress value={(answerTimer.timeLeft / 30) * 100} className="w-20" />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <p className="text-lg font-medium mb-2">"{gameState.currentQuestion}"</p>
            </div>
            
            {isTargetPlayer() ? (
              <div className="space-y-4">
                <p className="text-center">Choose a player as your answer:</p>
                <div className="grid grid-cols-2 gap-2">
                  {players.filter(p => p.player_id !== currentPlayer.player_id).map((player) => (
                    <Button
                      key={player.id}
                      variant="outline"
                      onClick={() => setPlayerAnswer(player.player_name)}
                      className={playerAnswer === player.player_name ? "bg-primary text-primary-foreground" : ""}
                    >
                      {player.player_name}
                    </Button>
                  ))}
                </div>
                <Button 
                  onClick={handleAnswer}
                  disabled={!playerAnswer || isLoading}
                  className="w-full"
                >
                  Submit Answer
                </Button>
              </div>
            ) : (
              <div className="text-center">
                <p className="text-lg font-medium">
                  <strong>{getTargetPlayerName()}</strong> is answering the question...
                </p>
                <p className="text-sm text-muted-foreground">Please wait</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {gameState.phase === "waiting_for_flip" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Coin Flip Decision</span>
              {isTargetPlayer() && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  <span className="text-sm">{flipTimer.timeLeft}s</span>
                  <Progress value={(flipTimer.timeLeft / 30) * 100} className="w-20" />
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground mb-2">Question:</p>
                <p className="font-medium mb-3">"{gameState.currentQuestion}"</p>
                <p className="text-sm text-muted-foreground mb-2">Answer:</p>
                <p className="font-medium">{gameState.currentAnswer}</p>
              </div>
              
              {isTargetPlayer() ? (
                <Button 
                  onClick={flipCoin}
                  disabled={isLoading || gameState.isFlipping}
                  className="w-full"
                  size="lg"
                >
                  {gameState.isFlipping ? "Flipping..." : "Flip Coin"}
                </Button>
              ) : (
                <p className="text-lg font-medium">
                  <strong>{getTargetPlayerName()}</strong> must decide to flip the coin...
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {gameState.phase === "coin_flip" && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center space-y-4">
              <p className="text-lg font-medium">Flipping the coin...</p>
              <CoinFlip3D isFlipping={gameState.isFlipping} />
            </div>
          </CardContent>
        </Card>
      )}

      {(gameState.phase === "revealed" || gameState.phase === "not_revealed") && (
        <Card>
          <CardHeader>
            <CardTitle>
              {gameState.phase === "revealed" ? "🎉 Question Revealed!" : "🤫 Question Stays Secret"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center space-y-4">
              {gameState.phase === "revealed" ? (
                <div className="p-4 bg-success/10 border border-success rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Question:</p>
                  <p className="font-medium mb-3">"{gameState.currentQuestion}"</p>
                  <p className="text-sm text-muted-foreground mb-2">Answer:</p>
                  <p className="font-medium">{gameState.currentAnswer}</p>
                </div>
              ) : (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="font-medium">The question and answer remain secret! 🤐</p>
                </div>
              )}
              
              {currentPlayer.is_host && (
                <Button onClick={nextTurn} className="w-full">
                  Continue to Next Turn
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Game Controls */}
      <div className="flex gap-2">
        <Button variant="outline" onClick={backToLobby} className="flex-1">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Lobby
        </Button>
        {currentPlayer.is_host && gameState.phase !== ('waiting' as any) && (
          <Button variant="destructive" onClick={resetGame}>
            Reset Game
          </Button>
        )}
        <Button variant="destructive" onClick={leaveGame}>
          <LogOut className="h-4 w-4 mr-2" />
          Leave
        </Button>
      </div>
    </div>
  );
}