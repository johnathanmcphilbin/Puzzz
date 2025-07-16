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
  currentPlayer?: { id: string; player_name: string; player_id: string; is_host: boolean; } | null;
  onQuestionsGenerated?: (questions: any[], gameType: string) => void;
}

const AIChatbot: React.FC<AIChatbotProps> = ({ roomCode, currentGame, currentPlayer, onQuestionsGenerated }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [customization, setCustomization] = useState('');
  const [hasGeneratedQuestions, setHasGeneratedQuestions] = useState(false);
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
      // Set customization and automatically start generating questions
      setCustomization(userMessage);
      
      // Save customization to database
      if (roomCode) {
        await supabase.from('ai_chat_customizations').insert({
          room_id: roomCode,
          customization_text: userMessage
        });
      }

      // Show generating message
      addMessage(`Perfect! I'll now generate custom questions for all your games based on: "${userMessage}"`);
      
      // Automatically start generating questions
      await generateQuestionsFromCustomization(userMessage);
      
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
      console.log('Saving questions for room:', roomCode, 'Questions data:', allQuestions);
      
      if (!roomCode) {
        console.error('No room code provided to saveAllCustomQuestions');
        throw new Error('Room code is required to save questions');
      }
      
      // First get the room ID from room code
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id')
        .eq('room_code', roomCode)
        .single();
      
      if (roomError) {
        console.error('Error fetching room:', roomError);
        throw new Error(`Could not find room with code ${roomCode}`);
      }
      
      const roomId = roomData.id;
      console.log('Room ID found:', roomId);

      // Use a transaction-like approach by wrapping in try-catch
      const operations = [];

      // Save Would You Rather questions
      if (allQuestions.would_you_rather && allQuestions.would_you_rather.length > 0) {
        console.log('Processing would you rather questions:', allQuestions.would_you_rather.length);
        
        const wyrQuestions = allQuestions.would_you_rather.map((q: any) => ({
          option_a: q.option_a,
          option_b: q.option_b,
          category: `AI-Generated (${roomCode})`
        }));
        
        // Delete old AI questions for this room first
        const { error: deleteError } = await supabase
          .from('would_you_rather_questions')
          .delete()
          .eq('category', `AI-Generated (${roomCode})`);
        
        if (deleteError) {
          console.error('Error deleting old would you rather questions:', deleteError);
        }
          
        const { data: insertedWYR, error: wyrError } = await supabase
          .from('would_you_rather_questions')
          .insert(wyrQuestions)
          .select();
        
        if (wyrError) {
          console.error('Error inserting would you rather questions:', wyrError);
          throw wyrError;
        }
        console.log('Successfully saved would you rather questions:', insertedWYR?.length);
      }

      // Save Forms questions
      if (allQuestions.forms && allQuestions.forms.length > 0) {
        console.log('Processing forms questions:', allQuestions.forms.length);
        
        const formsQuestions = allQuestions.forms.map((q: any) => ({
          question: q.question,
          category: `AI-Generated (${roomCode})`,
          is_controversial: false
        }));
        
        // Delete old AI questions for this room first
        const { error: deleteError } = await supabase
          .from('forms_questions')
          .delete()
          .eq('category', `AI-Generated (${roomCode})`);
        
        if (deleteError) {
          console.error('Error deleting old forms questions:', deleteError);
        }
          
        const { data: insertedForms, error: formsError } = await supabase
          .from('forms_questions')
          .insert(formsQuestions)
          .select();
        
        if (formsError) {
          console.error('Error inserting forms questions:', formsError);
          throw formsError;
        }
        console.log('Successfully saved forms questions:', insertedForms?.length);
      }

      // Save Paranoia questions
      if (allQuestions.paranoia && allQuestions.paranoia.length > 0) {
        console.log('Processing paranoia questions:', allQuestions.paranoia.length);
        
        const paranoiaQuestions = allQuestions.paranoia.map((q: any) => ({
          question: q.question,
          category: `AI-Generated (${roomCode})`,
          spiciness_level: 3
        }));
        
        // Delete old AI questions for this room first
        const { error: deleteError } = await supabase
          .from('paranoia_questions')
          .delete()
          .eq('category', `AI-Generated (${roomCode})`);
        
        if (deleteError) {
          console.error('Error deleting old paranoia questions:', deleteError);
        }
          
        const { data: insertedParanoia, error: paranoiaError } = await supabase
          .from('paranoia_questions')
          .insert(paranoiaQuestions)
          .select();
        
        if (paranoiaError) {
          console.error('Error inserting paranoia questions:', paranoiaError);
          throw paranoiaError;
        }
        console.log('Successfully saved paranoia questions:', insertedParanoia?.length);
      }
      
      console.log('All questions saved successfully for room:', roomCode);
    } catch (error) {
      console.error('Error saving all custom questions:', error);
      throw error;
    }
  };

  const saveCustomization = async (customizationText: string) => {
    if (roomCode) {
      try {
        await supabase.from('ai_chat_customizations').insert({
          room_id: roomCode,
          customization_text: customizationText
        });
        console.log('Saved customization to database:', customizationText);
      } catch (error) {
        console.error('Error saving customization:', error);
      }
    } else {
      console.warn('Cannot save customization: no room code provided');
    }
  };

  const generateQuestionsFromCustomization = async (customizationText: string) => {
    if (!roomCode) {
      throw new Error('Room code is required');
    }

    try {
      console.log('Starting question generation for room:', roomCode, 'with customization:', customizationText);
      
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: '',
          action: 'generate_all_questions',
          customization: customizationText.trim(),
          roomCode
        }
      });

      console.log('AI function response:', { data, error });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      if (!data || !data.response) {
        console.error('No response data from AI function');
        throw new Error('No response from AI service');
      }

      console.log('Raw AI response:', data.response);
      
      // Clean the response by removing markdown code blocks if present
      let cleanedResponse = data.response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      
      console.log('Cleaned response for parsing:', cleanedResponse);
      
      // Parse the JSON response
      let allQuestions;
      try {
        allQuestions = JSON.parse(cleanedResponse);
        console.log('Successfully parsed questions:', allQuestions);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Raw response:', data.response);
        console.error('Cleaned response:', cleanedResponse);
        throw new Error(`Failed to parse AI response: ${parseError.message}`);
      }

      // Validate structure
      if (!allQuestions || typeof allQuestions !== 'object') {
        console.error('Invalid questions structure:', allQuestions);
        throw new Error('AI response is not a valid object');
      }

      const hasWYR = allQuestions.would_you_rather && Array.isArray(allQuestions.would_you_rather);
      const hasForms = allQuestions.forms && Array.isArray(allQuestions.forms);
      const hasParanoia = allQuestions.paranoia && Array.isArray(allQuestions.paranoia);

      if (!hasWYR || !hasForms || !hasParanoia) {
        console.error('Missing question types:', { hasWYR, hasForms, hasParanoia, structure: allQuestions });
        throw new Error('AI did not generate all required question types');
      }

      // Save all question types to database
      console.log('About to save questions to database...');
      await saveAllCustomQuestions(allQuestions);

      // Mark that questions have been generated for this room
      setHasGeneratedQuestions(true);

      const totalQuestions = allQuestions.would_you_rather.length + 
                           allQuestions.forms.length + 
                           allQuestions.paranoia.length;

      addMessage(`✅ Generated ${totalQuestions} custom questions for all your games! They're now active in your room.`);

      toast({
        title: "Questions Generated!",
        description: `Created ${allQuestions.would_you_rather.length} Would You Rather, ${allQuestions.forms.length} Forms, and ${allQuestions.paranoia.length} Paranoia questions`,
      });
    } catch (error) {
      console.error('Question generation error:', error);
      const errorMessage = error.message || 'Unknown error occurred';
      addMessage(`❌ Sorry, I had trouble generating questions: ${errorMessage}`);
      throw error;
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
      await generateQuestionsFromCustomization(customization);
    } catch (error) {
      // Error handling is done in generateQuestionsFromCustomization
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
          <CardHeader className="flex-row items-center justify-between p-4 bg-gradient-to-r from-primary/10 to-secondary/10 border-b">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-sm">AI Game Assistant</h3>
            </div>
            <Button
              onClick={() => setIsOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 hover:bg-background/50"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 scroll-smooth">
              
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] p-3 rounded-lg text-sm break-words ${
                      message.isUser
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted text-foreground rounded-bl-sm'
                    }`}
                  >
                    <div className="whitespace-pre-wrap leading-relaxed">
                      {message.text}
                    </div>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions */}
            {customization && !hasGeneratedQuestions && (
              <div className="p-3 border-t bg-muted/20">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="text-xs font-medium">
                    Theme: {customization}
                  </Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickActions.map((action) => (
                    <Button
                      key={action.label}
                      onClick={action.action}
                      disabled={isLoading}
                      variant="outline"
                      size="sm"
                      className="text-xs h-8 hover:bg-primary/10"
                    >
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Show message if questions already generated */}
            {hasGeneratedQuestions && (
              <div className="p-3 border-t bg-muted/20">
                <div className="text-center text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    ✅ Custom questions already generated for this room
                  </Badge>
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={hasGeneratedQuestions ? "Questions already generated for this room" : "Tell me about your group..."}
                  className="flex-1 text-sm focus:ring-primary/50"
                  disabled={isLoading || hasGeneratedQuestions}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isLoading || hasGeneratedQuestions}
                  size="icon"
                  className="h-9 w-9 shrink-0"
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