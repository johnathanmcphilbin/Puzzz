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
import 'regenerator-runtime/runtime';
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
  currentPlayer?: {
    id: string;
    player_name: string;
    player_id: string;
    is_host: boolean;
  } | null;
}

const AIChatbot: React.FC<AIChatbotProps> = ({
  roomCode,
  currentGame,
  currentPlayer,
}) => {
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
        addMessage(
          "Hi! I'm your AI assistant. Ask me anything or tell me about your group to generate custom questions!"
        );
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

  const sendChatMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Check if user is host for chat functionality
    if (!currentPlayer?.is_host) {
      toast({
        title: 'Host Only Feature',
        description: 'Only the room host can use the AI chatbot.',
        variant: 'destructive',
      });
      return;
    }

    const userMessage = inputMessage.trim();
    addMessage(userMessage, true);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Check if this is a request to generate questions (contains keywords)
      const isQuestionRequest =
        userMessage.toLowerCase().includes('generate') ||
        userMessage.toLowerCase().includes('questions') ||
        userMessage.toLowerCase().includes('customize');

      if (isQuestionRequest && !hasGeneratedQuestions) {
        // Set customization and generate questions
        setCustomization(userMessage);

        // Save customization to Redis room state
        if (roomCode) {
          const response = await fetch(`${FUNCTIONS_BASE_URL}/rooms-service`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              apikey: SUPABASE_ANON_KEY,
              Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              action: 'update',
              roomCode: roomCode,
              updates: {
                gameState: {
                  aiCustomization: userMessage,
                },
              },
            }),
          });

          if (!response.ok) {
            console.warn('Failed to save AI customization to room state');
          }
        }

        await generateAllCustomQuestions(userMessage);
      } else {
        // General chat response
        const { data, error } = await supabase.functions.invoke('ai-chat', {
          body: {
            message: userMessage,
            action: 'chat',
            customization: customization,
            crazynessLevel: crazynessLevel[0] ?? 50,
          },
        });

        if (error || !data?.response) {
          throw new Error(error?.message || 'Failed to get AI response');
        }

        addMessage(data.response);
      }

      setIsLoading(false);
    } catch (error) {
      console.error('Chat error:', error);
      addMessage("❌ Sorry, I couldn't process that. Please try again.");
      setIsLoading(false);
    }
  };

  const generateAllCustomQuestions = async (customizationText?: string) => {
    const effectiveCustomization = customizationText || customization;

    if (!effectiveCustomization.trim()) {
      toast({
        title: 'Customization Needed',
        description:
          "Please tell me about your group first (e.g., 'we are nerdy', 'we love sci-fi')",
        variant: 'destructive',
      });
      return;
    }

    if (!roomCode) {
      toast({
        title: 'Room Error',
        description: 'No room code found. Please refresh and try again.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    addMessage(
      `Generating custom questions for: "${effectiveCustomization}"`,
      false
    );

    try {
      // Call the room-questions edge function to generate and store custom questions
      const { data, error } = await supabase.functions.invoke(
        'room-questions',
        {
          body: {
            roomCode,
            customization: effectiveCustomization,
            crazynessLevel: crazynessLevel[0] ?? 50,
            // Pass the current game so the edge function knows what to generate
            gameType:
              currentGame === 'would_you_rather' ||
              currentGame === 'paranoia' ||
              currentGame === 'odd_one_out'
                ? currentGame
                : 'would_you_rather',
          },
        }
      );

      if (error || !data?.success) {
        throw new Error(
          error?.message || data?.error || 'Failed to generate questions'
        );
      }

      setHasGeneratedQuestions(true);
      addMessage(
        `✅ Generated ${data.counts?.would_you_rather || 0} Would You Rather, ${data.counts?.paranoia || 0} Paranoia, and ${data.counts?.odd_one_out || 0} Odd One Out questions!`
      );

      toast({
        title: 'Questions Generated!',
        description:
          data.message ||
          'Custom questions have been created for all your games',
      });

      setIsLoading(false);
    } catch (error) {
      console.error('Error generating questions:', error);
      addMessage('❌ Failed to generate questions. Please try again.');
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Don't render if no room code is available yet or if not host
  if (!roomCode || !currentPlayer?.is_host) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 max-h-[calc(100vh-2rem)] max-w-[calc(100vw-2rem)]">
      {!isOpen ? (
        <div onClick={() => setIsOpen(true)} className="group cursor-pointer">
          <img
            src="/src/assets/ai-chatbot-icon.png"
            alt="AI Chat Cat"
            className="h-20 w-20 shadow-lg transition-all duration-300 hover:scale-110 hover:shadow-xl"
          />
        </div>
      ) : (
        <Card className="animate-scale-in flex h-[32rem] w-80 flex-col border-primary/20 shadow-2xl sm:h-[36rem] sm:w-96">
          <CardHeader className="flex-shrink-0 border-b p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI Assistant</h3>
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

          <CardContent className="flex flex-grow flex-col overflow-hidden p-0">
            {/* Messages area */}
            <div className="flex-grow space-y-4 overflow-y-auto p-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'} mb-4`}
                >
                  <div className="relative max-w-[80%]">
                    {/* Speech bubble */}
                    <div
                      className={`rounded-2xl p-3 shadow-sm ${
                        message.isUser
                          ? 'rounded-br-sm bg-blue-500 text-white'
                          : 'rounded-bl-sm bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm leading-relaxed">{message.text}</p>
                    </div>

                    {/* Speech bubble tail */}
                    <div
                      className={`absolute bottom-0 ${
                        message.isUser
                          ? 'right-0 h-0 w-0 border-l-[12px] border-t-[8px] border-l-blue-500 border-t-transparent'
                          : 'left-0 h-0 w-0 border-r-[12px] border-t-[8px] border-r-gray-200 border-t-transparent'
                      }`}
                    ></div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Craziness level slider */}
            <div className="border-t px-4 py-2">
              <div className="mb-2 flex items-center justify-between">
                <Label htmlFor="craziness" className="text-sm font-medium">
                  Craziness Level: {crazynessLevel[0] ?? 50}%
                </Label>
                <Badge
                  variant={
                    (crazynessLevel[0] ?? 50) <= 15
                      ? 'secondary'
                      : (crazynessLevel[0] ?? 50) <= 30
                        ? 'outline'
                        : (crazynessLevel[0] ?? 50) <= 45
                          ? 'default'
                          : (crazynessLevel[0] ?? 50) <= 60
                            ? 'default'
                            : (crazynessLevel[0] ?? 50) <= 75
                              ? 'destructive'
                              : (crazynessLevel[0] ?? 50) <= 90
                                ? 'destructive'
                                : 'destructive'
                  }
                >
                  {(crazynessLevel[0] ?? 50) <= 15
                    ? '😇 SAFE'
                    : (crazynessLevel[0] ?? 50) <= 30
                      ? '😊 MILD'
                      : (crazynessLevel[0] ?? 50) <= 45
                        ? '😄 PLAYFUL'
                        : (crazynessLevel[0] ?? 50) <= 60
                          ? '😈 SPICY'
                          : (crazynessLevel[0] ?? 50) <= 75
                            ? '🔥 BOLD'
                            : (crazynessLevel[0] ?? 50) <= 90
                              ? '💀 WILD'
                              : '🌋 UNHINGED'}
                </Badge>
              </div>
              <Slider
                id="craziness"
                max={100}
                step={5}
                value={crazynessLevel}
                onValueChange={setCrazynessLevel}
                className="mb-2"
                disabled={isLoading}
              />
              <div className="text-center text-xs text-muted-foreground">
                {(crazynessLevel[0] ?? 50) <= 15
                  ? 'Extremely safe & family-friendly questions'
                  : (crazynessLevel[0] ?? 50) <= 30
                    ? 'Mild & safe with gentle humor'
                    : (crazynessLevel[0] ?? 50) <= 45
                      ? 'Moderately playful with mild awkwardness'
                      : (crazynessLevel[0] ?? 50) <= 60
                        ? 'Spicy & entertaining with social drama'
                        : (crazynessLevel[0] ?? 50) <= 75
                          ? 'Bold & dramatic with adult themes'
                          : (crazynessLevel[0] ?? 50) <= 90
                            ? 'Extremely wild & outrageous scenarios'
                            : 'Absolutely unhinged & chaotic content'}
              </div>
            </div>

            {/* Input area */}
            <div className="flex-shrink-0 border-t p-4">
              <div className="flex space-x-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={e => setInputMessage(e.target.value)}
                  placeholder="Ask me anything or describe your group..."
                  onKeyPress={handleKeyPress}
                  disabled={isLoading}
                  className="flex-grow"
                />
                <Button
                  size="icon"
                  onClick={sendChatMessage}
                  disabled={!inputMessage.trim() || isLoading}
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
