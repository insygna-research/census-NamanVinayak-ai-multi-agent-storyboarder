/**
 * Utility functions for image generation and processing
 */

// Interfaces for Google Gemini API responses
interface InlineData {
  mime_type: string;
  data: string;
}

interface GeminiResponsePart {
  text?: string;
  inline_data?: InlineData;
}

interface GeminiContent {
  parts: GeminiResponsePart[];
}

interface GeminiCandidate {
  content: GeminiContent;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
}

// Interface for image generation options
interface ImageGenerationOptions {
  width?: number;
  height?: number;
  style?: string;
}

/**
 * Generates an image based on text prompt using Google's Gemini API
 * @param prompt Text prompt describing the image to generate
 * @param options Configuration options for image generation
 * @returns Promise resolving to the URL of the generated image
 */
export async function generateImage(
  prompt: string,
  options: ImageGenerationOptions = {}
): Promise<string> {
  // Set default options
  const {
    width = 1024,
    height = 576,
    // Style could be used to enhance the prompt in the future
  } = options;

  // Choose which Gemini API to use - free tier (gemini-2.0-flash) or paid tier (imagen-3.0)
  const useFreeTier = true; // Toggle between free and paid tier

  try {
    if (useFreeTier) {
      // Using gemini-2.0-flash-exp-image-generation (free tier)
      const endpoint = "https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash-exp-image-generation:generateContent";
      
      const response = await fetch(`${endpoint}?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `Generate a high-quality image representing: ${prompt}. Make it in ${width}x${height} resolution.`
            }]
          }],
          config: {
            response_modalities: ["Text", "Image"]
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Gemini API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json() as GeminiResponse;
      
      // Extract the image from the response
      if (data.candidates && 
          data.candidates[0]?.content?.parts) {
        
        // Find the image part in the response
        const imagePart = data.candidates[0].content.parts.find(
          (part: GeminiResponsePart) => part.inline_data && part.inline_data.mime_type.startsWith('image/')
        );
        
        if (imagePart && imagePart.inline_data) {
          // Convert base64 to blob URL
          const base64Data = imagePart.inline_data.data;
          const blob = base64ToBlob(base64Data, imagePart.inline_data.mime_type);
          return URL.createObjectURL(blob);
        }
      }
    } else {
      // Using imagen-3.0-generate-002 (paid tier, higher quality)
      const endpoint = "https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict";
      
      const response = await fetch(`${endpoint}?key=${process.env.GOOGLE_GEMINI_API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{
            prompt: prompt
          }],
          parameters: {
            sampleCount: 1
          }
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Imagen API error: ${error.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      // Extract the image from the response
      if (data.predictions && data.predictions[0]?.image?.imageBytes) {
        const base64Data = data.predictions[0].image.imageBytes;
        const blob = base64ToBlob(base64Data, 'image/png');
        return URL.createObjectURL(blob);
      }
    }

    throw new Error('No image was generated');
    
  } catch (error) {
    console.error('Error generating image:', error);
    
    // For demo purposes, return a placeholder image if API call fails
    console.log(`Generating placeholder image for prompt: ${prompt.substring(0, 30)}...`);
    return `https://placehold.co/${width}x${height}?text=${encodeURIComponent(prompt.substring(0, 20))}`;
  }
}

/**
 * Helper function to convert base64 to Blob
 */
function base64ToBlob(base64: string, mimeType: string): Blob {
  const byteCharacters = atob(base64);
  const byteArrays = [];

  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }

  return new Blob(byteArrays, { type: mimeType });
}

/**
 * Optimizes images for video use (resizing, format conversion, etc.)
 * @param imageUrl URL of the image to optimize
 * @returns Promise resolving to the URL of the optimized image
 */
export async function optimizeImageForVideo(
  imageUrl: string
): Promise<string> {
  // In a real implementation, this would resize and optimize the image
  // using a service like Google Cloud Storage and Image Processing
  
  // For demo purposes, return the original URL
  return imageUrl;
}

/**
 * Prefetch and cache images to ensure smooth video creation
 * @param imageUrls Array of image URLs to prefetch
 * @returns Promise that resolves when all images are prefetched
 */
export async function prefetchImages(imageUrls: string[]): Promise<void> {
  // In a real implementation, this would download and cache all images
  await Promise.all(
    imageUrls.map(url => fetch(url, { cache: 'force-cache' }))
  );
} 