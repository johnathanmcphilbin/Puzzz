import { Crown, Users, CheckCircle, XCircle, Sparkles } from 'lucide-react';
import React, { useState, useEffect, useCallback } from 'react';

import { getCatImageUrl } from '@/assets/catImages';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface Question {
  id: string;
  image: string;
  options: string[];
  correctAnswer: string;
}

interface Player {
  id: string;
  player_id: string;
  player_name: string;
  is_host: boolean;
  room_id: string;
  joined_at: string;
  selected_character_id?: string;
}

interface CatCharacter {
  id: string;
  name: string;
  icon_url: string | null;
}

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface DemoDayGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (updates: Partial<Room>) => Promise<void>;
}

// Single Tim question with specific options
const timQuestion: Question = {
  id: 'tim',
  image: '/6.png',
  options: ['Tim', 'Patrick Walsh', 'Lucy Daly', 'Lynetta Wang'],
  correctAnswer: 'Tim',
};

type GamePhase = 'waiting' | 'question' | 'results' | 'ai-chat' | 'finished';

interface AIResponse {
  response: string;
  playerName: string;
  timestamp: string;
}

export const DemoDayGame: React.FC<DemoDayGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}) => {
  const [gamePhase, setGamePhase] = useState<GamePhase>('waiting');
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, string>>(
    {}
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [characterData, setCharacterData] = useState<
    Record<string, CatCharacter>
  >({});
  const [showResults, setShowResults] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const { toast } = useToast();

  const isHost = currentPlayer.is_host;
  const allPlayersAnswered =
    Object.keys(playerAnswers).length === players.length;

  // Sync game state from room
  useEffect(() => {
    if (room.game_state) {
      if (room.game_state.gamePhase) {
        setGamePhase(room.game_state.gamePhase);
      }
      if (room.game_state.scores) {
        setScores(room.game_state.scores);
      }
      if (room.game_state.playerAnswers) {
        setPlayerAnswers(room.game_state.playerAnswers);
      }
      if (room.game_state.showResults) {
        setShowResults(room.game_state.showResults);
      }
      if (room.game_state.aiResponse) {
        setAiResponse(room.game_state.aiResponse);
      }
    }
  }, [room.game_state]);

  // Load cat characters
  useEffect(() => {
    const loadCharacters = async () => {
      try {
        const { data, error } = await supabase
          .from('cat_characters')
          .select('*');

        if (error) {
          console.error('Error loading characters:', error);
          return;
        }

        const charactersMap: Record<string, CatCharacter> = {};
        data?.forEach(char => {
          if (char.icon_url) {
            charactersMap[char.id] = char as CatCharacter;
          }
        });
        setCharacterData(charactersMap);
      } catch (error) {
        console.error('Error loading characters:', error);
      }
    };

    loadCharacters();
  }, []);

  // Auto-show results when all players answered (host only)
  useEffect(() => {
    if (
      isHost &&
      gamePhase === 'question' &&
      allPlayersAnswered &&
      Object.keys(playerAnswers).length > 0
    ) {
      setTimeout(() => handleShowResults(), 500);
    }
  }, [playerAnswers, gamePhase, allPlayersAnswered, isHost]);

  const updateGameState = useCallback(
    async (updates: any) => {
      await onUpdateRoom({
        game_state: {
          ...room.game_state,
          ...updates,
        },
      });
    },
    [onUpdateRoom, room.game_state]
  );

  const startGame = async () => {
    const initialState = {
      phase: 'question',
      gamePhase: 'question',
      scores: {},
      playerAnswers: {},
      showResults: false,
      aiResponse: null,
    };

    await updateGameState(initialState);
  };

  const handleAnswerSelect = async (answer: string) => {
    if (selectedAnswer || gamePhase !== 'question') return;

    setSelectedAnswer(answer);
    const newAnswers = { ...playerAnswers, [currentPlayer.player_id]: answer };

    await updateGameState({
      playerAnswers: newAnswers,
    });
  };

  const handleShowResults = async () => {
    // Calculate scores
    const newScores = { ...scores };
    Object.entries(playerAnswers).forEach(([playerId, answer]) => {
      if (answer === timQuestion.correctAnswer) {
        newScores[playerId] = (newScores[playerId] || 0) + 1;
      }
    });

    await updateGameState({
      gamePhase: 'results',
      scores: newScores,
      showResults: true,
    });

    // Don't auto-advance anymore - let host manually end the demo
  };

  const endDemo = async () => {
    await updateGameState({
      phase: 'lobby',
      gamePhase: 'waiting',
      scores: {},
      playerAnswers: {},
      showResults: false,
      aiResponse: null,
    });
  };

  const resetGame = async () => {
    await updateGameState({
      phase: 'lobby',
      gamePhase: 'waiting',
      scores: {},
      playerAnswers: {},
      showResults: false,
      aiResponse: null,
    });
  };

  if (gamePhase === 'waiting') {
    return (
      <div className="gradient-bg min-h-screen p-6">
        <div className="mx-auto max-w-4xl">
          <div className="animate-fade-in mb-8 text-center">
            <h1 className="mb-4 text-5xl font-bold text-primary">Demo Day</h1>
            <h2 className="mb-6 text-2xl text-muted-foreground">
              Interactive Team Quiz
            </h2>

            <Card className="mb-6 border-2">
              <CardContent className="p-8">
                <div className="mb-6 flex items-center justify-center gap-4">
                  <Users className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-semibold">
                    {players.length} Players Ready
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {players.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center gap-3 rounded-lg bg-muted p-4"
                    >
                      {player.is_host && (
                        <Crown className="h-5 w-5 text-yellow-500" />
                      )}
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                        {player.player_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isHost && (
              <Button
                onClick={startGame}
                size="lg"
                className="animate-scale-in px-12 py-6 text-xl"
              >
                <Sparkles className="mr-3 h-6 w-6" />
                Start Demo Day Experience
              </Button>
            )}

            {!isHost && (
              <p className="animate-pulse text-lg text-muted-foreground">
                Waiting for host to start the demo day experience...
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === 'finished') {
    const sortedScores = Object.entries(scores)
      .map(([playerId, score]) => ({
        player: players.find(p => p.player_id === playerId),
        score,
      }))
      .sort((a, b) => b.score - a.score);

    return (
      <div className="gradient-bg min-h-screen p-6">
        <div className="animate-fade-in mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-5xl font-bold text-primary">
            Demo Day Complete! 🎉
          </h1>
          <h2 className="mb-8 text-2xl text-muted-foreground">Final Results</h2>

          <Card className="mb-8 border-2">
            <CardContent className="p-8">
              <h3 className="mb-6 text-2xl font-semibold">Leaderboard</h3>
              <div className="space-y-4">
                {sortedScores.map((item, index) => (
                  <div
                    key={item.player?.player_id}
                    className="flex items-center justify-between rounded-lg bg-muted p-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">{index + 1}.</span>
                      {index === 0 && (
                        <Crown className="h-6 w-6 text-yellow-500" />
                      )}
                      <span className="text-lg font-medium">
                        {item.player?.player_name}
                      </span>
                    </div>
                    <span className="text-xl font-bold">{item.score}/1</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isHost && (
            <Button
              onClick={resetGame}
              size="lg"
              className="px-12 py-6 text-xl"
            >
              Play Again
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="gradient-bg min-h-screen p-6">
      <div className="mx-auto max-w-4xl">
        <div className="animate-fade-in mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-primary">
            Demo Day Quiz
          </h1>
          <div className="mb-6 text-lg">Who is this person?</div>
        </div>

        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center">
            <img
              src={timQuestion.image}
              alt="Demo Day quiz - identify this team member"
              className="animate-fade-in mx-auto mb-8 h-80 w-80 rounded-lg bg-white/10 object-contain shadow-lg"
            />

            <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
              {timQuestion.options.map((option: string, index: number) => {
                const isCorrect = option === timQuestion.correctAnswer;
                const isSelected = selectedAnswer === option;
                const showResultsNow = showResults;

                let buttonVariant:
                  | 'default'
                  | 'destructive'
                  | 'outline'
                  | 'secondary' = 'outline';
                let buttonClassName =
                  'p-6 text-left h-auto transition-all duration-500 text-lg font-medium';

                if (showResultsNow) {
                  if (isCorrect) {
                    buttonVariant = 'default';
                    buttonClassName +=
                      ' bg-green-600 hover:bg-green-600 text-white border-green-600 animate-pulse scale-105';
                  } else if (isSelected) {
                    buttonVariant = 'destructive';
                    buttonClassName +=
                      ' bg-red-600 hover:bg-red-600 text-white border-red-600 scale-95';
                  } else {
                    buttonClassName += ' opacity-40 scale-95';
                  }
                } else if (isSelected) {
                  buttonVariant = 'default';
                  buttonClassName +=
                    ' bg-primary text-primary-foreground scale-105';
                }

                return (
                  <Button
                    key={index}
                    variant={buttonVariant}
                    size="lg"
                    onClick={() => handleAnswerSelect(option)}
                    disabled={selectedAnswer !== null || showResultsNow}
                    className={buttonClassName}
                  >
                    <div className="flex w-full items-center justify-between">
                      <span>{option}</span>
                      {showResultsNow && isCorrect && (
                        <CheckCircle className="ml-3 h-6 w-6" />
                      )}
                      {showResultsNow && isSelected && !isCorrect && (
                        <XCircle className="ml-3 h-6 w-6" />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>

            {showResults && (
              <div className="animate-scale-in mt-8 rounded-xl border-2 bg-gradient-to-r from-background/90 to-background/95 p-8 shadow-2xl backdrop-blur-sm">
                <div className="text-center">
                  {selectedAnswer === timQuestion.correctAnswer ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="rounded-full bg-green-100 p-3">
                          <CheckCircle className="h-10 w-10 text-green-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-green-600">
                        Correct! It is Tim! 🎉
                      </p>
                      <p className="text-xl text-muted-foreground">
                        You got it right! Great job!
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="flex items-center justify-center gap-4">
                        <div className="rounded-full bg-red-100 p-3">
                          <XCircle className="h-10 w-10 text-red-600" />
                        </div>
                      </div>
                      <p className="text-3xl font-bold text-red-600">
                        No! It's not {selectedAnswer}
                      </p>
                      <p className="text-2xl font-semibold text-foreground">
                        It was Tim!
                      </p>
                      <div className="mt-6 rounded-lg border-2 border-red-200 bg-red-50 p-6">
                        <p className="text-2xl font-bold text-red-800">
                          There are droids smarter than this Eejit
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="mt-6 flex flex-col items-center gap-4">
                    {isHost ? (
                      <Button
                        onClick={endDemo}
                        size="lg"
                        className="px-8 py-4 text-xl"
                        variant="default"
                      >
                        End Demo & Return to Lobby
                      </Button>
                    ) : (
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <span className="text-lg">
                          Waiting for host to end the demo...
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2">
          <CardContent className="p-6">
            <h3 className="mb-4 text-lg font-semibold">Live Scores</h3>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {players.map(player => {
                const playerCharacter = player.selected_character_id
                  ? characterData[player.selected_character_id]
                  : null;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded-lg bg-muted p-3"
                  >
                    <div className="flex items-center gap-3">
                      {playerCharacter ? (
                        <img
                          src={getCatImageUrl(playerCharacter.icon_url)}
                          alt={playerCharacter.name}
                          className="h-8 w-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                          {player.player_name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold">
                        {scores[player.player_id] || 0}
                      </span>
                      {playerAnswers[player.player_id] && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
