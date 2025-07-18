import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { message, action, customization, crazynessLevel, gameType, players, roomCode } = await req.json();

    console.log('AI Chat request:', { message, action, customization, crazynessLevel, gameType, players, roomCode });

    let systemPrompt = '';
    let userPrompt = message;

    if (action === 'chat') {
      systemPrompt = `You are a helpful AI assistant for a party games app. You help users customize their gaming experience and provide fun suggestions. Keep responses conversational, friendly, and brief. If users mention preferences like "we are nerdy" or "we love sci-fi", remember these for future interactions.`;
    } else if (action === 'generate_would_you_rather') {
      const playerNames = players && players.length > 0 ? players.map(p => p.player_name).join(', ') : '';
      const playerInfo = playerNames ? `The players are: ${playerNames}.` : '';
      
      systemPrompt = `Generate 5 personalized "Would You Rather" questions based on the customization and players. ${playerInfo}
      
      Make the questions:
      1. Personalized and relevant to the group
      2. Fun and engaging for party games
      3. Appropriate for the group dynamic
      4. Creative and thought-provoking
      
      You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
      {
        "questions": [
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."}
        ]
      }`;
      userPrompt = `Generate 5 "Would You Rather" questions for: ${customization}. ${playerInfo}`;
    } else if (action === 'generate_all_questions') {
      const crazynessDescription = crazynessLevel <= 20 ? "very mild and safe" :
                                  crazynessLevel <= 40 ? "mild with some fun edge" :
                                  crazynessLevel <= 60 ? "moderately spicy and entertaining" :
                                  crazynessLevel <= 80 ? "quite dramatic and bold" :
                                  "extremely wild, dramatic, and outrageous";
      
      systemPrompt = `Generate questions for ALL three party games based on the customization: "${customization}". 
      
      CRAZINESS LEVEL: ${crazynessLevel}% (${crazynessDescription})
      
      Adjust the intensity and dramatization of questions based on the craziness level:
      - 0-20%: Keep questions very mild, safe, and family-friendly
      - 21-40%: Add some fun elements but stay mostly tame
      - 41-60%: Make questions more entertaining with moderate spice
      - 61-80%: Create dramatic, bold questions that push boundaries
      - 81-100%: Go wild with outrageous, extreme, and highly dramatic scenarios
      
      You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
      {
        "would_you_rather": [
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."}
        ],
        "forms": [
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."},
          {"question": "..."}
        ],
        "paranoia": [
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."}
        ]
      }
      
      Make sure all questions match both the theme/preferences mentioned in the customization AND the specified craziness level. Return ONLY the JSON object, nothing else.`;
      userPrompt = `Generate questions for all three party games for a group that is: ${customization}. Craziness level: ${crazynessLevel}%`;
    }

    console.log('Sending request to OpenAI:', {
      action,
      userPrompt,
      systemPrompt
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: action === 'chat' ? 0.8 : 0.9,
        max_tokens: action === 'chat' ? 200 : 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error
      });
      throw new Error(`OpenAI API error: ${response.status} - ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('OpenAI response:', generatedText);

    return new Response(JSON.stringify({ 
      response: generatedText,
      action: action 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});