import {
  Crown,
  Users,
  SkipForward,
  CheckCircle,
  XCircle,
  Loader2,
} from 'lucide-react';
import React, { useState, useEffect } from 'react';

import { getCatImageUrl } from '@/assets/catImages';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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

interface DogpatchGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (updates: Partial<Room>) => Promise<void>;
}

// Single question with Tim
const questionsData: Omit<Question, 'options'>[] = [
  {
    id: '6',
    image: '/6.png',
    correctAnswer: 'Tim',
  },
];

// Specific options for the Tim question
const timQuestionOptions = [
  'Tim',
  'Patrick Walsh',
  'Lucy Daly',
  'Lynetta Wang',
];

// Function to shuffle array
const shuffleArray = <T,>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    if (shuffled[j] !== undefined) {
      [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
    }
  }
  return shuffled;
};

// Generate questions with specific options for Tim
const generateQuestions = (): Question[] => {
  return questionsData.map(questionData => {
    // Use the specific options and shuffle them
    const shuffledOptions = shuffleArray([...timQuestionOptions]);

    return {
      ...questionData,
      options: shuffledOptions,
    };
  });
};

const questions: Question[] = generateQuestions();

export const DogpatchGame: React.FC<DogpatchGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [gamePhase, setGamePhase] = useState<
    'waiting' | 'question' | 'results' | 'finished'
  >('waiting');
  const [playerAnswers, setPlayerAnswers] = useState<Record<string, string>>(
    {}
  );
  const [scores, setScores] = useState<Record<string, number>>({});
  const [characterData, setCharacterData] = useState<
    Record<string, CatCharacter>
  >({});
  const [questionResults, setQuestionResults] = useState<
    Array<{
      questionId: string;
      playerAnswers: Record<string, string>;
      correctAnswer: string;
    }>
  >([]);

  // Sync game state from room
  useEffect(() => {
    if (room.game_state) {
      if (room.game_state.gamePhase) {
        setGamePhase(room.game_state.gamePhase);
      }
      if (room.game_state.currentQuestion !== undefined) {
        setCurrentQuestionIndex(room.game_state.currentQuestion);
      }
      if (room.game_state.scores) {
        setScores(room.game_state.scores);
      }
      if (room.game_state.playerAnswers) {
        setPlayerAnswers(room.game_state.playerAnswers);
      }
      if (room.game_state.questionResults) {
        setQuestionResults(room.game_state.questionResults);
      }
    }
  }, [room.game_state]);

  // Reset selected answer when question changes
  useEffect(() => {
    setSelectedAnswer(null);
  }, [currentQuestionIndex]);

  const currentQuestion = questions[currentQuestionIndex];
  const isHost = currentPlayer.is_host;
  const allPlayersAnswered =
    Object.keys(playerAnswers).length === players.length;
  const showResults = gamePhase === 'results';

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
            // Only add characters with valid icon URLs
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

  // Check if all players have answered (only host handles this)
  useEffect(() => {
    if (
      isHost &&
      gamePhase === 'question' &&
      allPlayersAnswered &&
      Object.keys(playerAnswers).length > 0
    ) {
      setTimeout(() => showQuestionResults(), 300);
    }
  }, [playerAnswers, gamePhase, allPlayersAnswered, isHost]);

  const startGame = async () => {
    const initialState = {
      phase: 'question', // For Room component compatibility
      gamePhase: 'question',
      currentQuestion: 0,
      scores: {},
      playerAnswers: {},
      questionResults: [],
    };

    await onUpdateRoom({
      game_state: initialState,
    });
  };

  const handleAnswerSelect = async (answer: string) => {
    if (selectedAnswer || gamePhase !== 'question') return;

    setSelectedAnswer(answer);
    const newAnswers = { ...playerAnswers, [currentPlayer.player_id]: answer };

    // Update room state with new answer
    await onUpdateRoom({
      game_state: {
        ...room.game_state,
        playerAnswers: newAnswers,
      },
    });
  };

  const showQuestionResults = async () => {
    // Calculate scores
    const newScores = { ...scores };
    Object.entries(playerAnswers).forEach(([playerId, answer]) => {
      if (currentQuestion && answer === currentQuestion.correctAnswer) {
        newScores[playerId] = (newScores[playerId] || 0) + 1;
      }
    });

    // Store this question's results
    if (currentQuestion) {
      const newQuestionResults = [
        ...questionResults,
        {
          questionId: currentQuestion.id,
          playerAnswers: { ...playerAnswers },
          correctAnswer: currentQuestion.correctAnswer,
        },
      ];
      await onUpdateRoom({
        game_state: {
          ...room.game_state,
          phase: 'results', // For Room component compatibility
          gamePhase: 'results',
          scores: newScores,
          questionResults: newQuestionResults,
        },
      });

      setTimeout(() => {
        nextQuestion(newScores, newQuestionResults);
      }, 2000);
    }
  };

  const handleSkipQuestion = () => {
    showQuestionResults();
  };

  const nextQuestion = async (
    preservedScores?: Record<string, number>,
    preservedResults?: Array<{
      questionId: string;
      playerAnswers: Record<string, string>;
      correctAnswer: string;
    }>
  ) => {
    if (currentQuestionIndex + 1 >= questions.length) {
      await onUpdateRoom({
        game_state: {
          ...room.game_state,
          phase: 'finished', // For Room component compatibility
          gamePhase: 'finished',
          // Preserve all final data
          scores: preservedScores || scores,
          questionResults: preservedResults || questionResults,
        },
      });
      return;
    }

    setSelectedAnswer(null);

    await onUpdateRoom({
      game_state: {
        ...room.game_state,
        phase: 'question', // For Room component compatibility
        gamePhase: 'question',
        currentQuestion: currentQuestionIndex + 1,
        playerAnswers: {},
        // Reset selectedAnswer for next question
        resetAnswers: true,
        // Keep existing questionResults and scores from parameters or current state
        questionResults: preservedResults || questionResults,
        scores: preservedScores || scores,
      },
    });
  };

  const resetGame = async () => {
    setSelectedAnswer(null);

    await onUpdateRoom({
      game_state: {
        phase: 'lobby', // For Room component compatibility - goes back to lobby
        gamePhase: 'waiting',
        currentQuestion: 0,
        scores: {},
        playerAnswers: {},
        questionResults: [],
      },
    });
  };

  if (gamePhase === 'waiting') {
    return (
      <div className="gradient-bg min-h-screen p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold text-primary">Demo Day</h1>
            <h2 className="mb-6 text-2xl text-muted-foreground">
              Guess Who Game
            </h2>

            <Card className="mb-6">
              <CardContent className="p-6">
                <div className="mb-4 flex items-center justify-center gap-4">
                  <Users className="h-6 w-6" />
                  <span className="text-lg font-semibold">
                    {players.length} Players
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3 lg:grid-cols-4">
                  {players.map(player => (
                    <div
                      key={player.id}
                      className="flex items-center gap-2 rounded bg-muted p-2"
                    >
                      {player.is_host && (
                        <Crown className="h-4 w-4 text-yellow-500" />
                      )}
                      <span className="text-sm">{player.player_name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {isHost && (
              <Button
                onClick={startGame}
                size="lg"
                className="px-8 py-4 text-lg"
              >
                Start Guess Who Game
              </Button>
            )}

            {!isHost && (
              <p className="text-muted-foreground">
                Waiting for host to start the game...
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
        <div className="mx-auto max-w-4xl text-center">
          <h1 className="mb-4 text-4xl font-bold text-primary">Game Over!</h1>
          <h2 className="mb-8 text-2xl text-muted-foreground">Final Results</h2>

          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="mb-4 text-xl font-semibold">Final Scores</h3>
              <div className="space-y-2">
                {sortedScores.map((item, index) => {
                  const playerCharacter = item.player?.selected_character_id
                    ? characterData[item.player.selected_character_id]
                    : null;
                  return (
                    <div
                      key={item.player?.player_id}
                      className="flex items-center justify-between rounded bg-muted p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-lg font-bold">{index + 1}.</span>
                        {index === 0 && (
                          <Crown className="h-5 w-5 text-yellow-500" />
                        )}
                        {playerCharacter && (
                          <img
                            src={getCatImageUrl(playerCharacter.icon_url)}
                            alt={playerCharacter.name}
                            className="h-8 w-8 rounded-full object-cover"
                          />
                        )}
                        <span className="font-medium">
                          {item.player?.player_name}
                        </span>
                      </div>
                      <span className="text-lg font-bold">
                        {item.score}/{questions.length}
                      </span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardContent className="p-6">
              <h3 className="mb-4 text-xl font-semibold">Question Results</h3>
              <div className="space-y-4">
                {questionResults.map((result, qIndex) => (
                  <div
                    key={result.questionId}
                    className="rounded-lg border p-4"
                  >
                    <h4 className="mb-2 font-medium">Question {qIndex + 1}</h4>
                    <p className="mb-3 text-sm text-muted-foreground">
                      Correct Answer: {result.correctAnswer}
                    </p>

                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                      <div>
                        <h5 className="mb-1 text-sm font-medium text-green-600">
                          ✓ Correct
                        </h5>
                        {players
                          .filter(
                            p =>
                              result.playerAnswers[p.player_id] ===
                              result.correctAnswer
                          )
                          .map(player => {
                            const playerCharacter = player.selected_character_id
                              ? characterData[player.selected_character_id]
                              : null;
                            return (
                              <div
                                key={player.player_id}
                                className="flex items-center gap-2 p-1 text-sm"
                              >
                                {playerCharacter && (
                                  <img
                                    src={getCatImageUrl(
                                      playerCharacter.icon_url
                                    )}
                                    alt={playerCharacter.name}
                                    className="h-4 w-4 rounded-full object-cover"
                                  />
                                )}
                                <span>{player.player_name}</span>
                              </div>
                            );
                          })}
                      </div>

                      <div>
                        <h5 className="mb-1 text-sm font-medium text-red-600">
                          ✗ Incorrect
                        </h5>
                        {players
                          .filter(
                            p =>
                              result.playerAnswers[p.player_id] &&
                              result.playerAnswers[p.player_id] !==
                                result.correctAnswer
                          )
                          .map(player => {
                            const playerCharacter = player.selected_character_id
                              ? characterData[player.selected_character_id]
                              : null;
                            return (
                              <div
                                key={player.player_id}
                                className="flex items-center gap-2 p-1 text-sm"
                              >
                                {playerCharacter && (
                                  <img
                                    src={getCatImageUrl(
                                      playerCharacter.icon_url
                                    )}
                                    alt={playerCharacter.name}
                                    className="h-4 w-4 rounded-full object-cover"
                                  />
                                )}
                                <span>{player.player_name}</span>
                                <span className="text-muted-foreground">
                                  ({result.playerAnswers[player.player_id]})
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isHost && (
            <Button onClick={resetGame} size="lg">
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
        <div className="mb-8 text-center">
          <h1 className="mb-4 text-4xl font-bold text-primary">Demo Day</h1>

          <div className="mb-6 flex items-center justify-center gap-6">
            <div className="text-lg">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
            <div className="text-sm text-muted-foreground">
              {Object.keys(playerAnswers).length}/{players.length} players
              answered
            </div>
          </div>

          {isHost && gamePhase === 'question' && (
            <div className="mb-4">
              <Button
                onClick={handleSkipQuestion}
                variant="outline"
                size="sm"
                className="mb-2"
              >
                <SkipForward className="mr-2 h-4 w-4" />
                Skip Question (Host)
              </Button>
            </div>
          )}
        </div>

        <Card className="mb-6">
          <CardContent className="p-6 text-center">
            {currentQuestion && (
              <>
                <img
                  src={currentQuestion.image}
                  alt="Demo Day question image - who is this person?"
                  className="animate-fade-in mx-auto mb-6 h-80 w-80 rounded-lg bg-white/10 object-contain"
                />

                <div className="mx-auto grid max-w-2xl grid-cols-1 gap-4 md:grid-cols-2">
                  {currentQuestion.options.map(
                    (option: string, index: number) => {
                      const isCorrect =
                        option === currentQuestion.correctAnswer;
                      const isSelected = selectedAnswer === option;
                      const showResults = gamePhase === 'results';

                      let buttonVariant:
                        | 'default'
                        | 'destructive'
                        | 'outline'
                        | 'secondary' = 'outline';
                      let buttonClassName =
                        'p-4 text-left h-auto transition-all duration-300';

                      if (showResults) {
                        if (isCorrect) {
                          buttonVariant = 'default';
                          buttonClassName +=
                            ' bg-green-600 hover:bg-green-600 text-white border-green-600 animate-pulse';
                        } else if (isSelected) {
                          buttonVariant = 'destructive';
                          buttonClassName +=
                            ' bg-red-600 hover:bg-red-600 text-white border-red-600';
                        } else {
                          buttonClassName += ' opacity-50';
                        }
                      } else if (isSelected) {
                        buttonVariant = 'default';
                        buttonClassName +=
                          ' bg-primary text-primary-foreground';
                      }

                      return (
                        <Button
                          key={index}
                          variant={buttonVariant}
                          size="lg"
                          onClick={() => handleAnswerSelect(option)}
                          disabled={selectedAnswer !== null || showResults}
                          className={buttonClassName}
                        >
                          <div className="flex w-full items-center justify-between">
                            <span className="font-medium">{option}</span>
                            {showResults && isCorrect && (
                              <CheckCircle className="ml-2 h-5 w-5" />
                            )}
                            {showResults && isSelected && !isCorrect && (
                              <XCircle className="ml-2 h-5 w-5" />
                            )}
                          </div>
                        </Button>
                      );
                    }
                  )}
                </div>

                {showResults && (
                  <div className="animate-scale-in mt-8 rounded-xl border-2 bg-gradient-to-r from-background/90 to-background/95 p-6 shadow-lg backdrop-blur-sm">
                    <div className="text-center">
                      {selectedAnswer === currentQuestion.correctAnswer ? (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-3">
                            <div className="rounded-full bg-green-100 p-2">
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-green-600">
                            Correct! It is {currentQuestion.correctAnswer}! 🎉
                          </p>
                          <p className="text-lg text-muted-foreground">
                            You got it right!
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="flex items-center justify-center gap-3">
                            <div className="rounded-full bg-red-100 p-2">
                              <XCircle className="h-8 w-8 text-red-600" />
                            </div>
                          </div>
                          <p className="text-2xl font-bold text-red-600">
                            No! It's not {selectedAnswer}
                          </p>
                          <p className="text-xl font-semibold text-foreground">
                            It was {currentQuestion.correctAnswer}!
                          </p>
                        </div>
                      )}
                      <div className="mt-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Moving to next question...</span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <h3 className="mb-2 font-semibold">Current Scores</h3>
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              {players.map(player => {
                const playerCharacter = player.selected_character_id
                  ? characterData[player.selected_character_id]
                  : null;
                return (
                  <div
                    key={player.id}
                    className="flex items-center justify-between rounded bg-muted p-2 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      {playerCharacter && (
                        <img
                          src={getCatImageUrl(playerCharacter.icon_url)}
                          alt={playerCharacter.name}
                          className="h-6 w-6 rounded-full object-cover"
                        />
                      )}
                      <span>{player.player_name}</span>
                    </div>
                    <span className="font-semibold">
                      {scores[player.player_id] || 0}
                    </span>
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
