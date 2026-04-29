/**
 * Leonardo AI API client for image generation with Flux models
 */

interface LeonardoAIGenerationOptions {
  // Required parameters
  modelId: string;
  prompt: string;
  contrast: number; // Values: 1.0, 1.3, 1.8, 2.5, 3, 3.5, 4, 4.5
  
  // Optional parameters
  enhancePrompt?: boolean;
  enhancePromptInstruction?: string;
  height?: number;
  width?: number;
  num_images?: number;
  styleUUID?: string; // Preset style UUID
  ultra?: boolean; // Generation Mode - Ultra
  negative_prompt?: string;
}

interface LeonardoAIGenerationResponse {
  data: {
    generationId: string;
    [key: string]: unknown;
  }
}

interface LeonardoAIGenerationResult {
  generations_by_pk: {
    generated_images: Array<{
      url: string;
      id: string;
    }>;
    status: string;
    [key: string]: unknown;
  }
  [key: string]: unknown;
}

class LeonardoAIClient {
  private apiKey: string | null = null;
  private baseUrl = 'https://cloud.leonardo.ai/api/rest/v1';

  /**
   * Set the API key for authentication
   * @param key - Leonardo AI API key
   */
  auth(key: string): this {
    this.apiKey = key;
    return this;
  }

  /**
   * Create an image generation request
   * @param options - Generation options
   * @returns Promise with generation data
   */
  async createGeneration(options: LeonardoAIGenerationOptions): Promise<LeonardoAIGenerationResponse> {
    if (!this.apiKey) {
      throw new Error('API key is required. Call auth() method first.');
    }

    try {
      console.log('Leonardo AI request options:', JSON.stringify(options, null, 2));

      const response = await fetch(`${this.baseUrl}/generations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(options)
      });

      const responseData = await response.json();
      console.log('Leonardo AI raw response:', JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        throw new Error(`Leonardo AI API error: ${JSON.stringify(responseData)}`);
      }

      // Handle different possible response structures
      let generationId;
      
      // Check for new API structure
      if (responseData.sdGenerationJob?.generationId) {
        generationId = responseData.sdGenerationJob.generationId;
      } 
      // Check for old/legacy API structure
      else if (responseData.generationId) {
        generationId = responseData.generationId;
      }
      // Check for data wrapper structure
      else if (responseData.data?.generationId) {
        generationId = responseData.data.generationId;
      }
      else {
        throw new Error(`Could not find generationId in Leonardo AI response: ${JSON.stringify(responseData)}`);
      }

      // Return with the expected structure
      return {
        data: {
          generationId: generationId
        }
      };
    } catch (error) {
      console.error('Error calling Leonardo AI API:', error);
      throw error;
    }
  }

  /**
   * Get the status and results of a generation
   * @param generationId - ID of the generation to check
   * @returns Promise with generation results
   */
  async getGenerationById(generationId: string): Promise<LeonardoAIGenerationResult> {
    if (!this.apiKey) {
      throw new Error('API key is required. Call auth() method first.');
    }

    try {
      const response = await fetch(`${this.baseUrl}/generations/${generationId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        }
      });

      const responseData = await response.json();
      console.log(`Generation status check for ID ${generationId}:`, JSON.stringify(responseData, null, 2));

      if (!response.ok) {
        throw new Error(`Leonardo AI API error: ${JSON.stringify(responseData)}`);
      }

      // Handle different possible response structures
      if (responseData.generations_by_pk) {
        return responseData;
      } 
      // Handle case where the response might be directly the result we want
      else if (responseData.status && responseData.generated_images) {
        return {
          generations_by_pk: responseData
        };
      }
      // Handle case where the data might be wrapped
      else if (responseData.data?.generations_by_pk) {
        return responseData.data;
      }
      else {
        throw new Error(`Leonardo AI API response missing expected structure: ${JSON.stringify(responseData)}`);
      }
    } catch (error) {
      console.error('Error fetching generation:', error);
      throw error;
    }
  }
}

// Create and export singleton instance
const leonardoai = new LeonardoAIClient();
export default leonardoai; 