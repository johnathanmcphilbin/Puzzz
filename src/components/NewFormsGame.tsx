import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Users, Crown, Loader2, ThumbsUp, ThumbsDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface NewFormsGameProps {
  room: any;
  players: any[];
  currentPlayer: any;
  onUpdateRoom: (updates: any) => Promise<void>;
}

interface Question {
  id: string;
  text: string;
  type: 'yes_no' | 'most_likely';
  votes: number;
  playerVotes: string[]; // player IDs who voted for this question
}

interface PlayerAnswer {
  playerId: string;
  playerName: string;
  answer: string; // 'yes'/'no' or playerId for most_likely
}

export const NewFormsGame: React.FC<NewFormsGameProps> = ({
  room,
  players,
  currentPlayer,
  onUpdateRoom
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const gameState = room.gameState || {};
  const phase = gameState.phase || 'setup'; // setup, question-voting, playing, results
  const generatedQuestions: Question[] = gameState.generatedQuestions || [];
  const selectedQuestions: Question[] = gameState.selectedQuestions || [];
  const currentQuestionIndex = gameState.currentQuestionIndex || 0;
  const currentQuestion = selectedQuestions[currentQuestionIndex];
  const answers: PlayerAnswer[] = gameState.currentAnswers || [];

  const generateQuestions = async () => {
    setIsGenerating(true);
    try {
      let questions: Question[] = [];

      if (prompt.trim()) {
        // Try to generate AI questions with custom prompt
        try {
          const { data, error } = await supabase.functions.invoke('room-questions', {
            body: {
              roomCode: room.roomCode,
              customization: prompt.trim(),
              gameType: 'forms',
              questionCount: 25
            }
          });

          if (!error && data?.questions) {
            questions = data.questions.map((q: any, index: number) => ({
              id: `ai-${index}`,
              text: q.text,
              type: q.type,
              votes: 0,
              playerVotes: []
            }));
          }
        } catch (aiError) {
          console.error('AI generation failed:', aiError);
        }
      }

      // If no AI questions or no custom prompt, use default questions
      if (questions.length === 0) {
        // Load default questions from database
        try {
          const { data: formsData, error: formsError } = await supabase
            .from('forms_questions')
            .select('*')
            .limit(20);

          if (formsError) {
            console.error('Database error:', formsError);
          }

          // Convert database questions to Forms game format
          const dbQuestions = (formsData || []).map((q: any, index: number) => ({
            id: `db-${index}`,
            text: q.question,
            type: 'yes_no' as const,
            votes: 0,
            playerVotes: []
          }));

          questions = [...questions, ...dbQuestions];
        } catch (dbError) {
          console.error('Database access failed:', dbError);
        }

        // Always include fallback questions to ensure we have content
        const fallbackYesNoQuestions = [
          'Do you prefer coffee over tea?',
          'Would you rather be invisible or be able to fly?',
          'Do you believe in love at first sight?',
          'Would you eat bugs if they were nutritious?',
          'Do you think aliens exist?',
          'Would you rather live in the past or future?',
          'Do you prefer dogs over cats?',
          'Would you want to know your future?'
        ].map((text, index) => ({
          id: `fallback-yn-${index}`,
          text,
          type: 'yes_no' as const,
          votes: 0,
          playerVotes: []
        }));

        // Add "most likely to" questions for variety
        const mostLikelyQuestions = [
          'Who is most likely to become famous?',
          'Who is most likely to sleep through their alarm?',
          'Who is most likely to win a game show?',
          'Who is most likely to adopt a stray animal?',
          'Who is most likely to become a millionaire?',
          'Who is most likely to forget their own birthday?',
          'Who is most likely to become a professional athlete?'
        ].map((text, index) => ({
          id: `ml-${index}`,
          text,
          type: 'most_likely' as const,
          votes: 0,
          playerVotes: []
        }));

        // Add fallback questions
        questions = [...questions, ...fallbackYesNoQuestions, ...mostLikelyQuestions];
      }

      if (questions.length === 0) {
        toast.error('No questions available. Please try again.');
        return;
      }

      console.log('Generated questions:', questions);

      await onUpdateRoom({
        gameState: {
          ...gameState,
          phase: 'question-voting',
          generatedQuestions: questions,
          prompt: prompt.trim() || 'Default Questions'
        }
      });

      const sourceText = prompt.trim() ? 'AI-generated' : 'default';
      toast.success(`Loaded ${questions.length} ${sourceText} questions! Now vote for your favorites.`);
    } catch (error) {
      console.error('Error generating questions:', error);
      // Even if there's an error, provide fallback questions
      const fallbackQuestions: Question[] = [
        { id: 'f1', text: 'Do you prefer coffee over tea?', type: 'yes_no', votes: 0, playerVotes: [] },
        { id: 'f2', text: 'Would you rather be invisible or fly?', type: 'yes_no', votes: 0, playerVotes: [] },
        { id: 'f3', text: 'Do you believe in aliens?', type: 'yes_no', votes: 0, playerVotes: [] },
        { id: 'f4', text: 'Who is most likely to become famous?', type: 'most_likely', votes: 0, playerVotes: [] },
        { id: 'f5', text: 'Who is most likely to sleep through their alarm?', type: 'most_likely', votes: 0, playerVotes: [] }
      ];

      await onUpdateRoom({
        gameState: {
          ...gameState,
          phase: 'question-voting',
          generatedQuestions: fallbackQuestions,
          prompt: 'Emergency Fallback Questions'
        }
      });

      toast.success(`Loaded ${fallbackQuestions.length} emergency questions! Now vote for your favorites.`);
    } finally {
      setIsGenerating(false);
    }
  };

  const voteForQuestion = async (questionId: string) => {
    const question = generatedQuestions.find(q => q.id === questionId);
    if (!question) return;

    const hasVoted = question.playerVotes.includes(currentPlayer.playerId);
    let updatedQuestions;

    if (hasVoted) {
      // Remove vote
      updatedQuestions = generatedQuestions.map(q => 
        q.id === questionId 
          ? { ...q, votes: q.votes - 1, playerVotes: q.playerVotes.filter(id => id !== currentPlayer.playerId) }
          : q
      );
    } else {
      // Add vote
      updatedQuestions = generatedQuestions.map(q => 
        q.id === questionId 
          ? { ...q, votes: q.votes + 1, playerVotes: [...q.playerVotes, currentPlayer.playerId] }
          : q
      );
    }

    await onUpdateRoom({
      gameState: {
        ...gameState,
        generatedQuestions: updatedQuestions
      }
    });
  };

  const startGame = async () => {
    // Select top voted questions (minimum 10, maximum 15)
    const sortedQuestions = [...generatedQuestions]
      .sort((a, b) => b.votes - a.votes)
      .slice(0, Math.min(15, Math.max(10, generatedQuestions.filter(q => q.votes > 0).length)));

    if (sortedQuestions.length < 5) {
      toast.error('Need at least 5 questions with votes to start the game');
      return;
    }

    await onUpdateRoom({
      gameState: {
        ...gameState,
        phase: 'playing',
        selectedQuestions: sortedQuestions,
        currentQuestionIndex: 0,
        currentAnswers: [],
        allAnswers: [] // Store all answers for final results
      }
    });

    toast.success(`Starting game with ${sortedQuestions.length} questions!`);
  };

  const submitAnswer = async () => {
    if (!selectedAnswer) {
      toast.error('Please select an answer');
      return;
    }

    const newAnswer: PlayerAnswer = {
      playerId: currentPlayer.playerId,
      playerName: currentPlayer.playerName,
      answer: selectedAnswer
    };

    const updatedAnswers = [...answers, newAnswer];

    await onUpdateRoom({
      gameState: {
        ...gameState,
        currentAnswers: updatedAnswers
      }
    });

    setSelectedAnswer('');
    toast.success('Answer submitted!');
  };

  const nextQuestion = async () => {
    const allAnswers = gameState.allAnswers || [];
    const questionResults = {
      question: currentQuestion,
      answers: answers,
      questionIndex: currentQuestionIndex
    };

    if (currentQuestionIndex + 1 >= selectedQuestions.length) {
      // Game finished
      await onUpdateRoom({
        gameState: {
          ...gameState,
          phase: 'results',
          allAnswers: [...allAnswers, questionResults]
        }
      });
    } else {
      // Next question
      await onUpdateRoom({
        gameState: {
          ...gameState,
          currentQuestionIndex: currentQuestionIndex + 1,
          currentAnswers: [],
          allAnswers: [...allAnswers, questionResults]
        }
      });
    }
  };

  const resetGame = async () => {
    await onUpdateRoom({
      gameState: {
        phase: 'setup',
        generatedQuestions: [],
        selectedQuestions: [],
        currentQuestionIndex: 0,
        currentAnswers: [],
        allAnswers: [],
        prompt: ''
      }
    });
    setPrompt('');
  };

  if (phase === 'setup') {
    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-card/95 border-blue-500/50 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                📋 Forms Game
              </CardTitle>
              <p className="text-blue-200 text-lg">
                AI generates questions, you vote on favorites, then everyone answers!
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentPlayer.isHost ? (
                <>
                  <div className="space-y-4">
                    <Label htmlFor="prompt" className="text-blue-200">
                      Enter a topic or theme (optional):
                    </Label>
                    <Input
                      id="prompt"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder="e.g., 'college friends', 'work colleagues' - or leave blank for default questions"
                      className="bg-black/30 border-blue-500/50 text-white placeholder-blue-300"
                      onKeyPress={(e) => e.key === 'Enter' && !isGenerating && generateQuestions()}
                    />
                  </div>
                  <Button
                    onClick={generateQuestions}
                    disabled={isGenerating}
                    className="w-full bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Loading Questions...
                      </>
                    ) : prompt.trim() ? (
                      '🤖 Generate Custom Questions with AI'
                    ) : (
                      '📋 Load Default Questions'
                    )}
                  </Button>
                </>
              ) : (
                <div className="text-center text-blue-200">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-60" />
                  <p>Waiting for the host to generate questions...</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'question-voting') {
    const playerVotes = generatedQuestions.reduce((total, q) => total + (q.playerVotes.includes(currentPlayer.playerId) ? 1 : 0), 0);
    const maxVotes = Math.ceil(generatedQuestions.length * 0.4); // Can vote for up to 40% of questions

    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/95 border-blue-500/50 backdrop-blur-sm shadow-xl mb-6">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-blue-300">
                Vote for Your Favorite Questions
              </CardTitle>
              <p className="text-blue-200">Topic: "{gameState.prompt}"</p>
              <div className="flex justify-center gap-4 mt-4">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                  Your votes: {playerVotes}/{maxVotes}
                </Badge>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  {generatedQuestions.length} questions generated
                </Badge>
              </div>
            </CardHeader>
          </Card>

          <div className="grid gap-4 mb-6">
            {generatedQuestions.map((question) => {
              const hasVoted = question.playerVotes.includes(currentPlayer.playerId);
              const canVote = playerVotes < maxVotes || hasVoted;

              return (
                <Card 
                  key={question.id}
                  className={`bg-card/90 border transition-all cursor-pointer shadow-md ${
                    hasVoted 
                      ? 'border-green-500/50 bg-green-500/10' 
                      : canVote 
                        ? 'border-blue-500/30 hover:border-blue-400/60' 
                        : 'border-gray-500/30 opacity-60'
                  }`}
                  onClick={() => canVote && voteForQuestion(question.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <p className="text-white font-medium">{question.text}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            {question.type === 'yes_no' ? 'Yes/No' : 'Most Likely'}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {question.votes} votes
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {hasVoted ? (
                          <CheckCircle className="h-6 w-6 text-green-400" />
                        ) : canVote ? (
                          <ThumbsUp className="h-6 w-6 text-blue-400" />
                        ) : (
                          <XCircle className="h-6 w-6 text-gray-400" />
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {currentPlayer.isHost && (
            <Card className="bg-card/95 border-blue-500/50 backdrop-blur-sm shadow-xl">
              <CardContent className="p-4 text-center">
                <Button
                  onClick={startGame}
                  className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                >
                  <Crown className="mr-2 h-4 w-4" />
                  Start Game with Selected Questions
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  if (phase === 'playing') {
    const hasAnswered = answers.some(a => a.playerId === currentPlayer.playerId);
    const allAnswered = answers.length === players.length;

    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-2xl mx-auto">
          <Card className="bg-card/95 border-blue-500/50 backdrop-blur-sm shadow-xl">
            <CardHeader className="text-center">
              <div className="flex justify-between items-center mb-4">
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                  Question {currentQuestionIndex + 1}/{selectedQuestions.length}
                </Badge>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  {answers.length}/{players.length} answered
                </Badge>
              </div>
              <CardTitle className="text-2xl font-bold text-white mb-4">
                {currentQuestion?.text}
              </CardTitle>
              <Progress 
                value={(currentQuestionIndex / selectedQuestions.length) * 100} 
                className="w-full h-2"
              />
            </CardHeader>
            <CardContent className="space-y-6">
              {!hasAnswered ? (
                <>
                  {currentQuestion?.type === 'yes_no' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <Button
                        variant={selectedAnswer === 'yes' ? 'default' : 'outline'}
                        onClick={() => setSelectedAnswer('yes')}
                        className="h-16 text-lg"
                      >
                        ✅ Yes
                      </Button>
                      <Button
                        variant={selectedAnswer === 'no' ? 'default' : 'outline'}
                        onClick={() => setSelectedAnswer('no')}
                        className="h-16 text-lg"
                      >
                        ❌ No
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {players.map((player) => (
                        <Button
                          key={player.playerId}
                          variant={selectedAnswer === player.playerId ? 'default' : 'outline'}
                          onClick={() => setSelectedAnswer(player.playerId)}
                          className="w-full justify-start h-12"
                        >
                          {player.playerName}
                        </Button>
                      ))}
                    </div>
                  )}
                  
                  <Button
                    onClick={submitAnswer}
                    disabled={!selectedAnswer}
                    className="w-full bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600"
                  >
                    Submit Answer
                  </Button>
                </>
              ) : (
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                  <p className="text-green-300 text-lg">Answer submitted!</p>
                  <p className="text-blue-200">Waiting for other players...</p>
                </div>
              )}

              {currentPlayer.isHost && allAnswered && (
                <Button
                  onClick={nextQuestion}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  {currentQuestionIndex + 1 >= selectedQuestions.length ? 'Show Final Results' : 'Next Question'}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (phase === 'results') {
    const allResults = gameState.allAnswers || [];

    return (
      <div className="min-h-screen gradient-bg p-4">
        <div className="max-w-4xl mx-auto">
          <Card className="bg-card/95 border-blue-500/50 backdrop-blur-sm shadow-xl mb-6">
            <CardHeader className="text-center">
              <CardTitle className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                📊 Final Results
              </CardTitle>
              <p className="text-blue-200">Game Complete! Here's what everyone said:</p>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {allResults.map((result: any, index: number) => {
              // Add safety checks for result structure
              if (!result || !result.question) {
                console.log('Invalid result structure:', result);
                return null;
              }
              
              return (
                <Card key={index} className="bg-card/90 border-blue-500/50 shadow-md">
                  <CardHeader>
                    <CardTitle className="text-xl text-white">
                      Q{index + 1}: {result.question.text || 'Question text unavailable'}
                    </CardTitle>
                  </CardHeader>
                <CardContent>
                  {result.question.type === 'yes_no' ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-400">
                          {result.answers.filter((a: PlayerAnswer) => a.answer === 'yes').length}
                        </div>
                        <div className="text-green-300">Yes</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-400">
                          {result.answers.filter((a: PlayerAnswer) => a.answer === 'no').length}
                        </div>
                        <div className="text-red-300">No</div>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {players.map((player) => {
                        const votes = result.answers.filter((a: PlayerAnswer) => a.answer === player.playerId).length;
                        return (
                          <div key={player.playerId} className="flex justify-between items-center p-2 bg-white/5 rounded">
                            <span className="text-white">{player.playerName}</span>
                            <Badge variant="secondary">{votes} votes</Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                 </CardContent>
               </Card>
              );
            })}
          </div>

          {currentPlayer.isHost && (
            <Card className="bg-card/95 border-blue-500/50 backdrop-blur-sm shadow-xl mt-6">
              <CardContent className="p-4 text-center">
                <Button
                  onClick={resetGame}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  Start New Forms Game
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    );
  }

  return null;
};