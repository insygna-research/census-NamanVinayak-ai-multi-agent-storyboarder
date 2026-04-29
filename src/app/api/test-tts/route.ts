import { NextResponse } from 'next/server';
import { textToSpeech } from '@/utils/audioProcessing';
import { GoogleGenAI } from '@google/genai';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test endpoint to format a script and generate TTS audio
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script, folderId } = body;
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    if (!folderId) {
      return NextResponse.json({ error: 'Folder ID is required. Initialize a project first.' }, { status: 400 });
    }
    
    const scriptPreview = script.length > 100 ? script.substring(0, 100) + '...' : script;
    console.log(`Processing script (${script.length} characters): ${scriptPreview}`);
    console.log(`Using folder ID: ${folderId}`);
    
    // Verify that the directory exists
    const publicDir = path.join(process.cwd(), 'public', folderId);
    try {
      await fs.access(publicDir);
      console.log(`Directory exists: ${publicDir}`);
    } catch {
      // Create directory if it doesn't exist
      console.log(`Directory does not exist, creating: ${publicDir}`);
      try {
        await fs.mkdir(publicDir, { recursive: true });
        console.log(`Created directory: ${publicDir}`);
      } catch (mkdirError) {
        console.error('Error creating directory:', mkdirError);
        return NextResponse.json({ error: 'Invalid or inaccessible folder ID' }, { status: 400 });
      }
    }
    
    // Step 1: Format script for TTS using Google Gemini
    console.log('Step 1: Formatting script with Google Gemini...');
    const startFormatting = Date.now();
    const formattedScript = await formatScriptForTTS(script);
    const formattingTime = ((Date.now() - startFormatting) / 1000).toFixed(2);
    console.log(`Script formatted successfully in ${formattingTime}s. Length: ${formattedScript.length} characters`);
    
    // Step 2: Convert the formatted script to speech using Gemini TTS
    console.log('Step 2: Converting formatted script to speech with Google Gemini TTS...');
    const startTTS = Date.now();
    const audioUrl = await textToSpeech(formattedScript, folderId);
    const ttsTime = ((Date.now() - startTTS) / 1000).toFixed(2);
    console.log(`Audio generation completed in ${ttsTime}s. URL: ${audioUrl}`);
    
    // Calculate total processing time
    const totalTime = ((Date.now() - startFormatting) / 1000).toFixed(2);
    console.log(`Total processing time: ${totalTime}s`);
    
    // Return the processed data
    return NextResponse.json({
      success: true,
      formattedScript,
      audioUrl,
      folderId,
      stats: {
        scriptLength: script.length,
        formattedLength: formattedScript.length,
        formattingTime: parseFloat(formattingTime),
        ttsTime: parseFloat(ttsTime),
        totalTime: parseFloat(totalTime)
      }
    });
    
  } catch (error) {
    console.error('Error in test-tts endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Format the script for TTS using Google Gemini
 */
async function formatScriptForTTS(script: string): Promise<string> {
  try {
    const googleApiKey = process.env.GOOGLE_AI_API_KEY;
    if (!googleApiKey) {
      console.error('Google AI API key is not configured');
      return script;
    }

    const ai = new GoogleGenAI({ apiKey: googleApiKey });
    
    console.log('Making Google Gemini API request for script formatting...');
    console.log('=== ORIGINAL SCRIPT ===');
    console.log(script);
    console.log('=== END ORIGINAL SCRIPT ===');
    
    const prompt = `You are an AI assistant working within an advanced audio production pipeline. Your specific role is to analyze and optimize scripts for Google Gemini TTS (Text-to-Speech) generation to ensure maximum audio quality and expressiveness.

CONTEXT: You are preparing text that will be fed directly into Google Gemini 2.5 TTS, which features 30+ distinct voices with emotional and tonal variations. The TTS system can detect nuances in text formatting and respond with appropriate vocal expressiveness, pacing, and emotional delivery.

YOUR MISSION: Transform the provided script to give the Gemini TTS system maximum understanding of:
1. HOW the speaker should sound (vocal character, emotion, energy)
2. HOW they should speak (pacing, rhythm, emphasis, pauses)
3. WHAT vocal style best serves the story/content

ANALYSIS FRAMEWORK:
1. Story Genre & Mood Assessment:
   • Identify if this is: horror, comedy, drama, documentary, educational, thriller, etc.
   • Determine the emotional arc: suspenseful, exciting, contemplative, urgent, mysterious
   • Choose optimal vocal approach: whispered secrets, dramatic narration, conversational explanation, etc.

2. Speaker Persona Development:
   • Define the ideal narrator voice: authoritative documentarian, enthusiastic storyteller, mysterious guide, etc.
   • Consider what voice from Gemini's range would work best (Puck for upbeat, Enceladus for breathy/intimate, Kore for firm authority, Charon for informative clarity)

3. Vocal Direction Integration:
   • Use natural language cues that Gemini TTS recognizes for style control
   • Embed pacing instructions through punctuation and sentence structure
   • Signal emotional shifts through word choice and rhythm changes

FORMATTING RULES FOR GEMINI TTS:
• Use ellipses (...) for suspenseful pauses or trailing thoughts
• Use em dashes (—) for dramatic breaks or sudden shifts
• Use exclamation marks (!) sparingly but effectively for genuine excitement or shock
• Use question marks (?) to create curiosity and engagement
• Break long sentences into shorter, punchier phrases for better pacing
• Use repetition strategically for emphasis ("Very, very carefully...")
• Include breathing cues through natural sentence breaks
• Spell out numbers, dates, and times naturally ("nineteen forty-two" not "1942")

VOICE OPTIMIZATION:
• Front-load emotional context so TTS understands the mood immediately
• Use descriptive language that hints at desired vocal qualities
• Structure sentences to create natural rhythm and flow
• Avoid overly complex syntax that might confuse vocal delivery
• Ensure each sentence has clear emotional intent

Remember: You're not just formatting text—you're directing a voice performance. The Gemini TTS will interpret your formatting choices as vocal instructions. Make every punctuation mark, word choice, and sentence structure deliberate to create the most compelling audio experience possible.

Analyze this script and reformat it for optimal Gemini TTS performance:

${script}`;
    
    console.log('Sending prompt to Google Gemini (gemini-2.5-flash)...');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ parts: [{ text: prompt }] }]
    });
    
    const formattedScript = response.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!formattedScript) {
      console.warn('Gemini did not return a formatted script, using original script instead');
      console.log('Full Gemini response:', JSON.stringify(response, null, 2));
      return script;
    }
    
    console.log('=== FORMATTED SCRIPT FROM GEMINI ===');
    console.log(formattedScript);
    console.log('=== END FORMATTED SCRIPT ===');
    console.log(`Script formatting complete. Original: ${script.length} chars, Formatted: ${formattedScript.length} chars`);
    
    return formattedScript;
  } catch (error) {
    console.error('Error formatting script with Gemini:', error);
    // Return original script if formatting fails
    return script;
  }
} 