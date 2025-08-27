// @ts-nocheck
// This is a Deno Edge Function - TypeScript errors for Deno imports are expected in Node.js environment
import 'https://deno.land/x/xhr@0.1.0/mod.ts';
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
};

// Function to get craziness-specific prompt modifications
const getCrazynessPromptModifications = (crazynessLevel: number) => {
  if (crazynessLevel <= 15) {
    return {
      description: 'EXTREMELY SAFE & FAMILY-FRIENDLY',
      constraints: [
        'All content must be appropriate for children',
        'No controversial topics whatsoever',
        'Focus on wholesome, innocent scenarios',
        'Avoid any potentially uncomfortable situations',
        'Keep everything light and cheerful',
      ],
      examples: [
        'Would You Rather: "eat ice cream for breakfast" vs "have pancakes for dinner"',
        'Paranoia: "Who is most likely to help someone find their lost pet?"',
      ],
      forbidden: [
        'relationships',
        'money stress',
        'embarrassing situations',
        'risky activities',
      ],
      temperature: 0.7,
    };
  } else if (crazynessLevel <= 30) {
    return {
      description: 'MILD & SAFE',
      constraints: [
        'Keep content family-friendly but can include mild humor',
        'Gentle hypothetical scenarios only',
        'Avoid anything potentially offensive',
        'Focus on fun, everyday situations',
      ],
      examples: [
        'Would You Rather: "always have to sing instead of talk" vs "always have to hop instead of walk"',
        'Paranoia: "Who is most likely to accidentally wear mismatched shoes?"',
      ],
      forbidden: [
        'adult themes',
        'controversial topics',
        'embarrassing personal situations',
      ],
      temperature: 0.8,
    };
  } else if (crazynessLevel <= 45) {
    return {
      description: 'MODERATELY PLAYFUL',
      constraints: [
        'Include some mildly awkward or funny scenarios',
        'Can mention everyday embarrassments',
        'Add some absurd but harmless situations',
        'Keep it entertaining but not offensive',
      ],
      examples: [
        'Would You Rather: "accidentally send a text meant for your crush to your boss" vs "show up to a formal event in pajamas"',
        'Paranoia: "Who is most likely to get caught talking to themselves in public?"',
      ],
      forbidden: ['sexual content', 'serious trauma', 'illegal activities'],
      temperature: 0.85,
    };
  } else if (crazynessLevel <= 60) {
    return {
      description: 'SPICY & ENTERTAINING',
      constraints: [
        'Include moderately embarrassing scenarios',
        'Can mention social awkwardness and dating mishaps',
        'Add dramatic hypothetical situations',
        'Include some relationship and social dynamics',
        'Make scenarios more emotionally intense',
      ],
      examples: [
        'Would You Rather: "have your browser history publicly displayed for a week" vs "have to wear your most embarrassing outfit to work for a month"',
        'Paranoia: "Who is most likely to drunk-text their ex at 3 AM?"',
      ],
      forbidden: [
        'explicit sexual content',
        'serious harm',
        'illegal activities',
      ],
      temperature: 0.9,
    };
  } else if (crazynessLevel <= 75) {
    return {
      description: 'BOLD & DRAMATIC',
      constraints: [
        'Include dramatically embarrassing scenarios',
        'Can mention adult themes and relationship drama',
        'Add morally complex situations',
        'Include social taboos and awkward personal situations',
        'Make scenarios psychologically intense',
      ],
      examples: [
        'Would You Rather: "find out your partner has been reading your diary for years" vs "accidentally reveal a friend\'s biggest secret at their wedding"',
        'Paranoia: "Who is most likely to have a secret OnlyFans account?"',
      ],
      forbidden: [
        'graphic violence',
        'serious trauma',
        'explicitly illegal content',
      ],
      temperature: 0.95,
    };
  } else if (crazynessLevel <= 90) {
    return {
      description: 'EXTREMELY WILD & OUTRAGEOUS',
      constraints: [
        'Include outrageous and shocking scenarios',
        'Can mention taboo subjects and controversial topics',
        'Add morally questionable hypothetical situations',
        'Include extreme social situations and personal boundaries',
        'Make scenarios wildly dramatic and intense',
        'Push social norms and comfort zones',
      ],
      examples: [
        'Would You Rather: "accidentally send nudes to your family group chat" vs "walk in on your parents having a threesome"',
        'Paranoia: "Who is most likely to fake their own death to escape their problems?"',
      ],
      forbidden: [
        'graphic violence against people',
        'serious illegal activities',
        'promotion of harmful behaviors',
      ],
      temperature: 1.0,
    };
  } else {
    return {
      description: 'ABSOLUTELY UNHINGED & CHAOTIC',
      constraints: [
        'Include completely outrageous and shocking scenarios',
        'Push ALL boundaries while staying legal',
        'Include the most dramatic, wild, and intense situations possible',
        'Make everything as chaotic and unhinged as possible',
        'Include taboo subjects, controversial opinions, extreme hypotheticals',
        'Go absolutely wild with creativity and shock value',
      ],
      examples: [
        'Would You Rather: "be trapped in an elevator with your worst enemy and a truth serum" vs "have to spend a night in jail with someone who has a crush on you"',
        'Paranoia: "Who is most likely to start a cult if they got bored enough?"',
      ],
      forbidden: [
        'only graphic violence and explicit illegal content - everything else is fair game',
      ],
      temperature: 1.1,
    };
  }
};

serve(async req => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const {
      message,
      action,
      customization,
      crazynessLevel,
      gameType,
      players,
      roomCode,
    } = await req.json();

    console.log('AI Chat request:', {
      message,
      action,
      customization,
      crazynessLevel,
      gameType,
      players,
      roomCode,
    });

    let systemPrompt = '';
    let userPrompt = message;
    let temperature = 0.8;

    // Get craziness-specific modifications
    const crazynessConfig = getCrazynessPromptModifications(
      crazynessLevel || 50
    );
    temperature = crazynessConfig.temperature;

    if (action === 'chat') {
      systemPrompt = `You are a helpful AI assistant for a party games app. You help users customize their gaming experience and provide fun suggestions. Keep responses conversational, friendly, and brief. If users mention preferences like "we are nerdy" or "we love sci-fi", remember these for future interactions.`;
    } else if (action === 'generate_would_you_rather') {
      systemPrompt = `Generate 5 "Would You Rather" questions based HEAVILY on the customization theme: "${customization}".
      
      CRAZINESS LEVEL: ${crazynessLevel}% - ${crazynessConfig.description}
      
      CONTENT CONSTRAINTS FOR THIS LEVEL:
      ${crazynessConfig.constraints.map(c => `• ${c}`).join('\n')}
      
      EXAMPLES OF APPROPRIATE CONTENT FOR THIS LEVEL:
      ${crazynessConfig.examples.map(e => `• ${e}`).join('\n')}
      
      FORBIDDEN CONTENT:
      ${crazynessConfig.forbidden.map(f => `• ${f}`).join('\n')}
      
      CRITICAL: DO NOT include "Would you rather" in the options themselves. Only provide the choice content.
      
      IMPORTANT: The questions MUST be directly related to and inspired by the theme/interests mentioned in the customization. If they mention "Star Wars", include Star Wars elements. If they mention "nerdy", include nerdy/geeky scenarios.
      
      Make the questions:
      1. HEAVILY themed around the customization (this is the most important requirement)
      2. Perfectly matched to the ${crazynessLevel}% craziness level
      3. General scenarios (NOT personalized to specific players)
      4. Dramatically different in intensity based on the craziness level
      5. Following the specific constraints and examples for this craziness level
      
      Format the options as simple choices without "Would you rather" prefix.
      
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
      userPrompt = `Generate 5 "Would You Rather" questions that are HEAVILY themed around: ${customization}. Craziness level: ${crazynessLevel}% (${crazynessConfig.description}). Make them match the exact intensity and constraints specified for this craziness level. Do NOT include "Would you rather" in the options.`;
    } else if (action === 'generate_all_questions') {
      systemPrompt = `Generate questions for ALL three party games based HEAVILY on the customization theme: "${customization}". 
      
      CRAZINESS LEVEL: ${crazynessLevel}% - ${crazynessConfig.description}
      
      CONTENT CONSTRAINTS FOR THIS LEVEL:
      ${crazynessConfig.constraints.map(c => `• ${c}`).join('\n')}
      
      EXAMPLES OF APPROPRIATE CONTENT FOR THIS LEVEL:
      ${crazynessConfig.examples.map(e => `• ${e}`).join('\n')}
      
      FORBIDDEN CONTENT:
      ${crazynessConfig.forbidden.map(f => `• ${f}`).join('\n')}
      
      CRITICAL: ALL questions must be directly related to and inspired by the theme/interests mentioned. If they mention "Star Wars", include Star Wars elements throughout. If they mention "nerdy", include nerdy/geeky scenarios. The theme should be evident in EVERY question.
      
      INTENSITY REQUIREMENTS:
      - Every single question must precisely match the ${crazynessLevel}% craziness level
      - The difference between low and high craziness levels should be DRAMATIC
      - Follow the specific constraints and forbidden content for this level
      - Use the examples as guidance for appropriate intensity
      
      Generate 20 Would You Rather questions and 15 Paranoia questions.
      
      You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
      {
        "would_you_rather": [
          {"option_a": "...", "option_b": "..."},
          {"option_a": "...", "option_b": "..."}
        ],
        "paranoia": [
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."}
        ]
      }
      
      Make sure ALL questions are HEAVILY themed around the customization AND precisely match the ${crazynessLevel}% craziness level with its specific constraints. Return ONLY the JSON object, nothing else.`;
      userPrompt = `Generate 20 Would You Rather questions and 15 Paranoia questions that are HEAVILY themed around: ${customization}. Craziness level: ${crazynessLevel}% (${crazynessConfig.description}). Every single question must incorporate elements from this theme AND match the exact intensity level specified.`;
    } else if (action === 'generate_paranoia_questions') {
      const playerNames =
        players && players.length > 0
          ? players.map(p => p.player_name).join(', ')
          : '';
      const playerInfo = playerNames ? `The players are: ${playerNames}.` : '';

      systemPrompt = `Generate 10 personalized Paranoia questions based on the customization and players. ${playerInfo}
      
      CRAZINESS LEVEL: ${crazynessLevel}% - ${crazynessConfig.description}
      
      CONTENT CONSTRAINTS FOR THIS LEVEL:
      ${crazynessConfig.constraints.map(c => `• ${c}`).join('\n')}
      
      EXAMPLES OF APPROPRIATE CONTENT FOR THIS LEVEL:
      ${crazynessConfig.examples
        .filter(e => e.includes('Paranoia'))
        .map(e => `• ${e}`)
        .join('\n')}
      
      FORBIDDEN CONTENT:
      ${crazynessConfig.forbidden.map(f => `• ${f}`).join('\n')}
      
      Paranoia questions should:
      1. Start with "Who is most likely to..." or similar format
      2. Be personalized to the group when player names are provided
      3. Precisely match the ${crazynessLevel}% craziness level
      4. Create fun suspense and mystery appropriate to the intensity level
      5. Follow the specific constraints for this craziness level
      6. Make players curious about who was chosen
      
      You MUST return ONLY valid JSON with this exact structure (no markdown, no code blocks, no explanations):
      {
        "questions": [
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."},
          {"question": "Who is most likely to..."}
        ]
      }`;
      userPrompt = `Generate 10 Paranoia questions for: ${customization}. ${playerInfo} Craziness level: ${crazynessLevel}% (${crazynessConfig.description}). Match the exact intensity and constraints for this level.`;
    }

    console.log('Sending request to OpenAI:', {
      action,
      userPrompt,
      systemPrompt,
      temperature,
      crazynessLevel,
    });

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: temperature,
        max_tokens: action === 'chat' ? 200 : 1000,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      console.error('OpenAI API error:', {
        status: response.status,
        statusText: response.statusText,
        error,
      });
      throw new Error(
        `OpenAI API error: ${response.status} - ${error.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;

    console.log('OpenAI response:', generatedText);

    return new Response(
      JSON.stringify({
        response: generatedText,
        action: action,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
