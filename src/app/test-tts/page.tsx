
'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import styles from './page.module.css';
import type { UserContext } from '@/types/userContext';
import type { ScriptModeUserContext } from '@/types/scriptModeUserContext';

interface CutPoint {
  cut_number: number;
  cut_time_s: number;
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

// NEW: Vision Document Interface (enhanced for audio pipeline)
interface VisionDocument {
  core_concept: string;
  emotion_arc: string[];
  pacing: 'slow' | 'medium' | 'fast';
  visual_style: string;
  duration: number;
  content_classification: {
    type: 'narrative_driven' | 'concept_driven' | 'abstract_thematic' | 'narrative_character';
  };
  visual_complexity: 'simple' | 'moderate' | 'complex';
  color_philosophy: string;
  detected_artistic_style?: string;
  // NEW: Audio-specific optimization fields
  narration_optimization?: {
    vocal_style: 'dramatic' | 'conversational' | 'mysterious' | 'inspiring' | 'intimate';
    emphasis_points: string[];
    natural_pauses: string[];
    audio_visual_sync: 'tight' | 'loose' | 'atmospheric';
  };
}

// NEW: Vision Understanding Result Interface (for future use)
// interface VisionUnderstandingResult {
//   success: boolean;
//   stage1_vision_analysis?: {
//     vision_document: VisionDocument;
//     timing_blueprint?: {
//       total_duration: number;
//       cut_strategy: string;
//       optimal_cut_count: number;
//       average_cut_length: number;
//       pacing_rationale: string;
//       cut_points: Array<{
//         cut_number: number;
//         cut_time: number;
//         narrative_reason: string;
//         content_transition: string;
//         cognitive_weight: 'light' | 'medium' | 'heavy';
//         emotional_intensity: 'low' | 'medium' | 'high';
//       }>;
//     };
//   };
//   executionTime?: number;
//   rawResponse?: string;
//   error?: string;
// }

// NEW: Vision Form Data Interface
interface VisionFormData {
  concept: string;
  style: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
  pacing: 'slow' | 'medium' | 'fast';
  duration: number;
  contentType: 'general' | 'educational' | 'storytelling' | 'abstract';
}

export default function TestTTS() {
  const searchParams = useSearchParams();
  const conversationMode = searchParams?.get('conversationMode') === 'true';
  const conversationData = searchParams?.get('conversation');
  const preGeneratedScript = searchParams?.get('script');
  const urlUseVisionMode = searchParams?.get('useVisionMode') === 'true';
  const urlConcept = searchParams?.get('concept');
  const urlStyle = searchParams?.get('style') as VisionFormData['style'] | null;
  const urlPacing = searchParams?.get('pacing') as VisionFormData['pacing'] | null;
  const urlDuration = searchParams?.get('duration');
  const urlContentType = searchParams?.get('contentType') as VisionFormData['contentType'] | null;
  
  const [script, setScript] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingScript, setIsGeneratingScript] = useState<boolean>(false);
  const [conversationAnalyzed, setConversationAnalyzed] = useState<boolean>(false);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [loadingDots, setLoadingDots] = useState<string>('');
  const [runId, setRunId] = useState<string | null>(null);
  
  // NEW: Vision form state (with URL parameter defaults)
  const [useVisionMode, setUseVisionMode] = useState<boolean>(urlUseVisionMode);
  const [visionFormData, setVisionFormData] = useState<VisionFormData>({
    concept: urlConcept || '',
    style: urlStyle || 'cinematic',
    pacing: urlPacing || 'medium',
    duration: urlDuration ? parseInt(urlDuration) : 30,
    contentType: urlContentType || 'general'
  });

  // NEW: Script Mode form data state (no duration - auto-calculated from TTS)
  const [scriptFormData, setScriptFormData] = useState({
    style: 'cinematic' as 'cinematic' | 'documentary' | 'artistic' | 'minimal',
    pacing: 'medium' as 'slow' | 'medium' | 'fast',
    contentType: 'general' as string
  });

  // Workflow state (UPDATED: Separated vision understanding from audio generation)
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { name: 'Initialize Project', status: 'pending' },
    { name: 'Vision Understanding', status: 'pending' }, // NEW: Separate step
    { name: 'Generate Audio from Script', status: 'pending' }, // NEW: Separate step
    { name: 'Transcribe Audio (Nvidia)', status: 'pending' },
    { name: 'Generate Cut Points (Producer Agent)', status: 'pending' },
    { name: 'Generate Creative Vision (Director Agent)', status: 'pending' },
    { name: 'Generate Cinematography Directions (DoP Agent)', status: 'pending' },
    { name: 'Generate Image Prompts (Prompt Engineer Agent)', status: 'pending' },
    { name: 'Generate Images (ComfyUI)', status: 'pending' },
    { name: 'Review Images (QWEN VL Agent)', status: 'pending' },
    { name: 'Generate Videos (WAN)', status: 'pending' }
  ]);
  
  // Session tracking for organized output storage
  const [sessionId, setSessionId] = useState<string | null>(null);
  
  // Results from each step
  const [visionDocument, setVisionDocument] = useState<VisionDocument | null>(null); // NEW: Vision result
  const [visionAgentResult, setVisionAgentResult] = useState<Record<string, unknown> | null>(null); // NEW: Raw vision agent result
  const [narrationScript, setNarrationScript] = useState<string | null>(null); // NEW: Original narration script from vision agent
  const [formattedScript, setFormattedScript] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcriptionResult, setTranscriptionResult] = useState<TranscriptionResult | null>(null);
  const [producerResult, setProducerResult] = useState<ProducerResult | null>(null);
  const [directorResult, setDirectorResult] = useState<DirectorResult | null>(null);
  const [dopResult, setDoPResult] = useState<DoPResult | null>(null);
  const [promptEngineerResult, setPromptEngineerResult] = useState<PromptEngineerResult | null>(null);
  
  // Enhanced Script Mode results (different structure than legacy)
  const [enhancedProducerResult, setEnhancedProducerResult] = useState<any>(null);
  const [enhancedDirectorResult, setEnhancedDirectorResult] = useState<any>(null);
  const [enhancedDopResult, setEnhancedDopResult] = useState<any>(null);
  const [enhancedPromptEngineerResult, setEnhancedPromptEngineerResult] = useState<any>(null);
  const [generatedImages, setGeneratedImages] = useState<string[]>([]);
  const [imageGenerationProgress, setImageGenerationProgress] = useState<{
    currentIndex: number;
    totalImages: number;
    percentage: number;
    isGenerating: boolean;
    message: string;
  }>({ currentIndex: 0, totalImages: 0, percentage: 0, isGenerating: false, message: '' });
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

  // Handle conversation mode analysis
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const conversationMode = params.get('conversationMode') === 'true';
    const preGeneratedScript = params.get('preGeneratedScript');
    const scriptParam = params.get('script');
    const useScriptMode = params.get('useScriptMode') === 'true';
    const conversationData = params.get('conversationData');
    
    if (conversationMode) {
      if (preGeneratedScript) {
        const decodedScript = decodeURIComponent(preGeneratedScript);
        setScript(decodedScript);
        setConversationAnalyzed(true);
        setUseVisionMode(false);
      } else if (scriptParam) {
        // Handle extracted script from conversation mode
        const decodedScript = decodeURIComponent(scriptParam);
        setScript(decodedScript);
        setConversationAnalyzed(true);
        setUseVisionMode(false);
        console.log('📝 Using extracted script from conversation:', decodedScript.substring(0, 50) + '...');
      } else if (useScriptMode) {
        // Force script mode even without script
        setUseVisionMode(false);
      } else if (conversationData) {
        analyzeConversationAndGenerateScript();
      }
    }
  }, []);

  const analyzeConversationAndGenerateScript = async () => {
    if (!conversationData) return;
    
    setIsGeneratingScript(true);
    setError(null);
    
    try {
      const decodedConversation = decodeURIComponent(conversationData);
      
      const response = await fetch('/api/conversation-to-script', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          conversation: decodedConversation
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate script from conversation');
      }

      const data = await response.json();
      setScript(data.script);
      setConversationAnalyzed(true);
      
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      setError('Failed to generate script from conversation. Please try again.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

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

  // Helper function to save agent outputs
  const saveAgentOutput = async (agentName: string, output: unknown, rawResponse?: string) => {
    if (!runId) return;
    
    try {
      const response = await fetch('/api/save-agent-output', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          runId,
          agentName,
          output,
          rawResponse
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log(`Saved ${agentName} output to:`, result.savedTo);
      } else {
        console.error(`Failed to save ${agentName} output`);
      }
    } catch (error) {
      console.error(`Error saving ${agentName} output:`, error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // NEW: Reset sessionId for new workflow run
    setSessionId(null);
    
    // Validate input based on mode
    if (useVisionMode) {
      if (!visionFormData.concept.trim()) {
        setError('Please enter a concept for vision mode');
        return;
      }
    } else {
      if (!script.trim()) {
        setError('Please enter a script for script mode');
        return;
      }
    }
    
    setLoading(true);
    setError(null);
    setVisionDocument(null); // NEW: Reset vision document
    setVisionAgentResult(null); // NEW: Reset vision agent result
    setNarrationScript(null); // NEW: Reset narration script
    setFormattedScript(null);
    setAudioUrl(null);
    setTranscriptionResult(null);
    setProducerResult(null);
    setDirectorResult(null);
    setDoPResult(null);
    setPromptEngineerResult(null);
    
    // Reset Enhanced Script results
    setEnhancedProducerResult(null);
    setEnhancedDirectorResult(null);
    setEnhancedDopResult(null);
    setEnhancedPromptEngineerResult(null);
    setGeneratedImages([]);
    setImageGenerationProgress({ currentIndex: 0, totalImages: 0, percentage: 0, isGenerating: false, message: '' });
    setQwenVLResult(null);
    setGeneratedVideos([]);
    setVideoGenerationResult(null);
    setElapsedTime(0);

    // Generate run ID for this workflow execution
    const currentRunId = Date.now().toString();
    setRunId(currentRunId);
    console.log(`Starting new run with ID: ${currentRunId} in ${useVisionMode ? 'VISION' : 'SCRIPT'} mode`);

    // Reset all steps
    setSteps(prev => prev.map(step => ({ ...step, status: 'pending', result: undefined, error: undefined, duration: undefined })));

    // Variables to store data across steps (fixes React state async timing issues)
    let generatedAudioUrl = '';
    let generatedFormattedScript = '';
    let currentVisionDocument: VisionDocument | null = null;
    let currentVisionAgentData: any = null; // Store full vision agent response for agent instructions
    let currentScriptModeUserContext: ScriptModeUserContext | null = null; // Store script mode context

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
          body: JSON.stringify({ 
            script: useVisionMode ? visionFormData.concept : script,
            mode: useVisionMode ? 'vision' : 'script'
          }),
        });

        if (!initResponse.ok) {
          const errorData = await initResponse.json();
          throw new Error(errorData.error || 'Failed to initialize project');
        }

        const initData = await initResponse.json();
        projectFolderId = initData.folderId;
        setFolderId(projectFolderId);
      }
      
      // Save initial project setup with mode information
      const projectSetup = { 
        folderId: projectFolderId, 
        mode: useVisionMode ? 'vision' : 'script',
        input: useVisionMode ? visionFormData : { script },
        startTime: new Date().toISOString()
      };
      await saveAgentOutput('project-setup', projectSetup);
      
      updateStepStatus(0, 'completed', { folderId: projectFolderId }, undefined, Date.now() - step1Start);

      // Create UserContext for Vision Mode only
      const userContext: UserContext | null = useVisionMode ? {
        originalPrompt: visionFormData.concept,
        settings: {
          duration: visionFormData.duration,
          pacing: visionFormData.pacing,
          visualStyle: visionFormData.style,
          contentType: visionFormData.contentType,
          voiceSelection: 'enceladus' // Default voice for now - TODO: Add voice selection UI
        },
        pipeline: {
          mode: 'vision_enhanced',
          timestamp: new Date().toISOString(),
          sessionId: sessionId || projectFolderId // Use sessionId if available, else projectFolderId
        },
        constraints: {
          mustMatchDuration: true,
          durationTolerance: 5 // Fixed at 5%
        }
      } : null;

      // DEBUG: Log UserContext creation (Vision Mode only)
      if (useVisionMode && userContext) {
        console.log('🎯 USERCONTEXT CREATED FOR VISION MODE:');
        console.log('- Original Prompt:', userContext.originalPrompt);
      } else {
        console.log('🎯 SCRIPT MODE: No UserContext created (using ScriptModeUserContext instead)');
      }
      if (useVisionMode && userContext) {
        console.log('- Duration:', userContext.settings.duration);
        console.log('- Pacing:', userContext.settings.pacing);
        console.log('- Visual Style:', userContext.settings.visualStyle);
        console.log('- Pipeline Mode:', userContext.pipeline.mode);
      }
      if (useVisionMode && userContext) {
        console.log('- Full UserContext:', JSON.stringify(userContext, null, 2));
      }

      if (useVisionMode) {
        // Step 2: Vision Understanding (Separate step)
        updateStepStatus(1, 'processing');
        const step2Start = Date.now();
        
        console.log('📤 Sending to Vision API - UserContext only (no redundant concept)');
        
        const visionResponse = await fetch('/api/vision-only', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            userContext // Pass only userContext, no redundant concept
          }),
        });

        if (!visionResponse.ok) {
          const errorData = await visionResponse.json();
          throw new Error(errorData.error || 'Failed to generate vision understanding');
        }

        const visionData = await visionResponse.json();
        
        // Debug: Log what we received from vision API
        console.log('🔍 DEBUG - test-tts received from vision API:');
        console.log('- visionData.narrationScript:', visionData.narrationScript);
        console.log('- visionData keys:', Object.keys(visionData));
        console.log('- visionData structure:', JSON.stringify(visionData, null, 2));
        
        // ENHANCED DEBUG: Log agent instructions
        console.log('📋 AGENT INSTRUCTIONS DEBUG:');
        console.log('- Has visionAgentData:', !!visionData.visionAgentData);
        console.log('- Has stage1_vision_analysis:', !!visionData.visionAgentData?.stage1_vision_analysis);
        console.log('- Has agent_instructions:', !!visionData.visionAgentData?.stage1_vision_analysis?.agent_instructions);
        if (visionData.visionAgentData?.stage1_vision_analysis?.agent_instructions) {
          const instructions = visionData.visionAgentData.stage1_vision_analysis.agent_instructions;
          console.log('- Producer instructions:', instructions.producer_instructions);
          console.log('- Director instructions:', instructions.director_instructions);
          console.log('- DoP instructions:', instructions.dop_instructions);
          console.log('- Prompt Engineer instructions:', instructions.prompt_engineer_instructions);
        }
        
        // Store vision results immediately
        setVisionDocument(visionData.visionDocument);
        setVisionAgentResult(visionData.visionAgentData);
        setNarrationScript(visionData.narrationScript);
        currentVisionDocument = visionData.visionDocument; // Store for agent chain
        currentVisionAgentData = visionData.visionAgentData; // Store for agent enhancement instructions
        
        console.log('✅ Vision understanding completed:', visionData.visionDocument);
        console.log('📜 Narration script:', visionData.narrationScript);
        
        // Save vision results
        await saveAgentOutput('vision-understanding', visionData);
        
        updateStepStatus(1, 'completed', visionData, undefined, Date.now() - step2Start);

        // Step 3: Generate Audio from Script (Separate step)
        updateStepStatus(2, 'processing');
        const step3Start = Date.now();
        
        // Debug: Log what we're sending to TTS
        console.log('🔍 DEBUG - test-tts sending to TTS API:');
        console.log('- visionData.narrationScript:', visionData.narrationScript);
        console.log('- typeof visionData.narrationScript:', typeof visionData.narrationScript);
        
        const audioResponse = await fetch('/api/generate-audio-from-script', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            narrationScript: visionData.narrationScript,
            folderId: projectFolderId
          }),
        });

        if (!audioResponse.ok) {
          const errorData = await audioResponse.json();
          throw new Error(errorData.error || 'Failed to generate audio');
        }

        const audioData = await audioResponse.json();
        
        setFormattedScript(audioData.formattedScript);
        setAudioUrl(audioData.audioUrl);
        generatedAudioUrl = audioData.audioUrl; // Store for transcription step
        generatedFormattedScript = audioData.formattedScript; // Store for Producer Agent step
        
        console.log('✅ Audio generation completed:', audioData.audioUrl);
        
        // Save audio results
        await saveAgentOutput('audio-generation', audioData);
        
        updateStepStatus(2, 'completed', audioData, undefined, Date.now() - step3Start);
        
      } else {
        // Enhanced Script Mode: Step 1: Script Formatting
        updateStepStatus(1, 'processing', { message: 'Formatting script for TTS...' });
        const formatStart = Date.now();
        
        // Create ScriptModeUserContext (duration will be calculated after TTS)
        const scriptModeUserContext: ScriptModeUserContext = {
          originalScript: script,
          originalPrompt: script, // In script mode, the script IS the prompt
          settings: {
            // calculatedDuration will be set after TTS generation
            pacing: scriptFormData.pacing,
            visualStyle: scriptFormData.style,
            contentType: scriptFormData.contentType || 'narrative',
            voiceSelection: 'enceladus' // TODO: Add voice selection UI
          },
          pipeline: {
            mode: 'enhanced_script',
            timestamp: new Date().toISOString(),
            sessionId: sessionId || projectFolderId
          },
          constraints: {
            scriptFidelity: 'exact' as const,
            adaptToTTSDuration: true // Must adapt cuts to actual TTS duration
          }
        };
        
        // Call Script Formatting Agent
        const formatResponse = await fetch('/api/script-formatting', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalScript: script,
            userContext: {
              // No duration needed - will be calculated from TTS
              contentType: scriptFormData.contentType
            }
          })
        });
        
        if (!formatResponse.ok) {
          throw new Error('Script formatting failed');
        }
        
        const formatResult = await formatResponse.json();
        scriptModeUserContext.scriptContext = {
          formatted_script_for_tts: formatResult.formatted_script_for_tts,
          script_analysis: formatResult.script_analysis
        };
        
        generatedFormattedScript = formatResult.formatted_script_for_tts;
        setFormattedScript(formatResult.formatted_script_for_tts);
        updateStepStatus(1, 'completed', formatResult, undefined, Date.now() - formatStart);
        
        // Step 2: TTS Generation
        updateStepStatus(2, 'processing');
        const ttsStart = Date.now();
        
        const ttsResponse = await fetch('/api/generate-audio-from-script', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            narrationScript: formatResult.formatted_script_for_tts,
            voiceName: 'enceladus', // TODO: Use voice from settings
            folderId: projectFolderId
          })
        });
        
        if (!ttsResponse.ok) {
          throw new Error('TTS generation failed');
        }
        
        const ttsResult = await ttsResponse.json();
        setAudioUrl(ttsResult.audioUrl);
        generatedAudioUrl = ttsResult.audioUrl;
        
        // Update ScriptModeUserContext with calculated duration from TTS
        if (ttsResult.duration) {
          scriptModeUserContext.settings.calculatedDuration = ttsResult.duration;
          console.log(`🎵 TTS Duration calculated: ${ttsResult.duration} seconds for script mode`);
        }
        
        await saveAgentOutput('tts-generation', ttsResult);
        updateStepStatus(2, 'completed', ttsResult, undefined, Date.now() - ttsStart);
        
        // Store updated scriptModeUserContext for later use
        currentScriptModeUserContext = scriptModeUserContext;
      }

      // Step 4: Transcribe Audio using Nvidia script (updated index)
      updateStepStatus(3, 'processing');
      const step4Start = Date.now();
      
      // Extract project folder from audio URL (e.g., "/script-123/generated-audio-456.wav" -> "script-123")
      // Use the project folder ID directly since we know it from initialization
      const projectFolder = projectFolderId;
      
      // Ensure we have a valid audio URL
      if (!generatedAudioUrl) {
        throw new Error('Audio URL is not available for transcription. Audio generation may have failed.');
      }
      
      console.log('Audio URL:', generatedAudioUrl);
      console.log('Project folder:', projectFolder);
      
      const transcribeResponse = await fetch('/api/transcribe-audio', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          audioUrl: generatedAudioUrl,
          projectFolder: projectFolder,
          // NEW: Pass sessionId for organized output storage
          ...(sessionId && { sessionId })
        }),
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      const transcribeData = await transcribeResponse.json();
      
      // NEW: Capture sessionId from first agent response (transcription)
      if (!sessionId && transcribeData.sessionId) {
        setSessionId(transcribeData.sessionId);
        console.log('📁 Session ID captured from transcription:', transcribeData.sessionId);
      }
      
      // Debug: Check transcription response structure
      console.log('📝 TRANSCRIPTION RESPONSE DEBUG:');
      console.log('- Full response:', transcribeData);
      console.log('- transcribeData.word_timestamps:', transcribeData.word_timestamps);
      console.log('- transcribeData.transcription:', transcribeData.transcription);
      console.log('- transcribeData.transcript:', transcribeData.transcript);
      console.log('- generatedFormattedScript available:', !!generatedFormattedScript);
      console.log('- generatedFormattedScript value:', generatedFormattedScript);
      
      setTranscriptionResult(transcribeData);
      
      // Calculate duration from transcription word timestamps for Script Mode
      if (!useVisionMode && transcribeData.word_timestamps && Array.isArray(transcribeData.word_timestamps)) {
        const lastWord = transcribeData.word_timestamps[transcribeData.word_timestamps.length - 1];
        if (lastWord && (lastWord.end_time || lastWord.end)) {
          const calculatedDuration = lastWord.end_time || lastWord.end;
          if (currentScriptModeUserContext) {
            currentScriptModeUserContext.settings.calculatedDuration = calculatedDuration;
            console.log(`🎵 Duration calculated from transcription: ${calculatedDuration} seconds for script mode`);
          }
        }
      }
      
      // Save Transcription output
      await saveAgentOutput('transcription', transcribeData);
      
      updateStepStatus(3, 'completed', transcribeData, undefined, Date.now() - step4Start);

      // Step 5: Generate Cut Points using Producer Agent
      updateStepStatus(4, 'processing');
      const step5Start = Date.now();
      
      // Debug: Check what we're sending to producer agent
      const transcriptData = transcribeData.word_timestamps || transcribeData.transcription?.word_timestamps || [];
      console.log('🔍 DEBUG Producer Agent Input:');
      console.log('- Transcript data:', transcriptData);
      console.log('- Transcript length:', Array.isArray(transcriptData) ? transcriptData.length : 'Not an array');
      console.log('- Generated formatted script:', generatedFormattedScript);
      console.log('- Script length:', generatedFormattedScript ? generatedFormattedScript.length : 'Script is null/undefined');
      
      // Additional validation
      if (!Array.isArray(transcriptData) || transcriptData.length === 0) {
        console.error('⚠️ TRANSCRIPT DATA ISSUE: transcript is not a valid array or is empty');
        throw new Error('Invalid transcript data received from transcription service');
      }
      
      if (!generatedFormattedScript || typeof generatedFormattedScript !== 'string' || generatedFormattedScript.trim().length === 0) {
        console.error('⚠️ SCRIPT DATA ISSUE: generatedFormattedScript is not valid');
        console.error('- generatedFormattedScript type:', typeof generatedFormattedScript);
        console.error('- generatedFormattedScript value:', generatedFormattedScript);
        throw new Error('Invalid formatted script - missing or empty');
      }
      
      // Extract producer instructions from Vision Agent output
      const producerInstructions = currentVisionAgentData?.stage1_vision_analysis?.agent_instructions?.producer_instructions;
      
      console.log('🔍 PRODUCER AGENT ENHANCEMENT DEBUG:');
      console.log('- currentVisionAgentData available:', !!currentVisionAgentData);
      console.log('- agent_instructions available:', !!currentVisionAgentData?.stage1_vision_analysis?.agent_instructions);
      console.log('- producer_instructions available:', !!producerInstructions);
      console.log('- producer_instructions content:', JSON.stringify(producerInstructions, null, 2));
      console.log('- Vision document core_concept:', currentVisionDocument?.core_concept);
      console.log('- Vision document detected_artistic_style:', currentVisionDocument?.detected_artistic_style);
      
      // Determine which producer agent to use based on mode
      const producerEndpoint = useVisionMode ? '/api/vision-enhanced-producer-agent' : '/api/enhanced-script-producer-agent';
      console.log(`🎬 Using producer endpoint: ${producerEndpoint} (Vision Mode: ${useVisionMode})`);
      
      const producerResponse = await fetch(producerEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript: transcriptData,
          ...(useVisionMode ? {
            // Vision Mode parameters
            script: generatedFormattedScript,
            userContext,
            ...(producerInstructions && { producer_instructions: producerInstructions }),
            ...(currentVisionDocument && {
              visionDocument: currentVisionDocument,
              enhancedMode: true
            })
          } : {
            // Enhanced Script Mode parameters
            transcript: transcriptData,
            formatted_script: generatedFormattedScript,
            scriptModeUserContext: currentScriptModeUserContext
          }),
          // Common parameter
          ...(sessionId && { sessionId })
        }),
      });

      if (!producerResponse.ok) {
        const errorData = await producerResponse.json();
        throw new Error(errorData.error || 'Failed to get producer agent response');
      }

      const producerData = await producerResponse.json();
      if (useVisionMode) {
        setProducerResult(producerData);
      } else {
        setEnhancedProducerResult(producerData);
      }
      
      // NEW: Capture sessionId from producer if not already captured
      if (!sessionId && producerData.sessionId) {
        setSessionId(producerData.sessionId);
        console.log('📁 Session ID captured from producer:', producerData.sessionId);
      }
      
      // Save Producer Agent output
      await saveAgentOutput('producer', producerData, producerData.rawResponse);
      
      updateStepStatus(4, 'completed', producerData, undefined, Date.now() - step5Start);

      // Step 6: Generate Creative Vision using Director Agent
      updateStepStatus(5, 'processing');
      const step6Start = Date.now();
      
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
      
      // Extract director instructions from Vision Agent output
      const directorInstructions = currentVisionAgentData?.stage1_vision_analysis?.agent_instructions?.director_instructions;
      
      console.log('🔍 DIRECTOR AGENT ENHANCEMENT DEBUG:');
      console.log('- currentVisionAgentData available:', !!currentVisionAgentData);
      console.log('- director_instructions available:', !!directorInstructions);
      console.log('- director_instructions content:', JSON.stringify(directorInstructions, null, 2));
      console.log('- Passing vision core_concept:', currentVisionDocument?.core_concept);
      console.log('- Passing detected_artistic_style:', currentVisionDocument?.detected_artistic_style);
      
      console.log('Sending to Director Agent:', { 
        producer_output: producerOutput, 
        script: generatedFormattedScript,
        hasVisionDocument: !!currentVisionDocument,
        visionConcept: currentVisionDocument?.core_concept,
        hasDirectorInstructions: !!directorInstructions
      });
      
      const directorEndpoint = useVisionMode ? '/api/director-agent' : '/api/enhanced-script-director-agent';
      console.log(`🎬 Using director endpoint: ${directorEndpoint} (Vision Mode: ${useVisionMode})`);
      
      const directorResponse = await fetch(directorEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(useVisionMode ? {
            // Vision Mode parameters
            producer_output: producerOutput,
            script: generatedFormattedScript,
            userContext,
            ...(directorInstructions && { director_instructions: directorInstructions }),
            ...(currentVisionDocument && {
              visionDocument: currentVisionDocument,
              enhancedMode: true
            })
          } : {
            // Enhanced Script Mode parameters
            producer_output: producerData.producer_output || producerOutput,
            script: generatedFormattedScript,
            scriptModeUserContext: currentScriptModeUserContext
          }),
          // Common parameter
          ...(sessionId && { sessionId })
        }),
      });

      if (!directorResponse.ok) {
        const errorData = await directorResponse.json();
        throw new Error(errorData.error || 'Failed to get director agent response');
      }

      const directorData = await directorResponse.json();
      if (useVisionMode) {
        setDirectorResult(directorData);
      } else {
        setEnhancedDirectorResult(directorData);
      }
      
      // Save Director Agent output (including failed parsing attempts)
      await saveAgentOutput('director', directorData, directorData.rawResponse || 'No raw response available');
      
      updateStepStatus(5, 'completed', directorData, undefined, Date.now() - step6Start);

      // Step 7: Generate Cinematography Directions using DoP Agent
      updateStepStatus(6, 'processing');
      const step7Start = Date.now();
      
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
      
      // Extract dop instructions from Vision Agent output
      const dopInstructions = currentVisionAgentData?.stage1_vision_analysis?.agent_instructions?.dop_instructions;
      
      console.log('🔍 DOP AGENT ENHANCEMENT DEBUG:');
      console.log('- dop_instructions available:', !!dopInstructions);
      console.log('- dop_instructions content:', JSON.stringify(dopInstructions, null, 2));
      
      console.log('Sending to DoP Agent:', { 
        script: generatedFormattedScript, 
        producer_output: producerOutputForDoP, 
        director_output: directorOutputForDoP,
        hasVisionDocument: !!currentVisionDocument,
        visionConcept: currentVisionDocument?.core_concept,
        hasDopInstructions: !!dopInstructions,
        detectedArtisticStyle: (currentVisionDocument as any)?.detected_artistic_style
      });
      
      const dopEndpoint = useVisionMode ? '/api/dop-agent' : '/api/enhanced-script-dop-agent';
      console.log(`🎬 Using DoP endpoint: ${dopEndpoint} (Vision Mode: ${useVisionMode})`);
      
      const dopResponse = await fetch(dopEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(useVisionMode ? {
            // Vision Mode parameters
            script: generatedFormattedScript,
            producer_output: producerOutputForDoP,
            director_output: directorOutputForDoP,
            userContext,
            ...(dopInstructions && { dop_instructions: dopInstructions }),
            ...(currentVisionDocument && {
              visionDocument: currentVisionDocument,
              enhancedMode: true
            })
          } : {
            // Enhanced Script Mode parameters
            director_output: directorData.director_output || directorOutputForDoP,
            script: generatedFormattedScript,
            producer_output: producerData.producer_output || producerOutputForDoP,
            scriptModeUserContext: currentScriptModeUserContext
          }),
          // Common parameter
          ...(sessionId && { sessionId })
        }),
      });

      if (!dopResponse.ok) {
        const errorData = await dopResponse.json();
        throw new Error(errorData.error || 'Failed to get DoP agent response');
      }

      const dopData = await dopResponse.json();
      if (useVisionMode) {
        setDoPResult(dopData);
      } else {
        setEnhancedDopResult(dopData);
      }
      
      // Save DoP Agent output
      await saveAgentOutput('dop', dopData, dopData.rawResponse);
      
      updateStepStatus(6, 'completed', dopData, undefined, Date.now() - step7Start);

      // Step 8: Generate Image Prompts using Prompt Engineer Agent
      updateStepStatus(7, 'processing');
      const step8Start = Date.now();
      
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
      
      // Extract prompt engineer instructions from Vision Agent output
      const promptEngineerInstructions = currentVisionAgentData?.stage1_vision_analysis?.agent_instructions?.prompt_engineer_instructions;
      
      console.log('🔍 PROMPT ENGINEER ENHANCEMENT DEBUG:');
      console.log('- prompt_engineer_instructions available:', !!promptEngineerInstructions);
      console.log('- prompt_engineer_instructions content:', JSON.stringify(promptEngineerInstructions, null, 2));
      console.log('- Detected artistic style being passed:', currentVisionDocument?.detected_artistic_style);
      
      console.log('Sending to Prompt Engineer Agent:', { 
        script: generatedFormattedScript, 
        director_output: directorOutputForPE, 
        dop_output: dopOutputForPE,
        num_images: numImages,
        hasVisionDocument: !!currentVisionDocument,
        visionConcept: currentVisionDocument?.core_concept,
        visualStyle: currentVisionDocument?.visual_style,
        hasPromptEngineerInstructions: !!promptEngineerInstructions,
        detectedArtisticStyle: (currentVisionDocument as any)?.detected_artistic_style
      });
      
      const promptEngineerEndpoint = useVisionMode ? '/api/prompt-engineer-agent' : '/api/enhanced-script-prompt-engineer-agent';
      console.log(`🎬 Using Prompt Engineer endpoint: ${promptEngineerEndpoint} (Vision Mode: ${useVisionMode})`);
      
      const promptEngineerResponse = await fetch(promptEngineerEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...(useVisionMode ? {
            // Vision Mode parameters
            script: generatedFormattedScript,
            director_output: directorOutputForPE,
            dop_output: dopOutputForPE,
            num_images: numImages,
            userContext,
            ...(promptEngineerInstructions && { prompt_engineer_instructions: promptEngineerInstructions }),
            ...(currentVisionDocument && {
              visionDocument: currentVisionDocument,
              enhancedMode: true
            })
          } : {
            // Enhanced Script Mode parameters
            director_output: directorData.director_output || directorOutputForPE,
            dop_output: dopData.dop_output || dopOutputForPE,
            script: generatedFormattedScript,
            scriptModeUserContext: currentScriptModeUserContext
          }),
          // Common parameter
          ...(sessionId && { sessionId })
        }),
      });

      if (!promptEngineerResponse.ok) {
        const errorData = await promptEngineerResponse.json();
        throw new Error(errorData.error || 'Failed to get Prompt Engineer agent response');
      }

      const promptEngineerData = await promptEngineerResponse.json();
      if (useVisionMode) {
        setPromptEngineerResult(promptEngineerData);
      } else {
        setEnhancedPromptEngineerResult(promptEngineerData);
      }
      
      // Save Prompt Engineer Agent output
      await saveAgentOutput('prompt-engineer', promptEngineerData, promptEngineerData.rawResponse);
      
      updateStepStatus(7, 'completed', promptEngineerData, undefined, Date.now() - step8Start);

      // Step 9: Generate Images using ComfyUI
      console.log('🎯 Script Mode: Proceeding with image generation using Enhanced Script prompts');
      
      updateStepStatus(8, 'processing');
      const step9Start = Date.now();
      
      // Extract prompts from prompt engineer output (support both legacy and Enhanced Script modes)
      let promptsToGenerate: string[] = [];
      if (promptEngineerData.promptsOutput && Array.isArray(promptEngineerData.promptsOutput)) {
        promptsToGenerate = promptEngineerData.promptsOutput;
      } else if (promptEngineerData.prompts && Array.isArray(promptEngineerData.prompts)) {
        // Enhanced Script Mode format
        promptsToGenerate = promptEngineerData.prompts;
      } else if (promptEngineerData.promptEngineerOutput?.prompts && Array.isArray(promptEngineerData.promptEngineerOutput.prompts)) {
        promptsToGenerate = promptEngineerData.promptEngineerOutput.prompts;
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
      
      console.log(`Generating ${promptsToGenerate.length} images using ComfyUI with real-time streaming...`);
      console.log('Prompts preview:', promptsToGenerate.slice(0, 2));
      
      // Initialize progress state
      setImageGenerationProgress({
        currentIndex: 0,
        totalImages: promptsToGenerate.length,
        percentage: 0,
        isGenerating: true,
        message: `Starting generation of ${promptsToGenerate.length} images...`
      });
      
      // Initialize generated images array with placeholders
      const placeholderImages = new Array(promptsToGenerate.length).fill('');
      setGeneratedImages(placeholderImages);
      
      // Use fetch with streaming response for SSE
      const allGeneratedImages: string[] = [...placeholderImages];
      // let finalOutput: unknown = null; // Commented out as not used
      let isComplete = false;
      
      try {
        const response = await fetch('/api/generate-comfy-images-stream', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompts: promptsToGenerate,
            folderId: projectFolderId
          }),
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        
        if (!reader) {
          throw new Error('No response body');
        }
        
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader.read();
          
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Debug: Log raw chunks
          if (chunk.includes('event:') || chunk.includes('data:')) {
            console.log('Raw SSE chunk:', chunk);
          }
          
          // Process complete SSE events from buffer
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer
          
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('event:')) {
              const eventType = line.substring(6).trim();
              
              // Get the data line (should be next)
              if (i + 1 < lines.length && lines[i + 1].startsWith('data:')) {
                const dataLine = lines[i + 1];
                try {
                  const data = JSON.parse(dataLine.substring(5).trim());
                  
                  switch (eventType) {
                  case 'start':
                    console.log('Generation started:', data);
                    setImageGenerationProgress(prev => ({
                      ...prev,
                      message: data.message
                    }));
                    break;
                    
                  case 'processing':
                    console.log('Processing image:', data);
                    setImageGenerationProgress(prev => ({
                      ...prev,
                      currentIndex: data.index,
                      message: data.message
                    }));
                    break;
                    
                  case 'image':
                    console.log('Image generated:', data);
                    console.log('Current allGeneratedImages:', allGeneratedImages);
                    
                    // Update the specific image in the array
                    if (data.index >= 0 && data.index < allGeneratedImages.length) {
                      allGeneratedImages[data.index] = data.imageUrl;
                      setGeneratedImages([...allGeneratedImages]);
                      console.log('Updated images array:', allGeneratedImages);
                    } else {
                      console.error('Invalid image index:', data.index, 'for array length:', allGeneratedImages.length);
                    }
                    
                    // Update progress
                    setImageGenerationProgress(prev => ({
                      ...prev,
                      currentIndex: data.index + 1,
                      percentage: data.progress,
                      message: data.message
                    }));
                    break;
                    
                  case 'error':
                    console.error('Generation error:', data);
                    if (typeof data === 'object' && data.message) {
                      setImageGenerationProgress(prev => ({
                        ...prev,
                        message: `Error: ${data.message}`
                      }));
                    }
                    break;
                    
                  case 'complete':
                    console.log('Generation complete:', data);
                    
                    if (data.success) {
                      // Update final images if provided
                      if (data.generatedImages && data.generatedImages.length > 0) {
                        setGeneratedImages(data.generatedImages);
                      }
                      
                      // finalOutput = data; // Commented out as not used
                      
                      // Save Image Generation output
                      await saveAgentOutput('image-generation', data);
                      
                      // Update progress to completed
                      setImageGenerationProgress(prev => ({
                        ...prev,
                        percentage: 100,
                        isGenerating: false,
                        message: data.message
                      }));
                      
                      updateStepStatus(8, 'completed', data, undefined, Date.now() - step9Start);
                      isComplete = true;
                    } else {
                      throw new Error(data.error || 'Failed to generate images with ComfyUI');
                    }
                    break;
                  }
                  
                  // Skip the data line in the next iteration
                  i++;
                } catch (error) {
                  console.error('Error parsing SSE data:', error, dataLine);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Streaming error:', error);
        
        setImageGenerationProgress(prev => ({
          ...prev,
          isGenerating: false,
          message: 'Error during image generation, falling back to batch mode'
        }));
        
        // Fall back to regular API
        const comfyResponse = await fetch('/api/generate-comfy-images-concurrent', {
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
        await saveAgentOutput('image-generation', comfyData);
        updateStepStatus(8, 'completed', comfyData, undefined, Date.now() - step9Start);
        isComplete = true;
      }
      
      // Ensure we've completed before continuing
      if (!isComplete) {
        throw new Error('Image generation did not complete properly');
      }

      // Mark remaining steps as completed (skipped for testing)
      updateStepStatus(9, 'completed', { skipped: true, reason: 'QWEN VL Review step commented out for testing' });
      updateStepStatus(10, 'completed', { skipped: true, reason: 'Video Generation step commented out for testing' });
      
      // Stop the main timer when workflow completes successfully
      setLoading(false);

      // COMMENTED OUT FOR TESTING - Step 10: Review Images using QWEN VL Agent
      /*
      updateStepStatus(9, 'processing');
      const step10Start = Date.now();
      
      // Check if we have enough images for review (need at least 3)
      if (generatedImageUrls.length < 3) {
        console.warn(`Only ${generatedImageUrls.length} images generated, skipping QWEN VL review (requires at least 3)`);
        updateStepStatus(9, 'completed', { 
          skipped: true, 
          reason: 'Insufficient images for review (need at least 3)' 
        }, undefined, Date.now() - step10Start);
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
        
        updateStepStatus(9, 'completed', qwenVLData, undefined, Date.now() - step10Start);
      }
      */
      // Manually mark step 9 as completed (skipped)
      const step10Start = Date.now(); // Keep timer for consistency if needed, or remove
      updateStepStatus(9, 'completed', { 
        skipped: true, 
        reason: 'QWEN VL review step manually commented out' 
      }, undefined, Date.now() - step10Start);


      // Step 11: Generate Videos using WAN (runs regardless of QWEN VL review)
      /*
      updateStepStatus(10, 'processing');
      const step11Start = Date.now();
      
      // Temporarily skip WAN video generation due to endpoint issues
      console.log('Skipping WAN video generation due to endpoint issues');
      updateStepStatus(10, 'completed', { 
        skipped: true, 
        reason: 'WAN video generation temporarily disabled due to endpoint issues' 
      }, undefined, Date.now() - step11Start);

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
        
        updateStepStatus(10, 'completed', wanData, undefined, Date.now() - step11Start);
      } else {
        console.warn('No images available for video generation');
        updateStepStatus(10, 'completed', { 
          skipped: true, 
          reason: 'No images available for video generation' 
        }, undefined, Date.now() - step11Start);
      }
      */

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
        <strong>Enhanced with Vision Understanding!</strong> Choose between Script Mode (legacy) or Vision Mode (enhanced) for input. 
        This workflow will: 1) Understand your creative vision and generate audio, 2) Transcribe the audio using Nvidia, 
        3) Generate cut points using the Producer Agent, 4) Generate creative vision using the Director Agent,
        5) Generate cinematography directions using the DoP Agent, 6) Generate image prompts using the Prompt Engineer Agent,
        7) Generate images using ComfyUI (FLUX model). Steps 8-10 (image review, video generation) are commented out. 
        Vision Mode provides richer creative context to all agents for better results.
      </p>
      
      {(folderId || runId) && (
        <div className={styles.projectInfo}>
          {folderId && <p><strong>Project ID:</strong> {folderId}</p>}
          {runId && <p><strong>Run ID:</strong> {runId}</p>}
          {runId && <p><strong>Outputs saved to:</strong> /public/run-{runId}/</p>}
        </div>
      )}
      
      {conversationMode && (
        <div className={styles.conversationModeInfo}>
          <h2>🤖 Conversation Mode</h2>
          <p>{preGeneratedScript ? 'Script loaded from your conversation!' : 'Generating script from your conversation...'}</p>
          {isGeneratingScript && (
            <div className={styles.generatingScript}>
              <div className={styles.loadingSpinner}></div>
              <span>Analyzing conversation and generating script...</span>
            </div>
          )}
          {conversationAnalyzed && (
            <div className={styles.scriptGenerated}>
              ✅ Script generated successfully from your conversation!
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.form}>
        {/* NEW: Mode Toggle */}
        <div className={styles.inputGroup}>
          <label className={styles.label}>Input Mode:</label>
          <div className={styles.modeToggle}>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="inputMode"
                checked={!useVisionMode}
                onChange={() => setUseVisionMode(false)}
                disabled={loading || isGeneratingScript}
              />
              Script Mode (Legacy)
            </label>
            <label className={styles.radioLabel}>
              <input
                type="radio"
                name="inputMode"
                checked={useVisionMode}
                onChange={() => setUseVisionMode(true)}
                disabled={loading || isGeneratingScript}
              />
              Vision Mode (Enhanced)
            </label>
          </div>
        </div>

        {/* Script Mode Input (Existing) */}
        {!useVisionMode && (
          <>
            <div className={styles.inputGroup}>
              <label htmlFor="script" className={styles.label}>
                {conversationMode ? 'Generated Script:' : 'Enter Script:'}
              </label>
              <textarea
                id="script"
                value={script}
                onChange={(e) => setScript(e.target.value)}
                className={styles.textarea}
                rows={5}
                placeholder={conversationMode ? "Script will be generated from your conversation..." : "Enter your script here..."}
                required
                disabled={loading || isGeneratingScript}
                readOnly={conversationMode && !conversationAnalyzed}
              />
            </div>

            {/* NEW: Script Mode Preferences (parallel to Vision Mode) */}
            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="scriptStyle" className={styles.label}>Visual Style</label>
                <select
                  id="scriptStyle"
                  value={scriptFormData.style}
                  onChange={(e) => setScriptFormData({...scriptFormData, style: e.target.value as typeof scriptFormData.style})}
                  className={styles.select}
                  disabled={loading || isGeneratingScript}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="artistic">Artistic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="scriptPacing" className={styles.label}>Pacing</label>
                <select
                  id="scriptPacing"
                  value={scriptFormData.pacing}
                  onChange={(e) => setScriptFormData({...scriptFormData, pacing: e.target.value as typeof scriptFormData.pacing})}
                  className={styles.select}
                  disabled={loading || isGeneratingScript}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="scriptContentType" className={styles.label}>Content Type</label>
                <select
                  id="scriptContentType"
                  value={scriptFormData.contentType}
                  onChange={(e) => setScriptFormData({...scriptFormData, contentType: e.target.value})}
                  className={styles.select}
                  disabled={loading || isGeneratingScript}
                >
                  <option value="general">General</option>
                  <option value="educational">Educational</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="abstract">Abstract</option>
                </select>
              </div>
            </div>
          </>
        )}

        {/* NEW: Vision Mode Input */}
        {useVisionMode && (
          <>
            <div className={styles.inputGroup}>
              <label htmlFor="concept" className={styles.label}>
                Video Concept *
              </label>
              <textarea
                id="concept"
                value={visionFormData.concept}
                onChange={(e) => setVisionFormData({...visionFormData, concept: e.target.value})}
                className={styles.textarea}
                rows={4}
                placeholder="Describe your creative vision (e.g., 'A mysterious figure walking through an abandoned city at dusk, exploring themes of isolation and hope...')"
                required
                disabled={loading || isGeneratingScript}
              />
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="style" className={styles.label}>Visual Style</label>
                <select
                  id="style"
                  value={visionFormData.style}
                  onChange={(e) => setVisionFormData({...visionFormData, style: e.target.value as VisionFormData['style']})}
                  className={styles.select}
                  disabled={loading || isGeneratingScript}
                >
                  <option value="cinematic">Cinematic</option>
                  <option value="documentary">Documentary</option>
                  <option value="artistic">Artistic</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="pacing" className={styles.label}>Pacing</label>
                <select
                  id="pacing"
                  value={visionFormData.pacing}
                  onChange={(e) => setVisionFormData({...visionFormData, pacing: e.target.value as VisionFormData['pacing']})}
                  className={styles.select}
                  disabled={loading || isGeneratingScript}
                >
                  <option value="slow">Slow</option>
                  <option value="medium">Medium</option>
                  <option value="fast">Fast</option>
                </select>
              </div>
            </div>

            <div className={styles.row}>
              <div className={styles.inputGroup}>
                <label htmlFor="duration" className={styles.label}>Duration (seconds)</label>
                <input
                  type="number"
                  id="duration"
                  value={visionFormData.duration}
                  onChange={(e) => setVisionFormData({...visionFormData, duration: parseInt(e.target.value)})}
                  min="10"
                  max="300"
                  className={styles.input}
                  disabled={loading || isGeneratingScript}
                />
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="contentType" className={styles.label}>Content Type</label>
                <select
                  id="contentType"
                  value={visionFormData.contentType}
                  onChange={(e) => setVisionFormData({...visionFormData, contentType: e.target.value as VisionFormData['contentType']})}
                  className={styles.select}
                  disabled={loading || isGeneratingScript}
                >
                  <option value="general">General</option>
                  <option value="educational">Educational</option>
                  <option value="storytelling">Storytelling</option>
                  <option value="abstract">Abstract</option>
                </select>
              </div>
            </div>
          </>
        )}
        
        <button 
          type="submit" 
          className={styles.button}
          disabled={loading || isGeneratingScript || (conversationMode && !conversationAnalyzed) || (useVisionMode && !visionFormData.concept.trim())}
        >
          {loading ? 'Processing Workflow...' : 
           isGeneratingScript ? 'Generating Script...' : 
           useVisionMode ? 'Start Vision-Enhanced Workflow' : 'Start Complete Workflow'}
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
        {/* NEW: Vision Document Display (when in vision mode) */}
        {visionDocument && (
          <div className={styles.result}>
            <h2>1. Vision Understanding:</h2>
            <div className={styles.visionResult}>
              <div className={styles.resultGrid}>
                <div className={styles.resultItem}>
                  <strong>Core Concept:</strong>
                  <p>{visionDocument.core_concept}</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Emotion Arc:</strong>
                  <p>{visionDocument.emotion_arc?.join(' → ')}</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Visual Style:</strong>
                  <p>{visionDocument.visual_style}</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Pacing:</strong>
                  <p>{visionDocument.pacing}</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Duration:</strong>
                  <p>{visionDocument.duration} seconds</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Content Type:</strong>
                  <p>{visionDocument.content_classification?.type}</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Visual Complexity:</strong>
                  <p>{visionDocument.visual_complexity}</p>
                </div>
                <div className={styles.resultItem}>
                  <strong>Color Philosophy:</strong>
                  <p>{visionDocument.color_philosophy}</p>
                </div>
              </div>
              
              {/* Display audio optimization details if available */}
              {visionDocument.narration_optimization && (
                <div className={styles.audioOptimization}>
                  <h3>Audio Optimization:</h3>
                  <div className={styles.resultGrid}>
                    <div className={styles.resultItem}>
                      <strong>Vocal Style:</strong>
                      <p>{visionDocument.narration_optimization.vocal_style}</p>
                    </div>
                    <div className={styles.resultItem}>
                      <strong>Audio-Visual Sync:</strong>
                      <p>{visionDocument.narration_optimization.audio_visual_sync}</p>
                    </div>
                    <div className={styles.resultItem}>
                      <strong>Emphasis Points:</strong>
                      <p>{visionDocument.narration_optimization.emphasis_points.join(', ')}</p>
                    </div>
                    <div className={styles.resultItem}>
                      <strong>Natural Pauses:</strong>
                      <p>{visionDocument.narration_optimization.natural_pauses.join(', ')}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: Vision Agent Raw Output */}
        {visionAgentResult && (
          <div className={styles.result}>
            <h2>1b. Vision Agent Output (Raw):</h2>
            <div className={styles.visionAgentResult}>
              {visionAgentResult.success && (
                <>
                  <div className={styles.executionStats}>
                    <h3>Execution Stats:</h3>
                    <div className={styles.statsGrid}>
                      <div>
                        <strong>Execution Time:</strong> {(visionAgentResult as any).executionTime as number}ms
                      </div>
                      <div>
                        <strong>Pipeline Ready:</strong> {(visionAgentResult as any).pipeline_ready ? '✅ Yes' : '❌ No'}
                      </div>
                      <div>
                        <strong>Needs Clarification:</strong> {(visionAgentResult as any).needs_clarification ? '⚠️ Yes' : '✅ No'}
                      </div>
                      <div>
                        <strong>Pipeline Type:</strong> {((visionAgentResult as any).pipeline_type as string) || 'audio_enhanced'}
                      </div>
                    </div>
                  </div>

                  {(visionAgentResult as any).validation && (
                    <div className={styles.validationStats}>
                      <h3>Validation Scores:</h3>
                      <div className={styles.statsGrid}>
                        <div>
                          <strong>Audio-Visual Coherence:</strong> {(((visionAgentResult as any).validation as Record<string, unknown>).audio_visual_coherence as number * 100).toFixed(1)}%
                        </div>
                        <div>
                          <strong>Narration Quality:</strong> {(((visionAgentResult as any).validation as Record<string, unknown>).narration_quality_score as number * 100).toFixed(1)}%
                        </div>
                        <div>
                          <strong>Concept Specificity:</strong> {(((visionAgentResult as any).validation as Record<string, unknown>).concept_specificity_score as number * 100).toFixed(1)}%
                        </div>
                        <div>
                          <strong>Emotional Coherence:</strong> {(((visionAgentResult as any).validation as Record<string, unknown>).emotional_coherence_score as number * 100).toFixed(1)}%
                        </div>
                        <div>
                          <strong>Technical Completeness:</strong> {(((visionAgentResult as any).validation as Record<string, unknown>).technical_completeness_score as number * 100).toFixed(1)}%
                        </div>
                      </div>
                      {(visionAgentResult as any).validation.issues && (visionAgentResult as any).validation.issues.length > 0 && (
                        <div className={styles.validationIssues}>
                          <h4>Issues:</h4>
                          {(visionAgentResult as any).validation.issues.map((issue: any, index: any) => (
                            <div key={index} className={styles.issueItem}>
                              ⚠️ {issue}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {(visionAgentResult as any).stage1_vision_analysis?.audio_optimization && (
                    <div className={styles.audioOptimizationRaw}>
                      <h3>Audio Optimization Analysis:</h3>
                      <div className={styles.statsGrid}>
                        <div>
                          <strong>Concept Speakability:</strong> {(visionAgentResult as any).stage1_vision_analysis.audio_optimization.concept_speakability}
                        </div>
                        <div>
                          <strong>Vocal Performance Potential:</strong> {(visionAgentResult as any).stage1_vision_analysis.audio_optimization.vocal_performance_potential}
                        </div>
                        <div>
                          <strong>TTS Friendliness:</strong> {(visionAgentResult as any).stage1_vision_analysis.audio_optimization.tts_friendliness}
                        </div>
                        <div>
                          <strong>Recommended Voice:</strong> {(visionAgentResult as any).stage1_vision_analysis.audio_optimization.recommended_voice_characteristics}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* NEW: Agent-Specific Instructions Display */}
                  {(visionAgentResult as any).stage1_vision_analysis?.agent_instructions && (
                    <div className={styles.agentInstructions}>
                      <h3>🎭 Agent-Specific Instructions from Vision Agent:</h3>
                      
                      {/* Producer Instructions */}
                      {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.producer_instructions && (
                        <div className={styles.agentInstructionSection}>
                          <h4>📽️ Producer Agent Instructions:</h4>
                          <div className={styles.instructionContent}>
                            <div><strong>Target Cut Timing:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.producer_instructions.target_cut_timing}</div>
                            <div><strong>Audio Analysis Enhancement:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.producer_instructions.audio_analysis_enhancement}</div>
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.producer_instructions.pacing_rules && (
                              <div>
                                <strong>Pacing Rules:</strong>
                                <ul>
                                  {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.producer_instructions.pacing_rules.map((rule: any, index: any) => (
                                    <li key={index}>{rule}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Director Instructions */}
                      {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions && (
                        <div className={styles.agentInstructionSection}>
                          <h4>🎬 Director Agent Instructions:</h4>
                          <div className={styles.instructionContent}>
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.scene_direction_philosophy && (
                              <div><strong>Scene Direction Philosophy:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.scene_direction_philosophy}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.emotional_architecture && (
                              <div><strong>Emotional Architecture:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.emotional_architecture}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.character_relationship_dynamics && (
                              <div><strong>Character Dynamics:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.character_relationship_dynamics}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.visual_storytelling_mastery && (
                              <div><strong>Visual Storytelling:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.visual_storytelling_mastery}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.pacing_and_rhythm_guidance && (
                              <div><strong>Pacing & Rhythm:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.pacing_and_rhythm_guidance}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.environmental_integration && (
                              <div><strong>Environmental Integration:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.director_instructions.environmental_integration}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* DoP Instructions */}
                      {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions && (
                        <div className={styles.agentInstructionSection}>
                          <h4>📹 DoP Agent Instructions:</h4>
                          <div className={styles.instructionContent}>
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions.lighting_philosophy && (
                              <div><strong>Lighting Philosophy:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions.lighting_philosophy}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions.movement_style && (
                              <div><strong>Movement Style:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions.movement_style}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions.artistic_style_support && (
                              <div><strong>Artistic Style Support:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.dop_instructions.artistic_style_support}</div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Prompt Engineer Instructions */}
                      {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions && (
                        <div className={styles.agentInstructionSection}>
                          <h4>✍️ Prompt Engineer Agent Instructions:</h4>
                          <div className={styles.instructionContent}>
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.character_requirements && (
                              <div><strong>Character Requirements:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.character_requirements}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.setting_details && (
                              <div><strong>Setting Details:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.setting_details}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.technical_specifications && (
                              <div><strong>Technical Specs:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.technical_specifications}</div>
                            )}
                            {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.artistic_style_enforcement && (
                              <div><strong>Artistic Style:</strong> {(visionAgentResult as any).stage1_vision_analysis.agent_instructions.prompt_engineer_instructions.artistic_style_enforcement}</div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {(visionAgentResult as any).rawResponse && (
                    <div className={styles.rawResponse}>
                      <h3>Raw Agent Response:</h3>
                      <pre className={styles.rawResponseText}>
                        {(visionAgentResult as any).rawResponse}
                      </pre>
                    </div>
                  )}
                </>
              )}

              {!(visionAgentResult as any).success && (visionAgentResult as any).error && (
                <div className={styles.visionAgentError}>
                  <strong>Vision Agent Error:</strong> {(visionAgentResult as any).error}
                </div>
              )}
            </div>
          </div>
        )}

        {/* NEW: Original Narration Script Display */}
        {narrationScript && (
          <div className={styles.result}>
            <h2>1c. Original Narration Script (from Vision Agent):</h2>
            <div className={styles.narrationScript}>
              <p><strong>This is the complete story script generated by the vision agent:</strong></p>
              <div className={styles.scriptContent}>
                {narrationScript}
              </div>
              <p className={styles.scriptNote}>
                <em>This script was then formatted by Google Gemini for optimal TTS delivery (see next section).</em>
              </p>
            </div>
          </div>
        )}

        {formattedScript && (
          <div className={styles.result}>
            <h2>{visionDocument ? '2. Formatted Script (for TTS):' : '1. Formatted Script:'}</h2>
            <div className={styles.formattedScript}>
              {formattedScript}
            </div>
            {visionDocument && (
              <p className={styles.visionNote}>
                <em>Script optimized from narration script: &ldquo;{narrationScript?.substring(0, 100)}...&rdquo;</em>
              </p>
            )}
          </div>
        )}
        
        {audioUrl && (
          <div className={styles.result}>
            <h2>{visionDocument ? '3. Generated Audio (from Vision):' : '2. Generated Audio:'}</h2>
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
            <h2>{visionDocument ? '4. Audio Transcription:' : '3. Audio Transcription:'}</h2>
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
            <h2>{visionDocument ? '5. Producer Agent Cut Points:' : '4. Producer Agent Cut Points:'}</h2>
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
                                <td>{cut.cut_time_s}</td>
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

        {/* Enhanced Script Mode Producer Results */}
        {enhancedProducerResult && (
          <div className={styles.result}>
            <h2>4. Enhanced Script Producer Cut Points:</h2>
            <div className={styles.producerResult}>
              <div className={styles.executionStats}>
                <h3>Execution Stats:</h3>
                <div className={styles.statsGrid}>
                  <div>
                    <strong>Cut Count:</strong> {enhancedProducerResult.producer_output?.cut_count || 'N/A'}
                  </div>
                  <div>
                    <strong>Total Duration:</strong> {enhancedProducerResult.producer_output?.total_duration_s || 'N/A'}s
                  </div>
                  <div>
                    <strong>Target Duration:</strong> {enhancedProducerResult.producer_output?.target_duration_s || 'N/A'}s
                  </div>
                  <div>
                    <strong>Pacing Compliance:</strong> {enhancedProducerResult.producer_output?.pacing_compliance ? '✅ Yes' : '❌ No'}
                  </div>
                  <div>
                    <strong>Execution Time:</strong> {enhancedProducerResult.execution_time_ms}ms
                  </div>
                </div>
              </div>
              
              {enhancedProducerResult.producer_output?.cut_points && (
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
                        {enhancedProducerResult.producer_output.cut_points.map((cut: any) => (
                          <tr key={cut.cut_number}>
                            <td>{cut.cut_number}</td>
                            <td>{cut.cut_time_s}</td>
                            <td>{cut.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {enhancedProducerResult.rawResponse && (
                <div className={styles.rawResponse}>
                  <h3>Raw Response:</h3>
                  <pre className={styles.rawResponseText}>
                    {enhancedProducerResult.rawResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {directorResult && (
          <div className={styles.result}>
            <h2>{visionDocument ? '6. Director Agent Creative Vision:' : '5. Director Agent Creative Vision:'}</h2>
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
            <h2>{visionDocument ? '7. DoP Agent Cinematography:' : '6. DoP Agent Cinematography:'}</h2>
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

        {/* Enhanced Script Mode Director Results */}
        {enhancedDirectorResult && (
          <div className={styles.result}>
            <h2>5. Enhanced Script Director Creative Vision:</h2>
            <div className={styles.directorResult}>
              <div className={styles.executionStats}>
                <h3>Execution Stats:</h3>
                <div className={styles.statsGrid}>
                  <div>
                    <strong>Beat Count:</strong> {enhancedDirectorResult.director_output?.narrative_beats?.length || 'N/A'}
                  </div>
                  <div>
                    <strong>User Style Applied:</strong> {enhancedDirectorResult.director_output?.project_metadata?.user_visual_style || 'N/A'}
                  </div>
                  <div>
                    <strong>Execution Time:</strong> {enhancedDirectorResult.execution_time_ms}ms
                  </div>
                  <div>
                    <strong>Parsing Status:</strong> {enhancedDirectorResult.parsingStatus || 'N/A'}
                  </div>
                </div>
              </div>

              {enhancedDirectorResult.director_output?.narrative_beats && (
                <div className={styles.narrativeBeats}>
                  <h3>Narrative Beats:</h3>
                  <div className={styles.beatsList}>
                    {enhancedDirectorResult.director_output.narrative_beats.map((beat: any, index: number) => (
                      <div key={index} className={styles.beatItem}>
                        <div className={styles.beatNumber}>Beat {index + 1}:</div>
                        <div className={styles.beatContent}>
                          <div><strong>Creative Vision:</strong> {beat.creative_vision}</div>
                          <div><strong>Emotion:</strong> {beat.emotion}</div>
                          <div><strong>Narrative Function:</strong> {beat.narrative_function}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enhancedDirectorResult.rawResponse && (
                <div className={styles.rawResponse}>
                  <h3>Raw Response:</h3>
                  <pre className={styles.rawResponseText}>
                    {enhancedDirectorResult.rawResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Script Mode DoP Results */}
        {enhancedDopResult && (
          <div className={styles.result}>
            <h2>6. Enhanced Script DoP Cinematography:</h2>
            <div className={styles.dopResult}>
              <div className={styles.executionStats}>
                <h3>Execution Stats:</h3>
                <div className={styles.statsGrid}>
                  <div>
                    <strong>Shot Count:</strong> {Array.isArray(enhancedDopResult.dop_output) ? enhancedDopResult.dop_output.length : 'N/A'}
                  </div>
                  <div>
                    <strong>Style Consistency:</strong> {enhancedDopResult.dop_output?.[0]?.style_notes ? 'Present' : 'Missing'}
                  </div>
                  <div>
                    <strong>Execution Time:</strong> {enhancedDopResult.execution_time_ms}ms
                  </div>
                  <div>
                    <strong>Parsing Status:</strong> {enhancedDopResult.parsingStatus || 'N/A'}
                  </div>
                </div>
              </div>

              {Array.isArray(enhancedDopResult.dop_output) && (
                <div className={styles.cinematographyShots}>
                  <h3>Cinematography Shots:</h3>
                  <div className={styles.shotsList}>
                    {enhancedDopResult.dop_output.map((shot: any, index: number) => (
                      <div key={index} className={styles.shotItem}>
                        <div className={styles.shotNumber}>Shot {index + 1}:</div>
                        <div className={styles.shotContent}>
                          <div><strong>Shot Type:</strong> {shot.shot_type}</div>
                          <div><strong>Camera Movement:</strong> {shot.camera_movement}</div>
                          <div><strong>Lighting:</strong> {shot.lighting}</div>
                          <div><strong>Style Notes:</strong> {shot.style_notes}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enhancedDopResult.rawResponse && (
                <div className={styles.rawResponse}>
                  <h3>Raw Response:</h3>
                  <pre className={styles.rawResponseText}>
                    {enhancedDopResult.rawResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Enhanced Script Mode Prompt Engineer Results */}
        {enhancedPromptEngineerResult && (
          <div className={styles.result}>
            <h2>7. Enhanced Script Prompt Engineer Image Prompts:</h2>
            <div className={styles.promptEngineerResult}>
              <div className={styles.executionStats}>
                <h3>Execution Stats:</h3>
                <div className={styles.statsGrid}>
                  <div>
                    <strong>Prompt Count:</strong> {enhancedPromptEngineerResult.prompt_count || enhancedPromptEngineerResult.prompts?.length || enhancedPromptEngineerResult.promptEngineerOutput?.prompts?.length || enhancedPromptEngineerResult.promptsOutput?.length || 'N/A'}
                  </div>
                  <div>
                    <strong>Style Applied:</strong> {enhancedPromptEngineerResult.style_applied || 'N/A'}
                  </div>
                  <div>
                    <strong>Execution Time:</strong> {enhancedPromptEngineerResult.execution_time_ms}ms
                  </div>
                  <div>
                    <strong>Parsing Status:</strong> {enhancedPromptEngineerResult.parsingStatus || 'Text extraction used'}
                  </div>
                </div>
              </div>

              {(enhancedPromptEngineerResult.prompts || enhancedPromptEngineerResult.promptEngineerOutput?.prompts || enhancedPromptEngineerResult.promptsOutput) && (
                <div className={styles.promptEngineerOutput}>
                  <h3>Generated Image Prompts:</h3>
                  <div className={styles.promptsList}>
                    {(enhancedPromptEngineerResult.prompts || enhancedPromptEngineerResult.promptEngineerOutput?.prompts || enhancedPromptEngineerResult.promptsOutput || []).map((prompt: string, index: number) => (
                      <div key={index} className={styles.promptItem}>
                        <div className={styles.promptNumber}>Prompt {index + 1}:</div>
                        <div className={styles.promptText}>{prompt}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {enhancedPromptEngineerResult.rawResponse && (
                <div className={styles.rawResponse}>
                  <h3>Raw Response:</h3>
                  <pre className={styles.rawResponseText}>
                    {enhancedPromptEngineerResult.rawResponse}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}

        {promptEngineerResult && (
          <div className={styles.result}>
            <h2>{visionDocument ? '8. Prompt Engineer Image Prompts:' : '7. Prompt Engineer Image Prompts:'}</h2>
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

        {(generatedImages && generatedImages.length > 0) || imageGenerationProgress.isGenerating ? (
          <div className={styles.result}>
            <h2>{visionDocument ? '9. Generated Images (ComfyUI):' : '8. Generated Images (ComfyUI):'}</h2>
            <div className={styles.generatedImagesResult}>
              <div className={styles.executionStats}>
                <h3>Image Generation Stats:</h3>
                <div className={styles.statsGrid}>
                  <div>
                    <strong>Progress:</strong> {imageGenerationProgress.currentIndex}/{imageGenerationProgress.totalImages} ({imageGenerationProgress.percentage}%)
                  </div>
                  {imageGenerationProgress.message && (
                    <div>
                      <strong>Status:</strong> {imageGenerationProgress.message}
                    </div>
                  )}
                </div>
                {imageGenerationProgress.isGenerating && (
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${imageGenerationProgress.percentage}%` }}
                    />
                  </div>
                )}
              </div>

              <div className={styles.imagesGrid}>
                {generatedImages.map((imageUrl, index) => (
                  <div key={index} className={styles.imageContainer}>
                    {imageUrl ? (
                      <>
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
                      </>
                    ) : (
                      <div className={styles.imagePlaceholder}>
                        <div className={styles.placeholderContent}>
                          {index < imageGenerationProgress.currentIndex ? (
                            <>
                              <div className={styles.spinner}></div>
                              <p>Processing image {index + 1}...</p>
                            </>
                          ) : (
                            <p>Waiting for image {index + 1}</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {qwenVLResult && (
          <div className={styles.result}>
            <h2>{visionDocument ? '10. Image Review (QWEN VL Agent):' : '9. Image Review (QWEN VL Agent):'}</h2>
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
            <h2>{visionDocument ? '11. Generated Videos (WAN):' : '10. Generated Videos (WAN):'}</h2>
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
