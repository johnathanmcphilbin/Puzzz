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
      {/* Top Navigation */}
      <nav className="flex justify-between items-center p-6">
        <div className="text-2xl font-bold text-white">PUZZZZ</div>
        <Button 
          onClick={() => {
            setActiveTab("join");
            setShowDialog(true);
          }}
          className="bg-white/20 backdrop-blur-sm text-white border-white/30 hover:bg-white/30 transition-all duration-300"
          variant="outline"
        >
          Join Room
        </Button>
      </nav>

      {/* Hero Section */}
      <div className="px-6 pb-12">
        <div className="max-w-7xl mx-auto">
          {/* Main Hero */}
          <div className="mb-16">
            <div className="max-w-4xl">
              <img 
                src="/lovable-uploads/a66ddf8b-e796-4ae7-a019-a8e80b5f30ce.png" 
                alt="PUZZZZ"
                className="w-full max-w-2xl mb-8"
              />
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
                Party games that bring people together
              </h1>
              <p className="text-xl md:text-2xl text-white/80 mb-8 max-w-3xl">
                Choose your game, create a room, and dive into endless fun with friends
              </p>
            </div>
          </div>

          {/* Games Section */}
          <div className="mb-8">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-8">Games</h2>
          </div>
        </div>
      </div>

      {/* Games Grid - Netflix Style */}
      <div className="px-6 max-w-7xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          
          {/* Would You Rather */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("would_you_rather")}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-game-option-a to-game-option-b relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <img 
                src="/lovable-uploads/e1223d72-4579-4d9b-a783-c817eb336925.png" 
                alt="Would You Rather"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 68%' }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Would You Rather</h3>
                <p className="text-white/80 text-sm">Party Game • 2+ Players</p>
              </div>
            </div>
          </div>

          {/* Paranoia */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("paranoia")}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-violet-500 to-purple-600 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <img 
                src="/lovable-uploads/25019112-f839-4cf5-9cee-9a7d609be518.png" 
                alt="Paranoia"
                className="w-full h-full object-cover"
                style={{ objectPosition: 'center 65%' }}
              />
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Paranoia</h3>
                <p className="text-white/80 text-sm">Whisper Game • 3+ Players</p>
              </div>
            </div>
          </div>

          {/* Odd One Out */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("odd-one-out")}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-amber-500 to-orange-600 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 bg-white flex items-center justify-center">
                <img 
                  src="/lovable-uploads/4e6b1f5d-d7f0-40a7-bf86-96b9457c20f8.png" 
                  alt="Odd One Out"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Odd One Out</h3>
                <p className="text-white/80 text-sm">Detective Game • 3+ Players</p>
              </div>
            </div>
          </div>

          {/* Dramamatching */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("dramamatching")}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-pink-500 to-purple-600 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl">🎭</div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  BETA
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Dramamatching</h3>
                <p className="text-white/80 text-sm">AI Selfie Game • 2+ Players</p>
              </div>
            </div>
          </div>

          {/* Forms Game */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("forms")}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-indigo-500 to-blue-600 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl">📋</div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  BETA
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Forms Game</h3>
                <p className="text-white/80 text-sm">AI Poll Game • 2+ Players</p>
              </div>
            </div>
          </div>

          {/* Say it or pay it */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("say_it_or_pay_it")}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-red-500 to-orange-600 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl">🔥</div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  BETA
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Say it or pay it</h3>
                <p className="text-white/80 text-sm">Truth or Dare • 2-6 Players</p>
              </div>
            </div>
          </div>

          {/* Cat Conspiracy */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick('coup')}
          >
            <div className="aspect-[3/4] bg-gradient-to-br from-purple-500 to-blue-500 relative overflow-hidden rounded-lg">
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-8xl">👑</div>
              </div>
              <div className="absolute top-2 right-2">
                <span className="bg-orange-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                  BETA
                </span>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Cat Conspiracy</h3>
                <p className="text-white/80 text-sm">Bluffing & Strategy • 2-10 players</p>
              </div>
            </div>
          </div>

          {/* Puzzz Panic */}
          <div 
            className="group cursor-pointer transition-all duration-300 hover:scale-105"
            onClick={() => handleGameClick("puzzz_panic")}
          >
            <div className="aspect-[3/4] relative overflow-hidden rounded-lg" style={{backgroundColor: '#4c5bd4'}}>
              <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all duration-300" />
              <div className="absolute inset-0 flex items-center justify-center">
                <img 
                  src="/lovable-uploads/f3e4c1e6-0768-4256-bb63-274764483b98.png" 
                  alt="Puzzz Panic"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <h3 className="text-white font-bold text-lg mb-1">Puzzz Panic</h3>
                <p className="text-white/80 text-sm">Fast Action • 1-250 Players</p>
              </div>
            </div>
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