import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

/**
 * Test endpoint to call the Ideogram image generation API directly
 */
export async function GET(request: Request) {
  try {
    // Extract prompt from URL query parameters
    const { searchParams } = new URL(request.url);
    const prompt = searchParams.get('prompt') || 'A beautiful mountain landscape at sunset';
    
    // Log the request details
    console.log(`Testing Ideogram image generation with prompt: "${prompt}"`);
    
    // Get API key from environment variables
    const apiKey = process.env.IDEOGRAM_API_KEY || '';
    if (!apiKey) {
      return NextResponse.json({ error: 'Ideogram API key is not configured' }, { status: 500 });
    }
    
    console.log(`Using Ideogram API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
    
    // Make the API request to Ideogram
    const url = 'https://api.ideogram.ai/generate';
    const options = {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image_request: {
          prompt: prompt,
          aspect_ratio: "ASPECT_9_16", // Vertical aspect ratio (9:16)
          model: "V_2A_TURBO", // Using V_2A model
          magic_prompt_option: "AUTO",
          style_type: "REALISTIC"
        }
      })
    };
    
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Ideogram API error (${response.status}): ${errorText}`);
      return NextResponse.json({
        error: `Ideogram API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }
    
    const data = await response.json();
    console.log('Ideogram API response:', JSON.stringify(data, null, 2));
    
    // Check if the response contains image data
    if (!data.data || data.data.length === 0 || !data.data[0].url) {
      console.error('No image URL in Ideogram response');
      return NextResponse.json({
        error: 'No image URL in response'
      }, { status: 500 });
    }
    
    const imageUrl = data.data[0].url;
    console.log(`Received image URL: ${imageUrl}`);
    
    // Download the image from the provided URL
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      return NextResponse.json({
        error: `Failed to download image: ${imageResponse.status}`
      }, { status: 500 });
    }
    
    const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
    
    // Save the image to the public directory for testing purposes
    try {
      const publicDir = path.join(process.cwd(), 'public');
      const outputPath = path.join(publicDir, 'generated-image.png');
      
      await fs.writeFile(outputPath, imageBuffer);
      console.log(`Image saved to ${outputPath}`);
    } catch (saveError) {
      console.error('Error saving image:', saveError);
    }
    
    // Return the image data and info
    return NextResponse.json({
      success: true,
      message: 'Image generated successfully',
      imageUrl: '/generated-image.png',
      sourceUrl: imageUrl,
      prompt: prompt
    });
    
  } catch (error: unknown) {
    console.error('Error in test-ideogram endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
} 