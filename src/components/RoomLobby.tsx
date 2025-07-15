import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Copy, Play, Users, Crown, LogOut, ThumbsUp, QrCode } from "lucide-react";
import { useNavigate } from "react-router-dom";
import QRCode from "qrcode";

interface Room {
  id: string;
  room_code: string;
  name: string;
  host_id: string;
  current_game: string;
  game_state: any;
  is_active: boolean;
}

interface Player {
  id: string;
  player_name: string;
  player_id: string;
  is_host: boolean;
}

interface RoomLobbyProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

export const RoomLobby = ({ room, players, currentPlayer, onUpdateRoom }: RoomLobbyProps) => {
  const [isStarting, setIsStarting] = useState(false);
  const [selectedGame, setSelectedGame] = useState<string>("would_you_rather");
  const [gameVotes, setGameVotes] = useState<{[key: string]: number}>({});
  const [userVotes, setUserVotes] = useState<{[key: string]: boolean}>({});
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [freakinessLevel, setFreakinessLevel] = useState<number>(3);
  const { toast } = useToast();
  const navigate = useNavigate();

  const generateQRCode = async () => {
    try {
      const joinUrl = `${window.location.origin}/join/${room.room_code}`;
      const qrDataUrl = await QRCode.toDataURL(joinUrl, {
        width: 200,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });
      setQrCodeUrl(qrDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
    }
  };

  useEffect(() => {
    console.log("🚀 Setting up game votes for room:", room.id, "player:", currentPlayer.player_id, "is_host:", currentPlayer.is_host);
    loadGameVotes();
    generateQRCode();
    
    // Set up real-time subscription for game votes
    const channel = supabase
      .channel(`game_votes_${room.id}`) // Consistent channel name
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_requests",
          filter: `room_id=eq.${room.id}`,
        },
        (payload) => {
          console.log("🔄 Real-time update received by", currentPlayer.is_host ? "HOST" : "PLAYER", "Event:", payload.eventType, "New data:", payload.new, "Old data:", payload.old);
          console.log("📊 Current vote counts before reload:", gameVotes);
          console.log("📊 Current user votes before reload:", userVotes);
          loadGameVotes();
        }
      )
      .subscribe((status) => {
        console.log("📡 Game requests subscription status:", status, "for", currentPlayer.is_host ? "HOST" : "PLAYER");
        if (status === 'SUBSCRIBED') {
          console.log("✅ Successfully subscribed to game requests changes as", currentPlayer.is_host ? "HOST" : "PLAYER");
        } else if (status === 'CHANNEL_ERROR') {
          console.error("❌ Channel error for", currentPlayer.is_host ? "HOST" : "PLAYER");
        } else if (status === 'TIMED_OUT') {
          console.error("⏰ Subscription timed out for", currentPlayer.is_host ? "HOST" : "PLAYER");
        }
      });

    return () => {
      console.log("🧹 Cleaning up game requests subscription for", currentPlayer.is_host ? "HOST" : "PLAYER");
      supabase.removeChannel(channel);
    };
  }, [room.id, currentPlayer.player_id]);

  const loadGameVotes = async () => {
    try {
      console.log("Loading game votes for room:", room.id);
      const { data: votes, error } = await supabase
        .from("game_requests")
        .select("game_type, player_id")
        .eq("room_id", room.id);

      if (error) {
        console.error("Error loading game votes:", error);
        return;
      }

      console.log("Raw votes data:", votes);

      // Count votes per game
      const voteCounts: {[key: string]: number} = {};
      const userGameVotes: {[key: string]: boolean} = {};
      
      votes?.forEach(vote => {
        voteCounts[vote.game_type] = (voteCounts[vote.game_type] || 0) + 1;
        if (vote.player_id === currentPlayer.player_id) {
          userGameVotes[vote.game_type] = true;
        }
      });

      console.log("Processed vote counts:", voteCounts);
      console.log("User votes for player", currentPlayer.player_id, ":", userGameVotes);
      console.log("Is host:", currentPlayer.is_host);

      setGameVotes(voteCounts);
      setUserVotes(userGameVotes);
    } catch (error) {
      console.error("Error loading game votes:", error);
    }
  };

  const toggleGameVote = async (gameType: string) => {
    console.log("Toggle vote attempt - Game:", gameType, "Player:", currentPlayer.player_id, "Is Host:", currentPlayer.is_host);
    
    if (currentPlayer.is_host) {
      console.log("Vote blocked: Hosts cannot vote");
      return; // Hosts don't vote
    }

    console.log("Saving vote for game:", gameType);
    try {
      const hasVoted = userVotes[gameType];
      
      if (hasVoted) {
        // Remove vote
        const { error } = await supabase
          .from("game_requests")
          .delete()
          .eq("room_id", room.id)
          .eq("player_id", currentPlayer.player_id)
          .eq("game_type", gameType);

        if (error) throw error;
      } else {
        // Add vote using upsert to avoid duplicates
        const { error } = await supabase
          .from("game_requests")
          .upsert({
            room_id: room.id,
            player_id: currentPlayer.player_id,
            game_type: gameType,
          }, {
            onConflict: 'room_id,player_id,game_type',
            ignoreDuplicates: false
          });

        if (error) throw error;
      }

      // Update local state immediately for better UX
      setUserVotes(prev => ({
        ...prev,
        [gameType]: !hasVoted
      }));

      setGameVotes(prev => ({
        ...prev,
        [gameType]: (prev[gameType] || 0) + (hasVoted ? -1 : 1)
      }));

    } catch (error) {
      console.error("Error toggling game vote:", error);
      toast({
        title: "Error",
        description: "Failed to update vote",
        variant: "destructive",
      });
    }
  };

  const copyRoomCode = () => {
    navigator.clipboard.writeText(room.room_code);
    toast({
      title: "Copied!",
      description: "Room code copied to clipboard",
      className: "bg-success text-success-foreground",
    });
  };

  const startGame = async () => {
    if (!currentPlayer.is_host) return;

    setIsStarting(true);
    try {
      const { error } = await supabase
        .from("rooms")
        .update({
          current_game: selectedGame,
          game_state: selectedGame === "paranoia" ? {
            phase: "waiting",
            currentPlayerIndex: 0,
            roundNumber: 1,
            maxRounds: 10,
            freakinessLevel: freakinessLevel
          } : { 
            phase: "playing", 
            currentQuestion: null, 
            questionIndex: 0,
            votes: {},
            showResults: false,
            freakinessLevel: freakinessLevel
          }
        })
        .eq("id", room.id);

      if (error) throw error;

      const gameTitle = selectedGame === "forms_game" ? "Forms Game" : 
                        selectedGame === "paranoia" ? "Paranoia" : "Would You Rather";
      
      toast({
        title: "Game Started!",
        description: `${gameTitle} is now beginning`,
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error starting game:", error);
      toast({
        title: "Error",
        description: "Failed to start game",
        variant: "destructive",
      });
    } finally {
      setIsStarting(false);
    }
  };

  const leaveRoom = async () => {
    try {
      // Remove player's game requests
      await supabase
        .from("game_requests")
        .delete()
        .eq("player_id", currentPlayer.player_id);

      // Remove player from room
      await supabase
        .from("players")
        .delete()
        .eq("player_id", currentPlayer.player_id);

      // Check if this was the last player
      const { data: remainingPlayers } = await supabase
        .from("players")
        .select("id")
        .eq("room_id", room.id);

      // If no players remain, delete the room completely
      if (!remainingPlayers || remainingPlayers.length === 0) {
        // Delete all game requests for this room
        await supabase
          .from("game_requests")
          .delete()
          .eq("room_id", room.id);

        // Delete game votes first
        await supabase
          .from("game_votes")
          .delete()
          .eq("room_id", room.id);

        // Delete forms responses if any
        await supabase
          .from("forms_responses")
          .delete()
          .eq("room_id", room.id);

        // Delete the room
        await supabase
          .from("rooms")
          .delete()
          .eq("id", room.id);
      } else if (currentPlayer.is_host) {
        // If host is leaving but players remain, mark room as inactive and clean up requests
        await supabase
          .from("rooms")
          .update({ is_active: false })
          .eq("id", room.id);

        // Also clean up all game requests when room becomes inactive
        await supabase
          .from("game_requests")
          .delete()
          .eq("room_id", room.id);
      }

      // Clear local storage
      localStorage.removeItem("puzzz_player_id");
      localStorage.removeItem("puzzz_player_name");

      toast({
        title: "Left Room",
        description: "You have left the room",
      });

      navigate("/");
    } catch (error) {
      console.error("Error leaving room:", error);
      toast({
        title: "Error",
        description: "Failed to leave room",
        variant: "destructive",
      });
    }
  };

  const triggerCleanup = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('cleanup-rooms', {
        body: { trigger: 'manual' }
      });
      
      if (error) throw error;
      
      console.log('Cleanup triggered:', data);
      toast({
        title: "Cleanup Triggered",
        description: "Stale rooms cleanup has been initiated",
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error('Error triggering cleanup:', error);
      toast({
        title: "Cleanup Failed",
        description: "Failed to trigger cleanup function",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-4">{room.name}</h1>
          <div className="flex items-center justify-center gap-4 mb-4">
            <div className="room-code">{room.room_code}</div>
            <Button
              variant="outline"
              size="sm"
              onClick={copyRoomCode}
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              Copy Code
            </Button>
          </div>
          <p className="text-muted-foreground">
            Share the room code with friends to let them join
          </p>
        </div>

        {/* QR Code Section */}
        <div className="flex justify-center mb-8">
          <Card className="w-fit">
            <CardContent className="p-6 text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="h-5 w-5" />
                <h3 className="font-semibold">Quick Join</h3>
              </div>
              {qrCodeUrl ? (
                <div className="space-y-3">
                  <img 
                    src={qrCodeUrl} 
                    alt="QR Code to join room" 
                    className="mx-auto rounded-lg border"
                  />
                  <p className="text-sm text-muted-foreground">
                    Scan to join the room instantly
                  </p>
                </div>
              ) : (
                <div className="w-[200px] h-[200px] bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-muted-foreground">Generating QR code...</div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Freakometer Section */}
        <div className="flex justify-center mb-8">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-center text-lg">🌶️ Freakometer</CardTitle>
              <CardDescription className="text-center">
                Control the spiciness of questions across all games
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="px-4">
                <Slider
                  value={[freakinessLevel]}
                  onValueChange={(value) => setFreakinessLevel(value[0])}
                  max={5}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground px-4">
                <span>Mild</span>
                <span>Medium</span>
                <span>Spicy</span>
              </div>
              <div className="text-center">
                <Badge variant="outline" className="text-lg px-4 py-2">
                  Level {freakinessLevel}/5
                </Badge>
              </div>
              <div className="text-center text-sm text-muted-foreground">
                {freakinessLevel === 1 && "😊 Keep it tame and friendly"}
                {freakinessLevel === 2 && "😏 A little mischievous"}
                {freakinessLevel === 3 && "😈 Getting interesting"}
                {freakinessLevel === 4 && "🔥 Things are heating up"}
                {freakinessLevel === 5 && "🌶️ Maximum chaos unleashed"}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Players List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Players ({players.length})
              </CardTitle>
              <CardDescription>
                Waiting for more players to join...
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {players.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-3 bg-muted rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold">
                        {player.player_name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium">{player.player_name}</span>
                    </div>
                    {player.is_host && (
                      <Badge variant="secondary" className="gap-1">
                        <Crown className="h-3 w-3" />
                        Host
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Game Selection */}
          <Card>
            <CardHeader>
              <CardTitle>
                {currentPlayer.is_host ? "Select Game" : "Game Requests"}
              </CardTitle>
              <CardDescription>
                {currentPlayer.is_host 
                  ? "Choose which game to play with your friends"
                  : "Vote for the game you want to play"
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Game Options */}
              <div className="space-y-3">
                {/* Would You Rather Game */}
                <div 
                  className={`relative p-4 border rounded-lg transition-all ${
                    currentPlayer.is_host
                      ? `cursor-pointer ${selectedGame === "would_you_rather" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                      : "border-muted"
                  }`}
                  onClick={() => currentPlayer.is_host && setSelectedGame("would_you_rather")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Would You Rather</h4>
                      <p className="text-sm text-muted-foreground">Choose between two scenarios</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <div className="w-6 h-6 game-option-a rounded text-xs flex items-center justify-center text-white font-bold">A</div>
                        <div className="w-6 h-6 game-option-b rounded text-xs flex items-center justify-center text-white font-bold">B</div>
                      </div>
                      {!currentPlayer.is_host && (
                        <Button
                          variant={userVotes["would_you_rather"] ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGameVote("would_you_rather");
                          }}
                          className="gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {gameVotes["would_you_rather"] || 0}
                        </Button>
                      )}
                      {currentPlayer.is_host && gameVotes["would_you_rather"] > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {gameVotes["would_you_rather"]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Forms Game */}
                <div 
                  className={`relative p-4 border rounded-lg transition-all ${
                    currentPlayer.is_host
                      ? `cursor-pointer ${selectedGame === "forms_game" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                      : "border-muted"
                  }`}
                  onClick={() => currentPlayer.is_host && setSelectedGame("forms_game")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Forms Game</h4>
                      <p className="text-sm text-muted-foreground">Survey-style questions about friends</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">📋</div>
                      {!currentPlayer.is_host && (
                        <Button
                          variant={userVotes["forms_game"] ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGameVote("forms_game");
                          }}
                          className="gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {gameVotes["forms_game"] || 0}
                        </Button>
                      )}
                      {currentPlayer.is_host && gameVotes["forms_game"] > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {gameVotes["forms_game"]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Paranoia Game */}
                <div 
                  className={`relative p-4 border rounded-lg transition-all ${
                    currentPlayer.is_host
                      ? `cursor-pointer ${selectedGame === "paranoia" ? "border-primary bg-primary/10" : "border-muted hover:border-primary/50"}`
                      : "border-muted"
                  }`}
                  onClick={() => currentPlayer.is_host && setSelectedGame("paranoia")}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold">Paranoia</h4>
                      <p className="text-sm text-muted-foreground">Whisper secrets, let fate reveal them</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl">🤫</div>
                      {!currentPlayer.is_host && (
                        <Button
                          variant={userVotes["paranoia"] ? "default" : "outline"}
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleGameVote("paranoia");
                          }}
                          className="gap-1"
                        >
                          <ThumbsUp className="h-3 w-3" />
                          {gameVotes["paranoia"] || 0}
                        </Button>
                      )}
                      {currentPlayer.is_host && gameVotes["paranoia"] > 0 && (
                        <Badge variant="secondary" className="gap-1">
                          <ThumbsUp className="h-3 w-3" />
                          {gameVotes["paranoia"]}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Game Instructions - only show for host */}
              {currentPlayer.is_host && (
                <div className="p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">
                    {selectedGame === "forms_game" ? "Forms Game Rules:" : 
                     selectedGame === "paranoia" ? "Paranoia Rules:" : "How to Play:"}
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    {selectedGame === "forms_game" ? (
                      <>
                        <li>• Answer 8 questions about your friends</li>
                        <li>• Select who is most likely for each scenario</li>
                        <li>• Wait for everyone to finish</li>
                        <li>• See the results and laugh together!</li>
                      </>
                    ) : selectedGame === "paranoia" ? (
                      <>
                        <li>• Read your secret question (don't share it!)</li>
                        <li>• Choose who the question applies to</li>
                        <li>• Spin the randomizer to see if it gets revealed</li>
                        <li>• Build suspense and paranoia with each round!</li>
                      </>
                    ) : (
                      <>
                        <li>• Read the question carefully</li>
                        <li>• Choose Option A or Option B</li>
                        <li>• See how others voted</li>
                        <li>• Discuss and have fun!</li>
                      </>
                    )}
                  </ul>
                </div>
              )}

              {currentPlayer.is_host ? (
                <Button
                  onClick={startGame}
                  disabled={isStarting || players.length < (selectedGame === "forms_game" ? 3 : 2)}
                  className="w-full text-lg py-6"
                  size="lg"
                >
                  {isStarting ? (
                    "Starting Game..."
                  ) : players.length < (selectedGame === "forms_game" ? 3 : 2) ? (
                    `Need at least ${selectedGame === "forms_game" ? 3 : 2} players`
                  ) : (
                    <>
                      <Play className="mr-2 h-5 w-5" />
                      Start {selectedGame === "forms_game" ? "Forms Game" : 
                            selectedGame === "paranoia" ? "Paranoia" : "Would You Rather"}
                    </>
                  )}
                </Button>
              ) : (
                <div className="text-center p-4 bg-muted rounded-lg">
                  <p className="text-muted-foreground">
                    Waiting for the host to start the game...
                  </p>
                  <div className="inline-flex items-center gap-2 mt-2">
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                    <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Leave Room Button */}
        <div className="flex justify-center mt-8">
          <Button
            variant="outline"
            onClick={leaveRoom}
            className="gap-2 text-destructive hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Leave Room
          </Button>
        </div>
      </div>
    </div>
  );
};