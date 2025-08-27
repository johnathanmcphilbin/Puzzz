import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { useTimer } from '@/hooks/useTimer';
import {
  Users,
  Crown,
  Trophy,
  MessageSquare,
  Play,
  StopCircle,
  Clock,
  ArrowLeft,
  LogOut,
  Eye,
  EyeOff,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getCatImageUrl, STATIC_CATS } from '@/assets/catImages';
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';
import { getActivePlayers } from '@/utils/roomState';

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

export function OddOneOutGame({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}: OddOneOutGameProps) {
  const { toast } = useToast();
  const navigate = useNavigate();

  const [currentQuestion, setCurrentQuestion] =
    useState<OddOneOutQuestion | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<{
    [playerId: string]: string;
  }>({});
  const [votes, setVotes] = useState<{ [playerId: string]: string }>({});
  const [myAnswer, setMyAnswer] = useState('');
  const [selectedVote, setSelectedVote] = useState('');
  const [scores, setScores] = useState<{ [playerId: string]: number }>({});
  const [characterData, setCharacterData] = useState<{ [key: string]: any }>(
    {}
  );
  const [isSubmittingAnswer, setIsSubmittingAnswer] = useState(false);
  const [isSubmittingVote, setIsSubmittingVote] = useState(false);

  // Game state from room
  const gameState = room.game_state || {};
  const phase = gameState.phase || 'setup'; // setup, answering, voting, reveal
  const imposterPlayerId = gameState.imposter_player_id;
  const roundNumber = gameState.round_number || 1;

  // Load character data for players
  useEffect(() => {
    const loadCharacterData = async () => {
      const characterIds = players
        .map(p => p.selected_character_id)
        .filter((id): id is string => Boolean(id));
      if (characterIds.length === 0) return;

      try {
        // Use static cat list instead of Supabase database
        const characterMap = STATIC_CATS.reduce((acc, char) => {
          if (characterIds.includes(char.id)) {
            acc[char.id] = char;
          }
          return acc;
        }, {} as any);

        setCharacterData(characterMap);
      } catch (error) {
        console.error('Error loading character data:', error);
      }
    };

    loadCharacterData();
  }, [players]);

  // Timer for voting phase (60 seconds)
  const {
    time: timeLeft,
    start: startTimer,
    stop: stopTimer,
    reset: resetTimer,
  } = useTimer({ initialTime: 60 });

  useEffect(() => {
    if (phase === 'voting') {
      resetTimer(60);
      startTimer();
    } else {
      stopTimer();
    }
  }, [phase]);

  useEffect(() => {
    if (timeLeft === 0 && phase === 'voting') {
      // Auto reveal if voting time runs out
      const finalVotes = gameState.votes || {};
      revealResults(finalVotes);
    }
  }, [timeLeft, phase]);

  // Load questions and set up game state sync
  useEffect(() => {
    if (phase === 'setup' && currentPlayer.is_host) {
      loadRandomQuestion();
    }

    // Sync question from game state if not host
    if (gameState.question && !currentQuestion) {
      setCurrentQuestion(gameState.question);
    }

    // Sync other game state
    if (gameState.player_answers) {
      setPlayerAnswers(gameState.player_answers);
    }
    if (gameState.votes) {
      setVotes(gameState.votes);
    }
    if (gameState.scores) {
      setScores(gameState.scores);
    }
  }, [phase, currentPlayer.is_host, gameState]);

  const loadRandomQuestion = async () => {
    try {
      // Use fallback questions since database structure doesn't match our interface
      const fallbackQuestions = [
        {
          id: 'fallback-1',
          normal_prompt: 'Name something you might find in a kitchen',
          imposter_prompt: 'Name something you might find in a bathroom',
          category: 'household',
        },
        {
          id: 'fallback-2',
          normal_prompt: 'Name a type of vehicle',
          imposter_prompt: 'Name a type of animal',
          category: 'general',
        },
        {
          id: 'fallback-3',
          normal_prompt: 'Name something cold',
          imposter_prompt: 'Name something hot',
          category: 'temperature',
        },
        {
          id: 'fallback-4',
          normal_prompt: 'Name a type of food',
          imposter_prompt: 'Name a type of drink',
          category: 'consumables',
        },
        {
          id: 'fallback-5',
          normal_prompt: 'Name something round',
          imposter_prompt: 'Name something square',
          category: 'shapes',
        },
      ];
      const randomFallback =
        fallbackQuestions[Math.floor(Math.random() * fallbackQuestions.length)];
      if (randomFallback) {
        setCurrentQuestion(randomFallback);
      }
    } catch (error) {
      console.error('Error loading question:', error);
      toast({
        title: 'Using fallback question',
        description: 'No custom questions found for this room.',
        variant: 'destructive',
      });
    }
  };

  const startGame = async () => {
    if (!currentPlayer.is_host || !currentQuestion || players.length === 0)
      return;

    // Randomly select an imposter
    const randomImposter = players[Math.floor(Math.random() * players.length)];
    if (!randomImposter) return;

    const newGameState = {
      phase: 'answering',
      imposter_player_id: randomImposter.player_id,
      question_id: currentQuestion.id,
      question: currentQuestion,
      round_number: 1,
      player_answers: {},
      votes: {},
      scores: players.reduce(
        (acc, player) => ({ ...acc, [player.player_id]: 0 }),
        {}
      ),
    };

    await updateGameState(newGameState);

    toast({
      title: 'Game Started!',
      description: 'Everyone has received their prompt. Submit your answer!',
    });
  };

  const updateGameState = async (newState: any) => {
    try {
      // Use the Redis rooms-service instead of direct Supabase database calls
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_ANON_KEY,
          Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          action: 'update',
          roomCode: room.room_code,
          updates: {
            gameState: { ...gameState, ...newState },
          },
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        console.error(
          'Error updating game state:',
          data.error || 'Update failed'
        );
        return;
      }

      // Update local room state through the onUpdateRoom callback
      onUpdateRoom({
        ...room,
        game_state: { ...gameState, ...newState },
      });
    } catch (error) {
      console.error('Error updating game state:', error);
    }
  };

  const submitAnswer = async () => {
    if (!myAnswer.trim()) {
      toast({
        title: 'Answer Required',
        description: 'Please enter an answer before submitting.',
        variant: 'destructive',
      });
      return;
    }

    if (isSubmittingAnswer) return;

    setIsSubmittingAnswer(true);

    try {
      const updatedAnswers = {
        ...gameState.player_answers,
        [currentPlayer.player_id]: myAnswer.trim(),
      };

      // Update answers first
      await updateGameState({ player_answers: updatedAnswers });

      const totalAnswers = Object.keys(updatedAnswers).length;
      const activeCount = getActivePlayers(players as any, gameState).length;
      if (totalAnswers >= activeCount) {
        // Small delay to ensure all answer updates are processed
        setTimeout(async () => {
          try {
            await updateGameState({ phase: 'voting' });
          } catch (error) {
            console.error('Error moving to voting phase:', error);
          }
        }, 500);
      }

      setMyAnswer('');
      toast({
        title: 'Answer Submitted Successfully! ✓',
        description: 'Waiting for other players to finish...',
      });
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast({
        title: 'Submission Failed',
        description: 'Please try submitting your answer again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingAnswer(false);
    }
  };

  const submitVote = async () => {
    if (!selectedVote) {
      toast({
        title: 'Vote Required',
        description: 'Please select a player to vote for.',
        variant: 'destructive',
      });
      return;
    }

    if (isSubmittingVote) return;

    setIsSubmittingVote(true);

    try {
      const updatedVotes = {
        ...gameState.votes,
        [currentPlayer.player_id]: selectedVote,
      };

      await updateGameState({ votes: updatedVotes });

      // Check if all active players have voted
      const activeCount = getActivePlayers(players as any, gameState).length;
      if (Object.keys(updatedVotes).length === activeCount) {
        await revealResults(updatedVotes);
      }

      setSelectedVote('');
      toast({
        title: 'Vote Submitted Successfully! ✓',
        description: 'Waiting for other players to vote...',
      });
    } catch (error) {
      console.error('Error submitting vote:', error);
      toast({
        title: 'Vote Submission Failed',
        description: 'Please try voting again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingVote(false);
    }
  };

  const revealResults = async (finalVotes: { [playerId: string]: string }) => {
    console.log('[OddOneOut] reveal results with votes:', finalVotes);
    // Count votes
    const voteCounts: { [playerId: string]: number } = {};
    Object.values(finalVotes).forEach(votedFor => {
      voteCounts[votedFor] = (voteCounts[votedFor] || 0) + 1;
    });

    // Determine top votes and handle ties deterministically
    const entries = Object.entries(voteCounts);
    const maxVotes = Math.max(...entries.map(([, c]) => c));
    const topPlayers = entries
      .filter(([, c]) => c === maxVotes)
      .map(([id]) => id);

    const tie = topPlayers.length > 1;
    const suspectedImposter = topPlayers[0]; // deterministic: first by key order
    const wasImposterCaught = !tie && suspectedImposter === imposterPlayerId;

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
      // Imposter wins or tie - imposter gets +2
      newScores[imposterPlayerId] = (newScores[imposterPlayerId] || 0) + 2;
    }

    await updateGameState({
      phase: 'reveal',
      vote_counts: voteCounts,
      suspected_imposter: tie ? null : suspectedImposter,
      was_imposter_caught: wasImposterCaught,
      tie: tie,
      scores: newScores,
    });
  };

  const startNewRound = async () => {
    if (!currentPlayer.is_host || players.length === 0) return;

    // Reset for new round
    setMyAnswer('');
    setSelectedVote('');

    // Load new question and get it for syncing
    await loadRandomQuestion();

    // Wait a bit to ensure question is loaded, then get the current question
    setTimeout(async () => {
      // Select new imposter
      const randomImposter =
        players[Math.floor(Math.random() * players.length)];
      if (!randomImposter) return;

      await updateGameState({
        phase: 'answering',
        imposter_player_id: randomImposter.player_id,
        question: currentQuestion, // Sync the question to all players
        question_id: currentQuestion?.id,
        round_number: (gameState.round_number || 1) + 1,
        player_answers: {},
        votes: {},
        vote_counts: {},
        suspected_imposter: null,
        was_imposter_caught: null,
      });
    }, 100);
  };

  const leaveGame = async () => {
    try {
      // Players are now managed through Redis, so we should handle leaving properly
      // For now, just navigate away - the parent component should handle cleanup
      navigate('/');
    } catch (error) {
      console.error('Error leaving game:', error);
      navigate('/');
    }
  };

  const endGame = async () => {
    if (!currentPlayer.is_host) return;

    await updateGameState({ phase: 'setup' });
    navigate('/');
  };

  // Get player's prompt based on whether they're the imposter
  const getMyPrompt = () => {
    if (!currentQuestion) return '';
    if (currentPlayer.player_id === imposterPlayerId) {
      return currentQuestion.imposter_prompt;
    }
    return currentQuestion.normal_prompt;
  };

  const renderPlayerIcon = (player: Player, isActive = false) => {
    const playerCharacter = player.selected_character_id
      ? characterData[player.selected_character_id]
      : null;
    const catImageSrc = playerCharacter
      ? getCatImageUrl(playerCharacter.icon_url)
      : null;

    return (
      <div
        className={`relative h-8 w-8 rounded-full border-2 transition-all sm:h-12 sm:w-12 sm:border-4 md:h-16 md:w-16 ${
          isActive
            ? 'scale-110 border-primary shadow-lg'
            : 'border-muted-foreground/20'
        }`}
      >
        {playerCharacter && catImageSrc ? (
          <div className="h-full w-full overflow-hidden rounded-full bg-white">
            <img
              src={catImageSrc}
              alt={playerCharacter.name}
              className="h-full w-full object-contain p-0.5"
              loading="eager"
              onError={e => {
                console.error('Failed to load cat image:', catImageSrc);
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground sm:text-sm">
            {player.player_name.charAt(0).toUpperCase()}
          </div>
        )}
        {player.is_host && (
          <Crown className="absolute -right-1 -top-1 h-3 w-3 text-yellow-500 sm:-right-2 sm:-top-2 sm:h-6 sm:w-6" />
        )}
      </div>
    );
  };

  if (phase === 'setup') {
    return (
      <div className="gradient-bg min-h-screen p-2 sm:p-4">
        <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="text-center sm:text-left">
              <img
                src="/src/assets/odd-one-out.png"
                alt="Odd One Out"
                className="mx-auto h-16 sm:mx-0 sm:h-20"
              />
              <p className="mt-2 text-sm text-muted-foreground sm:text-base">
                Find the hidden imposter
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 sm:justify-end">
              <Button variant="outline" size="sm" onClick={() => navigate('/')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Back to Lobby</span>
                <span className="sm:hidden">Back</span>
              </Button>
              <Button variant="outline" size="sm" onClick={leaveGame}>
                <LogOut className="mr-2 h-4 w-4" />
                <span className="hidden sm:inline">Leave Game</span>
                <span className="sm:hidden">Leave</span>
              </Button>
            </div>
          </div>

          {/* Quick Rules */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="space-y-2 text-center sm:space-y-3">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  Everyone gets the same prompt except one secret{' '}
                  <strong>Imposter</strong> who gets a different one. Answer the
                  prompt, then vote to find the Imposter!
                </p>
                <div className="flex justify-center gap-2 text-xs sm:gap-4">
                  <span className="text-green-600">
                    Find Imposter: +1⭐ each
                  </span>
                  <span className="text-red-600">Imposter wins: +2⭐</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Players */}
          <Card>
            <CardContent className="pt-4 sm:pt-6">
              <div className="grid grid-cols-2 justify-center gap-2 sm:flex sm:flex-wrap sm:gap-3">
                {players.map(player => (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-1 rounded-lg bg-muted p-2 sm:flex-row sm:gap-2 sm:px-3 sm:py-2"
                  >
                    <div className="flex items-center gap-1 sm:gap-2">
                      {renderPlayerIcon(player)}
                      <div className="text-center sm:text-left">
                        <span className="block text-xs font-medium sm:text-sm">
                          {player.player_name}
                        </span>
                        {player.is_host && (
                          <Crown className="mx-auto h-3 w-3 text-amber-500 sm:mx-0" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Start Game */}
          {currentPlayer.is_host && (
            <Card>
              <CardContent className="pt-4 sm:pt-6">
                <div className="text-center">
                  <Button
                    onClick={startGame}
                    size="lg"
                    disabled={players.length < 3 || !currentQuestion}
                    className="w-full max-w-md"
                  >
                    <Play className="mr-2 h-4 w-4 sm:h-5 sm:w-5" />
                    Start Odd One Out
                  </Button>
                  {players.length < 3 && (
                    <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
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

  if (phase === 'answering') {
    const isImposter = currentPlayer.player_id === imposterPlayerId;
    const myPrompt = getMyPrompt();
    const answeredCount = Object.keys(gameState.player_answers || {}).length;

    return (
      <div className="gradient-bg min-h-screen p-2 sm:p-4">
        <div className="mx-auto max-w-2xl space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">
              Round {roundNumber}
            </h1>
            <div className="flex items-center justify-center gap-2">
              <Badge variant="default" className="text-xs sm:text-sm">
                🕵️ Find the odd one out
              </Badge>
            </div>
            <Progress
              value={
                (answeredCount /
                  getActivePlayers(players as any, gameState).length) *
                100
              }
              className="w-full"
            />
            <p className="text-xs text-muted-foreground sm:text-sm">
              {answeredCount} of{' '}
              {getActivePlayers(players as any, gameState).length} active
              players have answered
            </p>
          </div>

          {/* Your Prompt */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Your Prompt</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="rounded-lg bg-muted p-3 text-base font-medium sm:p-4 sm:text-lg">
                {myPrompt}
              </p>
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
                    onChange={e => setMyAnswer(e.target.value)}
                    placeholder="Type your answer here..."
                    className="mt-2"
                    rows={3}
                  />
                </div>
                <Button
                  onClick={submitAnswer}
                  className="w-full"
                  disabled={!myAnswer.trim() || isSubmittingAnswer}
                >
                  {isSubmittingAnswer ? 'Submitting...' : 'Submit Answer'}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Submitted Answer */}
          {gameState.player_answers?.[currentPlayer.player_id] && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="text-green-600">
                  Answer Submitted ✓
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">
                  "{gameState.player_answers[currentPlayer.player_id]}"
                </p>
                <p className="mt-2 text-sm text-muted-foreground">
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
              <div className="grid grid-cols-2 justify-center gap-2 sm:flex sm:flex-wrap sm:gap-4">
                {players.map(player => (
                  <div
                    key={player.id}
                    className="flex flex-col items-center gap-1 sm:gap-2"
                  >
                    {renderPlayerIcon(
                      player,
                      gameState.player_answers?.[player.player_id]
                    )}
                    <span className="text-center text-xs font-medium sm:text-sm">
                      {player.player_name}
                    </span>
                    <Badge
                      variant={
                        gameState.player_answers?.[player.player_id]
                          ? 'default'
                          : 'outline'
                      }
                      className="text-xs"
                    >
                      {gameState.player_answers?.[player.player_id]
                        ? 'Done'
                        : 'Thinking...'}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Leave Game Button */}
          <div className="text-center">
            <Button variant="outline" onClick={leaveGame} className="mt-4">
              <LogOut className="mr-2 h-4 w-4" />
              Leave Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'voting') {
    const hasVoted = gameState.votes?.[currentPlayer.player_id];
    const voteCount = Object.keys(gameState.votes || {}).length;

    return (
      <div className="gradient-bg min-h-screen p-2 sm:p-4">
        <div className="mx-auto max-w-4xl space-y-4 sm:space-y-6">
          {/* Header */}
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-bold text-primary sm:text-3xl">
              Who's the Imposter?
            </h1>
            <div className="flex items-center justify-center gap-2 sm:gap-4">
              <Badge variant="default">Round {roundNumber}</Badge>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{timeLeft}s</span>
              </div>
            </div>
            <Progress
              value={
                (voteCount /
                  getActivePlayers(players as any, gameState).length) *
                100
              }
              className="mx-auto w-full max-w-md"
            />
            <p className="text-xs text-muted-foreground sm:text-sm">
              {voteCount} of{' '}
              {getActivePlayers(players as any, gameState).length} active
              players have voted
            </p>
          </div>

          {/* All Answers Display */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">All Answers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:gap-4">
                {players.map(player => {
                  const answer = gameState.player_answers?.[player.player_id];

                  return (
                    <div
                      key={player.id}
                      className="rounded-lg border bg-muted/50 p-3 sm:p-4"
                    >
                      <div className="flex items-center gap-2 sm:gap-3">
                        <div className="h-8 w-8 sm:h-12 sm:w-12">
                          {renderPlayerIcon(player)}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold sm:text-base">
                            {player.player_name}
                          </p>
                          <p className="text-sm font-medium text-primary sm:text-lg">
                            "{answer}"
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Voting */}
          {!hasVoted && (
            <Card>
              <CardHeader>
                <CardTitle className="text-center">
                  Vote for the Imposter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-4">
                  {players.map(player => (
                    <button
                      key={player.id}
                      onClick={() => setSelectedVote(player.player_id)}
                      className={`rounded-lg border-2 p-2 transition-all sm:p-4 ${
                        selectedVote === player.player_id
                          ? 'border-primary bg-primary/10'
                          : 'border-muted-foreground/20 hover:border-muted-foreground/40'
                      }`}
                    >
                      <div className="flex flex-col items-center gap-1 sm:gap-2">
                        {renderPlayerIcon(player)}
                        <span className="text-center text-xs font-medium sm:text-sm">
                          {player.player_name}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
                <Button
                  onClick={submitVote}
                  className="mt-4 w-full sm:mt-6"
                  size="lg"
                  disabled={!selectedVote || isSubmittingVote}
                >
                  {isSubmittingVote
                    ? 'Submitting Vote...'
                    : `Vote for ${selectedVote ? players.find(p => p.player_id === selectedVote)?.player_name : '...'}`}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Voted */}
          {hasVoted && (
            <Card className="border-green-500">
              <CardHeader>
                <CardTitle className="text-center text-green-600">
                  Vote Submitted ✓
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <p className="text-sm sm:text-base">
                  You voted for:{' '}
                  <strong>
                    {players.find(p => p.player_id === hasVoted)?.player_name}
                  </strong>
                </p>
                <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                  Waiting for other players to vote...
                </p>
              </CardContent>
            </Card>
          )}

          {/* Leave Game Button */}
          <div className="text-center">
            <Button variant="outline" onClick={leaveGame} className="mt-4">
              <LogOut className="mr-2 h-4 w-4" />
              Leave Game
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (phase === 'reveal') {
    const imposterPlayer = players.find(p => p.player_id === imposterPlayerId);
    const suspectedPlayer = players.find(
      p => p.player_id === gameState.suspected_imposter
    );
    const wasCorrect = gameState.was_imposter_caught;
    const voteCounts = gameState.vote_counts || {};
    const currentScores = gameState.scores || {};

    return (
      <div className="gradient-bg min-h-screen p-4">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Header */}
          <div className="space-y-4 text-center">
            <h1 className="text-4xl font-bold text-primary">Results!</h1>
            <Badge variant="default" className="px-4 py-2 text-lg">
              Round {roundNumber}
            </Badge>

            {/* Result */}
            <Card
              className={`border-4 ${wasCorrect ? 'border-green-500' : 'border-red-500'}`}
            >
              <CardContent className="space-y-4 pt-6 text-center">
                <div className="text-6xl">{wasCorrect ? '🎉' : '😈'}</div>
                <h2
                  className={`text-2xl font-bold ${wasCorrect ? 'text-green-600' : 'text-red-600'}`}
                >
                  {wasCorrect ? 'Players Win!' : 'Imposter Wins!'}
                </h2>
                <div className="space-y-2">
                  <p className="text-lg">
                    The imposter was:{' '}
                    <strong className="text-red-600">
                      {imposterPlayer?.player_name}
                    </strong>
                  </p>
                  <p className="text-lg">
                    You suspected:{' '}
                    <strong>{suspectedPlayer?.player_name}</strong>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Reveal Prompts */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-green-600">Normal Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">
                  {gameState.question?.normal_prompt}
                </p>
              </CardContent>
            </Card>
            <Card className="border-red-500">
              <CardHeader>
                <CardTitle className="text-red-600">Imposter Prompt</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-lg font-medium">
                  {gameState.question?.imposter_prompt}
                </p>
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
                {players.map(player => {
                  const votes = voteCounts[player.player_id] || 0;
                  const isImposter = player.player_id === imposterPlayerId;
                  const wasSuspected =
                    player.player_id === gameState.suspected_imposter;

                  return (
                    <div
                      key={player.id}
                      className={`rounded-lg border-2 p-4 ${
                        isImposter
                          ? 'border-red-500 bg-red-50'
                          : wasSuspected
                            ? 'border-yellow-500 bg-yellow-50'
                            : 'bg-muted/50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {renderPlayerIcon(player)}
                          <div>
                            <p className="font-semibold">
                              {player.player_name}
                              {isImposter && (
                                <span className="ml-2 text-red-600">
                                  🎭 IMPOSTER
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              "{gameState.player_answers?.[player.player_id]}"
                            </p>
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-2xl font-bold">{votes}</div>
                          <div className="text-sm text-muted-foreground">
                            votes
                          </div>
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
                <Trophy className="h-5 w-5" />
                Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {players
                  .sort(
                    (a, b) =>
                      (currentScores[b.player_id] || 0) -
                      (currentScores[a.player_id] || 0)
                  )
                  .map((player, index) => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-lg bg-muted/50 p-3"
                    >
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
          <div className="flex justify-center gap-4">
            {currentPlayer.is_host && (
              <>
                <Button onClick={startNewRound} size="lg" variant="default">
                  <Play className="mr-2 h-5 w-5" />
                  Next Round
                </Button>
                <Button onClick={endGame} size="lg" variant="outline">
                  <StopCircle className="mr-2 h-5 w-5" />
                  End Game
                </Button>
              </>
            )}
            {!currentPlayer.is_host && (
              <p className="text-muted-foreground">
                Waiting for host to start next round...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
