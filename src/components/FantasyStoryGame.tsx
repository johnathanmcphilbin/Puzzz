import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Crown, Sword, Eye, Wind, Brain, MessageCircle } from "lucide-react";

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

interface CatCharacter {
  id: string;
  name: string;
  description: string;
  stats: {
    strength: number;
    stealth: number;
    speed: number;
    intelligence: number;
    charisma: number;
  };
  perks: string[];
}

interface StorySession {
  id: string;
  room_id: string;
  story_theme: string;
  current_turn: number;
  max_turns: number;
  status: string;
  story_content: any[];
  final_summary?: string;
}

interface StoryPlayer {
  id: string;
  story_session_id: string;
  player_id: string;
  player_name: string;
  cat_character_id: string;
  turn_order: number;
  cat_character?: CatCharacter;
}

interface StoryTurn {
  id: string;
  story_session_id: string;
  turn_number: number;
  player_id: string;
  ai_prompt: string;
  player_action: string;
  ai_response?: string;
}

interface FantasyStoryGameProps {
  room: Room;
  players: Player[];
  currentPlayer: Player;
  onUpdateRoom: (room: Room) => void;
}

const statIcons = {
  strength: Sword,
  stealth: Eye,
  speed: Wind,
  intelligence: Brain,
  charisma: MessageCircle,
};

export const FantasyStoryGame = ({ room, players, currentPlayer }: FantasyStoryGameProps) => {
  const [catCharacters, setCatCharacters] = useState<CatCharacter[]>([]);
  const [selectedCat, setSelectedCat] = useState<string>("");
  const [storySession, setStorySession] = useState<StorySession | null>(null);
  const [storyPlayers, setStoryPlayers] = useState<StoryPlayer[]>([]);
  const [storyTurns, setStoryTurns] = useState<StoryTurn[]>([]);
  const [currentAction, setCurrentAction] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [gamePhase, setGamePhase] = useState<"cat_selection" | "playing" | "completed">("cat_selection");
  
  const { toast } = useToast();

  useEffect(() => {
    loadCatCharacters();
    checkExistingSession();
    setupRealtimeSubscriptions();
  }, [room.id]);

  const loadCatCharacters = async () => {
    try {
      const { data, error } = await supabase
        .from("cat_characters")
        .select("*")
        .order("name");

      if (error) throw error;
      setCatCharacters((data || []).map(cat => ({
        ...cat,
        stats: cat.stats as CatCharacter['stats']
      })));
    } catch (error) {
      console.error("Error loading cat characters:", error);
    }
  };

  const checkExistingSession = async () => {
    try {
      const { data: sessionData, error: sessionError } = await supabase
        .from("story_sessions")
        .select("*")
        .eq("room_id", room.id)
        .single();

      if (sessionError && sessionError.code !== 'PGRST116') throw sessionError;

      if (sessionData) {
        setStorySession({
          ...sessionData,
          story_content: Array.isArray(sessionData.story_content) ? sessionData.story_content : []
        });
        setGamePhase(sessionData.status === 'completed' ? 'completed' : 'playing');
        
        // Load story players
        const { data: playersData, error: playersError } = await supabase
          .from("story_players")
          .select(`
            *,
            cat_character:cat_characters(*)
          `)
          .eq("story_session_id", sessionData.id)
          .order("turn_order");

        if (playersError) throw playersError;
        setStoryPlayers((playersData || []).map(player => ({
          ...player,
          cat_character: player.cat_character ? {
            ...player.cat_character,
            stats: player.cat_character.stats as CatCharacter['stats']
          } : undefined
        })));

        // Check if current player has selected a cat
        const currentStoryPlayer = playersData?.find(p => p.player_id === currentPlayer.player_id);
        if (currentStoryPlayer) {
          setSelectedCat(currentStoryPlayer.cat_character_id);
        }

        // Only check if we should start the story if we're still in active status and haven't started yet
        if (playersData && sessionData.status === 'active' && sessionData.current_turn === 0) {
          // Check if ALL players from the room have selected cats
          const allPlayersHaveCats = players.every(player => 
            playersData.some(storyPlayer => storyPlayer.player_id === player.player_id)
          );
          
          if (allPlayersHaveCats) {
            // Double check we don't already have an initial story
            const hasInitialStory = await checkForInitialStory(sessionData.id);
            if (!hasInitialStory) {
              await generateInitialStory();
            }
          }
        }

        // Load story turns
        loadStoryTurns(sessionData.id);
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
    }
  };

  const loadStoryTurns = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("story_turns")
        .select("*")
        .eq("story_session_id", sessionId)
        .order("turn_number");

      if (error) throw error;
      setStoryTurns(data || []);
    } catch (error) {
      console.error("Error loading story turns:", error);
    }
  };

  const setupRealtimeSubscriptions = () => {
    const storySessionChannel = supabase
      .channel(`story_session_${room.id}`)
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'story_sessions' },
        () => checkExistingSession()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'story_players' },
        () => checkExistingSession()
      )
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'story_turns' },
        (payload) => {
          if (storySession) {
            loadStoryTurns(storySession.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(storySessionChannel);
    };
  };

  const selectCat = async (catId: string) => {
    // Check if cat is already taken by another player
    const isCatTaken = storyPlayers.some(p => p.cat_character_id === catId && p.player_id !== currentPlayer.player_id);
    
    if (isCatTaken) {
      toast({
        title: "Cat Unavailable",
        description: "This cat has already been chosen by another player.",
        variant: "destructive",
      });
      return;
    }

    if (!storySession) {
      await startNewStory();
      return;
    }

    try {
      setIsProcessing(true);
      
      // Check if player already has a cat selected
      const existingPlayer = storyPlayers.find(p => p.player_id === currentPlayer.player_id);
      
      if (existingPlayer) {
        // Update existing selection
        const { error } = await supabase
          .from("story_players")
          .update({ cat_character_id: catId })
          .eq("id", existingPlayer.id);
        
        if (error) throw error;
      } else {
        // Create new story player entry
        const { error } = await supabase
          .from("story_players")
          .insert({
            story_session_id: storySession.id,
            player_id: currentPlayer.player_id,
            player_name: currentPlayer.player_name,
            cat_character_id: catId,
            turn_order: storyPlayers.length
          });
        
        if (error) throw error;
      }

      setSelectedCat(catId);
      
      // Reload story players to get the most current state
      await checkExistingSession();
      
      toast({
        title: "Cat Selected!",
        description: "Your character has been chosen for the adventure.",
        className: "bg-success text-success-foreground",
      });
    } catch (error) {
      console.error("Error selecting cat:", error);
      toast({
        title: "Error",
        description: "Failed to select cat character",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const startNewStory = async () => {
    try {
      const teamDescription = `A team of ${players.length} magical cats: ${players.map(p => p.player_name).join(", ")}`;
      
      const { data: sessionData, error: sessionError } = await supabase
        .from("story_sessions")
        .insert({
          room_id: room.id,
          story_theme: teamDescription,
          current_turn: 0,
          max_turns: 20,
          status: 'active'
        })
        .select()
        .single();

      if (sessionError) throw sessionError;
      
      setStorySession({
        ...sessionData,
        story_content: Array.isArray(sessionData.story_content) ? sessionData.story_content : []
      });
    } catch (error) {
      console.error("Error starting new story:", error);
      toast({
        title: "Error",
        description: "Failed to start story session",
        variant: "destructive",
      });
    }
  };

  const checkForInitialStory = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("story_turns")
        .select("id")
        .eq("story_session_id", sessionId)
        .eq("turn_number", 0)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    } catch (error) {
      console.error("Error checking for initial story:", error);
      return false;
    }
  };

  const generateInitialStory = async () => {
    if (!storySession) return;

    try {
      setIsProcessing(true);
      
      const response = await fetch(`${window.location.origin.replace(/:\d+/, ':54321')}/functions/v1/story-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'initial_story',
          teamDescription: storySession.story_theme,
          storyPlayers: storyPlayers
        }),
      });

      if (!response.ok) throw new Error('Failed to generate story');
      
      const { response: aiResponse } = await response.json();
      
      // Create the first turn entry
      await supabase
        .from("story_turns")
        .insert({
          story_session_id: storySession.id,
          turn_number: 0,
          player_id: 'AI',
          ai_prompt: 'Initial story setup',
          player_action: 'Story begins',
          ai_response: aiResponse
        });

      setGamePhase("playing");
    } catch (error) {
      console.error("Error generating initial story:", error);
      toast({
        title: "Error",
        description: "Failed to generate initial story",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const submitAction = async () => {
    if (!currentAction.trim() || !storySession) return;

    try {
      setIsProcessing(true);
      
      const currentStoryPlayer = storyPlayers.find(p => p.player_id === currentPlayer.player_id);
      const catPerks = currentStoryPlayer?.cat_character?.perks || [];
      
      // Create the turn entry first
      const { data: turnData, error: turnError } = await supabase
        .from("story_turns")
        .insert({
          story_session_id: storySession.id,
          turn_number: storySession.current_turn + 1,
          player_id: currentPlayer.player_id,
          ai_prompt: `${currentPlayer.player_name} (${currentStoryPlayer?.cat_character?.name}) takes action`,
          player_action: currentAction
        })
        .select()
        .single();

      if (turnError) throw turnError;

      // Generate AI response
      const response = await fetch(`${window.location.origin.replace(/:\d+/, ':54321')}/functions/v1/story-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'continue_story',
          storyHistory: storyTurns,
          playerAction: currentAction,
          catPerks: catPerks,
          currentTurn: storySession.current_turn + 1,
          maxTurns: storySession.max_turns
        }),
      });

      if (!response.ok) throw new Error('Failed to generate story continuation');
      
      const { response: aiResponse } = await response.json();
      
      // Update the turn with AI response
      await supabase
        .from("story_turns")
        .update({ ai_response: aiResponse })
        .eq("id", turnData.id);

      // Update session turn count
      const newTurnCount = storySession.current_turn + 1;
      await supabase
        .from("story_sessions")
        .update({ current_turn: newTurnCount })
        .eq("id", storySession.id);

      // Check if story is complete
      if (newTurnCount >= storySession.max_turns) {
        await finalizeStory();
      }

      setCurrentAction("");
    } catch (error) {
      console.error("Error submitting action:", error);
      toast({
        title: "Error",
        description: "Failed to submit action",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const finalizeStory = async () => {
    if (!storySession) return;

    try {
      const response = await fetch(`${window.location.origin.replace(/:\d+/, ':54321')}/functions/v1/story-ai`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'final_summary',
          storyHistory: storyTurns
        }),
      });

      if (!response.ok) throw new Error('Failed to generate final summary');
      
      const { response: finalSummary } = await response.json();
      
      await supabase
        .from("story_sessions")
        .update({ 
          status: 'completed',
          final_summary: finalSummary 
        })
        .eq("id", storySession.id);

      setGamePhase("completed");
    } catch (error) {
      console.error("Error finalizing story:", error);
    }
  };

  const getCurrentTurnPlayer = () => {
    if (!storySession || storyPlayers.length === 0) return null;
    const playerIndex = storySession.current_turn % storyPlayers.length;
    return storyPlayers[playerIndex];
  };

  const isMyTurn = () => {
    const currentTurnPlayer = getCurrentTurnPlayer();
    return currentTurnPlayer?.player_id === currentPlayer.player_id;
  };

  if (gamePhase === "cat_selection") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-foreground mb-4 flex items-center justify-center gap-2">
              <Sparkles className="h-8 w-8 text-primary" />
              Fantasy Cat Adventure
            </h1>
            <p className="text-lg text-muted-foreground">
              Choose your magical cat companion for this epic journey
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Waiting for all players to select their cats ({storyPlayers.filter(p => p.cat_character_id).length}/{players.length} selected)
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {catCharacters.map((cat) => {
              const isTaken = storyPlayers.some(p => p.cat_character_id === cat.id && p.player_id !== currentPlayer.player_id);
              const takenBy = storyPlayers.find(p => p.cat_character_id === cat.id && p.player_id !== currentPlayer.player_id);
              
              return (
                <Card 
                  key={cat.id}
                  className={`transition-all duration-300 ${
                    isTaken ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-105 hover:shadow-lg'
                  } ${
                    selectedCat === cat.id ? 'ring-2 ring-primary bg-primary/10' : ''
                  }`}
                  onClick={() => !isTaken && selectCat(cat.id)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white font-bold">
                        {cat.name.charAt(0)}
                      </div>
                      {cat.name}
                      {isTaken && (
                        <Badge variant="secondary" className="ml-auto">
                          Taken by {takenBy?.player_name}
                        </Badge>
                      )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">{cat.description}</p>
                  
                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Stats:</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(cat.stats).map(([stat, value]) => {
                        const Icon = statIcons[stat as keyof typeof statIcons];
                        return (
                          <div key={stat} className="flex items-center gap-1 text-xs">
                            <Icon className="h-3 w-3" />
                            <span className="capitalize">{stat}:</span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: 5 }, (_, i) => (
                                <div
                                  key={i}
                                  className={`w-2 h-2 rounded-full ${
                                    i < value ? 'bg-primary' : 'bg-muted'
                                  }`}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-semibold text-sm">Special Abilities:</h4>
                    <div className="space-y-1">
                      {cat.perks.map((perk, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {perk}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
                </Card>
              );
            })}
          </div>

          {selectedCat && (
            <div className="mt-8 text-center">
              <p className="text-muted-foreground mb-4">
                Waiting for other players to select their cats... ({storyPlayers.length + 1}/{players.length})
              </p>
              {isProcessing && (
                <div className="inline-flex items-center gap-2 text-primary">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Starting adventure...
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (gamePhase === "playing") {
    const currentTurnPlayer = getCurrentTurnPlayer();
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Story Content */}
          <div className="lg:col-span-3">
            <Card className="h-[600px] flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  The Adventure Unfolds
                  <Badge variant="outline" className="ml-auto">
                    Turn {storySession?.current_turn}/{storySession?.max_turns}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col">
                <ScrollArea className="flex-1 space-y-4 pr-4">
                  {storyTurns.map((turn, index) => (
                    <div key={turn.id} className="space-y-3">
                      {turn.ai_response && (
                        <div className="prose prose-sm max-w-none">
                          <div className="bg-muted/50 p-4 rounded-lg animate-fade-in">
                            <p className="text-foreground whitespace-pre-wrap">{turn.ai_response}</p>
                          </div>
                        </div>
                      )}
                      
                      {turn.player_id !== 'AI' && (
                        <div className="flex items-start gap-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-bold">
                            {storyPlayers.find(p => p.player_id === turn.player_id)?.cat_character?.name?.charAt(0) || 'P'}
                          </div>
                          <div className="bg-primary/10 p-3 rounded-lg flex-1">
                            <p className="font-medium text-sm">
                              {storyPlayers.find(p => p.player_id === turn.player_id)?.player_name} 
                              ({storyPlayers.find(p => p.player_id === turn.player_id)?.cat_character?.name})
                            </p>
                            <p className="text-foreground">{turn.player_action}</p>
                          </div>
                        </div>
                      )}
                      
                      {index < storyTurns.length - 1 && <Separator className="my-4" />}
                    </div>
                  ))}
                </ScrollArea>

                {/* Action Input */}
                {isMyTurn && (
                  <div className="mt-4 space-y-3 border-t pt-4">
                    <div className="flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="font-medium">Your Turn!</span>
                    </div>
                    <Textarea
                      value={currentAction}
                      onChange={(e) => setCurrentAction(e.target.value)}
                      placeholder="Describe what your cat does next..."
                      className="min-h-[100px]"
                      disabled={isProcessing}
                    />
                    <Button 
                      onClick={submitAction}
                      disabled={!currentAction.trim() || isProcessing}
                      className="w-full"
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          Processing...
                        </div>
                      ) : (
                        "Submit Action"
                      )}
                    </Button>
                  </div>
                )}

                {!isMyTurn && currentTurnPlayer && (
                  <div className="mt-4 text-center p-4 bg-muted/50 rounded-lg">
                    <p className="text-muted-foreground">
                      Waiting for <strong>{currentTurnPlayer.player_name}</strong> ({currentTurnPlayer.cat_character?.name}) to take their turn...
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Player Stats Panel */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Adventuring Party</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {storyPlayers.map((storyPlayer) => (
                  <div 
                    key={storyPlayer.id}
                    className={`p-3 rounded-lg border ${
                      getCurrentTurnPlayer()?.id === storyPlayer.id ? 'border-primary bg-primary/10' : 'border-muted'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-full flex items-center justify-center text-white text-sm font-bold">
                        {storyPlayer.cat_character?.name?.charAt(0) || 'C'}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{storyPlayer.player_name}</p>
                        <p className="text-xs text-muted-foreground">{storyPlayer.cat_character?.name}</p>
                      </div>
                    </div>
                    
                    {storyPlayer.cat_character && (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-1 text-xs">
                          {Object.entries(storyPlayer.cat_character.stats).map(([stat, value]) => {
                            const Icon = statIcons[stat as keyof typeof statIcons];
                            return (
                              <div key={stat} className="flex items-center gap-1">
                                <Icon className="h-3 w-3" />
                                <div className="flex gap-0.5">
                                  {Array.from({ length: 5 }, (_, i) => (
                                    <div
                                      key={i}
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        i < value ? 'bg-primary' : 'bg-muted'
                                      }`}
                                    />
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                        
                        <div className="space-y-1">
                          {storyPlayer.cat_character.perks.slice(0, 2).map((perk, index) => (
                            <Badge key={index} variant="outline" className="text-xs py-0">
                              {perk.split(':')[0]}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (gamePhase === "completed") {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold flex items-center justify-center gap-2">
                <Sparkles className="h-8 w-8 text-primary" />
                Adventure Complete!
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {storySession?.final_summary && (
                <div className="prose max-w-none">
                  <div className="bg-primary/10 p-6 rounded-lg">
                    <h3 className="text-xl font-semibold mb-4">Epic Summary</h3>
                    <p className="text-foreground whitespace-pre-wrap">{storySession.final_summary}</p>
                  </div>
                </div>
              )}
              
              <div className="text-center">
                <Button 
                  onClick={() => window.location.reload()}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  Start New Adventure
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return null;
};