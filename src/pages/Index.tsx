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
        <div className="text-center mb-12">
          <h1 className="text-6xl font-bold text-foreground mb-4 tracking-tight">
            Puzzz
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The ultimate party game platform. Create rooms, join friends, and enjoy endless entertainment together.
          </p>
        </div>

        {/* Games Selection */}
        <div className="max-w-7xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
            Choose Your Game
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {/* Would You Rather Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-game-option-a/20 to-game-option-b/20 overflow-hidden"
              onClick={handleGameClick}
            >
              <div className="aspect-video bg-gradient-to-br from-game-option-a to-game-option-b relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl font-bold mb-2">A vs B</div>
                    <div className="text-sm opacity-90">Choose Your Side</div>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-medium">
                    LIVE
                  </span>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Would You Rather</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Party Game</span>
                  <span>•</span>
                  <span>2-10 Players</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm line-clamp-2">
                  Make tough choices and see how your friends decide. Over 200 thought-provoking scenarios await!
                </CardDescription>
              </CardContent>
            </Card>

            {/* Forms Game */}
            <Card 
              className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl border-0 bg-gradient-to-br from-primary/20 to-secondary/20 overflow-hidden"
              onClick={handleGameClick}
            >
              <div className="aspect-video bg-gradient-to-br from-primary to-secondary relative overflow-hidden">
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <div className="text-4xl font-bold mb-2">📋</div>
                    <div className="text-sm opacity-90">Survey Time</div>
                  </div>
                </div>
                <div className="absolute top-3 right-3">
                  <span className="bg-success text-success-foreground px-2 py-1 rounded-full text-xs font-medium">
                    NEW
                  </span>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold">Forms Game</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Survey Game</span>
                  <span>•</span>
                  <span>3-10 Players</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm line-clamp-2">
                  Answer fun questions about your friends! Who's most likely to get arrested? Find out together.
                </CardDescription>
              </CardContent>
            </Card>

            {/* Coming Soon Games */}
            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20">
              <div className="aspect-video bg-muted/50 relative overflow-hidden flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-2xl font-bold mb-1">🎯</div>
                  <div className="text-sm">Coming Soon</div>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-muted-foreground">Trivia Challenge</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Quiz Game</span>
                  <span>•</span>
                  <span>2-8 Players</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm line-clamp-2">
                  Test your knowledge across various categories in this fast-paced trivia game.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20">
              <div className="aspect-video bg-muted/50 relative overflow-hidden flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-2xl font-bold mb-1">🎨</div>
                  <div className="text-sm">Coming Soon</div>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-muted-foreground">Draw & Guess</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Creative Game</span>
                  <span>•</span>
                  <span>3-12 Players</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm line-clamp-2">
                  Express your creativity and guess what others are drawing in this hilarious party game.
                </CardDescription>
              </CardContent>
            </Card>

            <Card className="group cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg border-dashed border-2 border-muted-foreground/30 bg-muted/20">
              <div className="aspect-video bg-muted/50 relative overflow-hidden flex items-center justify-center">
                <div className="text-center text-muted-foreground">
                  <div className="text-2xl font-bold mb-1">🎭</div>
                  <div className="text-sm">Coming Soon</div>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-bold text-muted-foreground">Truth or Dare</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Social Game</span>
                  <span>•</span>
                  <span>3-10 Players</span>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <CardDescription className="text-sm line-clamp-2">
                  The classic party game with modern twists and age-appropriate challenges.
                </CardDescription>
              </CardContent>
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
