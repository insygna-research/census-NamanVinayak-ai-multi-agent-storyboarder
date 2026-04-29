import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { prompt } = body;
    
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }
    
    console.log(`Generating script from prompt: ${prompt.substring(0, 100)}${prompt.length > 100 ? '...' : ''}`);
    
    // Initialize Google Gemini AI
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: 'Gemini API key is not configured' }, { status: 500 });
    }
    
    const ai = new GoogleGenerativeAI(apiKey);
    
    // Call Gemini to generate the script
    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash",
    });
    
    const result = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Create a script based on this idea: "${prompt}". 
              
              The script should:
              - Be about 2 minutes long when read aloud (~250-300 words)
              - Include natural-sounding dialogue or narration 
              - Use proper punctuation for optimal text-to-speech performance
              - Be ready to be directly fed to a TTS system
              - Include only the spoken words, no screenplay directions or formatting
              
              Please provide just the script text without any additional commentary.`
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      }
    });
    
    const response = await result.response;
    const generatedScript = response.text().trim();
    console.log(`Script generated successfully (${generatedScript.length} characters)`);
    
    return NextResponse.json({
      success: true,
      script: generatedScript
    });
    
  } catch (error) {
    console.error('Error generating script:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
} 