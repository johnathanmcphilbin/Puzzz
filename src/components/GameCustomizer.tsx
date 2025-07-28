import React, { useState, useEffect } from 'react';
import { Sparkles, Loader2, Wand2, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface GameCustomizerProps {
  roomCode: string;
  roomId: string;
  isHost: boolean;
}

const GameCustomizer: React.FC<GameCustomizerProps> = ({ roomCode, roomId, isHost }) => {
  const [customization, setCustomization] = useState('');
  const [crazynessLevel, setCrazynessLevel] = useState([50]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasGeneratedQuestions, setHasGeneratedQuestions] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const checkExistingQuestions = async () => {
      // Check for existing customization
      const { data: customizationData } = await supabase
        .from('ai_chat_customizations')
        .select('customization_text')
        .eq('room_id', roomCode)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (customizationData?.customization_text) {
        setCustomization(customizationData.customization_text);
      }

      // Check if room-specific questions already exist
      const { data: roomQuestions } = await supabase
        .from('room_questions')
        .select('id')
        .eq('room_id', roomId)
        .limit(1);

      setHasGeneratedQuestions(roomQuestions && roomQuestions.length > 0);
    };

    checkExistingQuestions();
  }, [roomCode, roomId]);

  const generateQuestions = async () => {
    if (!customization.trim() || !isHost) return;

    setIsLoading(true);

    try {
      // Save customization to database
      await supabase.from('ai_chat_customizations').insert({
        room_id: roomCode,
        customization_text: customization.trim()
      });

      // Generate questions
      const { data, error } = await supabase.functions.invoke('room-questions', {
        body: {
          roomCode,
          customization: customization.trim(),
          crazynessLevel: crazynessLevel[0]
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to generate questions');
      }

      setHasGeneratedQuestions(true);
      
      toast({
        title: "Questions Generated! 🎉",
        description: `Created ${data.counts?.would_you_rather || 0} Would You Rather, ${data.counts?.paranoia || 0} Paranoia, and ${data.counts?.odd_one_out || 0} Odd One Out questions!`,
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
            AI Game Customizer
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p>Only the host can customize game questions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-primary" />
          AI Game Customizer
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
              Custom questions will be used in all your games
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
              <p className="text-xs text-muted-foreground">
                Tell the AI about your group's interests to get personalized questions
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="craziness">Craziness Level</Label>
                <Badge variant={
                  crazynessLevel[0] <= 20 ? "secondary" :
                  crazynessLevel[0] <= 40 ? "outline" :
                  crazynessLevel[0] <= 60 ? "default" :
                  crazynessLevel[0] <= 80 ? "destructive" : "destructive"
                }>
                  {crazynessLevel[0]}% {crazynessLevel[0] <= 20 ? "😇" :
                   crazynessLevel[0] <= 40 ? "😊" :
                   crazynessLevel[0] <= 60 ? "😈" :
                   crazynessLevel[0] <= 80 ? "🔥" : "💀"}
                </Badge>
              </div>
              <Slider
                id="craziness"
                max={100}
                step={5}
                value={crazynessLevel}
                onValueChange={setCrazynessLevel}
                disabled={isLoading}
                className="w-full"
              />
              <div className="text-xs text-muted-foreground text-center">
                {crazynessLevel[0] <= 20 ? "Safe & family-friendly" :
                 crazynessLevel[0] <= 40 ? "Mild fun with light humor" :
                 crazynessLevel[0] <= 60 ? "Moderately entertaining & bold" :
                 crazynessLevel[0] <= 80 ? "Dramatic & boundary-pushing" : "Extreme & outrageous"}
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