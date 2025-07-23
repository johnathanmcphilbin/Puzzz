import { useState } from "react";
import { CreateRoom } from "@/components/CreateRoom";
import { JoinRoom } from "@/components/JoinRoom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Info } from "lucide-react";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [showDialog, setShowDialog] = useState(false);
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
          {/* Mobile-friendly join button */}
          <div className="flex justify-center mb-4 md:hidden">
            <Button 
              onClick={() => {
                setActiveTab("join");
                setShowDialog(true);
              }}
              variant="outline"
              size="sm"
            >
              Join Room
            </Button>
          </div>
          
          {/* Desktop join button */}
          <div className="hidden md:block relative">
            <Button 
              onClick={() => {
                setActiveTab("join");
                setShowDialog(true);
              }}
              className="absolute top-0 right-0"
              variant="outline"
            >
              Join Room
            </Button>
          </div>
          
          {/* Title Card Widget */}
          <Card className="mx-auto max-w-2xl mb-6 bg-card border-2 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl md:text-5xl font-pixel text-foreground tracking-wider leading-relaxed">
                PUZZZZ
              </CardTitle>
              <CardDescription className="text-base md:text-xl text-muted-foreground px-4">
                The ultimate party game platform. Create rooms, join friends, and enjoy endless entertainment together.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Games Selection */}
        <div className="max-w-7xl mx-auto">
          <Card className="mx-auto max-w-md mb-8 bg-card border-2 shadow-lg">
            <CardHeader className="pb-4">
              <CardTitle className="text-3xl font-bold text-center text-foreground">
                Choose Your Game
              </CardTitle>
            </CardHeader>
          </Card>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-6 max-w-4xl mx-auto justify-items-center">
            {/* Would You Rather Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-game-option-a/20 to-game-option-b/20 overflow-hidden h-full"
              onClick={() => handleGameClick("would_you_rather")}
            >
              <div className="aspect-video bg-gradient-to-br from-game-option-a to-game-option-b relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/e1223d72-4579-4d9b-a783-c817eb336925.png" 
                    alt="Would You Rather - Character vs Character"
                    className="w-full h-full object-cover object-center"
                    style={{ objectPosition: 'center 68%' }}
                  />
                </div>
                <div className="absolute top-1 right-1 sm:top-3 sm:right-3">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex flex-col h-[calc(100%-theme(aspectRatio.video)*100vw)]">
                <CardHeader className="pb-1 sm:pb-2 p-2 sm:p-6 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-lg font-bold truncate">Would You Rather</CardTitle>
                  <Dialog>
                    <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 hover:bg-background/20"
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
                   <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                     <span>Party Game</span>
                     <span>•</span>
                     <span>2+ Players</span>
                   </div>
                </CardHeader>
              </div>
            </Card>

            {/* Paranoia Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-violet-500/20 to-purple-600/20 overflow-hidden h-full"
              onClick={() => handleGameClick("paranoia")}
            >
              <div className="aspect-video bg-gradient-to-br from-violet-500 to-purple-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/25019112-f839-4cf5-9cee-9a7d609be518.png" 
                    alt="Paranoia - Mysterious character with swirling eyes"
                    className="w-full h-full object-cover object-center"
                    style={{ objectPosition: 'center 65%' }}
                  />
                </div>
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    NEW
                  </span>
                </div>
              </div>
              <div className="flex flex-col h-[calc(100%-theme(aspectRatio.video)*100vw)]">
                <CardHeader className="pb-1 sm:pb-2 p-2 sm:p-6 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-lg font-bold truncate">Paranoia</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 hover:bg-background/20"
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
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                    <span>Whisper Game</span>
                    <span>•</span>
                    <span>3+ Players</span>
                  </div>
                </CardHeader>
              </div>
            </Card>

            {/* Odd One Out Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-amber-500/20 to-orange-600/20 overflow-hidden h-full"
              onClick={() => handleGameClick("odd-one-out")}
            >
              <div className="aspect-video bg-gradient-to-br from-amber-500 to-orange-600 relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <img 
                    src="/lovable-uploads/97e3edcc-c426-4315-8b63-294a6edaf30b.png" 
                    alt="Odd One Out - Detective puzzle game"
                    className="w-full h-full object-cover object-center"
                    style={{ objectPosition: 'center 50%' }}
                  />
                </div>
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex flex-col h-[calc(100%-theme(aspectRatio.video)*100vw)]">
                <CardHeader className="pb-1 sm:pb-2 p-2 sm:p-6 flex-shrink-0">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm sm:text-lg font-bold truncate">Odd One Out</CardTitle>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="h-6 w-6 p-0 hover:bg-background/20"
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
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                    <span>Detective Game</span>
                    <span>•</span>
                    <span>3+ Players</span>
                  </div>
                </CardHeader>
              </div>
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
    </div>
  );
};

export default Index;