import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import "regenerator-runtime/runtime";
import { FUNCTIONS_BASE_URL, SUPABASE_ANON_KEY } from '@/utils/functions';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatbotProps {
  roomCode?: string;
  currentGame?: string;
  currentPlayer?: { id: string; player_name: string; player_id: string; is_host: boolean; } | null;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ roomCode, currentGame, currentPlayer }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customization, setCustomization] = useState('');
  const [hasGeneratedQuestions, setHasGeneratedQuestions] = useState(false);
  const [crazynessLevel, setCrazynessLevel] = useState([50]); // 0-100 scale
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load existing customization and check if questions already generated for this room
    const loadRoomState = async () => {
      if (roomCode) {
        // Since ai_chat_customizations and room_questions tables are deleted,
        // we'll start fresh and let users generate new questions
        setHasGeneratedQuestions(false);
        addMessage("Describe your group and I'll generate custom questions instantly!");
      }
    };
    
    loadRoomState();
  }, [roomCode]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const addMessage = (text: string, isUser: boolean = false) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const generateQuestionsFromInput = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if user is host for chat functionality
    if (!currentPlayer?.is_host) {
      toast({
        title: "Host Only Feature",
        description: "Only the room host can generate custom questions.",
        variant: "destructive",
      });
      return;
    }

    // Check if questions already generated
    if (hasGeneratedQuestions) {
      toast({
        title: "Questions Already Generated",
        description: "This room already has custom questions. Only one set per room is allowed.",
        variant: "destructive",
      });
      return;
    }

    const userMessage = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Set customization
      const sanitizedCustomization = userMessage;
      setCustomization(sanitizedCustomization);
      
      // Save customization to Redis room state
      if (roomCode) {
        const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'apikey': SUPABASE_ANON_KEY, 'Authorization': `Bearer ${SUPABASE_ANON_KEY}` },
          body: JSON.stringify({ 
            action: 'update', 
            roomCode: roomCode, 
            updates: { 
              gameState: { 
                aiCustomization: sanitizedCustomization 
              } 
            } 
          }),
        });

        if (!response.ok) {
          console.warn('Failed to save AI customization to room state');
        }
      }

      // Immediately generate questions
      await generateAllCustomQuestions(sanitizedCustomization);
      
    } catch (error) {
      console.error('Generation error:', error);
      toast({
        title: "Generation Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const generateAllCustomQuestions = async (customizationText?: string) => {
    const effectiveCustomization = customizationText || customization;
    
    if (!effectiveCustomization.trim()) {
      toast({
        title: "Customization Needed",
        description: "Please tell me about your group first (e.g., 'we are nerdy', 'we love sci-fi')",
        variant: "destructive",
      });
      return;
    }

    if (!roomCode) {
      toast({
        title: "Room Error",
        description: "No room code found. Please refresh and try again.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    addMessage(`Generating custom questions for: "${effectiveCustomization}"`, false);

    try {
      // Call the room-questions edge function to generate and store custom questions
      const { data, error } = await supabase.functions.invoke('room-questions', {
        body: {
          roomCode,
          customization: effectiveCustomization,
          crazynessLevel: crazynessLevel[0] ?? 50
        }
      });

      if (error || !data?.success) {
        throw new Error(error?.message || data?.error || 'Failed to generate questions');
      }

      setHasGeneratedQuestions(true);
      addMessage(`✅ Generated ${data.counts?.would_you_rather || 0} Would You Rather, ${data.counts?.paranoia || 0} Paranoia, and ${data.counts?.odd_one_out || 0} Odd One Out questions!`);
      
      toast({
        title: "Questions Generated!",
        description: data.message || "Custom questions have been created for all your games",
      });
        
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating questions:", error);
      addMessage("❌ Failed to generate questions. Please try again.");
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      generateQuestionsFromInput();
    }
  };

  // Don't render if no room code is available yet or if not host
  if (!roomCode || !currentPlayer?.is_host) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)]">
      {!isOpen ? (
        <div 
          onClick={() => setIsOpen(true)}
          className="cursor-pointer group"
        >
          <img 
            src="/lovable-uploads/a9cf8a42-6daa-41e9-96e2-a268aa5bc15f.png"
            alt="AI Chat Cat"
            className="w-20 h-20 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110"
          />
        </div>
      ) : (
        <Card className="w-80 sm:w-96 h-[32rem] sm:h-[36rem] flex flex-col shadow-2xl border-primary/20 animate-scale-in">
          <CardHeader className="p-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Game Customizer</h3>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="p-0 flex-grow overflow-hidden flex flex-col">
            {/* Messages area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className="relative max-w-[80%]">
                    {/* Speech bubble */}
                    <div
                      className={`p-3 rounded-2xl shadow-sm ${
                        message.isUser
                          ? 'bg-blue-500 text-white rounded-br-sm'
                          : 'bg-gray-200 text-gray-800 rounded-bl-sm'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>
                    
                    {/* Speech bubble tail */}
                    <div
                      className={`absolute bottom-0 ${
                        message.isUser
                          ? 'right-0 w-0 h-0 border-l-[12px] border-t-[8px] border-l-blue-500 border-t-transparent'
                          : 'left-0 w-0 h-0 border-r-[12px] border-t-[8px] border-r-gray-200 border-t-transparent'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Craziness level slider */}
            <div className="px-4 py-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="craziness" className="text-sm font-medium">
                  Craziness Level: {crazynessLevel[0] ?? 50}%
                </Label>
                <Badge variant={
                  (crazynessLevel[0] ?? 50) <= 20 ? "secondary" :
                  (crazynessLevel[0] ?? 50) <= 40 ? "outline" :
                  (crazynessLevel[0] ?? 50) <= 60 ? "default" :
                  (crazynessLevel[0] ?? 50) <= 80 ? "destructive" : "destructive"
                }>
                  {(crazynessLevel[0] ?? 50) <= 20 ? "😇 Tame" :
                   (crazynessLevel[0] ?? 50) <= 40 ? "😊 Fun" :
                   (crazynessLevel[0] ?? 50) <= 60 ? "😈 Spicy" :
                   (crazynessLevel[0] ?? 50) <= 80 ? "🔥 Wild" : "💀 INSANE"}
                </Badge>
              </div>
              <Slider
                id="craziness"
                max={100}
                step={5}
                value={crazynessLevel}
                onValueChange={setCrazynessLevel}
                className="mb-2"
                disabled={isLoading || hasGeneratedQuestions}
              />
              <div className="text-xs text-muted-foreground text-center">
                {(crazynessLevel[0] ?? 50) <= 20 ? "Safe & family-friendly questions" :
                 (crazynessLevel[0] ?? 50) <= 40 ? "Mild fun with light humor" :
                 (crazynessLevel[0] ?? 50) <= 60 ? "Moderately entertaining & bold" :
                 (crazynessLevel[0] ?? 50) <= 80 ? "Dramatic & boundary-pushing" : "Extreme & outrageous scenarios"}
              </div>
            </div>
            
            
            {/* Input area */}
            <div className="p-4 border-t flex-shrink-0">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="e.g. 'nerdy group of friends who love gaming'"
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || hasGeneratedQuestions}
                  className="flex-grow"
                />
                <Button
                  size="icon"
                  onClick={generateQuestionsFromInput}
                  disabled={!inputMessage.trim() || isLoading || hasGeneratedQuestions}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AIChatbot;