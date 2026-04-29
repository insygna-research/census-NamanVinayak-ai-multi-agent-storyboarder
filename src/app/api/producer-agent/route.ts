import { NextResponse } from 'next/server';
import { PRODUCER_SYSTEM_MESSAGE } from '@/agents/producer';

/**
 * Producer Agent endpoint to generate cut points for video editing
 * Uses the Qwen3-32B model running on RunPod endpoint: roow74ms9yz4ri
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { transcript, script } = body;
    
    if (!transcript || !script) {
      return NextResponse.json({ 
        error: 'Both transcript and script are required' 
      }, { status: 400 });
    }

    // Get API key from environment variables
    const apiKey = process.env.ARSHH_RUNPOD_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ 
        error: 'Runpod API key is not configured' 
      }, { status: 500 });
    }

    const endpointId = 'roow74ms9yz4ri';
    
    console.log('Calling Producer Agent with transcript and script...');
    console.log(`Transcript preview: ${JSON.stringify(transcript).substring(0, 100)}...`);
    console.log(`Script preview: ${script.substring(0, 100)}...`);
    
    // Prepare the user content message
    const userContent = `Here is the transcription from Whisper:
${JSON.stringify(transcript)}

Here is the video script:
"${script}"

Please output the full list of cuts as a JSON array exactly as specified above.`;

    // Create the request payload for RunPod
    const payload = {
      input: {
        messages: [
          {
            role: "system",
            content: PRODUCER_SYSTEM_MESSAGE
          },
          {
            role: "user",
            content: userContent
          }
        ],
        sampling_params: {
          max_tokens: 15000,
          temperature: 0,
          top_p: 1,
          top_k: 1
        }
      }
    };

    // Make the API request to RunPod
    const url = `https://api.runpod.ai/v2/${endpointId}/run`;
    const options = {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    };

    console.log('Sending request to Producer Agent RunPod endpoint...');
    const response = await fetch(url, options);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`RunPod API error (${response.status}): ${errorText}`);
      return NextResponse.json({
        error: `RunPod API error: ${response.status}`,
        details: errorText
      }, { status: response.status });
    }

    const result = await response.json();
    console.log('RunPod response received:', JSON.stringify(result, null, 2));

    // Check if we got a job ID (async mode)
    if (result.id) {
      console.log('Got job ID, polling for result:', result.id);
      
      // Poll for the result
      const statusUrl = `https://api.runpod.ai/v2/${endpointId}/status/${result.id}`;
      const statusOptions = {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      };

      let attempts = 0;
      const maxAttempts = 60; // 5 minutes max (5 second intervals)
      
      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
        attempts++;
        
        console.log(`Polling attempt ${attempts}/${maxAttempts}...`);
        const statusResponse = await fetch(statusUrl, statusOptions);
        
        if (!statusResponse.ok) {
          const errorText = await statusResponse.text();
          console.error(`Status check error (${statusResponse.status}): ${errorText}`);
          continue;
        }
        
        const statusResult = await statusResponse.json();
        console.log(`Status result:`, JSON.stringify(statusResult, null, 2));
        
        if (statusResult.status === 'COMPLETED') {
          // Process the completed result
          if (statusResult.output?.[0]?.choices?.[0]?.message?.content) {
            const producerResponse = statusResult.output[0].choices[0].message.content;
            
            try {
              // Clean the response by removing markdown code blocks
              let cleanedResponse = producerResponse.trim();
              
              // Remove markdown code blocks if present
              if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
                cleanedResponse = cleanedResponse.slice(7, -3).trim();
              } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
                cleanedResponse = cleanedResponse.slice(3, -3).trim();
              }
              
              // Try to parse the cleaned JSON response
              const cutPoints = JSON.parse(cleanedResponse);
              
              return NextResponse.json({
                success: true,
                cutPoints,
                executionTime: statusResult.executionTime,
                delayTime: statusResult.delayTime,
                rawResponse: producerResponse
              });
            } catch (parseError) {
              // If JSON parsing fails, return the raw response
              console.error('Failed to parse producer response as JSON:', parseError);
              return NextResponse.json({
                success: true,
                rawResponse: producerResponse,
                executionTime: statusResult.executionTime,
                delayTime: statusResult.delayTime,
                warning: 'Response could not be parsed as JSON'
              });
            }
          } else {
            return NextResponse.json({
              error: 'Completed but no valid output received',
              details: statusResult
            }, { status: 500 });
          }
        } else if (statusResult.status === 'FAILED') {
          return NextResponse.json({
            error: 'Producer Agent request failed',
            details: statusResult
          }, { status: 500 });
        }
        
        // Continue polling if still in progress
        console.log(`Job still ${statusResult.status}, continuing to poll...`);
      }
      
      return NextResponse.json({
        error: 'Producer Agent request timed out',
        details: 'Request took too long to complete'
      }, { status: 408 });
    }

    // Check if the request was successful (synchronous mode - fallback)
    if (result.status === 'COMPLETED' && result.output?.[0]?.choices?.[0]?.message?.content) {
      const producerResponse = result.output[0].choices[0].message.content;
      
      try {
        // Clean the response by removing markdown code blocks
        let cleanedResponse = producerResponse.trim();
        
        // Remove markdown code blocks if present
        if (cleanedResponse.startsWith('```json') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(7, -3).trim();
        } else if (cleanedResponse.startsWith('```') && cleanedResponse.endsWith('```')) {
          cleanedResponse = cleanedResponse.slice(3, -3).trim();
        }
        
        // Try to parse the cleaned JSON response
        const cutPoints = JSON.parse(cleanedResponse);
        
        return NextResponse.json({
          success: true,
          cutPoints,
          executionTime: result.executionTime,
          delayTime: result.delayTime,
          rawResponse: producerResponse
        });
      } catch (parseError) {
        // If JSON parsing fails, return the raw response
        console.error('Failed to parse producer response as JSON:', parseError);
        return NextResponse.json({
          success: true,
          rawResponse: producerResponse,
          executionTime: result.executionTime,
          delayTime: result.delayTime,
          warning: 'Response could not be parsed as JSON'
        });
      }
    } else {
      // Handle incomplete or failed requests
      console.error('Unexpected RunPod response:', JSON.stringify(result, null, 2));
      console.error('Response status:', result.status);
      console.error('Response output:', result.output);
      
      // Check if it's still in progress
      if (result.status === 'IN_PROGRESS' || result.status === 'IN_QUEUE') {
        return NextResponse.json({
          error: 'Producer Agent request is still processing',
          status: result.status,
          details: result
        }, { status: 202 }); // 202 Accepted - still processing
      }
      
      return NextResponse.json({
        error: 'Unexpected response from Producer Agent',
        status: result.status,
        details: result
      }, { status: 500 });
    }

  } catch (error: unknown) {
    console.error('Error in producer-agent endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}
