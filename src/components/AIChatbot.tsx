import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  onQuestionsGenerated?: (questions: any[], gameType: string) => void;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ roomCode, currentGame, onQuestionsGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customization, setCustomization] = useState('');
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

    const userMessage = inputMessage.trim();
    setInputMessage('');
    addMessage(userMessage, true);
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: userMessage,
          action: 'chat',
          customization,
          roomCode,
          currentGame
        }
      });

      if (error) throw error;

      // Check if user is setting customization
      if (userMessage.toLowerCase().includes('we are') || userMessage.toLowerCase().includes('we like') || userMessage.toLowerCase().includes('we love')) {
        setCustomization(userMessage);
        
        // Save to database if in a room
        if (roomCode) {
          await supabase.from('ai_chat_customizations').insert({
            room_id: roomCode,
            customization_text: userMessage
          });
        }
      }

      addMessage(data.response);
    } catch (error) {
      console.error('Chat error:', error);
      addMessage('Sorry, I encountered an error. Please try again.');
      toast({
        title: "Chat Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateCustomQuestions = async (gameType: string) => {
    if (!customization) {
      toast({
        title: "Customization Needed",
        description: "Please tell me about your group first (e.g., 'we are nerdy', 'we love sci-fi')",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    addMessage(`Generating custom ${gameType.replace('-', ' ')} questions based on: "${customization}"`, true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: '',
          action: 'generate_questions',
          customization,
          gameType,
          roomCode
        }
      });

      if (error) throw error;

      const questions = JSON.parse(data.response);
      addMessage(`Generated ${questions.length} custom questions! You can use them in your ${gameType.replace('-', ' ')} game.`);
      
      if (onQuestionsGenerated) {
        onQuestionsGenerated(questions, gameType);
      }

      toast({
        title: "Questions Generated!",
        description: `Created ${questions.length} custom questions for your game.`,
      });
    } catch (error) {
      console.error('Question generation error:', error);
      addMessage('Sorry, I had trouble generating questions. Please try again.');
      toast({
        title: "Generation Error",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { label: 'Would You Rather', action: () => generateCustomQuestions('would-you-rather') },
    { label: 'Forms Questions', action: () => generateCustomQuestions('forms') },
    { label: 'Paranoia Questions', action: () => generateCustomQuestions('paranoia') },
  ];

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300 animate-pulse"
          size="icon"
        >
          <Sparkles className="h-6 w-6" />
        </Button>
      ) : (
        <Card className="w-80 h-96 flex flex-col shadow-2xl border-primary/20 animate-scale-in">
          <CardHeader className="flex-row items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/10">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">AI Game Assistant</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground text-sm py-4">
                  <Sparkles className="h-8 w-8 mx-auto mb-2 text-primary/50" />
                  <p>Hi! I'm your AI game assistant.</p>
                  <p className="mt-1">Tell me about your group to get custom questions!</p>
                  <p className="mt-2 text-xs italic">Try: "We are nerdy" or "We love sci-fi"</p>
                </div>
              )}
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-2 rounded-lg text-sm ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {message.text}
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-2 rounded-lg flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {customization && (
              <div className="p-3 border-t bg-muted/20">
                <div className="flex items-center gap-1 mb-2">
                  <Badge variant="secondary" className="text-xs">
                    {customization}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-1">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={action.action}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-xs h-7"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Tell me about your group..."
                  className="flex-1 text-sm"
                  disabled={isLoading}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading}
                  size="icon"
                  className="h-9 w-9"
                >
                  <Send className="h-4 w-4" />
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