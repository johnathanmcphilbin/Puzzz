import {
  ChevronRight,
  Users,
  RotateCcw,
  Trophy,
  Clock,
  ArrowLeft,
  LogOut,
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getCatImageUrl } from '@/assets/catImages';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { useTimer } from '@/hooks/useTimer';
import { supabase } from '@/integrations/supabase/client';
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

interface Question {
  id: string;
  option_a: string;
  option_b: string;
  created_at?: string;
}

interface WouldYouRatherGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

export const WouldYouRatherGame = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}: WouldYouRatherGameProps) => {
  const navigate = useNavigate();
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [aiQuestions, setAiQuestions] = useState<Question[]>([]);
  const [questionQueue, setQuestionQueue] = useState<Question[]>([]);
  const [isPreloadingNext, setIsPreloadingNext] = useState(false);
  const [characterData, setCharacterData] = useState<{ [key: string]: any }>(
    {}
  );
  const { toast } = useToast();

  const gameState = room.game_state || {};
  const showResults = gameState.showResults || false;
  const questionIndex = gameState.questionIndex || 0;

  // Timer for voting phase
  const votingTimer = useTimer({
    initialTime: 30,
    onTimeUp: () => {
      if (!hasVoted && !showResults && currentQuestion) {
        toast({
          title: "Time's up!",
          description: 'Voting time expired - selecting random option',
          variant: 'destructive',
        });
        // Auto-vote random option
        const randomOption = Math.random() < 0.5 ? 'A' : 'B';
        vote(randomOption);
      }
    },
  });

  // Timer management effects (local) and sync from host
  useEffect(() => {
    if (currentQuestion && !hasVoted && !showResults) {
      // If host provided a synchronized start time, align timer
      if (gameState.votingStartTime) {
        const elapsed = Math.floor(
          (Date.now() - gameState.votingStartTime) / 1000
        );
        const remaining = Math.max(0, 30 - elapsed);
        if (remaining > 0) votingTimer.restart(remaining);
        else votingTimer.stop();
      } else {
        votingTimer.restart();
      }
    } else {
      votingTimer.stop();
    }
  }, [currentQuestion, hasVoted, showResults, gameState.votingStartTime]);

  useEffect(() => {
    loadCurrentQuestion();
    loadVotes();
    loadCharacterData();

    // Check if current player has voted
    const playerVoted = Object.keys(gameState.votes || {}).includes(
      currentPlayer.player_id
    );
    setHasVoted(playerVoted);
  }, [room.game_state, currentPlayer.player_id]);

  const loadCurrentQuestion = async () => {
    if (gameState.currentQuestion) {
      setCurrentQuestion(gameState.currentQuestion);
      return;
    }

    // Load a random question if none is set
    if (currentPlayer.is_host) {
      await loadNextQuestion();
    }
  };

  const loadVotes = async () => {
    try {
      // Votes are now stored within the room's gameState in Redis
      const votesMap = gameState.votes || {};
      setVotes(votesMap);
    } catch (error) {
      console.error('Error loading votes:', error);
    }
  };

  const loadCharacterData = async () => {
    const characterIds = players
      .map(p => p.selected_character_id)
      .filter((id): id is string => Boolean(id));
    if (characterIds.length === 0) return;

    try {
      const { data, error } = await supabase
        .from('cat_characters')
        .select('*')
        .in('id', characterIds);

      if (error) throw error;

      const characterMap =
        data?.reduce((acc, char) => {
          acc[char.id] = char;
          return acc;
        }, {} as any) || {};

      setCharacterData(characterMap);
    } catch (error) {
      console.error('Error loading character data:', error);
    }
  };

  const preloadMoreQuestions = async () => {
    if (isPreloadingNext) return;

    setIsPreloadingNext(true);
    try {
      const newQuestions = await loadQuestions();
      setQuestionQueue(prev => [...prev, ...newQuestions]);
    } catch (error) {
      console.error('Error preloading questions:', error);
    } finally {
      setIsPreloadingNext(false);
    }
  };

  const generateAIQuestions = async () => {
    // AI question generation is no longer available - use default questions
    return [];
  };

  const loadQuestions = async (): Promise<Question[]> => {
    // Debug: Log the entire gameState to see what's available
    console.log(
      '[WouldYouRatherGame] Full gameState for debugging:',
      JSON.stringify(gameState, null, 2)
    );

    // Check if AI-generated questions exist in the expected location first
    if (gameState.aiQuestions && gameState.aiQuestions.length > 0) {
      console.log(
        '[WouldYouRatherGame] Using AI-generated Would You Rather questions (gameState.aiQuestions):',
        gameState.aiQuestions.length
      );
      console.log(
        '[WouldYouRatherGame] AI Questions content:',
        gameState.aiQuestions
      );
      return gameState.aiQuestions;
    }

    // Backwards-compatibility: handle older property names
    if (
      gameState.wouldYouRatherQuestions &&
      gameState.wouldYouRatherQuestions.length > 0
    ) {
      console.log(
        '[WouldYouRatherGame] Using legacy property gameState.wouldYouRatherQuestions:',
        gameState.wouldYouRatherQuestions.length
      );
      return gameState.wouldYouRatherQuestions;
    }

    // Handle customQuestions structure used by other game types
    if (
      gameState.customQuestions?.would_you_rather &&
      gameState.customQuestions.would_you_rather.length > 0
    ) {
      console.log(
        '[WouldYouRatherGame] Using customQuestions.would_you_rather from gameState.customQuestions:',
        gameState.customQuestions.would_you_rather.length
      );
      return gameState.customQuestions.would_you_rather;
    }

    // Fall back to database questions if no AI questions found
    console.log(
      '[WouldYouRatherGame] No AI questions found, falling back to database questions'
    );
    const { data: questionsData, error: questionsError } = await supabase
      .from('would_you_rather_questions')
      .select('*');

    if (questionsError) throw questionsError;

    return (questionsData || []).map(q => ({
      ...q,
      created_at: q.created_at || new Date().toISOString(),
    }));
  };

  const [isLoadingNext, setIsLoadingNext] = useState(false);

  const loadNextQuestion = async () => {
    if (!currentPlayer.is_host || isLoadingNext) return;

    setIsLoadingNext(true);
    try {
      // Clear votes for new question
      const newVotes = {};
      setVotes(newVotes);

      // Get available questions - prioritize AI questions if they exist
      const availableQuestions = await loadQuestions();

      if (!availableQuestions || availableQuestions.length === 0) {
        toast({
          title: 'No Questions Available',
          description: 'Could not load a new question',
          variant: 'destructive',
        });
        return;
      }

      const randomQuestion =
        availableQuestions[
          Math.floor(Math.random() * availableQuestions.length)
        ];

      const newGameStatePatch = {
        currentQuestion: randomQuestion,
        votes: newVotes,
        showResults: false,
        votingStartTime: Date.now(),
      };

      await onUpdateRoom({ gameState: newGameStatePatch } as any);

      if (randomQuestion) setCurrentQuestion(randomQuestion);
      setHasVoted(false);
    } catch (error) {
      console.error('Error loading next question:', error);
      toast({
        title: 'Error',
        description: 'Failed to load next question',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingNext(false);
    }
  };

  const vote = async (option: 'A' | 'B') => {
    if (!currentQuestion || hasVoted) return;

    try {
      // Update votes in the room's gameState in Redis
      const newVotes = { ...votes, [currentPlayer.player_id]: option };
      setVotes(newVotes);
      setHasVoted(true);

      const updatedGameState = {
        ...gameState,
        votes: newVotes,
        currentQuestion,
      };

      await onUpdateRoom({
        gameState: {
          votes: newVotes,
          currentQuestion,
        },
      } as any);
      // no-op error handling here; onUpdateRoom shows toast on failure via useRoom

      toast({
        title: 'Vote Recorded!',
        description: `You voted for option ${option}`,
        className: 'bg-success text-success-foreground',
      });

      if (currentPlayer.is_host) {
        setTimeout(async () => {
          const finalVotes = { ...newVotes };
          const resultsGameState = {
            ...gameState,
            votes: finalVotes,
            showResults: true,
          };
          console.log('[WouldYouRather] host reveal triggered');

          await onUpdateRoom({
            gameState: resultsGameState,
          } as any);
        }, 3000);
      }
    } catch (error) {
      console.error('Error voting:', error);
      toast({
        title: 'Error',
        description: 'Failed to record vote',
        variant: 'destructive',
      });
    }
  };

  const showResultsHandler = async () => {
    if (!currentPlayer.is_host) return;

    await onUpdateRoom({
      gameState: {
        showResults: true,
      },
    } as any);
  };

  const backToLobby = async () => {
    await onUpdateRoom({
      gameState: {
        phase: 'lobby',
      },
    } as any);
  };

  const transferHostAndLeave = async () => {
    if (!currentPlayer.is_host || players.length <= 1) {
      await playerLeave();
      return;
    }

    try {
      const otherPlayers = players.filter(
        p => p.player_id !== currentPlayer.player_id
      );
      const nextHost = otherPlayers[0];

      if (nextHost) {
        // Update players list and host through Redis
        const updatedPlayers = players
          .map(p => ({
            ...p,
            isHost: p.player_id === nextHost.player_id,
          }))
          .filter(p => p.player_id !== currentPlayer.player_id);

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
              hostId: nextHost.player_id,
              players: updatedPlayers,
            },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to transfer host');
        }
      }

      localStorage.removeItem('puzzz_player_id');
      localStorage.removeItem('puzzz_player_name');
      navigate('/');
    } catch (error) {
      console.error('Error transferring host:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave room',
        variant: 'destructive',
      });
    }
  };

  const playerLeave = async () => {
    try {
      // Remove player from the room
      const updatedPlayers = players.filter(
        p => p.player_id !== currentPlayer.player_id
      );

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
          updates: { players: updatedPlayers },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to leave room');
      }

      localStorage.removeItem('puzzz_player_id');
      localStorage.removeItem('puzzz_player_name');
      navigate('/');
    } catch (error) {
      console.error('Error leaving room:', error);
      toast({
        title: 'Error',
        description: 'Failed to leave room',
        variant: 'destructive',
      });
    }
  };

  if (!currentQuestion) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-lg text-muted-foreground">Loading question...</p>
        </div>
      </div>
    );
  }

  const optionAVotes = Object.values(votes).filter(vote => vote === 'A').length;
  const optionBVotes = Object.values(votes).filter(vote => vote === 'B').length;
  const totalVotes = optionAVotes + optionBVotes;
  const optionAPercentage =
    totalVotes > 0 ? (optionAVotes / totalVotes) * 100 : 0;
  const optionBPercentage =
    totalVotes > 0 ? (optionBVotes / totalVotes) * 100 : 0;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {/* Host Controls */}
        {currentPlayer.is_host && (
          <div className="fixed left-16 top-4 z-50 flex gap-2">
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
                    Are you sure you want to return everyone to the lobby? This
                    will end the current game.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button onClick={backToLobby} size="sm">
                      Yes, Return to Lobby
                    </Button>
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
                    Are you sure you want to leave? Another player will become
                    the new host.
                  </p>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button
                      onClick={transferHostAndLeave}
                      variant="destructive"
                      size="sm"
                    >
                      Yes, Leave Game
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Regular Player Controls */}
        {!currentPlayer.is_host && (
          <div className="fixed left-16 top-4 z-50">
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
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm">
                      Cancel
                    </Button>
                    <Button
                      onClick={playerLeave}
                      variant="destructive"
                      size="sm"
                    >
                      Yes, Leave Game
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex items-center justify-center gap-4">
            <Trophy className="h-6 w-6 text-warning" />
            <h1 className="text-3xl font-bold text-foreground">
              Would You Rather
            </h1>
            <Badge variant="outline" className="text-sm">
              Question {questionIndex}
            </Badge>
          </div>
          <div className="room-code text-lg">{room.room_code}</div>
          <div className="mt-2 flex items-center justify-center gap-2">
            <Users className="h-4 w-4" />
            <span className="text-muted-foreground">
              {players.length} players
            </span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">
              {totalVotes}/{players.length} voted
            </span>
          </div>
        </div>

        {/* Question Card */}
        <Card className="mb-8">
          <CardContent className="p-8">
            {/* Timer for voting */}
            {!hasVoted && !showResults && votingTimer.isRunning && (
              <div className="mb-6 space-y-2 text-center">
                <div className="flex items-center justify-center gap-2 text-destructive">
                  <Clock className="h-4 w-4" />
                  <span className="font-mono text-lg">
                    {votingTimer.formatTime}
                  </span>
                </div>
                <Progress
                  value={(votingTimer.time / 30) * 100}
                  className="mx-auto h-2 max-w-xs"
                />
              </div>
            )}

            <div className="mb-8 text-center">
              <h2 className="mb-4 text-2xl font-bold text-foreground">
                Would you rather...
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Option A */}
              <Card
                className={`cursor-pointer transition-all ${
                  hasVoted && votes[currentPlayer.player_id] === 'A'
                    ? 'ring-2 ring-game-option-a'
                    : ''
                } ${hasVoted ? 'opacity-75' : 'hover:shadow-lg'}`}
                onClick={() => !hasVoted && vote('A')}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-game-option-a text-xl font-bold text-white">
                      A
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      {currentQuestion.option_a}
                    </p>

                    {showResults && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{optionAVotes} votes</span>
                          <span>{Math.round(optionAPercentage)}%</span>
                        </div>
                        <Progress value={optionAPercentage} className="h-2" />
                        <div className="flex flex-wrap justify-center gap-1">
                          {Object.entries(votes)
                            .filter(([_, vote]) => vote === 'A')
                            .map(([playerId, _]) => {
                              const player = players.find(
                                p => p.player_id === playerId
                              );
                              const playerCharacter =
                                player?.selected_character_id
                                  ? characterData[player.selected_character_id]
                                  : null;
                              return (
                                <div
                                  key={playerId}
                                  className="flex items-center gap-1"
                                >
                                  {playerCharacter ? (
                                    <div className="h-5 w-5 overflow-hidden rounded-full bg-white">
                                      <img
                                        src={getCatImageUrl(
                                          playerCharacter.icon_url
                                        )}
                                        alt={playerCharacter.name}
                                        className="h-full w-full object-contain p-0.5"
                                        loading="eager"
                                      />
                                    </div>
                                  ) : null}
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {player?.player_name || playerId}
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Option B */}
              <Card
                className={`cursor-pointer transition-all ${
                  hasVoted && votes[currentPlayer.player_id] === 'B'
                    ? 'ring-2 ring-game-option-b'
                    : ''
                } ${hasVoted ? 'opacity-75' : 'hover:shadow-lg'}`}
                onClick={() => !hasVoted && vote('B')}
              >
                <CardContent className="p-6">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-game-option-b text-xl font-bold text-white">
                      B
                    </div>
                    <p className="text-lg font-medium text-foreground">
                      {currentQuestion.option_b}
                    </p>

                    {showResults && (
                      <div className="mt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>{optionBVotes} votes</span>
                          <span>{Math.round(optionBPercentage)}%</span>
                        </div>
                        <Progress value={optionBPercentage} className="h-2" />
                        <div className="flex flex-wrap justify-center gap-1">
                          {Object.entries(votes)
                            .filter(([_, vote]) => vote === 'B')
                            .map(([playerId, _]) => {
                              const player = players.find(
                                p => p.player_id === playerId
                              );
                              const playerCharacter =
                                player?.selected_character_id
                                  ? characterData[player.selected_character_id]
                                  : null;
                              return (
                                <div
                                  key={playerId}
                                  className="flex items-center gap-1"
                                >
                                  {playerCharacter ? (
                                    <div className="h-5 w-5 overflow-hidden rounded-full bg-white">
                                      <img
                                        src={getCatImageUrl(
                                          playerCharacter.icon_url
                                        )}
                                        alt={playerCharacter.name}
                                        className="h-full w-full object-contain p-0.5"
                                        loading="eager"
                                      />
                                    </div>
                                  ) : null}
                                  <Badge
                                    variant="secondary"
                                    className="text-xs"
                                  >
                                    {player?.player_name || playerId}
                                  </Badge>
                                </div>
                              );
                            })}
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Voting Status */}
            {!showResults && (
              <div className="mt-6 text-center">
                {hasVoted ? (
                  <p className="text-muted-foreground">
                    Waiting for other players to vote... ({totalVotes}/
                    {players.length})
                  </p>
                ) : (
                  <p className="text-muted-foreground">
                    Click an option to vote!
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          {currentPlayer.is_host && (
            <>
              {!showResults && totalVotes > 0 && (
                <Button onClick={showResultsHandler} variant="outline">
                  Show Results
                </Button>
              )}

              {showResults && (
                <>
                  <Button
                    onClick={generateAIQuestions}
                    disabled={isLoading}
                    variant="outline"
                    className="gap-2"
                  >
                    {isLoading ? 'Generating...' : 'Generate New AI Questions'}
                  </Button>
                  <Button
                    onClick={loadNextQuestion}
                    disabled={isLoading}
                    className="gap-2"
                  >
                    {isLoading ? (
                      'Loading...'
                    ) : (
                      <>
                        <ChevronRight className="h-4 w-4" />
                        Next Question
                      </>
                    )}
                  </Button>
                </>
              )}
            </>
          )}

          <Button variant="outline" onClick={backToLobby} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Back to Lobby
          </Button>
        </div>
      </div>
    </div>
  );
};
