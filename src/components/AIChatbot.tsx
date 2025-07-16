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
    // Load existing customization for this room
    const loadCustomization = async () => {
      if (roomCode) {
        const { data } = await supabase
          .from('ai_chat_customizations')
          .select('customization_text')
          .eq('room_id', roomCode)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        if (data?.customization_text) {
          setCustomization(data.customization_text);
        }
      }
    };
    
    loadCustomization();
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
        const newCustomization = userMessage;
        setCustomization(newCustomization);
        
        // Save to database if in a room
        if (roomCode) {
          await supabase.from('ai_chat_customizations').insert({
            room_id: roomCode,
            customization_text: newCustomization
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

  const saveAllCustomQuestions = async (allQuestions: any) => {
    try {
      console.log('Saving questions for room:', roomCode, allQuestions);
      
      // Save Would You Rather questions
      if (allQuestions.would_you_rather && allQuestions.would_you_rather.length > 0) {
        const wyrQuestions = allQuestions.would_you_rather.map((q: any) => ({
          option_a: q.option_a,
          option_b: q.option_b,
          category: `AI-Generated (${roomCode})`
        }));
        
        // Delete old AI questions for this room first
        await supabase
          .from('would_you_rather_questions')
          .delete()
          .eq('category', `AI-Generated (${roomCode})`);
          
        const { error: wyrError } = await supabase
          .from('would_you_rather_questions')
          .insert(wyrQuestions);
        
        if (wyrError) throw wyrError;
        console.log('Saved would you rather questions:', wyrQuestions.length);
      }

      // Save Forms questions
      if (allQuestions.forms && allQuestions.forms.length > 0) {
        const formsQuestions = allQuestions.forms.map((q: any) => ({
          question: q.question,
          category: `AI-Generated (${roomCode})`,
          is_controversial: false
        }));
        
        // Delete old AI questions for this room first
        await supabase
          .from('forms_questions')
          .delete()
          .eq('category', `AI-Generated (${roomCode})`);
          
        const { error: formsError } = await supabase
          .from('forms_questions')
          .insert(formsQuestions);
        
        if (formsError) throw formsError;
        console.log('Saved forms questions:', formsQuestions.length);
      }

      // Save Paranoia questions
      if (allQuestions.paranoia && allQuestions.paranoia.length > 0) {
        const paranoiaQuestions = allQuestions.paranoia.map((q: any) => ({
          question: q.question,
          category: `AI-Generated (${roomCode})`,
          spiciness_level: 3
        }));
        
        // Delete old AI questions for this room first
        await supabase
          .from('paranoia_questions')
          .delete()
          .eq('category', `AI-Generated (${roomCode})`);
          
        const { error: paranoiaError } = await supabase
          .from('paranoia_questions')
          .insert(paranoiaQuestions);
        
        if (paranoiaError) throw paranoiaError;
        console.log('Saved paranoia questions:', paranoiaQuestions.length);
      }
    } catch (error) {
      console.error('Error saving all custom questions:', error);
      throw error;
    }
  };

  const generateAllCustomQuestions = async () => {
    if (!customization) {
      toast({
        title: "Customization Needed",
        description: "Please tell me about your group first (e.g., 'we are nerdy', 'we love sci-fi')",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    addMessage(`Generating custom questions for all games based on: "${customization}"`, true);

    try {
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: '',
          action: 'generate_all_questions',
          customization,
          roomCode
        }
      });

      if (error) throw error;

      console.log('Raw AI response:', data.response);
      
      // Clean the response by removing markdown code blocks if present
      let cleanedResponse = data.response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      // Parse the JSON response
      let allQuestions;
      try {
        allQuestions = JSON.parse(cleanedResponse);
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Cleaned response:', cleanedResponse);
        throw new Error('Failed to parse AI response');
      }

      // Save all question types to database
      if (roomCode && allQuestions) {
        await saveAllCustomQuestions(allQuestions);
      }

      const totalQuestions = (allQuestions.would_you_rather?.length || 0) + 
                           (allQuestions.forms?.length || 0) + 
                           (allQuestions.paranoia?.length || 0);

      addMessage(`Generated ${totalQuestions} custom questions for all your games! They're now active in your room.`);

      toast({
        title: "Questions Generated!",
        description: `Created custom questions for all games and activated them for your room.`,
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
    { label: 'Generate Custom Questions', action: () => generateAllCustomQuestions() },
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
          className="h-14 w-14 rounded-full bg-primary hover:bg-primary/90 shadow-lg hover:shadow-xl transition-all duration-300"
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