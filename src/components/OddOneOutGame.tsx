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
import { Users, Crown, Trophy, MessageSquare, Play, StopCircle, Clock, ArrowLeft, LogOut, Eye, EyeOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getCatImageUrl } from "@/assets/catImages";

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

interface OddOneOutGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

interface OddOneOutQuestion {
  id: string;
  normal_prompt: string;
  imposter_prompt: string;
  category: string;
}

export function OddOneOutGame({ room, players, currentPlayer, onUpdateRoom }: OddOneOutGameProps) {
  const { toast } = useToast();
  const navigate = useNavigate();
  
  const [currentQuestion, setCurrentQuestion] = useState<OddOneOutQuestion | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<{ [playerId: string]: string }>({});
  const [playerDefenses, setPlayerDefenses] = useState<{ [playerId: string]: string }>({});
  const [votes, setVotes] = useState<{ [playerId: string]: string }>({});
  const [myAnswer, setMyAnswer] = useState("");
  const [myDefense, setMyDefense] = useState("");
  const [selectedVote, setSelectedVote] = useState("");
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  
  // Game state from room
  const gameState = room.game_state || {};
  const phase = gameState.phase || "setup"; // setup, answering, defending, discussion, voting, reveal
  const imposterPlayerId = gameState.imposter_player_id;
  const currentDefendingPlayer = gameState.current_defending_player;
  const roundNumber = gameState.round_number || 1;
  
  // Timer for defense phase (30 seconds) and discussion phase (2 minutes)
  const { time: timeLeft, start: startTimer, stop: stopTimer, reset: resetTimer } = useTimer({ initialTime: 30 });

  useEffect(() => {
    if (phase === "defending" && currentDefendingPlayer) {
      resetTimer(30);
      startTimer();
    } else if (phase === "discussion") {
      resetTimer(120);
      startTimer();
    } else {
      stopTimer();
    }
  }, [phase, currentDefendingPlayer]);

  useEffect(() => {
    if (timeLeft === 0) {
      if (phase === "defending") {
        handleDefenseComplete();
      } else if (phase === "discussion") {
        // Auto move to voting if discussion time runs out
        updateGameState({ phase: "voting" });
      }
    }
  }, [timeLeft, phase]);

  // Load questions and set up real-time subscriptions
  useEffect(() => {
    if (phase === "setup" && currentPlayer.is_host) {
      loadRandomQuestion();
    }
  }, [phase, currentPlayer.is_host]);

  const loadRandomQuestion = async () => {
    try {
      const { data: questions, error } = await supabase
        .from('odd_one_out_questions')
        .select('*')
        .order('random()')
        .limit(1);
      
      if (error) {
        console.error("Error loading questions:", error);
        throw error;
      }
      
      if (questions && questions.length > 0) {
        setCurrentQuestion(questions[0]);
      } else {
        // Fallback if no questions in database
        setCurrentQuestion({
          id: 'fallback-1',
          normal_prompt: 'Name something you might find in a kitchen',
          imposter_prompt: 'Name something you might find in a bathroom', 
          category: 'household'
        });
      }
    } catch (error) {
      console.error("Error loading question:", error);
      // Use fallback question
      setCurrentQuestion({
        id: 'fallback-1',
        normal_prompt: 'Name something you might find in a kitchen',
        imposter_prompt: 'Name something you might find in a bathroom', 
        category: 'household'
      });
      toast({
        title: "Error loading question",
        description: "Using fallback question.",
        variant: "destructive",
      });
    }
  };

  const startGame = async () => {
    if (!currentPlayer.is_host || !currentQuestion) return;
    
    // Randomly select an imposter
    const randomImposter = players[Math.floor(Math.random() * players.length)];
    
    const newGameState = {
      phase: "answering",
      imposter_player_id: randomImposter.player_id,
      question_id: currentQuestion.id,
      question: currentQuestion,
      round_number: 1,
      player_answers: {},
      player_defenses: {},
      votes: {},
      scores: players.reduce((acc, player) => ({ ...acc, [player.player_id]: 0 }), {})
    };
    
    await updateGameState(newGameState);
    
    toast({
      title: "Game Started!",
      description: "Everyone has received their prompt. Submit your answer!",
    });
  };

  const updateGameState = async (newState: any) => {
    try {
      const { error } = await supabase
        .from('rooms')
        .update({ 
          game_state: { ...gameState, ...newState }
        })
        .eq('id', room.id);

      if (error) {
        console.error("Error updating game state:", error);
        return;
      }

      // Update local room state
      const updatedRoom = { 
        ...room, 
        game_state: { ...gameState, ...newState }
      };
      onUpdateRoom(updatedRoom);
    } catch (error) {
      console.error("Error updating game state:", error);
    }
  };

  const submitAnswer = async () => {
    if (!myAnswer.trim()) {
      toast({
        title: "Answer Required",
        description: "Please enter an answer before submitting.",
        variant: "destructive",
      });
      return;
    }

    const updatedAnswers = { 
      ...gameState.player_answers, 
      [currentPlayer.player_id]: myAnswer.trim() 
    };
    
    await updateGameState({ player_answers: updatedAnswers });
    
    // Check if all players have answered
    if (Object.keys(updatedAnswers).length === players.length) {
      // Move to defending phase
      const firstPlayer = players[0];
      await updateGameState({ 
        phase: "defending",
        current_defending_player: firstPlayer.player_id,
        current_defending_index: 0
      });
    }
    
    setMyAnswer("");
    toast({
      title: "Answer Submitted!",
      description: "Waiting for other players...",
    });
  };

  const submitDefense = async () => {
    if (!myDefense.trim()) {
      toast({
        title: "Defense Required", 
        description: "Please enter a defense before submitting.",
        variant: "destructive",
      });
      return;
    }

    const updatedDefenses = { 
      ...gameState.player_defenses, 
      [currentPlayer.player_id]: myDefense.trim() 
    };
    
    await updateGameState({ player_defenses: updatedDefenses });
    setMyDefense("");
    
    toast({
      title: "Defense Submitted!",
      description: "Moving to next player...",
    });
  };

  const handleDefenseComplete = async () => {
    const currentIndex = gameState.current_defending_index || 0;
    const nextIndex = currentIndex + 1;
    
    if (nextIndex >= players.length) {
      // All players have defended, move to discussion
      await updateGameState({ 
        phase: "discussion",
        current_defending_player: null,
        current_defending_index: null
      });
    } else {
      // Move to next player
      const nextPlayer = players[nextIndex];
      await updateGameState({
        current_defending_player: nextPlayer.player_id,
        current_defending_index: nextIndex
      });
    }
  };

  const submitVote = async () => {
    if (!selectedVote) {
      toast({
        title: "Vote Required",
        description: "Please select a player to vote for.",
        variant: "destructive",
      });
      return;
    }

    const updatedVotes = { 
      ...gameState.votes, 
      [currentPlayer.player_id]: selectedVote 
    };
    
    await updateGameState({ votes: updatedVotes });
    
    // Check if all players have voted
    if (Object.keys(updatedVotes).length === players.length) {
      await revealResults(updatedVotes);
    }
    
    setSelectedVote("");
    toast({
      title: "Vote Submitted!",
      description: "Waiting for other players...",
    });
  };

  const revealResults = async (finalVotes: { [playerId: string]: string }) => {
    // Count votes
    const voteCounts: { [playerId: string]: number } = {};
    Object.values(finalVotes).forEach(votedFor => {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });
    
    // Find player with most votes
    const suspectedImposter = Object.keys(voteCounts).reduce((a, b) => 
      voteCounts[a] > voteCounts[b] ? a : b
    );
    
    const wasImposterCaught = suspectedImposter === imposterPlayerId;
    
    // Update scores
    const newScores = { ...gameState.scores };
    if (wasImposterCaught) {
      // Players win - everyone except imposter gets +1
      players.forEach(player => {
        if (player.player_id !== imposterPlayerId) {
          newScores[player.player_id] = (newScores[player.player_id] || 0) + 1;
        }
      });
    } else {
      // Imposter wins - imposter gets +2
      newScores[imposterPlayerId] = (newScores[imposterPlayerId] || 0) + 2;
    }
    
    await updateGameState({ 
      phase: "reveal",
      vote_counts: voteCounts,
      suspected_imposter: suspectedImposter,
      was_imposter_caught: wasImposterCaught,
      scores: newScores
    });
  };

  const startNewRound = async () => {
    if (!currentPlayer.is_host) return;
    
    // Reset for new round
    setMyAnswer("");
    setMyDefense("");
    setSelectedVote("");
    
    await loadRandomQuestion();
    
    // Select new imposter
    const randomImposter = players[Math.floor(Math.random() * players.length)];
    
    await updateGameState({
      phase: "answering",
      imposter_player_id: randomImposter.player_id,
      round_number: (gameState.round_number || 1) + 1,
      player_answers: {},
      player_defenses: {},
      votes: {},
      current_defending_player: null,
      current_defending_index: null,
      vote_counts: {},
      suspected_imposter: null,
      was_imposter_caught: null
    });
  };

  const leaveGame = async () => {
    try {
      await supabase
        .from('players')
        .delete()
        .eq('player_id', currentPlayer.player_id);
      
      navigate('/');
    } catch (error) {
      console.error("Error leaving game:", error);
      navigate('/');
    }
  };

  const endGame = async () => {
    if (!currentPlayer.is_host) return;
    
    await updateGameState({ phase: "setup" });
    navigate('/');
  };

  // Get player's prompt based on whether they're the imposter
  const getMyPrompt = () => {
    if (!currentQuestion) return "";
    if (currentPlayer.player_id === imposterPlayerId) {
      return currentQuestion.imposter_prompt;
    }
    return currentQuestion.normal_prompt;
  };

  const getCurrentDefendingPlayerName = () => {
    if (!currentDefendingPlayer) return "";
    const player = players.find(p => p.player_id === currentDefendingPlayer);
    return player ? player.player_name : "";
  };

  const renderPlayerIcon = (player: Player, isActive = false) => {
    const iconUrl = player.selected_character_id;
    const catImageSrc = getCatImageUrl(iconUrl);
    
    return (
      <div className={`relative w-16 h-16 rounded-full border-4 transition-all ${
        isActive ? 'border-primary shadow-lg scale-110' : 'border-muted-foreground/20'
      }`}>
        <img
          src={catImageSrc}
          alt={player.player_name}
          className="w-full h-full rounded-full object-cover"
          onError={(e) => {
            e.currentTarget.src = '/placeholder.svg';
          }}
        />
        {player.is_host && (
          <Crown className="absolute -top-2 -right-2 w-6 h-6 text-yellow-500" />
        )}
      </div>
    );
  };

  if (phase === "setup") {
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-primary">Odd One Out</h1>
              <p className="text-muted-foreground">Puzzz Edition</p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Lobby
              </Button>
              <Button variant="outline" size="sm" onClick={leaveGame}>
                <LogOut className="w-4 h-4 mr-2" />
                Leave Game
              </Button>
            </div>
          </div>

          {/* Game Rules */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="w-5 h-5" />
                Quick Rules
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-semibold">1. Get Prompts</h4>
                  <p className="text-sm text-muted-foreground">Everyone gets the same question—except one secret Imposter, who gets a twist.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">2. Pick Your Answer</h4>
                  <p className="text-sm text-muted-foreground">Choose any word or phrase that fits your prompt.</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">3. Defend It (30 sec max)</h4>
                  <p className="text-sm text-muted-foreground">One by one, give a brief reason for your choice. Imposter: blend in!</p>
                </div>
                <div className="space-y-2">
                  <h4 className="font-semibold">4. Discuss & Vote (2 min cap)</h4>
                  <p className="text-sm text-muted-foreground">Chat, point fingers, then vote for the suspected Imposter.</p>
                </div>
              </div>
              <div className="pt-4 border-t">
                <h4 className="font-semibold mb-2">Scoring:</h4>
                <div className="flex gap-4 text-sm">
                  <span className="text-green-600">Right guess: Players +1 ⭐ each</span>
                  <span className="text-red-600">Wrong guess: Imposter +2 ⭐</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Players ({players.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {players.map((player) => (
                  <div key={player.id} className="flex flex-col items-center gap-2">
                    {renderPlayerIcon(player)}
                    <span className="text-sm font-medium">{player.player_name}</span>
                    {player.is_host && <Badge variant="secondary">Host</Badge>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start Game */}
          {currentPlayer.is_host && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Button 
                    onClick={startGame} 
                    size="lg" 
                    disabled={players.length < 3 || !currentQuestion}
                    className="w-full max-w-md"
                  >
                    <Play className="w-5 h-5 mr-2" />
                    Start Odd One Out
                  </Button>
                  {players.length < 3 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Need at least 3 players to start
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (phase === "answering") {
    const isImposter = currentPlayer.player_id === imposterPlayerId;
    const myPrompt = getMyPrompt();
    const answeredCount = Object.keys(gameState.player_answers || {}).length;
    
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">Round {roundNumber}</h1>
            <div className="flex items-center justify-center gap-2">
              <Badge variant={isImposter ? "destructive" : "default"}>
                {isImposter ? "🎭 You are the IMPOSTER!" : "🕵️ Find the imposter"}
              </Badge>
            </div>
            <Progress value={(answeredCount / players.length) * 100} className="w-full" />
            <p className="text-sm text-muted-foreground">
              {answeredCount} of {players.length} players have answered
            </p>
          </div>

          {/* Your Prompt */}
          <Card className={isImposter ? "border-destructive" : ""}>
            <CardHeader>
              <CardTitle className="text-center">Your Prompt</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-lg font-medium p-4 bg-muted rounded-lg">
                {myPrompt}
              </p>
              {isImposter && (
                <p className="text-sm text-muted-foreground mt-2">
                  Remember: Blend in with the other players!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Answer Input */}
          {!gameState.player_answers?.[currentPlayer.player_id] && (
            <Card>
              <CardHeader>
                <CardTitle>Your Answer</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="answer">Enter your answer:</Label>
                  <Textarea
                    id="answer"
                    value={myAnswer}
                    onChange={(e) => setMyAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <Button onClick={submitAnswer} className="w-full" disabled={!myAnswer.trim()}>
                  Submit Answer
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Submitted Answer */}
          {gameState.player_answers?.[currentPlayer.player_id] && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="text-green-600">Answer Submitted ✓</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  "{gameState.player_answers[currentPlayer.player_id]}"
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for other players to finish...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Players Grid */}
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-4">
                {players.map((player) => (
                  <div key={player.id} className="flex flex-col items-center gap-2">
                    {renderPlayerIcon(player, gameState.player_answers?.[player.player_id])}
                    <span className="text-sm font-medium">{player.player_name}</span>
                    <Badge variant={gameState.player_answers?.[player.player_id] ? "default" : "outline"}>
                      {gameState.player_answers?.[player.player_id] ? "Done" : "Thinking..."}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "defending") {
    const defendingPlayer = players.find(p => p.player_id === currentDefendingPlayer);
    const isMyTurn = currentPlayer.player_id === currentDefendingPlayer;
    const hasSubmittedDefense = gameState.player_defenses?.[currentPlayer.player_id];
    
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">Defense Phase</h1>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="default">Round {roundNumber}</Badge>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">{timeLeft}s</span>
              </div>
            </div>
          </div>

          {/* Current Defender */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="text-center">
                {isMyTurn ? "Your Turn to Defend!" : `${getCurrentDefendingPlayerName()}'s Turn`}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              {defendingPlayer && (
                <div className="flex justify-center">
                  {renderPlayerIcon(defendingPlayer, true)}
                </div>
              )}
              
              {defendingPlayer && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">Their answer:</p>
                  <p className="font-semibold text-lg">
                    "{gameState.player_answers?.[defendingPlayer.player_id]}"
                  </p>
                </div>
              )}

              {isMyTurn && !hasSubmittedDefense && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="defense">Defend your answer (30 seconds):</Label>
                    <Textarea
                      id="defense"
                      value={myDefense}
                      onChange={(e) => setMyDefense(e.target.value)}
                      placeholder="Explain why you chose this answer..."
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <Button onClick={submitDefense} disabled={!myDefense.trim()}>
                    Submit Defense
                  </Button>
                </div>
              )}

              {hasSubmittedDefense && isMyTurn && (
                <div className="text-green-600">
                  <p>✓ Defense submitted! Time remaining: {timeLeft}s</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Answers So Far */}
          <Card>
            <CardHeader>
              <CardTitle>All Answers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {players.map((player) => {
                  const answer = gameState.player_answers?.[player.player_id];
                  const defense = gameState.player_defenses?.[player.player_id];
                  const hasDefended = !!defense;
                  
                  return (
                    <div key={player.id} className={`p-4 rounded-lg border ${
                      player.player_id === currentDefendingPlayer ? 'border-primary bg-primary/5' : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10">
                          {renderPlayerIcon(player)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold">{player.player_name}</p>
                          <p className="text-sm font-medium">"{answer}"</p>
                        </div>
                        <Badge variant={hasDefended ? "default" : "outline"}>
                          {hasDefended ? "Defended" : "Pending"}
                        </Badge>
                      </div>
                      {defense && (
                        <div className="mt-2 pl-13 text-sm text-muted-foreground">
                          <strong>Defense:</strong> {defense}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "discussion") {
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">Discussion Phase</h1>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="default">Round {roundNumber}</Badge>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span className="font-mono text-lg">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
            </div>
            <p className="text-muted-foreground">Discuss and figure out who the imposter is!</p>
          </div>

          {/* All Answers and Defenses */}
          <Card>
            <CardHeader>
              <CardTitle>All Answers & Defenses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                {players.map((player) => {
                  const answer = gameState.player_answers?.[player.player_id];
                  const defense = gameState.player_defenses?.[player.player_id];
                  
                  return (
                    <div key={player.id} className="p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-12 h-12">
                          {renderPlayerIcon(player)}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-lg">{player.player_name}</p>
                          <p className="text-lg font-medium text-primary">"{answer}"</p>
                        </div>
                      </div>
                      {defense && (
                        <div className="pl-15 text-muted-foreground">
                          <strong>Defense:</strong> {defense}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Move to Voting */}
          <Card>
            <CardContent className="pt-6 text-center">
              <Button 
                onClick={() => updateGameState({ phase: "voting" })}
                size="lg"
                disabled={!currentPlayer.is_host}
              >
                <MessageSquare className="w-5 h-5 mr-2" />
                Move to Voting
              </Button>
              {!currentPlayer.is_host && (
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for host to move to voting phase...
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "voting") {
    const hasVoted = gameState.votes?.[currentPlayer.player_id];
    const voteCount = Object.keys(gameState.votes || {}).length;
    
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">Voting Phase</h1>
            <Badge variant="default">Round {roundNumber}</Badge>
            <Progress value={(voteCount / players.length) * 100} className="w-full max-w-md mx-auto" />
            <p className="text-muted-foreground">
              {voteCount} of {players.length} players have voted
            </p>
          </div>

          {/* Voting */}
          {!hasVoted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">Who do you think is the imposter?</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {players.map((player) => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedVote(player.player_id)}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        selectedVote === player.player_id 
                          ? 'border-primary bg-primary/10' 
                          : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        {renderPlayerIcon(player)}
                        <span className="font-medium">{player.player_name}</span>
                        <p className="text-sm text-muted-foreground text-center">
                          "{gameState.player_answers?.[player.player_id]}"
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
                <Button 
                  onClick={submitVote} 
                  className="w-full mt-6" 
                  size="lg"
                  disabled={!selectedVote}
                >
                  Vote for {selectedVote ? players.find(p => p.player_id === selectedVote)?.player_name : "..."}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Voted */}
          {hasVoted && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="text-green-600 text-center">Vote Submitted ✓</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p>You voted for: <strong>{players.find(p => p.player_id === hasVoted)?.player_name}</strong></p>
                <p className="text-sm text-muted-foreground mt-2">
                  Waiting for other players to vote...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Players */}
          <Card>
            <CardHeader>
              <CardTitle>Players</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap justify-center gap-4">
                {players.map((player) => (
                  <div key={player.id} className="flex flex-col items-center gap-2">
                    {renderPlayerIcon(player)}
                    <span className="text-sm font-medium">{player.player_name}</span>
                    <Badge variant={gameState.votes?.[player.player_id] ? "default" : "outline"}>
                      {gameState.votes?.[player.player_id] ? "Voted" : "Voting..."}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === "reveal") {
    const imposterPlayer = players.find(p => p.player_id === imposterPlayerId);
    const suspectedPlayer = players.find(p => p.player_id === gameState.suspected_imposter);
    const wasCorrect = gameState.was_imposter_caught;
    const voteCounts = gameState.vote_counts || {};
    const currentScores = gameState.scores || {};
    
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold text-primary">Results!</h1>
            <Badge variant="default" className="text-lg px-4 py-2">Round {roundNumber}</Badge>
            
            {/* Result */}
            <Card className={`border-4 ${wasCorrect ? 'border-green-500' : 'border-red-500'}`}>
              <CardContent className="pt-6 text-center space-y-4">
                <div className="text-6xl">
                  {wasCorrect ? "🎉" : "😈"}
                </div>
                <h2 className={`text-2xl font-bold ${wasCorrect ? 'text-green-600' : 'text-red-600'}`}>
                  {wasCorrect ? "Players Win!" : "Imposter Wins!"}
                </h2>
                <div className="space-y-2">
                  <p className="text-lg">
                    The imposter was: <strong className="text-red-600">{imposterPlayer?.player_name}</strong>
                  </p>
                  <p className="text-lg">
                    You suspected: <strong>{suspectedPlayer?.player_name}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reveal Prompts */}
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Normal Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{gameState.question?.normal_prompt}</p>
              </CardContent>
            </Card>
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-600">Imposter Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">{gameState.question?.imposter_prompt}</p>
              </CardContent>
            </Card>
          </div>

          {/* Vote Results */}
          <Card>
            <CardHeader>
              <CardTitle>Vote Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {players.map((player) => {
                  const votes = voteCounts[player.player_id] || 0;
                  const isImposter = player.player_id === imposterPlayerId;
                  const wasSuspected = player.player_id === gameState.suspected_imposter;
                  
                  return (
                    <div key={player.id} className={`p-4 rounded-lg border-2 ${
                      isImposter ? 'border-red-500 bg-red-50' : wasSuspected ? 'border-yellow-500 bg-yellow-50' : 'bg-muted/50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {renderPlayerIcon(player)}
                          <div>
                            <p className="font-semibold">
                              {player.player_name}
                              {isImposter && <span className="text-red-600 ml-2">🎭 IMPOSTER</span>}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              "{gameState.player_answers?.[player.player_id]}"
                            </p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{votes}</div>
                          <div className="text-sm text-muted-foreground">votes</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="w-5 h-5" />
                Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {players
                  .sort((a, b) => (currentScores[b.player_id] || 0) - (currentScores[a.player_id] || 0))
                  .map((player, index) => (
                    <div key={player.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-muted-foreground">
                        #{index + 1}
                      </div>
                      {renderPlayerIcon(player)}
                      <div className="flex-1">
                        <p className="font-semibold">{player.player_name}</p>
                      </div>
                      <div className="text-2xl font-bold text-primary">
                        {currentScores[player.player_id] || 0} ⭐
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Next Round / End Game */}
          <div className="flex gap-4 justify-center">
            {currentPlayer.is_host && (
              <>
                <Button onClick={startNewRound} size="lg" variant="default">
                  <Play className="w-5 h-5 mr-2" />
                  Next Round
                </Button>
                <Button onClick={endGame} size="lg" variant="outline">
                  <StopCircle className="w-5 h-5 mr-2" />
                  End Game
                </Button>
              </>
            )}
            {!currentPlayer.is_host && (
              <p className="text-muted-foreground">Waiting for host to start next round...</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}