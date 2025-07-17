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
        const [wyrCheck, formsCheck, paranoiaCheck] = await Promise.all([
          supabase.from('would_you_rather_questions').select('id').eq('category', `AI-Generated (${roomCode})`).limit(1),
          supabase.from('forms_questions').select('id').eq('category', `AI-Generated (${roomCode})`).limit(1),
          supabase.from('paranoia_questions').select('id').eq('category', `AI-Generated (${roomCode})`).limit(1)
        ]);

        const hasExistingQuestions = (wyrCheck.data && wyrCheck.data.length > 0) ||
                                   (formsCheck.data && formsCheck.data.length > 0) ||
                                   (paranoiaCheck.data && paranoiaCheck.data.length > 0);
        
        setHasGeneratedQuestions(hasExistingQuestions);
        
        if (hasExistingQuestions && customizationData?.customization_text) {
          addMessage(`This room already has custom questions generated for theme: "${customizationData.customization_text}". Only one set of questions per room is allowed.`);
        } else if (!hasExistingQuestions) {
          // Add opening message when no questions have been generated yet
          addMessage("Hi! Tell me what you guys are into and I can personalise all of your games! Just describe your group's interests, hobbies, or themes you love.");
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

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if user is host for chat functionality
    if (!currentPlayer?.is_host) {
      toast({
        title: "Host Only Feature",
        description: "Only the room host can chat with the AI assistant.",
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
    addMessage(userMessage, true);
    setIsLoading(true);

    try {
      // Set customization and call chat endpoint
      const sanitizedCustomization = userMessage;
      setCustomization(sanitizedCustomization);
      
      // Save customization to database
      if (roomCode) {
        await supabase.from('ai_chat_customizations').insert({
          room_id: roomCode,
          customization_text: sanitizedCustomization
        });
      }

      // Call the AI chat endpoint
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'chat',
          message: userMessage,
        }
      });

      if (error || !data?.response) {
        throw new Error(error?.message || 'Failed to get AI response');
      }

      // Show response message
      addMessage(data.response);
      setIsLoading(false);
      
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('Sorry, I encountered an error. Please try again.');
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
      setIsLoading(false);
    }
  };

  const generateAllCustomQuestions = async () => {
    // Check if user is host
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

    if (!customization.trim()) {
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
    addMessage(`Generating custom questions for all games based on: "${customization}"`, true);

    try {
      // Call the AI edge function to generate custom questions
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          action: 'generate_all_questions',
          customization,
          crazynessLevel: crazynessLevel[0],
          gameType: currentGame,
          roomCode
        }
      });

      if (error || !data?.response) {
        throw new Error(error?.message || 'Failed to generate questions');
      }

      // Parse the response which should contain questions for all games
      const questions = JSON.parse(data.response);
      
      // Insert generated questions into respective tables
      const [wyrError, formsError, paranoiaError] = await Promise.all([
        supabase.from('would_you_rather_questions').insert(
          questions.would_you_rather.map((q: any) => ({
            option_a: q.option_a,
            option_b: q.option_b,
            category: `AI-Generated (${roomCode})`
          }))
        ),
        supabase.from('forms_questions').insert(
          questions.forms.map((q: any) => ({
            question: q.question,
            category: `AI-Generated (${roomCode})`
          }))
        ),
        supabase.from('paranoia_questions').insert(
          questions.paranoia.map((q: any) => ({
            question: q.question,
            category: `AI-Generated (${roomCode})`
          }))
        )
      ]);

      if (wyrError || formsError || paranoiaError) {
        throw new Error('Failed to save generated questions');
      }

      setHasGeneratedQuestions(true);
      addMessage("✅ Generated custom questions for all your games! They're now active in your room.");
      
      toast({
        title: "Questions Generated!",
        description: "Custom questions have been created for all games",
      });
        
      setIsLoading(false);
    } catch (error) {
      console.error("Error generating questions:", error);
      addMessage("❌ Sorry, I had trouble generating questions. Please try again.");
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
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
            
            {/* Action buttons */}
            <div className="px-4 py-2 border-t">
              <Button
                onClick={generateAllCustomQuestions}
                className="w-full mb-2"
                disabled={!customization || isLoading || hasGeneratedQuestions}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Custom Questions"
                )}
              </Button>
            </div>
            
            {/* Input area */}
            <div className="p-4 border-t flex-shrink-0">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Describe your group's interests..."
                  onKeyPress={handleKeyPress}
                  disabled={isLoading || hasGeneratedQuestions}
                  className="flex-grow"
                />
                <Button
                  size="icon"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading || hasGeneratedQuestions}
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
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