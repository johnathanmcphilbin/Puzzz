import { useState } from "react";
import { CreateRoom } from "@/components/CreateRoom";
import { JoinRoom } from "@/components/JoinRoom";
import { AuthDialog } from "@/components/AuthDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info, User } from "lucide-react";
import { FEATURES } from "@/config/featureFlags";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [showDialog, setShowDialog] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("would_you_rather");

  const handleGameClick = (gameType: string) => {
    setSelectedGame(gameType);
    setActiveTab("create");
    setShowDialog(true);
  };

  return (
    <div className="min-h-screen gradient-bg">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-12">
          {/* Mobile-friendly buttons */}
          <div className="flex justify-center gap-2 mb-4 md:hidden">
            <Button 
              onClick={() => setShowAuthDialog(true)}
              variant="outline"
              size="sm"
              className="bg-[hsl(var(--join-game))] text-white border-[hsl(var(--join-game))] hover:bg-[hsl(var(--join-game)/0.9)]"
            >
              <User className="h-4 w-4 mr-2" />
              Account
            </Button>
            <Button 
              onClick={() => {
                setActiveTab("join");
                setShowDialog(true);
              }}
              variant="outline"
              size="sm"
              className="bg-[hsl(var(--join-game))] text-white border-[hsl(var(--join-game))] hover:bg-[hsl(var(--join-game)/0.9)]"
            >
              Join Room
            </Button>
          </div>
          
          {/* Desktop join button and auth button */}
          <div className="hidden md:block relative">
            <div className="absolute top-0 right-0 flex gap-2">
              <Button 
                onClick={() => setShowAuthDialog(true)}
                variant="outline"
                size="sm"
                className="bg-[hsl(var(--join-game))] text-white border-[hsl(var(--join-game))] hover:bg-[hsl(var(--join-game)/0.9)]"
              >
                <User className="h-4 w-4 mr-2" />
                Account
              </Button>
              <Button 
                onClick={() => {
                  setActiveTab("join");
                  setShowDialog(true);
                }}
                className="bg-[hsl(var(--join-game))] text-white border-[hsl(var(--join-game))] hover:bg-[hsl(var(--join-game)/0.9)]"
                variant="outline"
              >
                Join Room
              </Button>
            </div>
          </div>
          
          {/* Title Card Widget */}
          <Card className="mx-auto max-w-2xl mb-6 bg-background/80 md:bg-card border-2 shadow-lg backdrop-blur-sm">
            <CardHeader className="pb-4">
              <div className="flex justify-center">
                <img 
                  src="/lovable-uploads/a66ddf8b-e796-4ae7-a019-a8e80b5f30ce.png" 
                  alt="PUZZZZ - Design Your Own Chaos"
                  className="max-w-full h-auto"
                />
              </div>
              <CardDescription className="text-base md:text-xl text-foreground/90 md:text-muted-foreground px-4">
                The ultimate party game platform. Create rooms, join friends, and enjoy endless entertainment together.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Games Selection */}
        <div className="max-w-6xl mx-auto">
          <Card className="mx-auto max-w-md mb-8 bg-card border-2 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-center text-foreground">
                Choose Your Game
              </CardTitle>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6 items-stretch">
            {/* Would You Rather Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-game-option-a/20 to-game-option-b/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("would_you_rather")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-game-option-a to-game-option-b">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/e1223d72-4579-4d9b-a783-c817eb336925.png" 
                    alt="Would You Rather - Character vs Character"
                    className="w-full h-full object-cover object-center"
                    style={{ objectPosition: 'center 68%' }}
                  />
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Would You Rather</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                          Choose between two options and see how your friends decide! Each round presents thought-provoking scenarios that will spark fun debates and reveal surprising preferences.
                        </p>
                        <div className="space-y-2">
                          <h4 className="font-medium">How to Play:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
                            <li>• Read the "Would You Rather" question</li>
                            <li>• Vote for Option A or Option B</li>
                            <li>• See live voting results from all players</li>
                            <li>• Discuss your choices and reasoning</li>
                            <li>• Host can advance to the next question</li>
                          </ul>
                        </div>
                        <div className="space-y-2">
                          <h4 className="font-medium">Features:</h4>
                          <ul className="text-sm text-muted-foreground space-y-1">
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
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                     <span>Party Game</span>
                     <span>•</span>
                     <span>2+ Players</span>
                   </div>
                </CardHeader>
            </Card>

            {/* Paranoia Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("paranoia")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-violet-500 to-purple-600">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/25019112-f839-4cf5-9cee-9a7d609be518.png" 
                    alt="Paranoia - Mysterious character with swirling eyes"
                    className="w-full h-full object-cover object-center"
                    style={{ objectPosition: 'center 65%' }}
                  />
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Paranoia</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                            Read a secret question, whisper someone's name as your answer, then flip a coin to see if the question gets revealed to everyone! Creates hilarious paranoia moments.
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Player reads a secret question to themselves</li>
                              <li>• Whisper your answer (someone's name) to one player</li>
                              <li>• Everyone sees who you chose, but not the question</li>
                              <li>• Flip a coin to decide if the question is revealed</li>
                              <li>• If revealed, everyone learns what the question was!</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Features:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Mysterious and suspenseful gameplay</li>
                              <li>• 30-second timers for each phase</li>
                              <li>• Perfect for groups of 3+ players</li>
                              <li>• Creates memorable moments and inside jokes</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                    <span>Whisper Game</span>
                    <span>•</span>
                    <span>3+ Players</span>
                  </div>
                </CardHeader>
            </Card>

            {/* Odd One Out Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("odd-one-out")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-amber-500 to-orange-600">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/4e6b1f5d-d7f0-40a7-bf86-96b9457c20f8.png" 
                    alt="Odd One Out - Detective puzzle game"
                    className="w-full h-full object-cover object-center"
                  />
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Odd One Out</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                            Everyone gets the same prompt except one secret Imposter who gets a twist! Answer, defend your choice, then vote to find the Imposter.
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Everyone gets a prompt (except the Imposter gets a different one)</li>
                              <li>• Pick any word or phrase that fits your prompt</li>
                              <li>• Defend your answer (30 seconds max)</li>
                              <li>• Discuss and vote for the suspected Imposter (2 min)</li>
                              <li>• Reveal results and score points</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Scoring:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Right guess: players get +1 ★ each</li>
                              <li>• Wrong guess: Imposter gets +2 ★</li>
                              <li>• Perfect for 3+ players</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                    <span>Detective Game</span>
                    <span>•</span>
                    <span>3+ Players</span>
                  </div>
                </CardHeader>
            </Card>

            {/* Dramamatching Game (feature-flagged) */}
            {FEATURES.dramamatching && (
              <Card 
                className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-pink-500/20 to-purple-600/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
                onClick={() => handleGameClick("dramamatching")}
              >
                <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-pink-500 to-purple-600">
                  <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-6xl">🎭</div>
                  </div>
                  <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                    <span className="bg-orange-500 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                      BETA
                    </span>
                  </div>
                </div>
                  <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Dramamatching</CardTitle>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                              className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                            onClick={(e) => e.stopPropagation()}
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
                              Snap a selfie and let our AI Drama Engine analyze your romantic chemistry, friendship potential, and enemy rivalry with other players!
                            </p>
                            <div className="space-y-2">
                              <h4 className="font-medium">How to Play:</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• Take a selfie using your camera</li>
                                <li>• AI randomly matches you with another player</li>
                                <li>• Get Romance, Friendship, and Enemy percentages</li>
                                <li>• Read the dramatic AI commentary</li>
                                <li>• Share the chaos with your friends!</li>
                              </ul>
                            </div>
                            <div className="space-y-2">
                              <h4 className="font-medium">Features:</h4>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                <li>• AI-powered selfie analysis</li>
                                <li>• Dramatic personality matching</li>
                                <li>• Hilarious AI commentary</li>
                                <li>• Perfect for parties and social gatherings</li>
                              </ul>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                     <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                      <span>AI Selfie Game</span>
                      <span>•</span>
                      <span>2+ Players</span>
                    </div>
                  </CardHeader>
              </Card>
            )}


            {/* Forms Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-indigo-500/20 to-blue-600/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("forms")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-indigo-500 to-blue-600">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl">📋</div>
                </div>
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-orange-500 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    BETA
                  </span>
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Forms Game</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                           className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                            AI generates bite-size questions based on your group, players vote on their favorites, then everyone answers yes/no polls and "most likely to" questions!
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Host enters a topic or theme for the group</li>
                              <li>• AI generates 20+ custom questions</li>
                              <li>• Everyone votes for their favorite questions</li>
                              <li>• Play starts with top-voted questions</li>
                              <li>• Answer yes/no polls and "most likely to" questions</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Features:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
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
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                    <span>AI Poll Game</span>
                    <span>•</span>
                    <span>2+ Players</span>
                  </div>
                </CardHeader>
            </Card>

            {/* Say it or pay it Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-red-500/20 to-orange-600/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("say_it_or_pay_it")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-red-500 to-orange-600">
                <img
                  src="/lovable-uploads/5bd080a5-1ea5-405f-b40e-961faf9e36eb.png"
                  alt="Say It or Pay It game thumbnail"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                  loading="lazy"
                  decoding="async"
                />
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-orange-500 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    BETA
                  </span>
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Say it or pay it</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                           className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                            Answer bold questions honestly or face hilarious forfeits! Each round puts one player in the hot seat to face truth or consequences.
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• One player sits in the "hot seat" each round</li>
                              <li>• Other players submit spicy questions</li>
                              <li>• AI generates additional questions (Mild/Spicy/Nuclear)</li>
                              <li>• Hot seat player: Answer honestly OR take a forfeit</li>
                              <li>• Rotate to next player and repeat</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Features:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Three spice levels: 😊 Mild, 🌶️ Spicy, 🔥 Nuclear</li>
                              <li>• AI-generated bold questions</li>
                              <li>• Random forfeit challenges</li>
                              <li>• Perfect for breaking the ice</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                    <span>Truth or Dare</span>
                    <span>•</span>
                    <span>2-6 Players</span>
                  </div>
                </CardHeader>
            </Card>

            {/* Demo Day Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-blue-500/20 to-indigo-600/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("dogpatch")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-blue-500 to-indigo-600">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/8ccd92fd-4776-432c-98c6-8098017d1b36.png" 
                    alt="Demo Day - Team photo quiz"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    DEMO
                  </span>
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Demo Day</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                           className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Info className="h-3 w-3 sm:h-4 sm:w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle>Demo Day</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            Guess Who-style photo game featuring team members! Look at photos and identify who's who with multiple choice answers.
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• View a photo of a team member</li>
                              <li>• Choose from 4 name options</li>
                              <li>• 15 seconds to answer each question</li>
                              <li>• Earn points for correct answers</li>
                              <li>• Compete for the highest score!</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Features:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• 16 hardcoded questions</li>
                              <li>• Real-time scoring system</li>
                              <li>• Perfect for presentations</li>
                              <li>• Team building activity</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                    <span>Quiz Game</span>
                    <span>•</span>
                    <span>2+ Players</span>
                  </div>
                </CardHeader>
            </Card>

            {/* Cat Conspiracy Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-purple-500/20 to-blue-500/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick('coup')}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-purple-500 to-blue-500">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-6xl">👑</div>
                </div>
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-orange-500 text-white px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    BETA
                  </span>
                </div>
              </div>
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Cat Conspiracy</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                           className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                            A game of deduction, deception, and cute cats! Use bluffing and strategy to be the last player standing.
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">How to Play:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Each player starts with 2 coins and 2 influence cards</li>
                              <li>• Take turns performing actions with cat characters</li>
                              <li>• Bluff about your cards or challenge others</li>
                              <li>• Lose influence when challenged or attacked</li>
                              <li>• Last player with influence wins!</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Cat Characters:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• 🩰 Ballet Cat: Tax (3 coins), Block Foreign Aid</li>
                              <li>• 🦕 Dino Cat: Assassinate opponents</li>
                              <li>• ✨ Aura Cat: Steal coins from others</li>
                              <li>• 😎 Chill Cat: Exchange cards, Block stealing</li>
                              <li>• 👑 Princess Cat: Block assassination</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                   <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
                    <span>Bluffing & Strategy</span>
                    <span>•</span>
                    <span>2-10 players</span>
                  </div>
                </CardHeader>
            </Card>

            {/* Puzzz Panic Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-red-500/20 to-yellow-500/20 overflow-hidden h-[20rem] sm:h-[22rem] md:h-[24rem] flex flex-col items-stretch"
              onClick={() => handleGameClick("puzzz_panic")}
            >
              <div className="relative overflow-hidden flex-1 min-h-[11rem] sm:min-h-[12rem] bg-gradient-to-br from-red-500 to-yellow-500">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src="/lovable-uploads/f3e4c1e6-0768-4256-bb63-274764483b98.png" 
                  alt="Puzzz Panic - Fast-paced challenge game"
                  className="w-full h-full object-cover"
                />
              </div>
              </div>
              
                <CardHeader className="shrink-0 p-3 sm:p-4 flex flex-col gap-1 space-y-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg sm:text-xl font-semibold leading-tight line-clamp-1">Puzzz Panic</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="ml-auto h-6 w-6 p-0 hover:bg-background/20"
                          onClick={(e) => e.stopPropagation()}
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
                            Fast-paced, interactive party game with 15 different rapid-fire challenges! Tap, swipe, think fast - each challenge completed in under 20 seconds.
                          </p>
                          <div className="space-y-2">
                            <h4 className="font-medium">Challenge Types:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• Tap to Ten - Tap exactly 10 times as fast as possible</li>
                              <li>• Color Flash - Tap the word that matches its text</li>
                              <li>• Reaction Time - Tap when the screen turns green</li>
                              <li>• Quick Math - Solve equations rapidly</li>
                              <li>• Memory Games - Pattern matching and recall</li>
                              <li>• + 10 more exciting challenges!</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Features:</h4>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              <li>• 10 random challenges per game</li>
                              <li>• Speed and accuracy scoring</li>
                              <li>• Live leaderboard updates</li>
                              <li>• Perfect for large groups (up to 250 players)</li>
                            </ul>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
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
              <div className="inline-flex bg-card rounded-lg p-1 shadow-sm border">
                <Button
                  variant={activeTab === "create" ? "default" : "ghost"}
                  onClick={() => setActiveTab("create")}
                  className="px-6 py-2"
                >
                  Create Room
                </Button>
                <Button
                  variant={activeTab === "join" ? "default" : "ghost"}
                  onClick={() => setActiveTab("join")}
                  className="px-6 py-2"
                >
                  Join Room
                </Button>
              </div>
            </div>
            {activeTab === "create" ? <CreateRoom selectedGame={selectedGame} /> : <JoinRoom />}
          </div>
        </DialogContent>
      </Dialog>

      {/* Auth Dialog */}
      <AuthDialog open={showAuthDialog} onOpenChange={setShowAuthDialog} />
    </div>
  );
};

export default Index;