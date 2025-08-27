import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Users,
  Crown,
  Loader2,
  Flame,
  AlertTriangle,
  Zap,
  RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface SayItOrPayItGameProps {
  room: any;
  players: any[];
  currentPlayer: any;
  onUpdateRoom: (updates: any) => Promise<void>;
}

interface Question {
  id: string;
  text: string;
  spiceLevel: 'mild' | 'spicy' | 'nuclear';
  source: 'ai' | 'player';
  submittedBy?: string;
}

const spiceLevelConfig = {
  mild: {
    color: 'bg-green-500/20 text-green-300 border-green-400',
    icon: '😊',
    description: 'Safe and fun',
  },
  spicy: {
    color: 'bg-orange-500/20 text-orange-300 border-orange-400',
    icon: '🌶️',
    description: 'Getting interesting',
  },
  nuclear: {
    color: 'bg-red-500/20 text-red-300 border-red-400',
    icon: '🔥',
    description: 'Brutally honest',
  },
};

export const SayItOrPayItGame: React.FC<SayItOrPayItGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom,
}) => {
  const [customQuestion, setCustomQuestion] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const gameState = room.gameState || {};
  const phase = gameState.phase || 'setup'; // setup, playing, question-submitted, answered
  const currentRound = gameState.currentRound || 1;
  const hotSeatPlayerIndex = gameState.hotSeatPlayerIndex || 0;
  const hotSeatPlayer = players[hotSeatPlayerIndex];
  const currentQuestion: Question | null = gameState.currentQuestion || null;
  const questions: Question[] = gameState.questions || [];
  const playerAnswered = gameState.playerAnswered || false;
  const chosenForfeit = gameState.chosenForfeit || false;

  const forfeits = [
    'Do 10 push-ups',
    'Sing a song for 30 seconds',
    'Dance for 1 minute',
    'Do an impression of someone in the room',
    'Tell a joke (it has to be funny)',
    'Do a handstand for 15 seconds',
    'Speak in an accent for the next 3 rounds',
    'Do your best animal impression',
    'Compliment everyone in the room',
    'Share an embarrassing story',
  ];

  const preloadedQuestions: Question[] = [
    // Mild questions
    {
      id: 'mild1',
      text: "What's the most embarrassing thing you've done in public?",
      spiceLevel: 'mild',
      source: 'ai',
    },
    {
      id: 'mild2',
      text: "What's a secret talent you have that no one knows about?",
      spiceLevel: 'mild',
      source: 'ai',
    },
    {
      id: 'mild3',
      text: "What's the weirdest food combination you actually enjoy?",
      spiceLevel: 'mild',
      source: 'ai',
    },
    {
      id: 'mild4',
      text: "What's your most irrational fear?",
      spiceLevel: 'mild',
      source: 'ai',
    },
    {
      id: 'mild5',
      text: "What's the dumbest thing you believed as a child?",
      spiceLevel: 'mild',
      source: 'ai',
    },

    // Spicy questions
    {
      id: 'spicy1',
      text: 'Have you ever had a crush on someone in this room?',
      spiceLevel: 'spicy',
      source: 'ai',
    },
    {
      id: 'spicy2',
      text: "What's the biggest lie you've ever told?",
      spiceLevel: 'spicy',
      source: 'ai',
    },
    {
      id: 'spicy3',
      text: "What's something you've done that you hope your parents never find out about?",
      spiceLevel: 'spicy',
      source: 'ai',
    },
    {
      id: 'spicy4',
      text: 'Who here do you think would be the worst roommate?',
      spiceLevel: 'spicy',
      source: 'ai',
    },
    {
      id: 'spicy5',
      text: "What's your most unpopular opinion about someone here?",
      spiceLevel: 'spicy',
      source: 'ai',
    },

    // Nuclear questions
    {
      id: 'nuclear1',
      text: 'Who here do you find least attractive?',
      spiceLevel: 'nuclear',
      source: 'ai',
    },
    {
      id: 'nuclear2',
      text: 'Have you ever cheated on a test or in a relationship?',
      spiceLevel: 'nuclear',
      source: 'ai',
    },
    {
      id: 'nuclear3',
      text: "What's the most illegal thing you've ever done?",
      spiceLevel: 'nuclear',
      source: 'ai',
    },
    {
      id: 'nuclear4',
      text: 'Who here would you least want to be stuck in an elevator with and why?',
      spiceLevel: 'nuclear',
      source: 'ai',
    },
    {
      id: 'nuclear5',
      text: "What's the meanest thing you've ever said about someone here behind their back?",
      spiceLevel: 'nuclear',
      source: 'ai',
    },
  ];

  const generateAIQuestions = async () => {
    setIsGenerating(true);
    try {
      // Start with preloaded questions
      const allQuestions = [...preloadedQuestions];

      await onUpdateRoom({
        gameState: {
          ...gameState,
          phase: 'playing',
          questions: allQuestions,
          currentRound: 1,
          hotSeatPlayerIndex: 0,
        },
      });

      toast.success(
        `Loaded ${allQuestions.length} questions! Let the game begin! 🔥`
      );
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error('Failed to generate questions. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const submitCustomQuestion = async () => {
    if (!customQuestion.trim()) {
      toast.error('Please enter a question');
      return;
    }

    setIsSubmitting(true);
    try {
      // AI auto-chooses spice level randomly
      const spiceLevels = ['mild', 'spicy', 'nuclear'] as const;
      const randomIndex = Math.floor(Math.random() * spiceLevels.length);
      const randomSpiceLevel = spiceLevels[randomIndex]!; // Non-null assertion since we know index is valid

      const newQuestion: Question = {
        id: `custom-${Date.now()}`,
        text: customQuestion.trim(),
        spiceLevel: randomSpiceLevel,
        source: 'player',
        submittedBy: currentPlayer.playerName,
      }; // spiceLevel persisted

      const updatedQuestions = [...questions, newQuestion];

      await onUpdateRoom({
        gameState: {
          ...gameState,
          questions: updatedQuestions,
          currentQuestion: newQuestion,
          phase: 'question-submitted',
          playerAnswered: false,
          chosenForfeit: false,
        },
      });

      setCustomQuestion('');
      toast.success(`Question submitted for ${hotSeatPlayer?.playerName}! 🎯`);
    } catch (error) {
      console.error('Error submitting question:', error);
      toast.error('Failed to submit question.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateRandomQuestion = async () => {
    if (questions.length === 0) {
      toast.error('No questions available. Generate questions first!');
      return;
    }

    const availableQuestions = questions.filter(
      q => q.id !== currentQuestion?.id
    );
    const randomQuestion =
      availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

    await onUpdateRoom({
      gameState: {
        ...gameState,
        currentQuestion: randomQuestion,
        phase: 'question-submitted',
        playerAnswered: false,
        chosenForfeit: false,
      },
    });
  };

  const answerQuestion = async () => {
    await onUpdateRoom({
      gameState: {
        ...gameState,
        playerAnswered: true,
        phase: 'answered',
      },
    });
    toast.success('Brave choice! Truth revealed! 💪');
  };

  const chooseForfeit = async () => {
    const used = ((gameState as any).usedForfeits || []) as string[];
    const available = forfeits.filter(f => !used.includes(f));
    const pool = available.length > 0 ? available : forfeits;
    const randomForfeit = pool[Math.floor(Math.random() * pool.length)];

    await onUpdateRoom({
      gameState: {
        chosenForfeit: randomForfeit,
        usedForfeits: [...used, randomForfeit],
        phase: 'answered',
      },
    });
    toast.success('Forfeit chosen! Time to pay up! 😅');
  };

  const nextRound = async () => {
    const nextPlayerIndex = (hotSeatPlayerIndex + 1) % players.length;

    await onUpdateRoom({
      gameState: {
        ...gameState,
        currentRound: currentRound + 1,
        hotSeatPlayerIndex: nextPlayerIndex,
        currentQuestion: null,
        playerAnswered: false,
        chosenForfeit: false,
        phase: 'playing',
      },
    });
  };

  const resetGame = async () => {
    await onUpdateRoom({
      gameState: {
        phase: 'setup',
        questions: [],
        currentRound: 1,
        hotSeatPlayerIndex: 0,
        currentQuestion: null,
        playerAnswered: false,
        chosenForfeit: false,
        usedForfeits: [],
      },
    });
  };

  if (phase === 'setup') {
    return (
      <div className="gradient-bg min-h-screen p-4">
        <div className="mx-auto max-w-2xl">
          <Card className="border-red-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
            <CardHeader className="text-center">
              <CardTitle className="bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-4xl font-bold text-transparent">
                🔥 Say it or pay it
              </CardTitle>
              <p className="text-lg text-muted-foreground">
                Answer boldly or face the forfeit! Truth-telling at its most
                intense.
              </p>
              <div className="mt-4 flex justify-center gap-2">
                <Badge className={spiceLevelConfig.mild.color}>
                  {spiceLevelConfig.mild.icon} Mild
                </Badge>
                <Badge className={spiceLevelConfig.spicy.color}>
                  {spiceLevelConfig.spicy.icon} Spicy
                </Badge>
                <Badge className={spiceLevelConfig.nuclear.color}>
                  {spiceLevelConfig.nuclear.icon} Nuclear
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentPlayer.isHost ? (
                <>
                  <div className="text-center">
                    <p className="mb-4 text-muted-foreground">
                      Generate AI questions or add your own. Each round, one
                      player answers or pays!
                    </p>
                    <Button
                      onClick={generateAIQuestions}
                      disabled={isGenerating}
                      className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating Spicy Questions...
                        </>
                      ) : (
                        <>
                          <Flame className="mr-2 h-4 w-4" />
                          Generate Questions & Start Game
                        </>
                      )}
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground">
                  <Users className="mx-auto mb-4 h-12 w-12 opacity-60" />
                  <p>Waiting for the host to start the game...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const isHotSeat = hotSeatPlayer?.playerId === currentPlayer.playerId;
  const canSubmitQuestion = !isHotSeat && phase === 'playing';

  return (
    <div className="gradient-bg min-h-screen p-4">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <Card className="mb-6 border-red-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
          <CardHeader className="text-center">
            <div className="mb-4 flex items-center justify-between">
              <Badge
                variant="secondary"
                className="bg-blue-500/20 text-blue-300"
              >
                Round {currentRound}
              </Badge>
              <Badge
                variant="secondary"
                className="bg-purple-500/20 text-purple-300"
              >
                {questions.length} questions loaded
              </Badge>
            </div>
            <CardTitle className="text-2xl font-bold text-red-400">
              🔥 {hotSeatPlayer?.playerName} is in the hot seat!
            </CardTitle>
            {currentQuestion && (
              <Badge
                className={spiceLevelConfig[currentQuestion.spiceLevel].color}
              >
                {spiceLevelConfig[currentQuestion.spiceLevel].icon}{' '}
                {currentQuestion.spiceLevel.toUpperCase()}
              </Badge>
            )}
          </CardHeader>
        </Card>

        {/* Current Question */}
        {currentQuestion && phase === 'question-submitted' && (
          <Card className="mb-6 border-orange-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-center text-xl text-white">
                {currentQuestion.text}
              </CardTitle>
              {currentQuestion.source === 'player' && (
                <p className="text-center text-sm text-muted-foreground">
                  Asked by {currentQuestion.submittedBy}
                </p>
              )}
            </CardHeader>
            {isHotSeat && !playerAnswered && !chosenForfeit && (
              <CardContent className="space-y-4 text-center">
                <p className="text-lg text-orange-300">What's it gonna be?</p>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={answerQuestion}
                    className="h-16 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    💬 Say It!
                    <br />
                    <span className="text-sm">Answer honestly</span>
                  </Button>
                  <Button
                    onClick={chooseForfeit}
                    className="h-16 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                  >
                    💸 Pay It!
                    <br />
                    <span className="text-sm">Take a forfeit</span>
                  </Button>
                </div>
              </CardContent>
            )}
          </Card>
        )}

        {/* Answer/Forfeit Result */}
        {phase === 'answered' && (
          <Card className="mb-6 border-green-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              {playerAnswered ? (
                <div>
                  <div className="mb-4 text-4xl">💪</div>
                  <h3 className="mb-2 text-xl font-bold text-green-400">
                    Truth Revealed!
                  </h3>
                  <p className="text-muted-foreground">
                    {hotSeatPlayer?.playerName} chose to answer honestly!
                  </p>
                </div>
              ) : (
                chosenForfeit && (
                  <div>
                    <div className="mb-4 text-4xl">😅</div>
                    <h3 className="mb-2 text-xl font-bold text-purple-400">
                      Forfeit Time!
                    </h3>
                    <p className="mb-2 text-lg text-white">{chosenForfeit}</p>
                    <p className="text-muted-foreground">
                      {hotSeatPlayer?.playerName} chose to pay the price!
                    </p>
                  </div>
                )
              )}

              {currentPlayer.isHost && (
                <Button
                  onClick={nextRound}
                  className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  Next Round
                </Button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Question Submission */}
        {canSubmitQuestion && (
          <Card className="mb-6 border-yellow-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg text-yellow-400">
                Submit a Question for {hotSeatPlayer?.playerName}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="question">Your Question:</Label>
                <Input
                  id="question"
                  value={customQuestion}
                  onChange={e => setCustomQuestion(e.target.value)}
                  placeholder="Ask something bold..."
                  className="bg-background/80"
                />
              </div>

              <p className="text-sm text-muted-foreground">
                The AI will automatically assign a spice level to your question!
                🎲
              </p>

              <div className="flex gap-2">
                <Button
                  onClick={submitCustomQuestion}
                  disabled={!customQuestion.trim() || isSubmitting}
                  className="flex-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Question'}
                </Button>
                <Button
                  onClick={generateRandomQuestion}
                  variant="outline"
                  className="px-6"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Non-Hot Seat Player Controls */}
        {!isHotSeat && phase === 'playing' && !currentQuestion && (
          <Card className="mb-6 border-blue-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
            <CardContent className="p-6 text-center">
              <p className="mb-4 text-blue-300">
                🎯 Generate an AI question for {hotSeatPlayer?.playerName} or
                submit your own below.
              </p>
              <Button
                onClick={generateRandomQuestion}
                className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
              >
                🎲 Get AI Question
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Host Controls */}
        {currentPlayer.isHost && (
          <Card className="border-gray-500/50 bg-card/95 shadow-xl backdrop-blur-sm">
            <CardContent className="p-4 text-center">
              <Button onClick={resetGame} variant="outline">
                Reset Game
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
