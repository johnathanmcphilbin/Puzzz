import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Wand2, Users, Zap, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';

interface GameCustomizerProps {
  roomCode: string;
  roomId: string;
  isHost: boolean;
  selectedGame: string;
}

const GameCustomizer: React.FC<GameCustomizerProps> = ({ roomCode, roomId, isHost, selectedGame }) => {
  const [customization, setCustomization] = useState('');
  const [crazynessLevel, setCrazynessLevel] = useState([50]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGeneratedQuestions, setHasGeneratedQuestions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkExistingQuestions = async () => {
      // Since ai_chat_customizations and room_questions tables are deleted,
      // we'll start fresh and let users generate new questions
      setHasGeneratedQuestions(false);
    };

    checkExistingQuestions();
  }, [roomCode, roomId]);

  const generateQuestions = async () => {
    if (!customization.trim() || !isHost) return;

    setIsLoading(true);

    try {
      // Save customization to Redis room state
      const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ 
          action: 'update', 
          roomCode: roomCode, 
          updates: { 
            gameState: { 
              aiCustomization: customization.trim() 
            } 
          } 
        }),
      });

      if (!response.ok) {
        console.warn('Failed to save AI customization to room state');
      }

      // Generate questions for selected game only
      const { data, error } = await supabase.functions.invoke('room-questions', {
        body: {
          roomCode,
          customization: customization.trim(),
          crazynessLevel: crazynessLevel[0] ?? 50,
          gameType: selectedGame
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to generate questions');
      }

      setHasGeneratedQuestions(true);
      
      const gameDisplayName = selectedGame === "would_you_rather" ? "Would You Rather" : 
                             selectedGame === "paranoia" ? "Paranoia" : 
                             selectedGame === "odd_one_out" ? "Odd One Out" : selectedGame;
      
      toast({
        title: "Questions Generated! 🎉",
        description: `Created ${data.count || 0} custom ${gameDisplayName} questions!`,
        className: "bg-success text-success-foreground",
      });
        
    } catch (error) {
      console.error("Error generating questions:", error);
      toast({
        title: "Generation Failed",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateQuestions();
    }
  };

  if (!isHost) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Game Customiser
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Only the host can customise the game questions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          Game Customiser
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {hasGeneratedQuestions ? (
          <div className="text-center space-y-4">
            <div className="p-4 bg-success/10 rounded-lg border border-success/20">
              <Sparkles className="h-8 w-8 mx-auto mb-2 text-success" />
              <h3 className="font-semibold text-success">Questions Generated!</h3>
              <p className="text-sm text-success/80">
                Your customized questions are ready for: "{customization}"
              </p>
            </div>
            <p className="text-sm text-muted-foreground">
              Custom questions will be used in {selectedGame === "would_you_rather" ? "Would You Rather" : 
                                              selectedGame === "paranoia" ? "Paranoia" : 
                                              selectedGame === "odd_one_out" ? "Odd One Out" : selectedGame}
            </p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label htmlFor="customization">Describe your group</Label>
              <Input
                id="customization"
                value={customization}
                onChange={(e) => setCustomization(e.target.value)}
                placeholder="e.g., 'nerdy friends who love gaming' or 'music lovers who party'"
                onKeyPress={handleKeyPress}
                disabled={isLoading}
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="craziness">Craziness Level</Label>
                <Badge variant={
                  (crazynessLevel[0] ?? 50) <= 15 ? "secondary" :
                  (crazynessLevel[0] ?? 50) <= 30 ? "outline" :
                  (crazynessLevel[0] ?? 50) <= 45 ? "default" :
                  (crazynessLevel[0] ?? 50) <= 60 ? "default" :
                  (crazynessLevel[0] ?? 50) <= 75 ? "destructive" :
                  (crazynessLevel[0] ?? 50) <= 90 ? "destructive" : "destructive"
                }>
                  {crazynessLevel[0] ?? 50}% {(crazynessLevel[0] ?? 50) <= 15 ? "😇" :
                   (crazynessLevel[0] ?? 50) <= 30 ? "😊" :
                   (crazynessLevel[0] ?? 50) <= 45 ? "😄" :
                   (crazynessLevel[0] ?? 50) <= 60 ? "😈" :
                   (crazynessLevel[0] ?? 50) <= 75 ? "🔥" :
                   (crazynessLevel[0] ?? 50) <= 90 ? "💀" : "🌋"}
                </Badge>
              </div>
              <Slider
                id="craziness"
                max={100}
                step={1}
                value={crazynessLevel}
                onValueChange={setCrazynessLevel}
                disabled={isLoading}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {(crazynessLevel[0] ?? 50) <= 15 ? "Extremely safe & family-friendly" :
                 (crazynessLevel[0] ?? 50) <= 30 ? "Mild & safe with gentle humor" :
                 (crazynessLevel[0] ?? 50) <= 45 ? "Moderately playful with mild awkwardness" :
                 (crazynessLevel[0] ?? 50) <= 60 ? "Spicy & entertaining with social drama" :
                 (crazynessLevel[0] ?? 50) <= 75 ? "Bold & dramatic with adult themes" :
                 (crazynessLevel[0] ?? 50) <= 90 ? "Extremely wild & outrageous" : "Absolutely unhinged & chaotic"}
              </div>
            </div>

            <Button
              onClick={generateQuestions}
              disabled={!customization.trim() || isLoading}
              className="w-full gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating Questions...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4" />
                  Generate Custom Questions
                </>
              )}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default GameCustomizer;