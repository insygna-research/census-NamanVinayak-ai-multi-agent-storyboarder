
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import styles from './page.module.css';

interface CutPoint {
  cut_number: number;
  cut_time: number;
  reason: string;
}

interface ProducerResult {
  success: boolean;
  cutPoints?: CutPoint[];
  executionTime?: number;
  delayTime?: number;
  rawResponse?: string;
  warning?: string;
  error?: string;
}

interface DirectorResult {
  success: boolean;
  directorOutput?: Record<string, unknown>;
  executionTime?: number;
  delayTime?: number;
  rawResponse?: string;
  warning?: string;
  error?: string;
}

interface DoPResult {
  success: boolean;
  dopOutput?: Record<string, unknown>;
  executionTime?: number;
  delayTime?: number;
  rawResponse?: string;
  warning?: string;
  error?: string;
}

interface PromptEngineerResult {
  success: boolean;
  promptEngineerOutput?: Record<string, unknown>;
  promptsOutput?: string[]; // New field from updated API
  numPrompts?: number; // New field from updated API
  executionTime?: number;
  delayTime?: number;
  rawResponse?: string;
  warning?: string;
  error?: string;
}

interface QwenVLReviewResult {
  success: boolean;
  reviewResult?: {
    overall_score: number;
    approved: boolean;
    style_continuity_score: number;
    narrative_progression_score: number;
    timeline_position: string;
    visual_motifs_maintained: boolean;
    script_alignment: boolean;
    auto_reject_triggered: boolean;
    auto_reject_reasons: string[];
    feedback: string[];
    narrative_context_notes: string;
  };
  framesEvaluated?: {
    frameA: string;
    frameB: string;
    candidateC: string;
  };
  rawResponse?: string;
  warning?: string;
  error?: string;
}

interface VideoGenerationResult {
  success: boolean;
  generatedVideos?: string[];
  totalRequested?: number;
  totalGenerated?: number;
  errors?: string[];
}

interface WordTimestamp {
  word: string;
  start?: number;
  end?: number;
  start_time?: number;
  end_time?: number;
}

interface TranscriptionResult {
  transcript?: string;
  word_timestamps?: WordTimestamp[];
  transcription?: {
    transcript: string;
    word_timestamps: WordTimestamp[];
  };
  success?: boolean;
  outputPath?: string;
}

interface WorkflowStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: unknown;
  error?: string;
  duration?: number;
}

export default function TestTTS() {
  const [script, setScript] = useState<string>('Have you ever been alone at night and heard something outside your door?');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [loadingDots, setLoadingDots] = useState<string>('');
  
  // Workflow state
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { name: 'Initialize Project', status: 'pending' },
    { name: 'Format Script & Generate Audio', status: 'pending' },
    { name: 'Transcribe Audio (Nvidia)', status: 'pending' },
    { name: 'Generate Cut Points (Producer Agent)', status: 'pending' },
    { name: 'Generate Creative Vision (Director Agent)', status: 'pending' },
    { name: 'Generate Cinematography Directions (DoP Agent)', status: 'pending' },
    { name: 'Generate Image Prompts (Prompt Engineer Agent)', status: 'pending' },
    { name: 'Generate Images (ComfyUI)', status: 'pending' },
    { name: 'Review Images (QWEN VL Agent)', status: 'pending' },
    { name: 'Generate Videos (WAN)', status: 'pending' }
  ]);
  
  // Results from each step
  const [formattedScript, setFormattedScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [producerResult, setProducerResult] = useState<ProducerResult | null>(null);
  const [directorResult, setDirectorResult] = useState<DirectorResult | null>(null);
  const [dopResult, setDoPResult] = useState<DoPResult | null>(null);
  const [promptEngineerResult, setPromptEngineerResult] = useState<PromptEngineerResult | null>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [qwenVLResult, setQwenVLResult] = useState<QwenVLReviewResult | null>(null);
  const [generatedVideos, setGeneratedVideos] = useState<string[]>([]);
  const [videoGenerationResult, setVideoGenerationResult] = useState<VideoGenerationResult | null>(null);

  // Update loading animation dots
  useEffect(() => {
    if (!loading) {
      setLoadingDots('');
      setElapsedTime(0);
      return;
    }

    const dotsInterval = setInterval(() => {
      setLoadingDots(prev => prev.length < 3 ? prev + '.' : '');
    }, 500);

    const timerInterval = setInterval(() => {
      setElapsedTime(prev => prev + 1);
    }, 1000);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(timerInterval);
    };
  }, [loading]);

  const updateStepStatus = (stepIndex: number, status: WorkflowStep['status'], result?: unknown, error?: string, duration?: number) => {
    setSteps(prev => prev.map((step, index) => 
      index === stepIndex 
        ? { ...step, status, result, error, duration }
        : step
    ));
  };

  const getCurrentStep = () => {
    return steps.findIndex(step => step.status === 'processing');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFormattedScript(null);
    setAudioUrl(null);
    setTranscriptionResult(null);
    setProducerResult(null);
    setDirectorResult(null);
    setDoPResult(null);
    setPromptEngineerResult(null);
    setGeneratedImages([]);
    setQwenVLResult(null);
    setGeneratedVideos([]);
    setVideoGenerationResult(null);
    setElapsedTime(0);

    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', result: undefined, error: undefined, duration: undefined })));

    try {
      // Step 1: Initialize Project
      updateStepStatus(0, 'processing');
      const step1Start = Date.now();
      
      let projectFolderId = folderId;
      if (!projectFolderId) {
        const initResponse = await fetch('/api/init-project', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ script }),
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.error || 'Failed to initialize project');
        }

        const initData = await initResponse.json();
        projectFolderId = initData.folderId;
        setFolderId(projectFolderId);
      }
      
      updateStepStatus(0, 'completed', { folderId: projectFolderId }, undefined, Date.now() - step1Start);

      // Step 2: Format Script and Generate Audio
      updateStepStatus(1, 'processing');
      const step2Start = Date.now();
      
      const ttsResponse = await fetch('/api/test-tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script, folderId: projectFolderId }),
      });

      if (!ttsResponse.ok) {
        const errorData = await ttsResponse.json();
        throw new Error(errorData.error || 'Failed to process script');
      }

      const ttsData = await ttsResponse.json();
      setFormattedScript(ttsData.formattedScript);
      setAudioUrl(ttsData.audioUrl);
      
      updateStepStatus(1, 'completed', ttsData, undefined, Date.now() - step2Start);

      // Step 3: Transcribe Audio using Nvidia script
      updateStepStatus(2, 'processing');
      const step3Start = Date.now();
      
      // Extract project folder from audio URL (e.g., "/script-123/generated-audio-456.wav" -> "script-123")
      const projectFolder = ttsData.audioUrl.split('/')[1]; // Get the folder name from the URL
      
      console.log('Audio URL:', ttsData.audioUrl);
      console.log('Project folder:', projectFolder);
      
      const transcribeResponse = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          audioUrl: ttsData.audioUrl,
          projectFolder: projectFolder
        }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const transcribeData = await transcribeResponse.json();
      setTranscriptionResult(transcribeData);
      
      updateStepStatus(2, 'completed', transcribeData, undefined, Date.now() - step3Start);

      // Step 4: Generate Cut Points using Producer Agent
      updateStepStatus(3, 'processing');
      const step4Start = Date.now();
      
      const producerResponse = await fetch('/api/producer-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcribeData.word_timestamps || transcribeData.transcription?.word_timestamps || [],
          script: script
        }),
      });

      if (!producerResponse.ok) {
        const errorData = await producerResponse.json();
        throw new Error(errorData.error || 'Failed to get producer agent response');
      }

      const producerData = await producerResponse.json();
      setProducerResult(producerData);
      
      updateStepStatus(3, 'completed', producerData, undefined, Date.now() - step4Start);

      // Step 5: Generate Creative Vision using Director Agent
      updateStepStatus(4, 'processing');
      const step5Start = Date.now();
      
      // Ensure we have producer output to pass to the director
      let producerOutput = producerData.cutPoints;
      if (!producerOutput) {
        // If cutPoints is not available, try to use the raw response or create a fallback structure
        if (producerData.rawResponse) {
          // Try to parse the raw response first
          try {
            producerOutput = JSON.parse(producerData.rawResponse);
          } catch {
            // If parsing fails, create a simple structure with the raw text
            producerOutput = [{ cut_number: 1, cut_time: 0, reason: "Raw producer output: " + producerData.rawResponse }];
          }
        } else {
          // Last resort fallback
          producerOutput = [{ cut_number: 1, cut_time: 0, reason: "Producer agent did not return cut points" }];
        }
      }
      
      console.log('Sending to Director Agent:', { producer_output: producerOutput, script: script });
      
      const directorResponse = await fetch('/api/director-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          producer_output: producerOutput,
          script: script
        }),
      });

      if (!directorResponse.ok) {
        const errorData = await directorResponse.json();
        throw new Error(errorData.error || 'Failed to get director agent response');
      }

      const directorData = await directorResponse.json();
      setDirectorResult(directorData);
      
      updateStepStatus(4, 'completed', directorData, undefined, Date.now() - step5Start);

      // Step 6: Generate Cinematography Directions using DoP Agent
      updateStepStatus(5, 'processing');
      const step6Start = Date.now();
      
      // Ensure we have producer output to pass to DoP (reuse the same logic)
      let producerOutputForDoP = producerData.cutPoints;
      if (!producerOutputForDoP) {
        if (producerData.rawResponse) {
          try {
            producerOutputForDoP = JSON.parse(producerData.rawResponse);
          } catch {
            producerOutputForDoP = [{ cut_number: 1, cut_time: 0, reason: "Raw producer output: " + producerData.rawResponse }];
          }
        } else {
          producerOutputForDoP = [{ cut_number: 1, cut_time: 0, reason: "Producer agent did not return cut points" }];
        }
      }
      
      // Ensure we have director output to pass to DoP
      let directorOutputForDoP = directorData.directorOutput;
      if (!directorOutputForDoP) {
        if (directorData.rawResponse) {
          try {
            directorOutputForDoP = JSON.parse(directorData.rawResponse);
          } catch {
            directorOutputForDoP = { creative_vision: "Raw director output: " + directorData.rawResponse };
          }
        } else {
          directorOutputForDoP = { creative_vision: "Director agent did not return structured output" };
        }
      }
      
      console.log('Sending to DoP Agent:', { 
        script: script, 
        producer_output: producerOutputForDoP, 
        director_output: directorOutputForDoP 
      });
      
      const dopResponse = await fetch('/api/dop-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          producer_output: producerOutputForDoP,
          director_output: directorOutputForDoP
        }),
      });

      if (!dopResponse.ok) {
        const errorData = await dopResponse.json();
        throw new Error(errorData.error || 'Failed to get DoP agent response');
      }

      const dopData = await dopResponse.json();
      setDoPResult(dopData);
      
      updateStepStatus(5, 'completed', dopData, undefined, Date.now() - step6Start);

      // Step 7: Generate Image Prompts using Prompt Engineer Agent
      updateStepStatus(6, 'processing');
      const step7Start = Date.now();
      
      // Ensure we have director output to pass to Prompt Engineer
      let directorOutputForPE = directorData.directorOutput;
      if (!directorOutputForPE) {
        if (directorData.rawResponse) {
          try {
            directorOutputForPE = JSON.parse(directorData.rawResponse);
          } catch {
            directorOutputForPE = { creative_vision: "Raw director output: " + directorData.rawResponse };
          }
        } else {
          directorOutputForPE = { creative_vision: "Director agent did not return structured output" };
        }
      }
      
      // Ensure we have DoP output to pass to Prompt Engineer
      let dopOutputForPE = dopData.dopOutput;
      if (!dopOutputForPE) {
        if (dopData.rawResponse) {
          try {
            dopOutputForPE = JSON.parse(dopData.rawResponse);
          } catch {
            dopOutputForPE = { cinematography: "Raw DoP output: " + dopData.rawResponse };
          }
        } else {
          dopOutputForPE = { cinematography: "DoP agent did not return structured output" };
        }
      }
      
      // Calculate number of images from DoP output
      let numImages = 1; // Default fallback
      if (Array.isArray(dopOutputForPE)) {
        numImages = dopOutputForPE.length;
      } else if (dopOutputForPE && typeof dopOutputForPE === 'object' && 'length' in dopOutputForPE) {
        numImages = dopOutputForPE.length as number;
      } else if (dopData.rawResponse) {
        try {
          const parsedResponse = JSON.parse(dopData.rawResponse);
          if (Array.isArray(parsedResponse)) {
            numImages = parsedResponse.length;
          }
        } catch {
          // Keep default of 1
        }
      }
      
      console.log('Sending to Prompt Engineer Agent:', { 
        script: script, 
        director_output: directorOutputForPE, 
        dop_output: dopOutputForPE,
        num_images: numImages
      });
      
      const promptEngineerResponse = await fetch('/api/prompt-engineer-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          script: script,
          director_output: directorOutputForPE,
          dop_output: dopOutputForPE,
          num_images: numImages // Use the number of beats from DoP output
        }),
      });

      if (!promptEngineerResponse.ok) {
        const errorData = await promptEngineerResponse.json();
        throw new Error(errorData.error || 'Failed to get Prompt Engineer agent response');
      }

      const promptEngineerData = await promptEngineerResponse.json();
      setPromptEngineerResult(promptEngineerData);
      
      updateStepStatus(6, 'completed', promptEngineerData, undefined, Date.now() - step7Start);

      // Step 8: Generate Images using ComfyUI
      updateStepStatus(7, 'processing');
      const step8Start = Date.now();
      
      // Extract prompts from prompt engineer output
      let promptsToGenerate: string[] = [];
      if (promptEngineerData.promptsOutput && Array.isArray(promptEngineerData.promptsOutput)) {
        promptsToGenerate = promptEngineerData.promptsOutput;
      } else if (promptEngineerData.rawResponse) {
        // Try to parse from raw response if structured output failed
        try {
          const parsedPrompts = JSON.parse(promptEngineerData.rawResponse);
          if (Array.isArray(parsedPrompts)) {
            promptsToGenerate = parsedPrompts;
          }
        } catch (parseError) {
          console.warn('Could not parse prompts from raw response:', parseError);
        }
      }
      
      if (promptsToGenerate.length === 0) {
        throw new Error('No prompts found in Prompt Engineer output for image generation');
      }
      
      console.log(`Generating ${promptsToGenerate.length} images using ComfyUI...`);
      console.log('Prompts preview:', promptsToGenerate.slice(0, 2));
      
      const comfyResponse = await fetch('/api/generate-comfy-images', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompts: promptsToGenerate,
          folderId: projectFolderId
        }),
      });

      if (!comfyResponse.ok) {
        const errorData = await comfyResponse.json();
        throw new Error(errorData.error || 'Failed to generate images with ComfyUI');
      }

      const comfyData = await comfyResponse.json();
      setGeneratedImages(comfyData.generatedImages || []);
      
      updateStepStatus(7, 'completed', comfyData, undefined, Date.now() - step8Start);

      // Get generated image URLs for both QWEN VL and WAN steps
      // const generatedImageUrls = comfyData.generatedImages || [];

      // Step 9: Review Images using QWEN VL Agent
      /*
      updateStepStatus(8, 'processing');
      const step9Start = Date.now();
      
      // Check if we have enough images for review (need at least 3)
      if (generatedImageUrls.length < 3) {
        console.warn(`Only ${generatedImageUrls.length} images generated, skipping QWEN VL review (requires at least 3)`);
        updateStepStatus(8, 'completed', { 
          skipped: true, 
          reason: 'Insufficient images for review (need at least 3)' 
        }, undefined, Date.now() - step9Start);
      } else {
        // Ensure we have director output for QWEN VL
        let directorOutputForQwen = directorData.directorOutput;
        if (!directorOutputForQwen) {
          if (directorData.rawResponse) {
            try {
              directorOutputForQwen = JSON.parse(directorData.rawResponse);
            } catch {
              directorOutputForQwen = { creative_vision: "Raw director output: " + directorData.rawResponse };
            }
          } else {
            directorOutputForQwen = { creative_vision: "Director agent did not return structured output" };
          }
        }

        // Ensure we have DoP output for QWEN VL
        let dopOutputForQwen = dopData.dopOutput;
        if (!dopOutputForQwen) {
          if (dopData.rawResponse) {
            try {
              dopOutputForQwen = JSON.parse(dopData.rawResponse);
            } catch {
              dopOutputForQwen = { cinematography: "Raw DoP output: " + dopData.rawResponse };
            }
          } else {
            dopOutputForQwen = { cinematography: "DoP agent did not return structured output" };
          }
        }

        console.log('Sending to QWEN VL Review Agent:', { 
          director_output: directorOutputForQwen,
          dop_output: dopOutputForQwen,
          original_script: script,
          generated_images: generatedImageUrls // Send all generated images for review
        });

        const qwenVLResponse = await fetch('/api/qwen-vl-review', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            director_output: directorOutputForQwen,
            dop_output: dopOutputForQwen,
            original_script: script,
            generated_images: generatedImageUrls
          }),
        });

        if (!qwenVLResponse.ok) {
          const errorData = await qwenVLResponse.json();
          throw new Error(errorData.error || 'Failed to get QWEN VL review response');
        }

        const qwenVLData = await qwenVLResponse.json();
        setQwenVLResult(qwenVLData);
        
        updateStepStatus(8, 'completed', qwenVLData, undefined, Date.now() - step9Start);
      }
      */
      // Manually mark step 8 as completed (skipped)
      const step9Start = Date.now(); // Keep timer for consistency if needed, or remove
      updateStepStatus(8, 'completed', { 
        skipped: true, 
        reason: 'QWEN VL review step manually commented out' 
      }, undefined, Date.now() - step9Start);


      // Step 10: Generate Videos using WAN (runs regardless of QWEN VL review)
      /*
      updateStepStatus(9, 'processing');
      const step10Start = Date.now();
      
      // Temporarily skip WAN video generation due to endpoint issues
      console.log('Skipping WAN video generation due to endpoint issues');
      updateStepStatus(9, 'completed', { 
        skipped: true, 
        reason: 'WAN video generation temporarily disabled due to endpoint issues' 
      }, undefined, Date.now() - step10Start);

      // TODO: Re-enable WAN video generation when endpoint is fixed
      if (generatedImageUrls.length > 0) {
        console.log(`Generating videos from ${generatedImageUrls.length} images using WAN...`);
        
        const wanResponse = await fetch('/api/generate-wan-videos', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            imageUrls: generatedImageUrls,
            folderId: projectFolderId
          }),
        });

        if (!wanResponse.ok) {
          const errorData = await wanResponse.json();
          throw new Error(errorData.error || 'Failed to generate videos with WAN');
        }

        const wanData = await wanResponse.json();
        setVideoGenerationResult(wanData);
        setGeneratedVideos(wanData.generatedVideos || []);
        
        updateStepStatus(9, 'completed', wanData, undefined, Date.now() - step10Start);
      } else {
        console.warn('No images available for video generation');
        updateStepStatus(9, 'completed', { 
          skipped: true, 
          reason: 'No images available for video generation' 
        }, undefined, Date.now() - step10Start);
      }
      */
      // Manually mark step 9 as completed (skipped)
      const step10Start = Date.now(); // Keep timer for consistency if needed, or remove
       updateStepStatus(9, 'completed', { 
        skipped: true, 
        reason: 'WAN video generation step manually commented out' 
      }, undefined, Date.now() - step10Start);

    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      
      // Mark current processing step as error
      const currentStepIndex = getCurrentStep();
      if (currentStepIndex !== -1) {
        updateStepStatus(currentStepIndex, 'error', undefined, errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Format time display (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  const getStepIcon = (status: WorkflowStep['status']) => {
    switch (status) {
      case 'completed': return '✅';
      case 'processing': return '⏳';
      case 'error': return '❌';
      default: return '⏸️';
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Complete Video Production Workflow</h1>
      <p className={styles.description}>
        This workflow will: 1) Generate audio from your script, 2) Transcribe the audio using Nvidia, 
        3) Generate cut points using the Producer Agent, 4) Generate creative vision using the Director Agent,
        5) Generate cinematography directions using the DoP Agent, 6) Generate image prompts using the Prompt Engineer Agent.
        Each step will be clearly shown below.
      </p>
      
      {folderId && (
        <div className={styles.projectInfo}>
          <p><strong>Project ID:</strong> {folderId}</p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="script" className={styles.label}>Enter Script:</label>
          <textarea
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className={styles.textarea}
            rows={5}
            placeholder="Enter your script here..."
            required
            disabled={loading}
          />
        </div>
        
        <button 
          type="submit" 
          className={styles.button}
          disabled={loading}
        >
          {loading ? 'Processing Workflow...' : 'Start Complete Workflow'}
        </button>
      </form>

      {/* Workflow Progress */}
      <div className={styles.workflowProgress}>
        <h2>Workflow Progress</h2>
        {steps.map((step, index) => (
          <div key={index} className={`${styles.workflowStep} ${styles[step.status]}`}>
            <div className={styles.stepHeader}>
              <span className={styles.stepIcon}>{getStepIcon(step.status)}</span>
              <span className={styles.stepName}>{step.name}</span>
              {step.duration && (
                <span className={styles.stepDuration}>({(step.duration / 1000).toFixed(1)}s)</span>
              )}
            </div>
            {step.status === 'processing' && (
              <div className={styles.progressBar}>
                <div className={styles.progressIndeterminate}></div>
              </div>
            )}
            {step.error && (
              <div className={styles.stepError}>Error: {step.error}</div>
            )}
          </div>
        ))}
      </div>

      {loading && (
        <div className={styles.processingStage}>
          <div className={styles.progressHeader}>
            <p>Running workflow{loadingDots}</p>
            <span className={styles.timer}>{formatTime(elapsedTime)}</span>
          </div>
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {/* Results Section */}
      <div className={styles.resultsSection}>
        {formattedScript && (
          <div className={styles.result}>
            <h2>1. Formatted Script:</h2>
            <div className={styles.formattedScript}>
              {formattedScript}
            </div>
          </div>
        )}
        
        {audioUrl && (
          <div className={styles.result}>
            <h2>2. Generated Audio:</h2>
            <audio controls src={audioUrl} className={styles.audio} />
            <div className={styles.downloadContainer}>
              <a 
                href={audioUrl} 
                download="formatted-audio.mp3" 
                className={styles.downloadButton}
              >
                Download Audio
              </a>
            </div>
          </div>
        )}

        {transcriptionResult && (
          <div className={styles.result}>
            <h2>3. Audio Transcription:</h2>
            <div className={styles.transcriptionResult}>
              <div className={styles.transcriptText}>
                <h3>Transcript:</h3>
                <p>&ldquo;{transcriptionResult.transcript || transcriptionResult.transcription?.transcript}&rdquo;</p>
              </div>
              
              {(transcriptionResult.word_timestamps || transcriptionResult.transcription?.word_timestamps) && (
                <div className={styles.wordTimestamps}>
                  <h3>Word Timestamps:</h3>
                  <div className={styles.timestampsGrid}>
                    {(transcriptionResult.word_timestamps || transcriptionResult.transcription?.word_timestamps || []).map((word: WordTimestamp, index: number) => (
                      <div key={index} className={styles.wordTimestamp}>
                        <span className={styles.word}>{word.word}</span>
                        <span className={styles.timestamp}>
                          {word.start?.toFixed(2) || word.start_time?.toFixed(2)}s - {word.end?.toFixed(2) || word.end_time?.toFixed(2)}s
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {producerResult && (
          <div className={styles.result}>
            <h2>4. Producer Agent Cut Points:</h2>
            <div className={styles.producerResult}>
              {producerResult.success && (
                <>
                  <div className={styles.executionStats}>
                    <h3>Execution Stats:</h3>
                    <div className={styles.statsGrid}>
                      <div>
                        <strong>Execution Time:</strong> {producerResult.executionTime}ms
                      </div>
                      <div>
                        <strong>Delay Time:</strong> {producerResult.delayTime}ms
                      </div>
                    </div>
                  </div>

                  {producerResult.cutPoints && (
                    <div className={styles.cutPoints}>
                      <h3>Cut Points:</h3>
                      <div className={styles.cutPointsTable}>
                        <table>
                          <thead>
                            <tr>
                              <th>Cut #</th>
                              <th>Time (s)</th>
                              <th>Reason</th>
                            </tr>
                          </thead>
                          <tbody>
                            {producerResult.cutPoints.map((cut) => (
                              <tr key={cut.cut_number}>
                                <td>{cut.cut_number}</td>
                                <td>{cut.cut_time}</td>
                                <td>{cut.reason}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {producerResult.rawResponse && (
                    <div className={styles.rawResponse}>
                      <h3>Raw Response:</h3>
                      <pre className={styles.rawResponseText}>
                        {producerResult.rawResponse}
                      </pre>
                    </div>
                  )}

                  {producerResult.warning && (
                    <div className={styles.warning}>
                      <strong>Warning:</strong> {producerResult.warning}
                    </div>
                  )}
                </>
              )}

              {!producerResult.success && producerResult.error && (
                <div className={styles.producerError}>
                  <strong>Producer Agent Error:</strong> {producerResult.error}
                </div>
              )}
            </div>
          </div>
        )}

        {directorResult && (
          <div className={styles.result}>
            <h2>5. Director Agent Creative Vision:</h2>
            <div className={styles.directorResult}>
              {directorResult.success && (
                <>
                  <div className={styles.executionStats}>
                    <h3>Execution Stats:</h3>
                    <div className={styles.statsGrid}>
                      <div>
                        <strong>Execution Time:</strong> {directorResult.executionTime}ms
                      </div>
                      <div>
                        <strong>Delay Time:</strong> {directorResult.delayTime}ms
                      </div>
                    </div>
                  </div>

                  {directorResult.directorOutput && (
                    <div className={styles.directorOutput}>
                      <h3>Creative Vision:</h3>
                      <pre className={styles.jsonOutput}>
                        {JSON.stringify(directorResult.directorOutput, null, 2)}
                      </pre>
                    </div>
                  )}

                  {directorResult.rawResponse && (
                    <div className={styles.rawResponse}>
                      <h3>Raw Response:</h3>
                      <pre className={styles.rawResponseText}>
                        {directorResult.rawResponse}
                      </pre>
                    </div>
                  )}

                  {directorResult.warning && (
                    <div className={styles.warning}>
                      <strong>Warning:</strong> {directorResult.warning}
                    </div>
                  )}
                </>
              )}

              {!directorResult.success && directorResult.error && (
                <div className={styles.directorError}>
                  <strong>Director Agent Error:</strong> {directorResult.error}
                </div>
              )}
            </div>
          </div>
        )}

        {dopResult && (
          <div className={styles.result}>
            <h2>6. DoP Agent Cinematography:</h2>
            <div className={styles.dopResult}>
              {dopResult.success && (
                <>
                  <div className={styles.executionStats}>
                    <h3>Execution Stats:</h3>
                    <div className={styles.statsGrid}>
                      <div>
                        <strong>Execution Time:</strong> {dopResult.executionTime}ms
                      </div>
                      <div>
                        <strong>Delay Time:</strong> {dopResult.delayTime}ms
                      </div>
                    </div>
                  </div>

                  {dopResult.dopOutput && (
                    <div className={styles.dopOutput}>
                      <h3>Cinematography Directions:</h3>
                      {Array.isArray(dopResult.dopOutput) && (
                        <div className={styles.imageCount}>
                          <strong>Number of Images to Generate:</strong> {dopResult.dopOutput.length}
                        </div>
                      )}
                      <pre className={styles.jsonOutput}>
                        {JSON.stringify(dopResult.dopOutput, null, 2)}
                      </pre>
                    </div>
                  )}

                  {dopResult.rawResponse && (
                    <div className={styles.rawResponse}>
                      <h3>Raw Response:</h3>
                      <pre className={styles.rawResponseText}>
                        {dopResult.rawResponse}
                      </pre>
                    </div>
                  )}

                  {dopResult.warning && (
                    <div className={styles.warning}>
                      <strong>Warning:</strong> {dopResult.warning}
                    </div>
                  )}
                </>
              )}

              {!dopResult.success && dopResult.error && (
                <div className={styles.dopError}>
                  <strong>DoP Agent Error:</strong> {dopResult.error}
                </div>
              )}
            </div>
          </div>
        )}

        {promptEngineerResult && (
          <div className={styles.result}>
            <h2>7. Prompt Engineer Image Prompts:</h2>
            <div className={styles.promptEngineerResult}>
              {promptEngineerResult.success && (
                <>
                  <div className={styles.executionStats}>
                    <h3>Execution Stats:</h3>
                    <div className={styles.statsGrid}>
                      <div>
                        <strong>Execution Time:</strong> {promptEngineerResult.executionTime}ms
                      </div>
                      <div>
                        <strong>Delay Time:</strong> {promptEngineerResult.delayTime}ms
                      </div>
                      {promptEngineerResult.numPrompts && (
                        <div>
                          <strong>Number of Prompts Generated:</strong> {promptEngineerResult.numPrompts}
                        </div>
                      )}
                    </div>
                  </div>

                  {promptEngineerResult.promptsOutput && (
                    <div className={styles.promptEngineerOutput}>
                      <h3>Generated Image Prompts:</h3>
                      <pre className={styles.jsonOutput}>
                        {JSON.stringify(promptEngineerResult.promptsOutput, null, 2)}
                      </pre>
                    </div>
                  )}

                  {promptEngineerResult.rawResponse && (
                    <div className={styles.rawResponse}>
                      <h3>Raw Response:</h3>
                      <pre className={styles.rawResponseText}>
                        {promptEngineerResult.rawResponse}
                      </pre>
                    </div>
                  )}

                  {promptEngineerResult.warning && (
                    <div className={styles.warning}>
                      <strong>Warning:</strong> {promptEngineerResult.warning}
                    </div>
                  )}
                </>
              )}

              {!promptEngineerResult.success && promptEngineerResult.error && (
                <div className={styles.promptEngineerError}>
                  <strong>Prompt Engineer Agent Error:</strong> {promptEngineerResult.error}
                </div>
              )}
            </div>
          </div>
        )}

        {generatedImages && generatedImages.length > 0 && (
          <div className={styles.result}>
            <h2>8. Generated Images (ComfyUI):</h2>
            <div className={styles.generatedImagesResult}>
              <div className={styles.executionStats}>
                <h3>Image Generation Stats:</h3>
                <div className={styles.statsGrid}>
                  <div>
                    <strong>Images Generated:</strong> {generatedImages.length}
                  </div>
                </div>
              </div>

              <div className={styles.imagesGrid}>
                {generatedImages.map((imageUrl, index) => (
                  <div key={index} className={styles.imageContainer}>
                    <Image 
                      src={imageUrl} 
                      alt={`Generated image ${index + 1}`}
                      className={styles.generatedImage}
                      width={500}
                      height={300}
                      onError={(e) => {
                        console.error(`Failed to load image ${index + 1}:`, imageUrl);
                        e.currentTarget.style.display = 'none';
                      }}
                    />

                    <div className={styles.imageActions}>
                      <a 
                        href={imageUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className={styles.viewFullButton}
                      >
                        View Full Size
                      </a>
                      <button 
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = imageUrl;
                          link.download = `generated-image-${index + 1}.png`;
                          link.click();
                        }}
                        className={styles.downloadButton}
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {qwenVLResult && (
          <div className={styles.result}>
            <h2>9. Image Review (QWEN VL Agent):</h2>
            <div className={styles.qwenVLResult}>
              {qwenVLResult.success && qwenVLResult.reviewResult && (
                <>
                  <div className={styles.executionStats}>
                    <h3>Visual Continuity Review:</h3>
                    <div className={styles.statsGrid}>
                      <div>
                        <strong>Overall Score:</strong> {qwenVLResult.reviewResult.overall_score}/10
                      </div>
                      <div>
                        <strong>Style Continuity:</strong> {qwenVLResult.reviewResult.style_continuity_score}/10
                      </div>
                      <div>
                        <strong>Narrative Progression:</strong> {qwenVLResult.reviewResult.narrative_progression_score}/10
                      </div>
                      <div>
                        <strong>Approved:</strong> {qwenVLResult.reviewResult.approved ? '✅ Yes' : '❌ No'}
                      </div>
                      <div>
                        <strong>Script Alignment:</strong> {qwenVLResult.reviewResult.script_alignment ? '✅ Yes' : '❌ No'}
                      </div>
                      <div>
                        <strong>Visual Motifs Maintained:</strong> {qwenVLResult.reviewResult.visual_motifs_maintained ? '✅ Yes' : '❌ No'}
                      </div>
                    </div>
                  </div>

                  {qwenVLResult.reviewResult.auto_reject_triggered && (
                    <div className={styles.autoReject}>
                      <h3>Auto-Reject Triggered:</h3>
                      <div className={styles.autoRejectReasons}>
                        {qwenVLResult.reviewResult.auto_reject_reasons.map((reason, index) => (
                          <div key={index} className={styles.rejectReason}>
                            ❌ {reason}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qwenVLResult.reviewResult.feedback && qwenVLResult.reviewResult.feedback.length > 0 && (
                    <div className={styles.feedback}>
                      <h3>Feedback:</h3>
                      <div className={styles.feedbackList}>
                        {qwenVLResult.reviewResult.feedback.map((feedback, index) => (
                          <div key={index} className={styles.feedbackItem}>
                            💬 {feedback}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {qwenVLResult.reviewResult.narrative_context_notes && (
                    <div className={styles.narrativeNotes}>
                      <h3>Narrative Context Notes:</h3>
                      <p className={styles.narrativeText}>
                        {qwenVLResult.reviewResult.narrative_context_notes}
                      </p>
                    </div>
                  )}

                  {qwenVLResult.framesEvaluated && (
                    <div className={styles.framesEvaluated}>
                      <h3>Frames Evaluated:</h3>
                      <div className={styles.framesList}>
                        <div className={styles.frameItem}>
                          <strong>Frame A (Reference):</strong>
                          <Image 
                            src={qwenVLResult.framesEvaluated.frameA} 
                            alt="Frame A"
                            className={styles.reviewFrame}
                            width={200}
                            height={120}
                          />
                        </div>
                        <div className={styles.frameItem}>
                          <strong>Frame B (Reference):</strong>
                          <Image 
                            src={qwenVLResult.framesEvaluated.frameB} 
                            alt="Frame B"
                            className={styles.reviewFrame}
                            width={200}
                            height={120}
                          />
                        </div>
                        <div className={styles.frameItem}>
                          <strong>Frame C (Candidate):</strong>
                          <Image 
                            src={qwenVLResult.framesEvaluated.candidateC} 
                            alt="Frame C"
                            className={styles.reviewFrame}
                            width={200}
                            height={120}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {qwenVLResult.rawResponse && (
                <div className={styles.rawResponse}>
                  <h3>Raw Response:</h3>
                  <pre className={styles.rawResponseText}>
                    {qwenVLResult.rawResponse}
                  </pre>
                </div>
              )}

              {qwenVLResult.warning && (
                <div className={styles.warning}>
                  <strong>Warning:</strong> {qwenVLResult.warning}
                </div>
              )}

              {!qwenVLResult.success && qwenVLResult.error && (
                <div className={styles.qwenVLError}>
                  <strong>QWEN VL Review Error:</strong> {qwenVLResult.error}
                </div>
              )}
            </div>
          </div>
        )}

        {(generatedVideos.length > 0 || videoGenerationResult) && (
          <div className={styles.result}>
            <h2>10. Generated Videos (WAN):</h2>
            <div className={styles.videoGenerationResult}>
              {videoGenerationResult && (
                <div className={styles.executionStats}>
                  <h3>Video Generation Stats:</h3>
                  <div className={styles.statsGrid}>
                    <div>
                      <strong>Videos Requested:</strong> {videoGenerationResult.totalRequested}
                    </div>
                    <div>
                      <strong>Videos Generated:</strong> {videoGenerationResult.totalGenerated}
                    </div>
                    <div>
                      <strong>Success Rate:</strong> {(videoGenerationResult.totalRequested && videoGenerationResult.totalGenerated) 
                        ? Math.round((videoGenerationResult.totalGenerated / videoGenerationResult.totalRequested) * 100) 
                        : 0}%
                    </div>
                  </div>
                  
                  {videoGenerationResult.errors && videoGenerationResult.errors.length > 0 && (
                    <div className={styles.videoErrors}>
                      <h4>Generation Errors:</h4>
                      {videoGenerationResult.errors.map((error, index) => (
                        <div key={index} className={styles.errorItem}>
                          ❌ {error}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {generatedVideos.length > 0 && (
                <div className={styles.videosGrid}>
                  {generatedVideos.map((videoUrl, index) => (
                    <div key={index} className={styles.videoContainer}>
                      <h4>Video {index + 1}</h4>
                      <video 
                        src={videoUrl} 
                        controls
                        className={styles.generatedVideo}
                        width="500"
                        height="300"
                        onError={() => {
                          console.error(`Failed to load video ${index + 1}:`, videoUrl);
                        }}
                      >
                        Your browser does not support the video tag.
                      </video>

                      <div className={styles.videoActions}>
                        <a 
                          href={videoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className={styles.viewFullButton}
                        >
                          Open in New Tab
                        </a>
                        <button 
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = videoUrl;
                            link.download = `generated-video-${index + 1}.mp4`;
                            link.click();
                          }}
                          className={styles.downloadButton}
                        >
                          Download
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
