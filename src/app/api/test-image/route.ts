import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Test endpoint to call the Gemini image generation API directly
 */
export async function GET(request: Request) {
  try {
    // Extract prompt from URL query parameters
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt') || 'A beautiful mountain landscape';
    
    // Log the request details
    console.log(`Testing image generation with prompt: "${prompt}"`);
    
    // Initialize the client with the API key
    const apiKey = process.env.GOOGLE_GEMINI_API_KEY || '';
    console.log(`Using API key: ${apiKey?.substring(0, 5)}...${apiKey?.substring(apiKey.length - 4)}`);
    
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Configure the model with proper response modalities
    const model = genAI.getGenerativeModel({
      model: "gemini-2.0-flash-exp-image-generation",
      generationConfig: {
        //responseModalities: ['Text', 'Image']
      },
    });
    
    // Generate the image
    const response = await model.generateContent(prompt);
    
    let imageData: string | null = null;
    let textResponse: string | null = null;
    let mimeType = "image/png";
    
    // Process the response parts with proper null checks
    const candidates = response.response?.candidates;
    if (!candidates || candidates.length === 0 || !candidates[0]?.content?.parts) {
      console.error('No valid candidates in response');
      return NextResponse.json({
        error: 'No valid candidates in response'
      }, { status: 500 });
    }
    
    // Now we can safely access the parts
    for (const part of candidates[0].content.parts) {
      if ('text' in part && part.text) {
        textResponse = part.text;
        console.log('Generated text:', part.text);
      } else if ('inlineData' in part && part.inlineData) {
        imageData = part.inlineData.data;
        mimeType = part.inlineData.mimeType;
        console.log('Image found in inlineData');
      }
    }
    
    if (!imageData) {
      console.error('No image found in response');
      return NextResponse.json({
        error: 'No image found in response',
        textResponse: textResponse
      }, { status: 500 });
    }
    
    console.log(`Image found with mime type: ${mimeType}`);
    
    // Save the image to the public directory for testing purposes
    try {
      const buffer = Buffer.from(imageData, 'base64');
      const publicDir = path.join(process.cwd(), 'public');
      const outputPath = path.join(publicDir, 'generated-image.png');
      
      await fs.writeFile(outputPath, buffer);
      console.log(`Image saved to ${outputPath}`);
    } catch (saveError) {
      console.error('Error saving image:', saveError);
    }
    
    // Return the image data and info
    return NextResponse.json({
      success: true,
      message: textResponse || 'Image generated successfully',
      imageUrl: '/generated-image.png',
      mimeType: mimeType,
      prompt: prompt
    });
    
  } catch (error: unknown) {
    console.error('Error in test-image endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 
