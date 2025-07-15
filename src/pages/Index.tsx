import { useState } from "react";
import { CreateRoom } from "@/components/CreateRoom";
import { JoinRoom } from "@/components/JoinRoom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Index = () => {
  const [activeTab, setActiveTab] = useState<"create" | "join">("create");
  const [showDialog, setShowDialog] = useState(false);

  const handleGameClick = () => {
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
              <CardTitle className="text-4xl md:text-6xl font-bold text-foreground tracking-tight">
                Puzzz
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
              onClick={handleGameClick}
            >
              <div className="aspect-[3/4] sm:aspect-video bg-gradient-to-br from-game-option-a to-game-option-b relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-4xl font-bold mb-1 sm:mb-2">A vs B</div>
                    <div className="text-[10px] sm:text-sm opacity-90">Choose Your Side</div>
                  </div>
                </div>
                <div className="absolute top-1 right-1 sm:top-3 sm:right-3">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    LIVE
                  </span>
                </div>
              </div>
              <div className="flex flex-col h-[calc(100%-theme(aspectRatio.3/4)*100vw)] sm:h-[calc(100%-theme(aspectRatio.video)*100vw)]">
                <CardHeader className="pb-1 sm:pb-2 p-2 sm:p-6 flex-shrink-0">
                  <CardTitle className="text-sm sm:text-lg font-bold truncate">Would You Rather</CardTitle>
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                    <span>Party Game</span>
                    <span>•</span>
                    <span>2-10 Players</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 p-2 sm:p-6 sm:pt-0 hidden sm:block flex-1">
                  <CardDescription className="text-xs sm:text-sm line-clamp-2">
                    Make tough choices and see how your friends decide. Over 200 thought-provoking scenarios await!
                  </CardDescription>
                </CardContent>
              </div>
            </Card>

            {/* Forms Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden h-full"
              onClick={handleGameClick}
            >
              <div className="aspect-[3/4] sm:aspect-video bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-4xl font-bold mb-1 sm:mb-2">📋</div>
                    <div className="text-[10px] sm:text-sm opacity-90">Survey Time</div>
                  </div>
                </div>
                <div className="absolute top-1 right-1 sm:top-3 sm:right-3">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    NEW
                  </span>
                </div>
              </div>
              <div className="flex flex-col h-[calc(100%-theme(aspectRatio.3/4)*100vw)] sm:h-[calc(100%-theme(aspectRatio.video)*100vw)]">
                <CardHeader className="pb-1 sm:pb-2 p-2 sm:p-6 flex-shrink-0">
                  <CardTitle className="text-sm sm:text-lg font-bold truncate">Forms Game</CardTitle>
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                    <span>Survey Game</span>
                    <span>•</span>
                    <span>3-10 Players</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 p-2 sm:p-6 sm:pt-0 hidden sm:block flex-1">
                  <CardDescription className="text-xs sm:text-sm line-clamp-2">
                    Answer fun questions about your friends! Who's most likely to get arrested? Find out together.
                  </CardDescription>
                </CardContent>
              </div>
            </Card>

            {/* Paranoia Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-destructive/20 to-warning/20 overflow-hidden h-full"
              onClick={handleGameClick}
            >
              <div className="aspect-[3/4] sm:aspect-video bg-gradient-to-br from-destructive to-warning relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-lg sm:text-4xl font-bold mb-1 sm:mb-2">🤫</div>
                    <div className="text-[10px] sm:text-sm opacity-90">Secrets & Suspense</div>
                  </div>
                </div>
                <div className="absolute top-1 right-1 sm:top-2 sm:right-2">
                  <span className="bg-destructive text-destructive-foreground px-1 py-0.5 sm:px-2 sm:py-1 rounded-full text-[8px] sm:text-xs font-medium">
                    NEW
                  </span>
                </div>
              </div>
              <div className="flex flex-col h-[calc(100%-theme(aspectRatio.3/4)*100vw)] sm:h-[calc(100%-theme(aspectRatio.video)*100vw)]">
                <CardHeader className="pb-1 sm:pb-2 p-2 sm:p-6 flex-shrink-0">
                  <CardTitle className="text-sm sm:text-lg font-bold truncate">Paranoia</CardTitle>
                  <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-sm text-muted-foreground">
                    <span>Whisper Game</span>
                    <span>•</span>
                    <span>2-10 Players</span>
                  </div>
                </CardHeader>
                <CardContent className="pt-0 p-2 sm:p-6 sm:pt-0 hidden sm:block flex-1">
                  <CardDescription className="text-xs sm:text-sm line-clamp-2">
                    Read secret questions, name someone, then let fate decide if the question gets revealed!
                  </CardDescription>
                </CardContent>
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
            {activeTab === "create" ? <CreateRoom /> : <JoinRoom />}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Index;