// @ts-nocheck
// This is a Deno Edge Function - TypeScript errors for Deno imports are expected in Node.js environment
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const functionsUrl = Deno.env.get('SUPABASE_URL') + '/functions/v1';
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Function to get craziness-specific prompt modifications
const getCrazynessPromptModifications = (crazynessLevel: number) => {
  if (crazynessLevel <= 15) {
    return {
      description: "EXTREMELY SAFE & FAMILY-FRIENDLY",
      constraints: [
        "All content must be appropriate for children",
        "No controversial topics whatsoever", 
        "Focus on wholesome, innocent scenarios",
        "Avoid any potentially uncomfortable situations",
        "Keep everything light and cheerful"
      ],
      examples: [
        'Would You Rather: "eat ice cream for breakfast" vs "have pancakes for dinner"',
        'Paranoia: "Who is most likely to help someone find their lost pet?"',
        'Odd One Out: Normal: "Name a farm animal" vs Imposter: "Name a zoo animal"'
      ],
      forbidden: ["relationships", "money stress", "embarrassing situations", "risky activities"],
      temperature: 0.7
    };
  } else if (crazynessLevel <= 30) {
    return {
      description: "MILD & SAFE",
      constraints: [
        "Keep content family-friendly but can include mild humor",
        "Gentle hypothetical scenarios only",
        "Avoid anything potentially offensive",
        "Focus on fun, everyday situations"
      ],
      examples: [
        'Would You Rather: "always have to sing instead of talk" vs "always have to hop instead of walk"',
        'Paranoia: "Who is most likely to accidentally wear mismatched shoes?"',
        'Odd One Out: Normal: "Name a breakfast food" vs Imposter: "Name a dessert"'
      ],
      forbidden: ["adult themes", "controversial topics", "embarrassing personal situations"],
      temperature: 0.8
    };
  } else if (crazynessLevel <= 45) {
    return {
      description: "MODERATELY PLAYFUL",
      constraints: [
        "Include some mildly awkward or funny scenarios",
        "Can mention everyday embarrassments",
        "Add some absurd but harmless situations",
        "Keep it entertaining but not offensive"
      ],
      examples: [
        'Would You Rather: "accidentally send a text meant for your crush to your boss" vs "show up to a formal event in pajamas"',
        'Paranoia: "Who is most likely to get caught talking to themselves in public?"',
        'Odd One Out: Normal: "Name something you do when nervous" vs Imposter: "Name something you do when excited"'
      ],
      forbidden: ["sexual content", "serious trauma", "illegal activities"],
      temperature: 0.85
    };
  } else if (crazynessLevel <= 60) {
    return {
      description: "SPICY & ENTERTAINING",
      constraints: [
        "Include moderately embarrassing scenarios",
        "Can mention social awkwardness and dating mishaps",
        "Add dramatic hypothetical situations",
        "Include some relationship and social dynamics",
        "Make scenarios more emotionally intense"
      ],
      examples: [
        'Would You Rather: "have your browser history publicly displayed for a week" vs "have to wear your most embarrassing outfit to work for a month"',
        'Paranoia: "Who is most likely to drunk-text their ex at 3 AM?"',
        'Odd One Out: Normal: "Name a red flag in dating" vs Imposter: "Name a green flag in dating"'
      ],
      forbidden: ["explicit sexual content", "serious harm", "illegal activities"],
      temperature: 0.9
    };
  } else if (crazynessLevel <= 75) {
    return {
      description: "BOLD & DRAMATIC",
      constraints: [
        "Include dramatically embarrassing scenarios",
        "Can mention adult themes and relationship drama",
        "Add morally complex situations",
        "Include social taboos and awkward personal situations",
        "Make scenarios psychologically intense"
      ],
      examples: [
        'Would You Rather: "find out your partner has been reading your diary for years" vs "accidentally reveal a friend\'s biggest secret at their wedding"',
        'Paranoia: "Who is most likely to have a secret OnlyFans account?"',
        'Odd One Out: Normal: "Name something you\'d never admit to your parents" vs Imposter: "Name something you\'d never admit to your friends"'
      ],
      forbidden: ["graphic violence", "serious trauma", "explicitly illegal content"],
      temperature: 0.95
    };
  } else if (crazynessLevel <= 90) {
    return {
      description: "EXTREMELY WILD & OUTRAGEOUS",
      constraints: [
        "Include outrageous and shocking scenarios",
        "Can mention taboo subjects and controversial topics",
        "Add morally questionable hypothetical situations",
        "Include extreme social situations and personal boundaries",
        "Make scenarios wildly dramatic and intense",
        "Push social norms and comfort zones"
      ],
      examples: [
        'Would You Rather: "accidentally send nudes to your family group chat" vs "walk in on your parents having a threesome"',
        'Paranoia: "Who is most likely to fake their own death to escape their problems?"',
        'Odd One Out: Normal: "Name something illegal you\'ve considered" vs Imposter: "Name something legal but morally questionable you\'ve done"'
      ],
      forbidden: ["graphic violence against people", "serious illegal activities", "promotion of harmful behaviors"],
      temperature: 1.0
    };
  } else {
    return {
      description: "ABSOLUTELY UNHINGED & CHAOTIC",
      constraints: [
        "Include completely outrageous and shocking scenarios",
        "Push ALL boundaries while staying legal",
        "Include the most dramatic, wild, and intense situations possible",
        "Make everything as chaotic and unhinged as possible",
        "Include taboo subjects, controversial opinions, extreme hypotheticals",
        "Go absolutely wild with creativity and shock value"
      ],
      examples: [
        'Would You Rather: "be trapped in an elevator with your worst enemy and a truth serum" vs "have to spend a night in jail with someone who has a crush on you"',
        'Paranoia: "Who is most likely to start a cult if they got bored enough?"',
        'Odd One Out: Normal: "Name the most unhinged thing you\'d do for money" vs Imposter: "Name the most unhinged thing you\'d do for love"'
      ],
      forbidden: ["only graphic violence and explicit illegal content - everything else is fair game"],
      temperature: 1.1
    };
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Environment check:', { 
      hasOpenAIKey: !!openAIApiKey, 
      functionsUrl, 
      hasSupabaseKey: !!supabaseAnonKey 
    });
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not found in environment variables');
      throw new Error('OpenAI API key not configured. Please contact the administrator.');
    }

    if (!supabaseAnonKey) {
      console.error('Supabase anon key not found in environment variables');
      throw new Error('Supabase configuration error. Please contact the administrator.');
    }

    const { roomCode, customization, crazynessLevel, gameType } = await req.json();
    
    if (!roomCode) {
      throw new Error('Room code is required');
    }

    if (!customization) {
      throw new Error('Customization text is required');
    }

    if (!gameType) {
      throw new Error('Game type is required');
    }

    console.log('Generating room questions for:', { roomCode, customization, crazynessLevel, gameType });

    // Verify room exists in Redis first
    const roomCheckResponse = await fetch(`${functionsUrl}/rooms-service?roomCode=${roomCode}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
    });

    if (!roomCheckResponse.ok) {
      const errorText = await roomCheckResponse.text();
      console.error('Room check failed:', { status: roomCheckResponse.status, error: errorText });
      throw new Error(`Room not found for code: ${roomCode}`);
    }

    // Get craziness-specific modifications
    const crazynessConfig = getCrazynessPromptModifications(crazynessLevel || 50);

    // Generate different prompts based on game type
    let systemPrompt = '';
    let userPrompt = '';
    let questionCount = 0;
    let responseStructure = '';

    if (gameType === 'would_you_rather') {
      questionCount = 20;
      responseStructure = `{
        "questions": [
          {"option_a": "...", "option_b": "..."}
        ]
      }`;
      
      systemPrompt = `Generate Would You Rather questions based HEAVILY on the customization theme: "${customization}".

      CRAZINESS LEVEL: ${crazynessLevel}% - ${crazynessConfig.description}
      
      CONTENT CONSTRAINTS FOR THIS LEVEL:
      ${crazynessConfig.constraints.map(c => `• ${c}`).join('\n')}
      
      EXAMPLES OF APPROPRIATE CONTENT FOR THIS LEVEL:
      ${crazynessConfig.examples.filter(e => e.includes('Would You Rather')).map(e => `• ${e}`).join('\n')}
      
      FORBIDDEN CONTENT:
      ${crazynessConfig.forbidden.map(f => `• ${f}`).join('\n')}
      
      CRITICAL: ALL questions must be directly related to and inspired by the theme/interests mentioned.
      
      Generate ${questionCount} Would You Rather questions.
      
      CRITICAL: DO NOT include "Would you rather" in the options themselves. Only provide the choice content.
      
      You MUST return ONLY valid JSON with this exact structure: ${responseStructure}`;
      
      userPrompt = `Generate ${questionCount} Would You Rather questions themed around: ${customization}. Craziness level: ${crazynessLevel}%.`;
      
    } else if (gameType === 'paranoia') {
      questionCount = 15;
      responseStructure = `{
        "questions": [
          {"question": "Who is most likely to..."}
        ]
      }`;
      
      systemPrompt = `Generate Paranoia questions based HEAVILY on the customization theme: "${customization}".

      CRAZINESS LEVEL: ${crazynessLevel}% - ${crazynessConfig.description}
      
      CONTENT CONSTRAINTS FOR THIS LEVEL:
      ${crazynessConfig.constraints.map(c => `• ${c}`).join('\n')}
      
      EXAMPLES OF APPROPRIATE CONTENT FOR THIS LEVEL:
      ${crazynessConfig.examples.filter(e => e.includes('Paranoia')).map(e => `• ${e}`).join('\n')}
      
      FORBIDDEN CONTENT:
      ${crazynessConfig.forbidden.map(f => `• ${f}`).join('\n')}
      
      CRITICAL: ALL Paranoia questions must be formatted to ask about selecting other people in the room. Use formats like:
      - "Who is most likely to..."
      - "Who would be the first to..."
      - "Who in the group would..."
      
      Generate ${questionCount} Paranoia questions.
      
      You MUST return ONLY valid JSON with this exact structure: ${responseStructure}`;
      
      userPrompt = `Generate ${questionCount} Paranoia questions themed around: ${customization}. Craziness level: ${crazynessLevel}%.`;
      
    } else if (gameType === 'odd_one_out' || gameType === 'odd-one-out') {
      questionCount = 12;
      responseStructure = `{
        "questions": [
          {"normal_prompt": "...", "imposter_prompt": "...", "category": "..."}
        ]
      }`;
      
      systemPrompt = `Generate Odd One Out questions based HEAVILY on the customization theme: "${customization}".

      CRAZINESS LEVEL: ${crazynessLevel}% - ${crazynessConfig.description}
      
      CONTENT CONSTRAINTS FOR THIS LEVEL:
      ${crazynessConfig.constraints.map(c => `• ${c}`).join('\n')}
      
      EXAMPLES OF APPROPRIATE CONTENT FOR THIS LEVEL:
      ${crazynessConfig.examples.filter(e => e.includes('Odd One Out')).map(e => `• ${e}`).join('\n')}
      
      FORBIDDEN CONTENT:
      ${crazynessConfig.forbidden.map(f => `• ${f}`).join('\n')}
      
      FOR ODD ONE OUT QUESTIONS: Create prompts where most players get one type of prompt and one "imposter" gets a different but related prompt.
      
      Example: {"normal_prompt": "Name a type of fruit", "imposter_prompt": "Name a type of vegetable", "category": "food"}
      
      Generate ${questionCount} Odd One Out questions.
      
      You MUST return ONLY valid JSON with this exact structure: ${responseStructure}`;
      
      userPrompt = `Generate ${questionCount} Odd One Out questions themed around: ${customization}. Craziness level: ${crazynessLevel}%.`;
    } else {
      throw new Error(`Unsupported game type: ${gameType}`);
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
        temperature: crazynessConfig.temperature,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedText = data.choices[0].message.content;
    
    console.log('OpenAI response:', generatedText);
    console.log('Used temperature:', crazynessConfig.temperature);
    console.log('Craziness config:', crazynessConfig.description);

    // Clean and parse the generated questions
    let questions;
    try {
      // Remove any markdown code blocks or extra text
      const cleanedText = generatedText.replace(/```json\n?/, '').replace(/```\n?$/, '').trim();
      questions = JSON.parse(cleanedText);
      // Debug: Log the parsed questions object to ensure JSON parsing worked as expected
      console.log('Parsed questions object:', questions);
      if (Array.isArray(questions.questions)) {
        console.log(`Parsed ${questions.questions.length} questions from OpenAI response`);
      }
    } catch (parseError) {
      console.error('Failed to parse OpenAI response as JSON:', parseError);
      console.error('Raw response:', generatedText);
      throw new Error('AI response was not valid JSON. Please try again.');
    }

    // Store AI questions in room state with proper IDs
    if (gameType === 'would_you_rather') {
      // Transform the questions into the structure expected by the frontend
      // and log the result before saving so we can confirm what will be stored.
      const aiQuestions = questions.questions.map((q: any) => ({
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        option_a: q.option_a,
        option_b: q.option_b,
        created_at: new Date().toISOString()
      }));

      console.log('🔵 [ROOM-QUESTIONS] aiQuestions to store:', JSON.stringify(aiQuestions, null, 2));
      console.log('🔵 [ROOM-QUESTIONS] Room code:', roomCode);
      console.log('🔵 [ROOM-QUESTIONS] About to update room with aiQuestions');

      // Update room state with AI questions
      const updatePayload = {
        action: 'update',
        roomCode: roomCode,
        updates: {
          gameState: {
            aiQuestions: aiQuestions,
            aiCustomization: customization,
            questionsGenerated: true,
            crazynessLevel: crazynessLevel,
            generatedForGame: gameType
          }
        }
      };
      
      console.log('🟡 [ROOM-QUESTIONS] Update payload being sent:', JSON.stringify(updatePayload, null, 2));
      
      const updateResponse = await fetch(`${functionsUrl}/rooms-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`
        },
        body: JSON.stringify(updatePayload)
      });

      console.log('🟡 [ROOM-QUESTIONS] Update response status:', updateResponse.status);
      
      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error('🔴 [ROOM-QUESTIONS] Failed to update room:', errorText);
        throw new Error('Failed to store AI questions in room state');
      }
      
      const updateResult = await updateResponse.json();
      console.log('🟢 [ROOM-QUESTIONS] Update successful, result:', JSON.stringify(updateResult, null, 2));

      console.log(`Successfully stored ${questions.questions?.length || 0} Would You Rather AI questions for room ${roomCode} with ${crazynessLevel}% craziness`);
    } else {
      // For other game types, keep existing logic
      const customQuestions = {};
      if (gameType === 'paranoia') {
        customQuestions = {
          would_you_rather: [],
          paranoia: questions.questions || [],
          odd_one_out: []
        };
      } else if (gameType === 'odd_one_out' || gameType === 'odd-one-out') {
        customQuestions = {
          would_you_rather: [],
          paranoia: [],
          odd_one_out: questions.questions || []
        };
      }

      // Store the generated questions in Redis via rooms-service
      const updateResponse = await fetch(`${functionsUrl}/rooms-service`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseAnonKey,
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify({
          action: 'update',
          roomCode: roomCode,
          updates: {
            gameState: {
              aiCustomization: customization,
              customQuestions: customQuestions,
              questionsGenerated: true,
              crazynessLevel: crazynessLevel,
              generatedForGame: gameType
            }
          }
        }),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json().catch(() => ({}));
        throw new Error(`Failed to store questions in Redis: ${errorData.error || 'Unknown error'}`);
      }
    }

    const gameDisplayName = gameType === 'would_you_rather' ? 'Would You Rather' : 
                           gameType === 'paranoia' ? 'Paranoia' : 
                           gameType === 'odd_one_out' || gameType === 'odd-one-out' ? 'Odd One Out' : gameType;

    console.log(`Successfully stored ${questions.questions?.length || 0} ${gameDisplayName} questions for room ${roomCode} with ${crazynessLevel}% craziness`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Generated ${questions.questions?.length || 0} custom ${gameDisplayName} questions for your room!`,
      count: questions.questions?.length || 0,
      gameType: gameType,
      crazynessLevel: crazynessLevel,
      crazynessDescription: crazynessConfig.description
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in room-questions function:', error);
    return new Response(JSON.stringify({ 
      error: error.message,
      success: false 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});