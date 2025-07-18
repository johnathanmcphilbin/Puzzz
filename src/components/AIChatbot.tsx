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

        // Check if AI-generated questions already exist for this room
        const [wyrCheck, paranoiaCheck] = await Promise.all([
          supabase.from('would_you_rather_questions').select('id').eq('category', `AI-Generated (${roomCode})`).limit(1),
          supabase.from('paranoia_questions').select('id').eq('category', `AI-Generated (${roomCode})`).limit(1)
        ]);

        const hasExistingQuestions = (wyrCheck.data && wyrCheck.data.length > 0) ||
                                   (paranoiaCheck.data && paranoiaCheck.data.length > 0);
        
        setHasGeneratedQuestions(hasExistingQuestions);
        
        if (hasExistingQuestions && customizationData?.customization_text) {
          addMessage(`Already customized for: "${customizationData.customization_text}"`);
        } else if (!hasExistingQuestions) {
          addMessage("Describe your group and I'll generate custom questions instantly!");
        }
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
      
      // Save customization to database
      if (roomCode) {
        await supabase.from('ai_chat_customizations').insert({
          room_id: roomCode,
          customization_text: sanitizedCustomization
        });
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
      // Call the AI edge function to generate custom questions
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'generate_all_questions',
          customization: effectiveCustomization,
          crazynessLevel: crazynessLevel[0],
          gameType: currentGame,
          roomCode
        }
      });

      if (error || !data?.response) {
        throw new Error(error?.message || 'Failed to generate questions');
      }

      try {
        const generatedQuestions = JSON.parse(data.response);
        console.log('Generated questions:', generatedQuestions);

        // Insert generated questions into respective tables - only paranoia and would_you_rather now
        const { error: wyrError } = await supabase.from('would_you_rather_questions').insert(
          generatedQuestions.would_you_rather.map((q: any) => ({
            option_a: q.option_a,
            option_b: q.option_b,
            category: `AI-Generated (${roomCode})`
          }))
        );

        const { error: paranoiaError } = await supabase.from('paranoia_questions').insert(
          generatedQuestions.paranoia.map((q: any) => ({
            question: q.question,
            category: `AI-Generated (${roomCode})`
          }))
        );

        console.log('Insert errors:', { wyrError, paranoiaError });

        if (wyrError || paranoiaError) {
          throw new Error(`Failed to save generated questions: ${wyrError?.message || paranoiaError?.message}`);
        }

        setHasGeneratedQuestions(true);
        addMessage("✅ Custom questions generated and ready to use!");
        
        toast({
          title: "Questions Generated!",
          description: "Custom questions have been created for your games",
        });
          
        setIsLoading(false);
      } catch (error) {
        console.error('Error parsing or saving questions:', error);
        throw new Error(`Failed to process questions: ${error.message}`);
      }
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
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
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
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p>{message.text}</p>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            
            {/* Craziness level slider */}
            <div className="px-4 py-2 border-t">
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="craziness" className="text-sm font-medium">
                  Craziness Level: {crazynessLevel[0]}%
                </Label>
              </div>
              <Slider
                id="craziness"
                max={100}
                step={1}
                value={crazynessLevel}
                onValueChange={setCrazynessLevel}
                className="mb-4"
                disabled={isLoading || hasGeneratedQuestions}
              />
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