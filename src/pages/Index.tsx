import { useState } from 'react';
import { CreateRoom } from '@/components/CreateRoom';
import { JoinRoom } from '@/components/JoinRoom';
import { AuthDialog } from '@/components/AuthDialog';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Info, User } from 'lucide-react';
import { FEATURES } from '@/config/featureFlags';
import {
  wouldYouRatherImg,
  paranoiaGameImg,
  oddOneOutImg,
  coupGameImg,
  sayItOrPayItImg,
  catConspiracyImg,
  formsGameImg,
  puzzlePanicImg,
} from '@/assets/gameImages';

const Index = () => {
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [showDialog, setShowDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>('would_you_rather');

  const handleGameClick = (gameType: string) => {
    setSelectedGame(gameType);
    setActiveTab('create');
    setShowDialog(true);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundImage: 'url(/src/assets/main-background.png)',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 text-center md:mb-12">
          {/* Mobile-friendly buttons */}
          <div className="mb-4 flex justify-center gap-2 md:hidden">
            <Button
              onClick={() => setShowAuthDialog(true)}
              variant="outline"
              size="sm"
              className="border-[hsl(var(--join-game))] bg-[hsl(var(--join-game))] text-white hover:bg-[hsl(var(--join-game)/0.9)]"
            >
              <User className="mr-2 h-4 w-4" />
              Account
            </Button>
            <Button
              onClick={() => {
                setActiveTab('join');
                setShowDialog(true);
              }}
              variant="outline"
              size="sm"
              className="border-[hsl(var(--join-game))] bg-[hsl(var(--join-game))] text-white hover:bg-[hsl(var(--join-game)/0.9)]"
            >
              Join Room
            </Button>
          </div>

          {/* Desktop join button and auth button */}
          <div className="relative hidden md:block">
            <div className="absolute right-0 top-0 flex gap-2">
              <Button
                onClick={() => setShowAuthDialog(true)}
                variant="outline"
                size="sm"
                className="border-[hsl(var(--join-game))] bg-[hsl(var(--join-game))] text-white hover:bg-[hsl(var(--join-game)/0.9)]"
              >
                <User className="mr-2 h-4 w-4" />
                Account
              </Button>
              <Button
                onClick={() => {
                  setActiveTab('join');
                  setShowDialog(true);
                }}
                className="border-[hsl(var(--join-game))] bg-[hsl(var(--join-game))] text-white hover:bg-[hsl(var(--join-game)/0.9)]"
                variant="outline"
              >
                Join Room
              </Button>
            </div>
          </div>

          {/* Title and Blurb Container */}
          <div className="mx-auto mb-8 max-w-3xl rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
            <h1 className="mb-4 text-6xl font-bold tracking-wider text-black md:text-8xl">
              PUZZZZ
            </h1>
            <p className="mx-auto max-w-2xl text-lg text-gray-600 md:text-xl">
              The ultimate party game platform. Create rooms, join friends, and
              enjoy endless entertainment together.
            </p>
          </div>
        </div>

        {/* Games Selection */}
        <div className="mx-auto max-w-6xl">
          <div className="mx-auto mb-8 max-w-md rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-center text-3xl font-bold text-black">
              Choose Your Game
            </h2>
          </div>

          <div className="mx-auto grid max-w-[85%] grid-cols-1 items-stretch gap-4 sm:grid-cols-2 md:gap-6 lg:grid-cols-3 xl:grid-cols-3">
            {/* Would You Rather Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-game-option-a/20 to-game-option-b/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('would_you_rather')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-game-option-a to-game-option-b sm:min-h-[10rem]">
                <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={wouldYouRatherImg}
                    alt="Would You Rather - Character vs Character"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Would You Rather
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Would You Rather</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Choose between two options and see how your friends
                          decide! Each round presents thought-provoking
                          scenarios that will spark fun debates and reveal
                          surprising preferences.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Read the "Would You Rather" question</li>
                            <li>• Vote for Option A or Option B</li>
                            <li>• See live voting results from all players</li>
                            <li>• Discuss your choices and reasoning</li>
                            <li>• Host can advance to the next question</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Features:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Over 200 unique questions</li>
                            <li>• 30-second voting timer</li>
                            <li>• Real-time vote tracking</li>
                            <li>• Perfect for 2+ players</li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>Party Game</span>
                  <span>•</span>
                  <span>2+ Players</span>
                </div>
              </CardHeader>
            </Card>

            {/* Paranoia Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('paranoia')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-violet-500 to-purple-600 sm:min-h-[10rem]">
                <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={paranoiaGameImg}
                    alt="Paranoia - Mysterious character with swirling eyes"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Paranoia
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Paranoia</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Read a secret question, whisper someone's name as your
                          answer, then flip a coin to see if the question gets
                          revealed to everyone! Creates hilarious paranoia
                          moments.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Player reads a secret question to themselves
                            </li>
                            <li>
                              • Whisper your answer (someone's name) to one
                              player
                            </li>
                            <li>
                              • Everyone sees who you chose, but not the
                              question
                            </li>
                            <li>
                              • Flip a coin to decide if the question is
                              revealed
                            </li>
                            <li>
                              • If revealed, everyone learns what the question
                              was!
                            </li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Features:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Mysterious and suspenseful gameplay</li>
                            <li>• 30-second timers for each phase</li>
                            <li>• Perfect for groups of 3+ players</li>
                            <li>
                              • Creates memorable moments and inside jokes
                            </li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>Whisper Game</span>
                  <span>•</span>
                  <span>3+ Players</span>
                </div>
              </CardHeader>
            </Card>

            {/* Odd One Out Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('odd-one-out')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-amber-500 to-orange-600 sm:min-h-[10rem]">
                <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={oddOneOutImg}
                    alt="Odd One Out - Detective puzzle game"
                    className="h-full w-full object-cover object-center"
                  />
                </div>
              </div>
              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Odd One Out
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Odd One Out - Puzzz Edition</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Everyone gets the same prompt except one secret
                          Imposter who gets a twist! Answer, defend your choice,
                          then vote to find the Imposter.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Everyone gets a prompt (except the Imposter gets
                              a different one)
                            </li>
                            <li>
                              • Pick any word or phrase that fits your prompt
                            </li>
                            <li>• Defend your answer (30 seconds max)</li>
                            <li>
                              • Discuss and vote for the suspected Imposter (2
                              min)
                            </li>
                            <li>• Reveal results and score points</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Scoring:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• Right guess: players get +1 ★ each</li>
                            <li>• Wrong guess: Imposter gets +2 ★</li>
                            <li>• Perfect for 3+ players</li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>Detective Game</span>
                  <span>•</span>
                  <span>3+ Players</span>
                </div>
              </CardHeader>
            </Card>

            {/* Dramamatching Game (feature-flagged) */}
            {FEATURES.dramamatching && (
              <Card
                className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
                onClick={() => handleGameClick('dramamatching')}
              >
                <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-pink-500 to-purple-600 sm:min-h-[10rem]">
                  <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl">🎭</div>
                  </div>
                  <div className="absolute right-1 top-1 sm:right-2 sm:top-2">
                    <span className="rounded-full bg-orange-500 px-1 py-0.5 text-[8px] font-medium text-white sm:px-2 sm:py-1 sm:text-xs">
                      BETA
                    </span>
                  </div>
                </div>
                <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                  <div className="flex items-center gap-2">
                    <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                      Dramamatching
                    </CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={e => e.stopPropagation()}
                        >
                          <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>🎭 Dramamatching</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Snap a selfie and let our AI Drama Engine analyze
                            your romantic chemistry, friendship potential, and
                            enemy rivalry with other players!
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              <li>• Take a selfie using your camera</li>
                              <li>
                                • AI randomly matches you with another player
                              </li>
                              <li>
                                • Get Romance, Friendship, and Enemy percentages
                              </li>
                              <li>• Read the dramatic AI commentary</li>
                              <li>• Share the chaos with your friends!</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Features:</h4>
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              <li>• AI-powered selfie analysis</li>
                              <li>• Dramatic personality matching</li>
                              <li>• Hilarious AI commentary</li>
                              <li>
                                • Perfect for parties and social gatherings
                              </li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                    <span>AI Selfie Game</span>
                    <span>•</span>
                    <span>2+ Players</span>
                  </div>
                </CardHeader>
              </Card>
            )}

            {/* Forms Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('forms')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-indigo-500 to-blue-600 sm:min-h-[10rem]">
                <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={formsGameImg}
                    alt="Forms Game - Survey questions"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute right-1 top-1 sm:right-2 sm:top-2">
                  <span className="rounded-full bg-orange-500 px-1 py-0.5 text-[8px] font-medium text-white sm:px-2 sm:py-1 sm:text-xs">
                    BETA
                  </span>
                </div>
              </div>
              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Forms Game
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>📋 Forms Game</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          AI generates bite-size questions based on your group,
                          players vote on their favorites, then everyone answers
                          yes/no polls and "most likely to" questions!
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Host enters a topic or theme for the group
                            </li>
                            <li>• AI generates 20+ custom questions</li>
                            <li>
                              • Everyone votes for their favorite questions
                            </li>
                            <li>• Play starts with top-voted questions</li>
                            <li>
                              • Answer yes/no polls and "most likely to"
                              questions
                            </li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Features:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• AI-powered question generation</li>
                            <li>• Democratic question selection</li>
                            <li>• Real-time voting and results</li>
                            <li>• Perfect for any group size</li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>AI Poll Game</span>
                  <span>•</span>
                  <span>2+ Players</span>
                </div>
              </CardHeader>
            </Card>

            {/* Say it or pay it Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('say_it_or_pay_it')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-red-500 to-orange-600 sm:min-h-[10rem]">
                <img
                  src={sayItOrPayItImg}
                  alt="Say It or Pay It game thumbnail"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute right-1 top-1 sm:right-2 sm:top-2">
                  <span className="rounded-full bg-orange-500 px-1 py-0.5 text-[8px] font-medium text-white sm:px-2 sm:py-1 sm:text-xs">
                    BETA
                  </span>
                </div>
              </div>
              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Say it or pay it
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>🔥 Say it or pay it</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Answer bold questions honestly or face hilarious
                          forfeits! Each round puts one player in the hot seat
                          to face truth or consequences.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • One player sits in the "hot seat" each round
                            </li>
                            <li>• Other players submit spicy questions</li>
                            <li>
                              • AI generates additional questions
                              (Mild/Spicy/Nuclear)
                            </li>
                            <li>
                              • Hot seat player: Answer honestly OR take a
                              forfeit
                            </li>
                            <li>• Rotate to next player and repeat</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Features:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Three spice levels: 😊 Mild, 🌶️ Spicy, 🔥
                              Nuclear
                            </li>
                            <li>• AI-generated bold questions</li>
                            <li>• Random forfeit challenges</li>
                            <li>• Perfect for breaking the ice</li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>Truth or Dare</span>
                  <span>•</span>
                  <span>2-6 Players</span>
                </div>
              </CardHeader>
            </Card>

            {/* Cat Conspiracy Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('coup')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-purple-500 to-blue-500 sm:min-h-[10rem]">
                <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={catConspiracyImg}
                    alt="Cat Conspiracy - Strategy game"
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="absolute right-1 top-1 sm:right-2 sm:top-2">
                  <span className="rounded-full bg-orange-500 px-1 py-0.5 text-[8px] font-medium text-white sm:px-2 sm:py-1 sm:text-xs">
                    BETA
                  </span>
                </div>
              </div>
              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Cat Conspiracy
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>👑 Cat Conspiracy</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          A game of deduction, deception, and cute cats! Use
                          bluffing and strategy to be the last player standing.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Each player starts with 2 coins and 2 influence
                              cards
                            </li>
                            <li>
                              • Take turns performing actions with cat
                              characters
                            </li>
                            <li>
                              • Bluff about your cards or challenge others
                            </li>
                            <li>
                              • Lose influence when challenged or attacked
                            </li>
                            <li>• Last player with influence wins!</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Cat Characters:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • 🩰 Ballet Cat: Tax (3 coins), Block Foreign Aid
                            </li>
                            <li>• 🦕 Dino Cat: Assassinate opponents</li>
                            <li>• ✨ Aura Cat: Steal coins from others</li>
                            <li>
                              • 😎 Chill Cat: Exchange cards, Block stealing
                            </li>
                            <li>• 👑 Princess Cat: Block assassination</li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>Bluffing & Strategy</span>
                  <span>•</span>
                  <span>2-10 players</span>
                </div>
              </CardHeader>
            </Card>

            {/* Puzzz Panic Game */}
            <Card
              className="group flex h-[16rem] cursor-pointer flex-col items-stretch overflow-hidden border-0 bg-gradient-to-br from-red-500/20 to-yellow-500/20 transition-all duration-300 hover:scale-105 hover:shadow-2xl sm:h-[18rem] md:h-[20rem]"
              onClick={() => handleGameClick('puzzz_panic')}
            >
              <div className="relative min-h-[9rem] flex-1 overflow-hidden bg-gradient-to-br from-red-500 to-yellow-500 sm:min-h-[10rem]">
                <div className="absolute inset-0 bg-black/40 transition-all duration-300 group-hover:bg-black/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img
                    src={puzzlePanicImg}
                    alt="Puzzz Panic - Fast-paced challenge game"
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>

              <CardHeader className="flex shrink-0 flex-col gap-1 space-y-0 p-3 sm:p-4">
                <div className="flex items-center gap-2">
                  <CardTitle className="line-clamp-1 text-lg font-semibold leading-tight sm:text-xl">
                    Puzzz Panic
                  </CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                        onClick={e => e.stopPropagation()}
                      >
                        <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>⚡ Puzzz Panic</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <p className="text-sm text-muted-foreground">
                          Fast-paced, interactive party game with 15 different
                          rapid-fire challenges! Tap, swipe, think fast - each
                          challenge completed in under 20 seconds.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">Challenge Types:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>
                              • Tap to Ten - Tap exactly 10 times as fast as
                              possible
                            </li>
                            <li>
                              • Color Flash - Tap the word that matches its text
                            </li>
                            <li>
                              • Reaction Time - Tap when the screen turns green
                            </li>
                            <li>• Quick Math - Solve equations rapidly</li>
                            <li>
                              • Memory Games - Pattern matching and recall
                            </li>
                            <li>• + 10 more exciting challenges!</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Features:</h4>
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            <li>• 10 random challenges per game</li>
                            <li>• Speed and accuracy scoring</li>
                            <li>• Live leaderboard updates</li>
                            <li>
                              • Perfect for large groups (up to 250 players)
                            </li>
                          </ul>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground sm:gap-2">
                  <span>Fast Action</span>
                  <span>•</span>
                  <span>1-250 Players</span>
                </div>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Create/Join Room Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get Started</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border bg-card p-1 shadow-sm">
                <Button
                  variant={activeTab === 'create' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('create')}
                  className="px-6 py-2"
                >
                  Create Room
                </Button>
                <Button
                  variant={activeTab === 'join' ? 'default' : 'ghost'}
                  onClick={() => setActiveTab('join')}
                  className="px-6 py-2"
                >
                  Join Room
                </Button>
              </div>
            </div>
            {activeTab === 'create' ? (
              <CreateRoom selectedGame={selectedGame} />
            ) : (
              <JoinRoom />
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
};

export default Index;
