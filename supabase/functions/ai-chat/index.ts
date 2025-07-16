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

    const { message, action, customization, gameType, players } = await req.json();

    console.log('AI Chat request:', { message, action, customization, gameType, players });

    let systemPrompt = '';
    let userPrompt = message;

    if (action === 'chat') {
      systemPrompt = `You are a helpful AI assistant for a party games app. You help users customize their gaming experience and provide fun suggestions. Keep responses conversational, friendly, and brief. If users mention preferences like "we are nerdy" or "we love sci-fi", remember these for future interactions.`;
    } else if (action === 'generate_questions') {
      if (gameType === 'would-you-rather') {
        systemPrompt = `Generate creative "Would You Rather" questions based on the customization: "${customization}". Return ONLY a JSON array of objects with "option_a" and "option_b" properties. Generate 5 questions that match the theme/preferences mentioned.`;
        userPrompt = `Generate 5 would you rather questions for a group that is: ${customization}`;
      } else if (gameType === 'forms') {
        systemPrompt = `Generate personal questions for the "Forms Game" based on the customization: "${customization}". Return ONLY a JSON array of objects with "question" property. Generate 5 questions that help people learn about each other and match the theme/preferences mentioned.`;
        userPrompt = `Generate 5 personal questions for a group that is: ${customization}`;
      } else if (gameType === 'paranoia') {
        systemPrompt = `Generate "Paranoia" questions based on the customization: "${customization}". These should be questions like "Who is most likely to..." Return ONLY a JSON array of objects with "question" property. Generate 5 questions that match the theme/preferences mentioned.`;
        userPrompt = `Generate 5 paranoia questions (who is most likely to...) for a group that is: ${customization}`;
      }
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: action === 'chat' ? 0.8 : 0.9,
        max_tokens: action === 'chat' ? 200 : 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
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