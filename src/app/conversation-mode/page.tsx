'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';
import VideoTypeSelector from './components/VideoTypeSelector';
import PipelineProgress from './components/PipelineProgress';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ExtractedRequirements {
  hasMusic: boolean | null;
  hasNarration: boolean | null;
  duration: number | null;
  style: string | null;
  pacing: string | null;
  artisticStyle: string | null;
  concept: string | null;
}

interface PipelineStage {
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
}

interface PipelineState {
  isRunning: boolean;
  pipeline: string | null;
  stages: PipelineStage[];
  currentStage: string | null;
  generatedImages: string[];
  imageGenerationProgress: {
    currentIndex: number;
    totalImages: number;
    percentage: number;
    isGenerating: boolean;
    message: string;
  };
  error: string | null;
  sessionId: string | null;
}

export default function ConversationMode() {
  const [showVideoTypeSelector, setShowVideoTypeSelector] = useState(true);
  const [selectedVideoType, setSelectedVideoType] = useState<'music_only' | 'voiceover_music' | 'pure_visuals' | null>(null);
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi there! I'm here to help you turn your idea into a short dramatic video. What's your idea?",
      timestamp: new Date()
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [canProceed, setCanProceed] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [debugMode, setDebugMode] = useState(false);
  const [agentResponses, setAgentResponses] = useState<Record<string, any>>({});

  // Image generation monitoring function
  const startImageGenerationMonitoring = (folderId: string, expectedCount: number) => {
    setPipelineState(prev => ({
      ...prev,
      imageGenerationProgress: {
        currentIndex: 0,
        totalImages: expectedCount,
        percentage: 0,
        isGenerating: true,
        message: `🎨 Generating ${expectedCount} images...`
      }
    }));

    const monitorInterval = setInterval(async () => {
      try {
        // Check for newly generated images in the public directory
        const response = await fetch('/api/scan-generated-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ folderId })
        });
        
        if (response.ok) {
          const data = await response.json();
          const newImages = data.images || [];
          
          setPipelineState(prev => {
            const currentImages = prev.generatedImages;
            const addedImages = newImages.filter((img: string) => !currentImages.includes(img));
            
            if (addedImages.length > 0) {
              const updatedImages = [...currentImages, ...addedImages];
              const progress = Math.min(100, (updatedImages.length / expectedCount) * 100);
              
              console.log(`🖼️ Found ${addedImages.length} new images (${updatedImages.length}/${expectedCount})`);
              
              return {
                ...prev,
                generatedImages: updatedImages,
                imageGenerationProgress: {
                  currentIndex: updatedImages.length,
                  totalImages: expectedCount,
                  percentage: progress,
                  isGenerating: updatedImages.length < expectedCount,
                  message: updatedImages.length >= expectedCount 
                    ? `✅ Generated all ${expectedCount} images!`
                    : `🎨 Generated ${updatedImages.length}/${expectedCount} images...`
                }
              };
            }
            
            return prev;
          });
        }
      } catch (error) {
        console.error('Error monitoring image generation:', error);
      }
    }, 2000); // Check every 2 seconds

    // Clear monitoring after 10 minutes (failsafe)
    setTimeout(() => {
      clearInterval(monitorInterval);
      setPipelineState(prev => ({
        ...prev,
        imageGenerationProgress: {
          ...prev.imageGenerationProgress,
          isGenerating: false,
          message: prev.generatedImages.length > 0 
            ? `✅ Generated ${prev.generatedImages.length} images`
            : '⚠️ Image generation monitoring timeout'
        }
      }));
    }, 600000);
  };

  const [extractedRequirements, setExtractedRequirements] = useState<ExtractedRequirements>({
    hasMusic: null,
    hasNarration: null,
    duration: null,
    style: null,
    pacing: null,
    artisticStyle: null,
    concept: null
  });
  
  // Music upload state
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioFileName, setAudioFileName] = useState<string>('');
  const [musicUploadError, setMusicUploadError] = useState<string | null>(null);
  
  // Pipeline execution state
  const [pipelineState, setPipelineState] = useState<PipelineState>({
    isRunning: false,
    pipeline: null,
    stages: [],
    currentStage: null,
    generatedImages: [],
    imageGenerationProgress: {
      currentIndex: 0,
      totalImages: 0,
      percentage: 0,
      isGenerating: false,
      message: ''
    },
    error: null,
    sessionId: null
  });

  const handleVideoTypeSelect = (type: 'music_only' | 'voiceover_music' | 'pure_visuals') => {
    console.log('🎯 ConversationMode: handleVideoTypeSelect called with type:', type);
    console.log('🎯 Current showVideoTypeSelector state:', showVideoTypeSelector);
    
    setSelectedVideoType(type);
    setShowVideoTypeSelector(false);
    
    console.log('🎯 Called setShowVideoTypeSelector(false)');
    
    // Update requirements based on selection
    const updatedRequirements = { ...extractedRequirements };
    
    switch (type) {
      case 'music_only':
        updatedRequirements.hasMusic = true;
        updatedRequirements.hasNarration = false;
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Great! Let's create an amazing music video. Tell me about your concept and the music you'll be using.",
          timestamp: new Date()
        }]);
        break;
      case 'voiceover_music':
        updatedRequirements.hasMusic = true;
        updatedRequirements.hasNarration = true;
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Perfect! We'll create a narrated video with background music. What story would you like to tell?",
          timestamp: new Date()
        }]);
        break;
      case 'pure_visuals':
        updatedRequirements.hasMusic = false;
        updatedRequirements.hasNarration = false;
        setMessages([{
          id: '1',
          role: 'assistant',
          content: "Excellent choice! Let's create a powerful visual story without audio. What concept do you have in mind?",
          timestamp: new Date()
        }]);
        break;
    }
    
    setExtractedRequirements(updatedRequirements);
  };

  // Add state for music analysis
  const [musicAnalysis, setMusicAnalysis] = useState<any>(null);
  const [isAnalyzingMusic, setIsAnalyzingMusic] = useState(false);

  const handleAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/aac'];
      if (!allowedTypes.includes(file.type)) {
        setMusicUploadError(`Unsupported file type: ${file.type}. Please use MP3, WAV, MP4, or AAC files.`);
        return;
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024; // 50MB
      if (file.size > maxSize) {
        setMusicUploadError(`File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 50MB.`);
        return;
      }

      setAudioFile(file);
      setAudioFileName(file.name);
      setMusicUploadError(null);
      setIsAnalyzingMusic(true);
      
      try {
        // Analyze the music file on the client-side
        console.log('🎵 Starting client-side music analysis...');
        const analysis = await analyzeAudioFileClientSide(file);
        setMusicAnalysis(analysis);
        console.log('✅ Music analysis complete:', analysis);
        
        // Update requirements to show music is available
        setExtractedRequirements(prev => ({ ...prev, hasMusic: true }));
        
      } catch (error) {
        console.error('❌ Music analysis failed:', error);
        setMusicUploadError('Failed to analyze audio file. Please try a different file.');
        setAudioFile(null);
        setAudioFileName('');
      } finally {
        setIsAnalyzingMusic(false);
      }
    }
  };

  // Client-side music analysis function
  const analyzeAudioFileClientSide = async (file: File) => {
    console.log(`Analyzing ${file.name} (${(file.size / 1024 / 1024).toFixed(1)}MB)...`);
    
    try {
      // Check if Web Audio API is supported
      if (!window.AudioContext && !(window as any).webkitAudioContext) {
        throw new Error('Web Audio API not supported in this browser');
      }
      
      // Create audio context
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Load and decode audio file
      const arrayBuffer = await file.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    
      const duration = audioBuffer.duration;
      const sampleRate = audioBuffer.sampleRate;
      const channelData = audioBuffer.getChannelData(0);
      
      console.log(`Audio properties: ${duration.toFixed(1)}s, ${sampleRate}Hz`);
      
      // Perform basic analysis
      const bpm = estimateBPM(channelData, sampleRate);
      const beats = generateBeatsFromBPM(bpm, duration);
      const downbeats = generateDownbeatsFromBeats(beats);
      const intensityCurve = calculateIntensityCurve(channelData, sampleRate);
      const naturalCutPoints = findNaturalCutPoints(intensityCurve, duration);
      
      // Close audio context to free resources
      audioContext.close();
      
      return {
        trackMetadata: {
          source: 'upload',
          title: file.name,
          duration: duration
        },
        musicAnalysis: {
          bpm: bpm,
          beats: beats,
          downbeats: downbeats,
          sections: {
            intro: [0, Math.min(15, duration * 0.1)],
            main: [Math.min(15, duration * 0.1), duration * 0.85],
            outro: [duration * 0.85, duration]
          },
          intensityCurve: intensityCurve,
          emotionalPeaks: findEmotionalPeaks(intensityCurve, duration),
          phraseBoundaries: generatePhraseBoundaries(duration),
          naturalCutPoints: naturalCutPoints,
          totalDuration: duration
        }
      };
      
    } catch (error) {
      console.error('Audio analysis failed:', error);
      throw new Error(`Failed to analyze audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Simple BPM estimation using autocorrelation
  const estimateBPM = (audioData: Float32Array, sampleRate: number): number => {
    const windowSize = Math.floor(sampleRate * 2); // 2-second windows
    const numWindows = Math.floor(audioData.length / windowSize);
    const bpmEstimates: number[] = [];
    
    for (let i = 0; i < Math.min(numWindows, 5); i++) {
      const start = i * windowSize;
      const window = audioData.slice(start, start + windowSize);
      const bpm = analyzeWindowForBPM(window, sampleRate);
      if (bpm > 60 && bpm < 200) {
        bpmEstimates.push(bpm);
      }
    }
    
    // Return median BPM or default
    if (bpmEstimates.length === 0) return 120;
    bpmEstimates.sort((a, b) => a - b);
    return bpmEstimates[Math.floor(bpmEstimates.length / 2)];
  };

  const analyzeWindowForBPM = (window: Float32Array, sampleRate: number): number => {
    // Simple energy-based beat detection
    const hopSize = 512;
    const energyValues: number[] = [];
    
    for (let i = 0; i < window.length - hopSize; i += hopSize) {
      const segment = window.slice(i, i + hopSize);
      const energy = segment.reduce((sum, val) => sum + val * val, 0) / segment.length;
      energyValues.push(energy);
    }
    
    // Find peaks in energy
    const peaks: number[] = [];
    const threshold = Math.max(...energyValues) * 0.6;
    
    for (let i = 1; i < energyValues.length - 1; i++) {
      if (energyValues[i] > energyValues[i-1] && 
          energyValues[i] > energyValues[i+1] && 
          energyValues[i] > threshold) {
        peaks.push(i);
      }
    }
    
    if (peaks.length < 2) return 120;
    
    // Calculate average interval between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
      intervals.push(peaks[i] - peaks[i-1]);
    }
    
    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const timePerHop = hopSize / sampleRate;
    const beatInterval = avgInterval * timePerHop;
    
    return Math.round(60 / beatInterval);
  };

  const generateBeatsFromBPM = (bpm: number, duration: number): number[] => {
    const beatInterval = 60 / bpm;
    const beats: number[] = [];
    for (let time = 0; time < duration; time += beatInterval) {
      beats.push(time);
    }
    return beats;
  };

  const generateDownbeatsFromBeats = (beats: number[]): number[] => {
    return beats.filter((_, index) => index % 4 === 0);
  };

  const calculateIntensityCurve = (audioData: Float32Array, sampleRate: number): number[] => {
    const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
    const curve: number[] = [];
    
    for (let i = 0; i < audioData.length; i += windowSize) {
      const window = audioData.slice(i, Math.min(i + windowSize, audioData.length));
      const rms = Math.sqrt(window.reduce((sum, val) => sum + val * val, 0) / window.length);
      curve.push(rms);
    }
    
    return curve;
  };

  const findNaturalCutPoints = (intensityCurve: number[], duration: number): number[] => {
    const cutPoints: number[] = [];
    const timePerPoint = duration / intensityCurve.length;
    
    // Find local minima as potential cut points
    for (let i = 1; i < intensityCurve.length - 1; i++) {
      if (intensityCurve[i] < intensityCurve[i-1] && 
          intensityCurve[i] < intensityCurve[i+1] &&
          intensityCurve[i] < 0.1) {
        cutPoints.push(i * timePerPoint);
      }
    }
    
    return cutPoints;
  };

  const findEmotionalPeaks = (intensityCurve: number[], duration: number): number[] => {
    const peaks: number[] = [];
    const timePerPoint = duration / intensityCurve.length;
    const threshold = Math.max(...intensityCurve) * 0.8;
    
    for (let i = 1; i < intensityCurve.length - 1; i++) {
      if (intensityCurve[i] > intensityCurve[i-1] && 
          intensityCurve[i] > intensityCurve[i+1] && 
          intensityCurve[i] > threshold) {
        peaks.push(i * timePerPoint);
      }
    }
    
    return peaks;
  };

  const generatePhraseBoundaries = (duration: number): number[] => {
    const boundaries: number[] = [];
    const phraseLength = 8; // 8-second phrases
    for (let time = 0; time < duration; time += phraseLength) {
      boundaries.push(time);
    }
    return boundaries;
  };

  const clearAudioFile = () => {
    setAudioFile(null);
    setAudioFileName('');
    setMusicUploadError(null);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/chatbot-conversation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map(msg => ({
            role: msg.role,
            content: msg.content
          })),
          context: {
            videoType: selectedVideoType,
            hasMusic: extractedRequirements.hasMusic,
            hasNarration: extractedRequirements.hasNarration
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get response');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // Enable Ready to Proceed button after 1 user message
      const userMessageCount = [...messages, userMessage].filter(m => m.role === 'user').length;
      console.log('User message count:', userMessageCount);
      if (userMessageCount >= 1) {
        setCanProceed(true);
      }
      
      // Extract requirements from conversation in real-time
      extractRequirementsFromConversation([...messages, userMessage, assistantMessage]);

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I'm having trouble responding right now. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-resize textarea as user types
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInputMessage(e.target.value);
    
    // Reset height to auto to get the correct scrollHeight
    e.target.style.height = 'auto';
    
    // Set the height to match content, with min and max constraints
    const scrollHeight = e.target.scrollHeight;
    const minHeight = 52; // ~2 lines
    const maxHeight = 200; // ~8 lines
    
    e.target.style.height = `${Math.min(Math.max(scrollHeight, minHeight), maxHeight)}px`;
  };

  // Reset textarea height after sending message
  useEffect(() => {
    if (!inputMessage) {
      const textarea = document.querySelector(`.${styles.messageInput}`) as HTMLTextAreaElement;
      if (textarea) {
        textarea.style.height = 'auto';
      }
    }
  }, [inputMessage]);

  const extractRequirementsFromConversation = (conversationMessages: Message[]) => {
    const fullText = conversationMessages.map(m => m.content).join(' ').toLowerCase();
    
    // Extract duration
    const durationMatch = fullText.match(/(\d+)\s*(second|seconds|sec|s)/);
    if (durationMatch) {
      setExtractedRequirements(prev => ({ ...prev, duration: parseInt(durationMatch[1]) }));
    }
    
    // Extract style
    if (fullText.includes('cinematic')) setExtractedRequirements(prev => ({ ...prev, style: 'cinematic' }));
    else if (fullText.includes('documentary')) setExtractedRequirements(prev => ({ ...prev, style: 'documentary' }));
    else if (fullText.includes('artistic')) setExtractedRequirements(prev => ({ ...prev, style: 'artistic' }));
    else if (fullText.includes('minimal')) setExtractedRequirements(prev => ({ ...prev, style: 'minimal' }));
    
    // Extract pacing
    if (fullText.includes('fast') || fullText.includes('quick') || fullText.includes('dynamic')) setExtractedRequirements(prev => ({ ...prev, pacing: 'fast' }));
    else if (fullText.includes('slow') || fullText.includes('contemplative')) setExtractedRequirements(prev => ({ ...prev, pacing: 'slow' }));
    else if (fullText.includes('medium') || fullText.includes('moderate')) setExtractedRequirements(prev => ({ ...prev, pacing: 'medium' }));
    
    // Extract music/narration indicators
    if (fullText.includes('music') || fullText.includes('song') || fullText.includes('track')) {
      setExtractedRequirements(prev => ({ ...prev, hasMusic: true }));
    }
    if (fullText.includes('narration') || fullText.includes('voiceover') || fullText.includes('explain')) {
      setExtractedRequirements(prev => ({ ...prev, hasNarration: true }));
    }
    if (fullText.includes('no music') || fullText.includes('silent')) {
      setExtractedRequirements(prev => ({ ...prev, hasMusic: false }));
    }
    if (fullText.includes('no words') || fullText.includes('no narration')) {
      setExtractedRequirements(prev => ({ ...prev, hasNarration: false }));
    }
  };

  const handleReadyToProceed = async () => {
    if (!canProceed) return;
    
    setIsAnalyzing(true);
    
    try {
      // For music only and pure visuals, we can route directly
      if (selectedVideoType === 'music_only') {
        const startMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎬 Great! Starting to create your music video. I'll show you the progress below...`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, startMessage]);
        
        // Extract concept from conversation
        const concept = messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join(' ');
        
        // TEMPORARY: Add debug link for music video
        const debugLink = `/music-video-pipeline?concept=${encodeURIComponent(concept)}&style=${extractedRequirements.style || 'cinematic'}&pacing=${extractedRequirements.pacing || 'dynamic'}&duration=${extractedRequirements.duration || 60}&contentType=abstract_thematic&musicPreference=auto`;
        const debugMessage: Message = {
          id: Date.now().toString() + '-debug',
          role: 'assistant',
          content: `🔧 [TEMPORARY DEBUG] Direct pipeline page: <a href="${debugLink}" target="_blank" style="color: #667eea; text-decoration: underline;">Open Music Video Pipeline</a>`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, debugMessage]);
        
        executePipeline('MUSIC_VIDEO', {
          concept,
          style: extractedRequirements.style || 'cinematic',
          pacing: extractedRequirements.pacing || 'dynamic',
          duration: extractedRequirements.duration || 60,
          contentType: 'abstract_thematic',
          musicPreference: musicAnalysis ? 'upload' : 'auto',
          preAnalyzedMusic: musicAnalysis  // Pass the client-side analyzed music data
        });
        
        setIsAnalyzing(false);
        return;
      }
      
      if (selectedVideoType === 'pure_visuals') {
        const startMessage: Message = {
          id: Date.now().toString(),
          role: 'assistant',
          content: `🎬 Perfect! Starting to create your visual story. I'll show you the progress below...`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, startMessage]);
        
        // Extract concept from conversation
        const concept = messages
          .filter(m => m.role === 'user')
          .map(m => m.content)
          .join(' ');
        
        // TEMPORARY: Add debug link for no-music video
        const debugLink = `/no-music-video-pipeline?concept=${encodeURIComponent(concept)}&style=${extractedRequirements.style || 'artistic'}&pacing=${extractedRequirements.pacing || 'contemplative'}&duration=${extractedRequirements.duration || 30}&contentType=abstract`;
        const debugMessage: Message = {
          id: Date.now().toString() + '-debug',
          role: 'assistant',
          content: `🔧 [TEMPORARY DEBUG] Direct pipeline page: <a href="${debugLink}" target="_blank" style="color: #667eea; text-decoration: underline;">Open No-Music Video Pipeline</a>`,
          timestamp: new Date()
        };
        setMessages(prev => [...prev, debugMessage]);
        
        executePipeline('NO_MUSIC_VIDEO', {
          concept,
          style: extractedRequirements.style || 'artistic',
          pacing: extractedRequirements.pacing || 'contemplative',
          duration: extractedRequirements.duration || 30,
          contentType: 'abstract'
        });
        
        setIsAnalyzing(false);
        return;
      }
      
      // For voiceover_music, user explicitly wants NARRATED content
      // Only use SCRIPT_MODE if user provided a complete script, otherwise VISION_ENHANCED
      const conversationText = messages.map(m => m.content).join(' ').toLowerCase();

      // Enhanced script detection patterns
      const scriptIndicators = [
        'here is my script', 'here\'s my script', 'script:', 'my script is',
        'the script:', 'narration:', 'voiceover:', 'here\'s what to say',
        'please use this script', 'use this text:', 'here is the narration',
        'here\'s the narration', 'the narration is', 'use this narration'
      ];

      // Check if any indicator is present
      const hasCompleteScript = scriptIndicators.some(indicator => 
        conversationText.includes(indicator)
      );

      // Extract the actual script content
      let extractedScript = null;
      if (hasCompleteScript) {
        // Get full text with original case
        const fullText = messages.map(m => m.content).join('\n');
        
        for (const indicator of scriptIndicators) {
          const lowerIndex = conversationText.indexOf(indicator);
          if (lowerIndex !== -1) {
            // Find the indicator in original case text
            const originalIndex = fullText.toLowerCase().indexOf(indicator);
            const afterIndicator = fullText.substring(originalIndex + indicator.length);
            
            // Clean and extract script
            let script = afterIndicator
              .trim()
              .replace(/^[:\s-]+/, ''); // Remove leading colons, spaces, dashes
            
            // Extract until double newline or end
            const doubleNewlineIndex = script.indexOf('\n\n');
            if (doubleNewlineIndex > 0) {
              script = script.substring(0, doubleNewlineIndex);
            }
            
            // Validate minimum length (at least 20 words)
            if (script.split(/\s+/).length >= 20) {
              extractedScript = script.trim();
              console.log('✅ Extracted script:', extractedScript);
              break;
            }
          }
        }
        
        // If no script extracted with indicators, check for quoted text
        if (!extractedScript) {
          const quotePatterns = [
            /"([^"]+)"/, // Double quotes
            /'([^']+)'/, // Single quotes
            /"([^"]+)"/, // Smart quotes
            /'([^']+)'/, // Smart single quotes
          ];
          
          for (const pattern of quotePatterns) {
            const match = fullText.match(pattern);
            if (match && match[1] && match[1].split(/\s+/).length >= 20) {
              extractedScript = match[1].trim();
              console.log('✅ Extracted quoted script:', extractedScript);
              break;
            }
          }
        }
      }

      console.log('Script detection result:', { hasCompleteScript, extractedScript });
      
      const selectedPipeline = hasCompleteScript ? 'SCRIPT_MODE' : 'VISION_ENHANCED';
      
      console.log(`🎤 User selected voiceover_music → routing to ${selectedPipeline}`);
      console.log(`📝 Has complete script: ${hasCompleteScript}`);
      console.log(`📝 Extracted script: ${extractedScript ? extractedScript.substring(0, 50) + '...' : 'None'}`);
      
      // Extract concept from conversation
      const concept = messages
        .filter(m => m.role === 'user')
        .map(m => m.content)
        .join(' ');
      
      // Add a message about starting the process
      const startMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `🎬 Perfect! Starting to create your ${
          selectedPipeline === 'SCRIPT_MODE' ? 'video from your script' : 'narrated video with background music'
        }. I'll show you the progress below...`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, startMessage]);
      
      // TEMPORARY: Add debug link
      const debugLink = extractedScript 
        ? `/test-tts?script=${encodeURIComponent(extractedScript)}&conversationMode=true&useScriptMode=true&duration=${extractedRequirements.duration || 30}`
        : `/test-tts?concept=${encodeURIComponent(concept)}&style=${extractedRequirements.style || 'cinematic'}&pacing=${extractedRequirements.pacing || 'moderate'}&duration=${extractedRequirements.duration || 30}&conversationMode=true&useVisionMode=true`;
      const debugMessage: Message = {
        id: Date.now().toString() + '-debug',
        role: 'assistant',
        content: `🔧 [TEMPORARY DEBUG] Direct pipeline page: <a href="${debugLink}" target="_blank" style="color: #667eea; text-decoration: underline;">Open ${selectedPipeline} Pipeline</a>`,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, debugMessage]);
      
      // Start pipeline execution - ALWAYS respect user's voiceover_music selection
      executePipeline(selectedPipeline, {
        concept,
        style: extractedRequirements.style || 'cinematic',
        pacing: extractedRequirements.pacing || 'moderate',
        duration: extractedRequirements.duration || 30,
        conversationMode: 'true',
        useVisionMode: extractedScript ? 'false' : 'true',
        useScriptMode: extractedScript ? 'true' : 'false',
        script: extractedScript || (hasCompleteScript ? concept : undefined)
      });
      
    } catch (error) {
      console.error('Error analyzing conversation:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Sorry, I had trouble analyzing your requirements. Please try again.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPipelineStages = (pipeline: string) => {
    const stageMap = {
      SCRIPT_MODE: [
        { name: 'format_script', agent: 'Script Formatter', status: 'pending' as const },
        { name: 'generate_audio', agent: 'TTS Engine', status: 'pending' as const },
        { name: 'transcribe_audio', agent: 'Transcription', status: 'pending' as const },
        { name: 'generate_cuts', agent: 'Producer Agent', status: 'pending' as const },
        { name: 'generate_vision', agent: 'Director Agent', status: 'pending' as const },
        { name: 'generate_cinematography', agent: 'DoP Agent', status: 'pending' as const },
        { name: 'generate_prompts', agent: 'Prompt Engineer', status: 'pending' as const },
        { name: 'generate_images', agent: 'Image Generator', status: 'pending' as const }
      ],
      VISION_ENHANCED: [
        { name: 'vision_understanding', agent: 'Vision Agent', status: 'pending' as const },
        { name: 'generate_audio', agent: 'TTS Engine', status: 'pending' as const },
        { name: 'transcribe_audio', agent: 'Transcription', status: 'pending' as const },
        { name: 'generate_cuts', agent: 'Producer Agent', status: 'pending' as const },
        { name: 'generate_vision', agent: 'Director Agent', status: 'pending' as const },
        { name: 'generate_cinematography', agent: 'DoP Agent', status: 'pending' as const },
        { name: 'generate_prompts', agent: 'Prompt Engineer', status: 'pending' as const },
        { name: 'generate_images', agent: 'Image Generator', status: 'pending' as const }
      ],
      MUSIC_VIDEO: [
        { name: 'vision_understanding', agent: 'Vision Agent', status: 'pending' as const },
        { name: 'music_analysis', agent: 'Music Analyzer + Producer', status: 'pending' as const },
        { name: 'music_director', agent: 'Music Director', status: 'pending' as const },
        { name: 'music_dop', agent: 'Music DoP', status: 'pending' as const },
        { name: 'music_prompts', agent: 'Music Prompt Engineer', status: 'pending' as const },
        { name: 'generate_images', agent: 'Image Generator', status: 'pending' as const }
      ],
      NO_MUSIC_VIDEO: [
        { name: 'vision_understanding', agent: 'Vision Agent', status: 'pending' as const },
        { name: 'no_music_director', agent: 'Director', status: 'pending' as const },
        { name: 'no_music_dop', agent: 'DoP', status: 'pending' as const },
        { name: 'no_music_prompts', agent: 'Prompt Engineer', status: 'pending' as const },
        { name: 'generate_images', agent: 'Image Generator', status: 'pending' as const }
      ]
    };
    
    return stageMap[pipeline as keyof typeof stageMap] || [];
  };

  const executePipeline = async (pipeline: string, parameters: any) => {
    const sessionId = `session-${Date.now()}`;
    
    // Get pipeline stages
    const pipelineStages = getPipelineStages(pipeline);
    
    // Clear previous debug data and initialize pipeline state
    setAgentResponses({});
    setPipelineState({
      isRunning: true,
      pipeline,
      stages: pipelineStages,
      currentStage: pipelineStages[0]?.name || null,
      generatedImages: [],
      imageGenerationProgress: {
        currentIndex: 0,
        totalImages: 0,
        percentage: 0,
        isGenerating: false,
        message: ''
      },
      error: null,
      sessionId
    });
    
    try {
      // Create project folder
      const folderId = `${pipeline.toLowerCase()}-${Date.now()}`;
      parameters.folderId = folderId;
      parameters.sessionId = sessionId;
      
      // Execute each stage sequentially and update UI in real-time
      const results: Record<string, any> = {};
      
      for (let i = 0; i < pipelineStages.length; i++) {
        const stage = pipelineStages[i];
        
        // Mark current stage as running
        setPipelineState(prev => ({
          ...prev,
          currentStage: stage.name,
          stages: prev.stages.map((s, index) => 
            index === i 
              ? { ...s, status: 'running' }
              : index < i 
                ? { ...s, status: 'completed' }
                : s
          )
        }));
        
        console.log(`🚀 Starting stage: ${stage.name}`);
        
        // Execute the individual stage
        try {
          const stageResult = await executeIndividualStage(stage, parameters, results);
          results[stage.name] = stageResult;
          
          // Store agent response for debug mode
          console.log('Storing agent response, debug mode:', debugMode);
          if (debugMode) {
            setAgentResponses(prev => {
              const newResponses = {
                ...prev,
                [stage.name]: {
                  agent: stage.agent,
                  timestamp: new Date().toISOString(),
                  request: prepareStageRequestBody(stage.name, parameters, results),
                  response: stageResult,
                  executionTime: stageResult.executionTime || 0
                }
              };
              console.log('Updated agent responses:', newResponses);
              return newResponses;
            });
          }
          
          // Mark stage as completed
          setPipelineState(prev => ({
            ...prev,
            stages: prev.stages.map((s, index) => 
              index === i 
                ? { ...s, status: 'completed', duration: 25000 + Math.random() * 10000 }
                : s
            )
          }));
          
          console.log(`✅ Completed stage: ${stage.name}`);
          
          // Handle image generation stage specifically
          if (stage.name === 'generate_images') {
            if (stageResult.stage7_image_generation?.generated_images) {
              const generatedImages = stageResult.stage7_image_generation.generated_images;
              setPipelineState(prev => ({
                ...prev,
                generatedImages: generatedImages,
                imageGenerationProgress: {
                  currentIndex: generatedImages.length,
                  totalImages: generatedImages.length,
                  percentage: 100,
                  isGenerating: false,
                  message: `✅ Generated ${generatedImages.length} images successfully`
                }
              }));
            } else {
              // Get expected image count from previous stage results
              const promptsResult = results.music_prompts || results.no_music_prompts;
              const expectedImageCount = promptsResult?.stage6_prompt_engineer_output?.flux_prompts?.length || 
                                       promptsResult?.stage6_prompt_engineer_output?.prompts_output?.length ||
                                       8; // fallback
              
              // Start real-time image monitoring
              console.log(`🎨 Starting real-time image generation monitoring for ${expectedImageCount} images...`);
              startImageGenerationMonitoring(parameters.folderId, expectedImageCount);
            }
          }
          
        } catch (stageError) {
          console.error(`❌ Stage ${stage.name} failed:`, stageError);
          
          // Mark stage as error and stop pipeline
          setPipelineState(prev => ({
            ...prev,
            isRunning: false,
            error: `Stage ${stage.name} failed`,
            stages: prev.stages.map((s, index) => 
              index === i 
                ? { ...s, status: 'error' }
                : s
            )
          }));
          
          const errorMessage: Message = {
            id: Date.now().toString(),
            role: 'assistant',
            content: `❌ Stage "${stage.agent}" failed. ${stageError instanceof Error ? stageError.message : 'Unknown error'}`,
            timestamp: new Date()
          };
          setMessages(prev => [...prev, errorMessage]);
          return;
        }
      }
      
      // All stages completed successfully
      const completeMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '✨ Your video has been generated successfully! The images are ready and can be converted to video.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, completeMessage]);
      
      setPipelineState(prev => ({
        ...prev,
        isRunning: false
      }));
      
    } catch (error) {
      console.error('Pipeline execution error:', error);
      
      setPipelineState(prev => ({
        ...prev,
        isRunning: false,
        error: 'Pipeline execution failed'
      }));
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: '❌ Sorry, there was an error generating your video. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  const executeIndividualStage = async (stage: PipelineStage, parameters: any, previousResults: any) => {
    // Use current window location to get the correct port
    const baseUrl = typeof window !== 'undefined' 
      ? `${window.location.protocol}//${window.location.host}`
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    
    // Map stage names to API endpoints
    const endpointMap: Record<string, string> = {
      // Vision Understanding (different endpoints for different pipelines)
      'vision_understanding': '/api/vision-understanding', 
      
      // TTS/Audio pipeline stages
      'format_script': '/api/format-script',
      'generate_audio': '/api/generate-audio-from-script',
      'transcribe_audio': '/api/transcribe-audio',
      
      // Standard pipeline agents - USE CORRECTED VISION-ENHANCED PRODUCER
      'generate_cuts': '/api/vision-enhanced-producer-agent',
      'generate_vision': '/api/director-agent', 
      'generate_cinematography': '/api/dop-agent',
      'generate_prompts': '/api/prompt-engineer-agent',
      
      // Music video pipeline
      'music_analysis': '/api/music-analysis',
      'music_producer': '/api/music-producer-agent',
      'music_director': '/api/music-director-agent',
      'music_dop': '/api/music-dop-agent',
      'music_prompts': '/api/music-prompt-engineer-agent',
      
      // No-music video pipeline
      'no_music_director': '/api/no-music-director-agent',
      'no_music_dop': '/api/no-music-dop-agent',
      'no_music_prompts': '/api/no-music-prompt-engineer-agent',
      
      // Image generation (shared across all pipelines)
      'generate_images': '/api/generate-comfy-images-concurrent'
    };
    
    const endpoint = endpointMap[stage.name];
    if (!endpoint) {
      throw new Error(`No endpoint mapping for stage: ${stage.name}`);
    }
    
    // Prepare request body based on stage requirements
    console.log(`🚨🚨 EXECUTING STAGE: ${stage.name} 🚨🚨`);
    const requestBody = prepareStageRequestBody(stage.name, parameters, previousResults);
    console.log(`🚨🚨 REQUEST BODY PREPARED FOR: ${stage.name} 🚨🚨`);
    
    const fullUrl = `${baseUrl}${endpoint}`;
    console.log(`📤 Calling ${fullUrl}`, { 
      stage: stage.name,
      agent: stage.agent,
      requestBodyKeys: Object.keys(requestBody),
      baseUrl
    });
    
    // Execute the API call
    try {
      const response = await fetch(fullUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const error = await response.text();
        console.error(`❌ API call failed:`, {
          url: fullUrl,
          status: response.status,
          statusText: response.statusText,
          error
        });
        throw new Error(`${stage.agent} failed (${response.status}): ${error}`);
      }
      
      const result = await response.json();
      console.log(`✅ ${stage.agent} completed successfully`);
      return result;
      
    } catch (fetchError) {
      console.error(`🚨 Network error calling ${fullUrl}:`, fetchError);
      throw new Error(`Network error calling ${stage.agent}: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}`);
    }
  };

  const prepareStageRequestBody = (stageName: string, parameters: any, previousResults: any): any => {
    console.log(`🎯 STAGE NAME DEBUG: "${stageName}" (length: ${stageName.length})`);
    console.log(`📋 Previous results keys:`, Object.keys(previousResults || {}));
    
    switch (stageName) {
      case 'vision_understanding':
        // Configure vision understanding based on USER'S ACTUAL SELECTION, not pipeline name
        console.log(`🎯 Configuring vision understanding for selectedVideoType: ${selectedVideoType}`);
        
        if (selectedVideoType === 'voiceover_music') {
          // User explicitly wants voiceover + background music = NARRATED CONTENT
          console.log(`🎤 Configuring for NARRATED content with background music`);
          return {
            userInput: parameters.concept,
            additionalContext: {
              stylePreferences: {
                pacing: parameters.pacing || 'moderate',
                visualStyle: parameters.style || 'cinematic',
                duration: parameters.duration || 30
              },
              technicalRequirements: {
                contentType: 'narrated_video_with_music'
              },
              musicContext: {
                willHaveMusic: true,  // User wants background music
                musicStyle: 'background_sync',
                noTtsRequired: false  // TTS IS REQUIRED for voiceover
              }
            },
            folderId: parameters.folderId
          };
        } else if (selectedVideoType === 'music_only') {
          // User explicitly wants music only = NO NARRATION
          console.log(`🎵 Configuring for MUSIC-ONLY content (no narration)`);
          return {
            userInput: parameters.concept,
            additionalContext: {
              stylePreferences: {
                pacing: parameters.pacing || 'dynamic',
                visualStyle: parameters.style || 'cinematic',
                duration: parameters.duration || 60
              },
              technicalRequirements: {
                contentType: 'music_video'
              },
              musicContext: {
                willHaveMusic: true,
                musicStyle: 'background_sync',
                noTtsRequired: true   // NO TTS for music only
              }
            },
            folderId: parameters.folderId
          };
        } else if (selectedVideoType === 'pure_visuals') {
          // User explicitly wants pure visuals = NO AUDIO AT ALL
          console.log(`🎨 Configuring for PURE VISUAL content (no audio)`);
          return {
            userInput: parameters.concept,
            additionalContext: {
              stylePreferences: {
                pacing: parameters.pacing || 'contemplative',
                visualStyle: parameters.style || 'artistic',
                duration: parameters.duration || 30
              },
              technicalRequirements: {
                contentType: 'visual_only'
              },
              musicContext: {
                willHaveMusic: false,
                musicStyle: 'none',
                noTtsRequired: true   // NO TTS for pure visuals
              }
            },
            folderId: parameters.folderId
          };
        } else {
          // Fallback configuration
          console.log(`⚠️ No selectedVideoType found, using default configuration`);
          return {
            userInput: parameters.concept,
            additionalContext: {
              stylePreferences: {
                pacing: parameters.pacing || 'moderate',
                visualStyle: parameters.style || 'cinematic',
                duration: parameters.duration || 30
              },
              technicalRequirements: {
                contentType: 'narrated_video'
              },
              musicContext: {
                willHaveMusic: false,
                musicStyle: 'none',
                noTtsRequired: false
              }
            },
            folderId: parameters.folderId
          };
        }
        
      case 'music_analysis':
        // Handle client-side analyzed music data
        const preAnalyzedMusic = parameters.preAnalyzedMusic;
        const actualMusicPreference = preAnalyzedMusic ? 'upload' : parameters.musicPreference || 'auto';
          
        console.log('🎵 MUSIC_ANALYSIS REQUEST PREPARATION:');
        console.log(`- Music preference: ${actualMusicPreference}`);
        console.log(`- Has pre-analyzed music: ${!!preAnalyzedMusic}`);
        console.log(`- Music title: ${preAnalyzedMusic?.trackMetadata?.title || 'N/A'}`);
        console.log(`- Music BPM: ${preAnalyzedMusic?.musicAnalysis?.bpm || 'N/A'}`);
        
        const requestBody = {
          visionDocument: previousResults.vision_understanding,
          audioFile: null, // No need to send file, we have analysis
          musicPreference: actualMusicPreference,
          preAnalyzedMusic: preAnalyzedMusic,
          // Add some debug info
          originalUserInput: { concept: parameters.concept },
          rawVisionAnalysis: previousResults.vision_understanding
        };
        
        console.log('🎵 Full music analysis request body:', JSON.stringify(requestBody, null, 2));
        
        return requestBody;
        
      case 'no_music_director':
        // No-music director needs vision document from vision understanding
        const visionResultForNoMusicDirector = previousResults.vision_understanding;
        
        let visionDocForNoMusicDirector = null;
        
        // Get vision document using same logic as music director
        if (visionResultForNoMusicDirector?.visionDocument) {
          visionDocForNoMusicDirector = visionResultForNoMusicDirector.visionDocument;
        } else if (visionResultForNoMusicDirector?.stage1_vision_analysis?.vision_document) {
          visionDocForNoMusicDirector = visionResultForNoMusicDirector.stage1_vision_analysis.vision_document;
        } else if (visionResultForNoMusicDirector?.vision_document) {
          visionDocForNoMusicDirector = visionResultForNoMusicDirector.vision_document;
        }
        
        console.log('🎬 NO_MUSIC_DIRECTOR REQUEST PREPARATION:');
        console.log(`- Vision document found: ${!!visionDocForNoMusicDirector}`);
        console.log(`- Vision concept: ${visionDocForNoMusicDirector?.core_concept || 'N/A'}`);
        
        return {
          userVisionDocument: visionDocForNoMusicDirector,
          contentClassification: { type: 'visual_only' },
          folderId: parameters.folderId
        };
        
      case 'music_director':
        // Music director needs vision document and music analysis (which includes producer results)
        const visionResultForMusicDirector = previousResults.vision_understanding;
        const musicAnalysisResult = previousResults.music_analysis;
        
        let visionDocForMusicDirector = null;
        
        // Get vision document
        if (visionResultForMusicDirector?.visionDocument) {
          visionDocForMusicDirector = visionResultForMusicDirector.visionDocument;
        } else if (visionResultForMusicDirector?.stage1_vision_analysis?.vision_document) {
          visionDocForMusicDirector = visionResultForMusicDirector.stage1_vision_analysis.vision_document;
        } else if (visionResultForMusicDirector?.vision_document) {
          visionDocForMusicDirector = visionResultForMusicDirector.vision_document;
        }
        
        console.log('🎬 MUSIC_DIRECTOR REQUEST PREPARATION:');
        console.log(`- Vision document found: ${!!visionDocForMusicDirector}`);
        console.log(`- Music analysis found: ${!!musicAnalysisResult}`);
        console.log(`- Producer cuts in analysis: ${!!musicAnalysisResult?.stage3_producer_output}`);
        
        return {
          userVisionDocument: visionDocForMusicDirector,
          musicAnalysis: musicAnalysisResult?.stage2_music_analysis?.musicAnalysis,
          producerCutPoints: musicAnalysisResult?.stage3_producer_output?.cutPoints || musicAnalysisResult?.stage3_producer_output?.cut_points,
          contentClassification: { type: 'music_video' },
          folderId: parameters.folderId
        };
        
      case 'music_dop':
        // Music DoP needs vision document, director beats, and music analysis
        const visionResultForMusicDop = previousResults.vision_understanding;
        const musicDirectorResult = previousResults.music_director;
        const musicAnalysisForDop = previousResults.music_analysis;
        
        let visionDocForMusicDop = null;
        
        // Get vision document
        if (visionResultForMusicDop?.visionDocument) {
          visionDocForMusicDop = visionResultForMusicDop.visionDocument;
        } else if (visionResultForMusicDop?.stage1_vision_analysis?.vision_document) {
          visionDocForMusicDop = visionResultForMusicDop.stage1_vision_analysis.vision_document;
        } else if (visionResultForMusicDop?.vision_document) {
          visionDocForMusicDop = visionResultForMusicDop.vision_document;
        }
        
        // Handle both parsed JSON and raw response fallback from Music Director
        let directorBeats = null;
        if (musicDirectorResult?.stage4_director_output?.visual_beats) {
          directorBeats = musicDirectorResult.stage4_director_output.visual_beats;
        } else if (musicDirectorResult?.stage4_director_output?.raw_director_response) {
          // Raw response fallback - pass the raw text to DoP agent
          directorBeats = {
            raw_director_response: musicDirectorResult.stage4_director_output.raw_director_response,
            parsing_note: "Director response contains visual beats in raw format"
          };
        } else {
          directorBeats = musicDirectorResult?.visual_beats || musicDirectorResult?.visualBeats || musicDirectorResult;
        }
        
        console.log('🎬 MUSIC_DOP REQUEST PREPARATION:');
        console.log(`- Vision document found: ${!!visionDocForMusicDop}`);
        console.log(`- Director beats found: ${!!directorBeats}`);
        console.log(`- Music analysis found: ${!!musicAnalysisForDop}`);
        console.log(`- Using fallback strategy: ${!!musicDirectorResult?.fallback_used}`);
        
        return {
          visionDocument: visionDocForMusicDop,
          directorVisualBeats: directorBeats,
          musicAnalysis: musicAnalysisForDop?.stage2_music_analysis?.musicAnalysis || musicAnalysisForDop?.musicAnalysis,
          contentClassification: { type: 'music_video' },
          folderId: parameters.folderId
        };
        
      case 'music_prompts':
        // Music Prompt Engineer needs vision document, director beats, and DoP specs
        const visionResultForMusicPrompts = previousResults.vision_understanding;
        const musicDirectorForPrompts = previousResults.music_director;
        const musicDopResult = previousResults.music_dop;
        
        let visionDocForMusicPrompts = null;
        
        // Get vision document
        if (visionResultForMusicPrompts?.visionDocument) {
          visionDocForMusicPrompts = visionResultForMusicPrompts.visionDocument;
        } else if (visionResultForMusicPrompts?.stage1_vision_analysis?.vision_document) {
          visionDocForMusicPrompts = visionResultForMusicPrompts.stage1_vision_analysis.vision_document;
        } else if (visionResultForMusicPrompts?.vision_document) {
          visionDocForMusicPrompts = visionResultForMusicPrompts.vision_document;
        }
        
        // Handle director beats (might be raw response)
        let directorBeatsForPrompts = null;
        if (musicDirectorForPrompts?.stage4_director_output?.visual_beats) {
          directorBeatsForPrompts = musicDirectorForPrompts.stage4_director_output.visual_beats;
        } else if (musicDirectorForPrompts?.stage4_director_output?.raw_director_response) {
          // Pass raw response for prompt engineer to parse
          directorBeatsForPrompts = {
            raw_director_response: musicDirectorForPrompts.stage4_director_output.raw_director_response,
            parsing_note: "Director response in raw format for prompt engineer parsing"
          };
        } else {
          directorBeatsForPrompts = musicDirectorForPrompts?.visual_beats || musicDirectorForPrompts?.visualBeats || musicDirectorForPrompts;
        }
        
        // Handle DoP specs
        let dopSpecs = null;
        if (musicDopResult?.stage5_dop_output?.cinematographic_shots) {
          dopSpecs = musicDopResult.stage5_dop_output.cinematographic_shots;
        } else if (musicDopResult?.cinematographic_shots) {
          dopSpecs = musicDopResult.cinematographic_shots;
        } else {
          dopSpecs = musicDopResult;
        }
        
        console.log('🎨 MUSIC_PROMPTS REQUEST PREPARATION:');
        console.log(`- Vision document found: ${!!visionDocForMusicPrompts}`);
        console.log(`- Director beats found: ${!!directorBeatsForPrompts}`);
        console.log(`- DoP specs found: ${!!dopSpecs}`);
        console.log(`- Using director fallback: ${!!musicDirectorForPrompts?.fallback_used}`);
        
        return {
          userVisionDocument: visionDocForMusicPrompts,
          directorBeats: directorBeatsForPrompts,
          dopSpecs: dopSpecs,
          contentClassification: { type: 'music_video' },
          folderId: parameters.folderId
        };
        
      case 'no_music_dop': {
        // DoP agent needs both the vision document and director's visual beats
        const visionResultForNoMusicDop = previousResults.vision_understanding;
        const directorResult = previousResults.no_music_director;
        
        let visionDocForNoMusicDop = null;
        
        // Get vision document using same logic as director
        if (visionResultForNoMusicDop?.stage1_vision_analysis?.vision_document) {
          visionDocForNoMusicDop = visionResultForNoMusicDop.stage1_vision_analysis.vision_document;
        } else if (visionResultForNoMusicDop?.visionDocument) {
          visionDocForNoMusicDop = visionResultForNoMusicDop.visionDocument;
        } else if (visionResultForNoMusicDop?.vision_document) {
          visionDocForNoMusicDop = visionResultForNoMusicDop.vision_document;
        }
        
        // Extract visual beats from the correct nested structure
        let directorVisualBeats = null;
        if (directorResult?.stage2_director_output?.visual_beats) {
          directorVisualBeats = directorResult.stage2_director_output.visual_beats;
        } else if (directorResult?.visual_beats) {
          directorVisualBeats = directorResult.visual_beats;
        } else if (directorResult?.visualBeats) {
          directorVisualBeats = directorResult.visualBeats;
        }
        
        console.log('🎬 NO_MUSIC_DOP REQUEST PREPARATION:');
        console.log(`- Vision document found: ${!!visionDocForNoMusicDop}`);
        console.log(`- Director result found: ${!!directorResult}`);
        console.log(`- Director visual beats: ${!!directorVisualBeats}`);
        console.log(`- Director visual beats count: ${Array.isArray(directorVisualBeats) ? directorVisualBeats.length : 'not array'}`);
        
        return {
          visionDocument: visionDocForNoMusicDop,
          directorVisualBeats: directorVisualBeats,
          folderId: parameters.folderId
        };
      }
      
      case 'no_music_prompts': {
        // Prompt engineer needs vision document, director beats, and DoP cinematography
        const visionResultForNoMusicPrompts = previousResults.vision_understanding;
        const directorResultForPrompts = previousResults.no_music_director;
        const dopResult = previousResults.no_music_dop;
        
        let visionDocForNoMusicPrompts = null;
        
        // Get vision document
        if (visionResultForNoMusicPrompts?.stage1_vision_analysis?.vision_document) {
          visionDocForNoMusicPrompts = visionResultForNoMusicPrompts.stage1_vision_analysis.vision_document;
        } else if (visionResultForNoMusicPrompts?.visionDocument) {
          visionDocForNoMusicPrompts = visionResultForNoMusicPrompts.visionDocument;
        } else if (visionResultForNoMusicPrompts?.vision_document) {
          visionDocForNoMusicPrompts = visionResultForNoMusicPrompts.vision_document;
        }
        
        // Extract director beats
        let directorBeatsForNoMusicPrompts = null;
        if (directorResultForPrompts?.stage2_director_output?.visual_beats) {
          directorBeatsForNoMusicPrompts = directorResultForPrompts.stage2_director_output.visual_beats;
        } else if (directorResultForPrompts?.visual_beats) {
          directorBeatsForNoMusicPrompts = directorResultForPrompts.visual_beats;
        } else if (directorResultForPrompts?.visualBeats) {
          directorBeatsForNoMusicPrompts = directorResultForPrompts.visualBeats;
        }
        
        // Extract DoP specs - the agent expects the cinematographic_shots array
        let dopSpecsForNoMusicPrompts = null;
        if (dopResult?.stage3_dop_output?.cinematographic_shots) {
          dopSpecsForNoMusicPrompts = dopResult.stage3_dop_output.cinematographic_shots;
        } else if (dopResult?.cinematographic_shots) {
          dopSpecsForNoMusicPrompts = dopResult.cinematographic_shots;
        } else if (dopResult?.stage3_dop_output) {
          // If no cinematographic_shots found, use entire stage3_dop_output
          dopSpecsForNoMusicPrompts = dopResult.stage3_dop_output;
        } else if (dopResult?.cinematography_specs) {
          dopSpecsForNoMusicPrompts = dopResult.cinematography_specs;
        } else {
          // Fallback: use the entire dopResult
          dopSpecsForNoMusicPrompts = dopResult;
        }
        
        console.log('🎨 NO_MUSIC_PROMPTS REQUEST PREPARATION:');
        console.log(`- Vision document found: ${!!visionDocForNoMusicPrompts}`);
        console.log(`- Director beats found: ${!!directorBeatsForNoMusicPrompts}`);
        console.log(`- DoP specs found: ${!!dopSpecsForNoMusicPrompts}`);
        console.log(`- Director beats count: ${Array.isArray(directorBeatsForNoMusicPrompts) ? directorBeatsForNoMusicPrompts.length : 'not array'}`);
        console.log(`- Director result structure:`, Object.keys(directorResultForPrompts || {}));
        console.log(`- DoP result structure:`, Object.keys(dopResult || {}));
        console.log(`- Raw vision doc:`, !!visionDocForNoMusicPrompts ? 'has core_concept' : 'null');
        console.log(`- Raw director beats:`, directorBeatsForNoMusicPrompts);
        console.log(`- Raw DoP specs:`, dopSpecsForNoMusicPrompts);
        
        const requestBody = {
          userVisionDocument: visionDocForNoMusicPrompts,
          directorBeats: directorBeatsForNoMusicPrompts,
          dopSpecs: dopSpecsForNoMusicPrompts,
          contentClassification: { type: 'visual_only' },
          folderId: parameters.folderId
        };
        
        console.log('🎨 Final NO_MUSIC_PROMPTS request body:', JSON.stringify(requestBody, null, 2));
        
        return requestBody;
      }
        
      case 'generate_images':
        console.log('🚨🖼️ GENERATE_IMAGES CASE HIT - UNIFIED HANDLER 🚨');
        
        // Image Generation needs prompt engineer output from ANY pipeline
        const musicPromptResult = previousResults.music_prompts;
        const noMusicPromptResult = previousResults.no_music_prompts;
        const visionPromptResult = previousResults.generate_prompts; // VISION_ENHANCED pipeline
        
        console.log('🎨 IMAGE_GENERATION REQUEST PREPARATION:');
        console.log(`- Previous results keys:`, Object.keys(previousResults || {}));
        console.log(`- Music prompt result type:`, typeof musicPromptResult);
        console.log(`- Music prompt result is array:`, Array.isArray(musicPromptResult));
        console.log(`- No-music prompt result type:`, typeof noMusicPromptResult);
        console.log(`- No-music prompt result is array:`, Array.isArray(noMusicPromptResult));
        console.log(`- Vision prompt result type:`, typeof visionPromptResult);
        console.log(`- Vision prompt result is array:`, Array.isArray(visionPromptResult));
        console.log(`- Vision prompt result:`, visionPromptResult);
        
        let promptsForAllImages = null;
        
        // The Prompt Engineer API returns prompts as a direct array OR wrapped in objects
        // Check all possible sources: VISION_ENHANCED (generate_prompts), MUSIC, NO_MUSIC
        if (Array.isArray(visionPromptResult)) {
          promptsForAllImages = visionPromptResult;
          console.log('🎨 Using direct array from VISION_ENHANCED generate_prompts');
        } else if (Array.isArray(musicPromptResult)) {
          promptsForAllImages = musicPromptResult;
          console.log('🎨 Using direct array from MUSIC music_prompts');
        } else if (Array.isArray(noMusicPromptResult)) {
          promptsForAllImages = noMusicPromptResult;
          console.log('🎨 Using direct array from NO_MUSIC no_music_prompts');
        } else {
          // Check nested object structures for all pipeline types
          promptsForAllImages = visionPromptResult?.promptsOutput ||
                               visionPromptResult?.prompts ||
                               visionPromptResult?.imagePrompts ||
                               visionPromptResult?.promptEngineerOutput?.prompts ||
                               visionPromptResult?.promptEngineerOutput?.promptsOutput ||
                               musicPromptResult?.stage6_prompt_engineer_output?.flux_prompts ||
                               musicPromptResult?.stage6_prompt_engineer_output?.prompts_output ||
                               musicPromptResult?.prompts_output ||
                               noMusicPromptResult?.stage4_prompt_engineer_output?.flux_prompts ||
                               noMusicPromptResult?.stage4_prompt_engineer_output?.prompts_output ||
                               noMusicPromptResult?.prompts_output ||
                               null;
          console.log('🎨 Using nested object extraction from multiple sources');
        }
        
        console.log(`- FINAL: Prompts found: ${!!promptsForAllImages}`);
        console.log(`- FINAL: Prompts type: ${Array.isArray(promptsForAllImages) ? 'array' : typeof promptsForAllImages}`);
        console.log(`- FINAL: Prompt count: ${Array.isArray(promptsForAllImages) ? promptsForAllImages.length : 0}`);
        console.log(`- FINAL: Sample prompt:`, Array.isArray(promptsForAllImages) && promptsForAllImages.length > 0 ? promptsForAllImages[0] : 'N/A');
        console.log(`- Folder ID: ${parameters.folderId}`);
        
        // Ensure we send a valid array
        const finalPromptsForAllImages = Array.isArray(promptsForAllImages) ? promptsForAllImages : [];
        
        if (finalPromptsForAllImages.length === 0) {
          console.error('🚨 ERROR: No valid prompts found for image generation!');
          console.error('🚨 Available previous results:', Object.keys(previousResults || {}));
        }
        
        return {
          prompts: finalPromptsForAllImages,
          folderId: parameters.folderId
        };
        
      // TTS/Audio pipeline stages
      case 'format_script':
        // Script formatting needs the extracted script or vision document
        const visionDoc = previousResults.vision_understanding?.stage1_vision_analysis?.vision_document;
        console.log('🎭 Format script - available inputs:', {
          paramScript: !!parameters.script,
          visionNarration: !!visionDoc?.narration_script,
          visionConcept: !!visionDoc?.core_concept,
          concept: !!parameters.concept
        });
        
        return {
          script: parameters.script || visionDoc?.narration_script || visionDoc?.core_concept || parameters.concept,
          folderId: parameters.folderId
        };
        
      case 'generate_audio':
        // TTS generation needs formatted script or vision document
        console.log('🎤 GENERATE_AUDIO: Starting TTS preparation...');
        console.log('🎤 Previous results keys:', Object.keys(previousResults));
        console.log('🎤 Parameters keys:', Object.keys(parameters));
        
        const formattedScript = previousResults.format_script?.formattedScript || 
                               previousResults.format_script?.script ||
                               parameters.script;
        
        console.log('🎤 Formatted script found:', !!formattedScript);
        console.log('🎤 Formatted script content:', formattedScript);
        
        // If no formatted script, use vision document narration script
        if (!formattedScript) {
          console.log('🎤 No formatted script, checking vision understanding...');
          const visionResult = previousResults.vision_understanding;
          console.log('🎤 Vision result structure:', Object.keys(visionResult || {}));
          console.log('🎤 Full vision result:', JSON.stringify(visionResult, null, 2));
          
          const visionDoc = visionResult?.stage1_vision_analysis?.vision_document;
          console.log('🎤 Vision document found:', !!visionDoc);
          
          // First try to get the proper narration_script from the vision analysis
          const narrationScript = visionResult?.stage1_vision_analysis?.narration_script ||
                                 visionResult?.narration_script ||
                                 visionResult?.narrationScript;
          
          if (narrationScript) {
            console.log('🎤 Using proper narration script from vision agent:', narrationScript);
            
            return {
              narrationScript: narrationScript,
              folderId: parameters.folderId
            };
          } else if (visionDoc) {
            console.log('🎤 No narration script found, falling back to vision doc core_concept:', visionDoc.core_concept);
            console.log('🎤 Vision doc emotion_arc:', visionDoc.emotion_arc);
            
            // Fallback: Create a narration script from the vision document
            const fallbackNarration = `${visionDoc.core_concept}. ${visionDoc.emotion_arc?.join(', ')}.`;
            console.log('🎤 Generated fallback narration:', fallbackNarration);
            
            return {
              narrationScript: fallbackNarration,
              folderId: parameters.folderId
            };
          } else {
            console.error('🎤 ERROR: No vision document found in vision understanding result');
          }
        }
        
        console.log('🎤 Final formatted script being sent to TTS:', formattedScript);
        return {
          narrationScript: formattedScript,
          folderId: parameters.folderId
        };
        
      case 'transcribe_audio':
        // Transcription needs the generated audio
        const audioResultForTranscription = previousResults.generate_audio;
        console.log('🎙️ TRANSCRIBE_AUDIO: Audio result structure:', Object.keys(audioResultForTranscription || {}));
        console.log('🎙️ TRANSCRIBE_AUDIO: Audio result:', audioResultForTranscription);
        
        const audioUrl = audioResultForTranscription?.audioUrl || audioResultForTranscription?.audioFile || audioResultForTranscription?.generatedAudio;
        console.log('🎙️ TRANSCRIBE_AUDIO: Extracted audioUrl:', audioUrl);
        
        return {
          audioUrl: audioUrl,
          folderId: parameters.folderId
        };
        
      case 'generate_cuts':
        // Producer agent needs transcript and timing data
        const transcriptionResult = previousResults.transcribe_audio;
        const audioResultForProducer = previousResults.generate_audio;
        
        console.log('🎬 GENERATE_CUTS: Preparing producer agent inputs...');
        console.log('🎬 Transcription result keys:', Object.keys(transcriptionResult || {}));
        console.log('🎬 Audio result keys:', Object.keys(audioResultForProducer || {}));
        
        // Get script from TTS generation (formattedScript)
        const scriptForProducer = audioResultForProducer?.formattedScript || parameters.script;
        console.log('🎬 Script found:', !!scriptForProducer);
        console.log('🎬 Script content:', scriptForProducer);
        
        return {
          transcript: transcriptionResult?.transcript,
          script: scriptForProducer,
          wordTimestamps: transcriptionResult?.word_timestamps,
          folderId: parameters.folderId
        };
        
      case 'generate_vision':
        // Director agent needs BOTH standard fields AND vision fields for Vision Enhanced pipeline
        const visionDocForDirector = previousResults.vision_understanding?.stage1_vision_analysis?.vision_document;
        const producerResult = previousResults.generate_cuts;
        const audioResultForDirector = previousResults.generate_audio;
        
        console.log('🎭 GENERATE_VISION: Preparing director agent inputs...');
        console.log('🎭 Vision doc found:', !!visionDocForDirector);
        console.log('🎭 Producer result keys:', Object.keys(producerResult || {}));
        console.log('🎭 Audio result keys:', Object.keys(audioResultForDirector || {}));
        
        // Standard Director Agent fields
        const producer_output = producerResult?.producerOutput || producerResult?.cutPoints || producerResult;
        const scriptForDirector = audioResultForDirector?.formattedScript || parameters.script;
        
        // Vision Enhanced fields
        const cutPoints = producerResult?.cutPoints;
        
        console.log('🎭 Producer output found:', !!producer_output);
        console.log('🎭 Script found:', !!scriptForDirector);
        console.log('🎭 Cut points found:', !!cutPoints);
        
        return {
          // Standard Director Agent requirements
          producer_output: producer_output,
          script: scriptForDirector,
          // Vision Enhanced additions
          visionDocument: visionDocForDirector,
          cutPoints: cutPoints,
          folderId: parameters.folderId
        };
        
      case 'generate_cinematography':
        // DoP agent needs BOTH standard fields AND vision fields for Vision Enhanced pipeline
        const visionDocForDop = previousResults.vision_understanding?.stage1_vision_analysis?.vision_document;
        const producerResultForDop = previousResults.generate_cuts;
        const audioResultForDop = previousResults.generate_audio;
        const directorResultForDop = previousResults.generate_vision;
        
        console.log('🎥 GENERATE_CINEMATOGRAPHY: Preparing DoP agent inputs...');
        console.log('🎥 Vision doc found:', !!visionDocForDop);
        console.log('🎥 Producer result keys:', Object.keys(producerResultForDop || {}));
        console.log('🎥 Audio result keys:', Object.keys(audioResultForDop || {}));
        console.log('🎥 Director result keys:', Object.keys(directorResultForDop || {}));
        
        // Standard DoP Agent fields
        const scriptForDop = audioResultForDop?.formattedScript || parameters.script;
        const producer_output_for_dop = producerResultForDop?.producerOutput || producerResultForDop?.cutPoints || producerResultForDop;
        const director_output = directorResultForDop?.directorOutput || directorResultForDop;
        
        console.log('🎥 Script found:', !!scriptForDop);
        console.log('🎥 Producer output found:', !!producer_output_for_dop);
        console.log('🎥 Director output found:', !!director_output);
        
        return {
          // Standard DoP Agent requirements
          script: scriptForDop,
          producer_output: producer_output_for_dop,
          director_output: director_output,
          // Vision Enhanced additions
          visionDocument: visionDocForDop,
          directorOutput: director_output,
          folderId: parameters.folderId
        };
        
      case 'generate_prompts':
        // Prompt engineer needs BOTH standard fields AND vision fields for Vision Enhanced pipeline
        const visionDocForPrompts = previousResults.vision_understanding?.stage1_vision_analysis?.vision_document;
        const audioResultForPrompts = previousResults.generate_audio;
        const directorResultForPrompts = previousResults.generate_vision;
        const dopResultForPrompts = previousResults.generate_cinematography;
        
        console.log('🎨 GENERATE_PROMPTS: Preparing Prompt Engineer inputs...');
        console.log('🎨 Vision doc found:', !!visionDocForPrompts);
        console.log('🎨 Audio result keys:', Object.keys(audioResultForPrompts || {}));
        console.log('🎨 Director result keys:', Object.keys(directorResultForPrompts || {}));
        console.log('🎨 DoP result keys:', Object.keys(dopResultForPrompts || {}));
        
        // Standard Prompt Engineer fields
        const scriptForPrompts = audioResultForPrompts?.formattedScript || parameters.script;
        const director_output_for_prompts = directorResultForPrompts?.directorOutput || directorResultForPrompts;
        const dop_output = dopResultForPrompts?.dopOutput || dopResultForPrompts;
        
        console.log('🎨 Script found:', !!scriptForPrompts);
        console.log('🎨 Director output found:', !!director_output_for_prompts);
        console.log('🎨 DoP output found:', !!dop_output);
        
        return {
          // Standard Prompt Engineer requirements
          script: scriptForPrompts,
          director_output: director_output_for_prompts,
          dop_output: dop_output,
          // Vision Enhanced additions
          visionDocument: visionDocForPrompts,
          directorOutput: director_output_for_prompts,
          dopOutput: dop_output,
          folderId: parameters.folderId
        };
        
      default:
        // For other stages, pass all parameters and previous results
        return { ...parameters, ...previousResults };
    }
  };

  // Poll for pipeline updates (in production, use WebSockets)
  useEffect(() => {
    if (!pipelineState.isRunning || !pipelineState.sessionId) return;
    
    // For now, just show that pipeline is running without fake progress
    // In production, this would poll a real status endpoint
    console.log('Pipeline is running, would poll for real updates here...');
    
  }, [pipelineState.isRunning, pipelineState.sessionId]);

  return (
    <div className={styles.container}>
      {showVideoTypeSelector && (
        <VideoTypeSelector onSelect={handleVideoTypeSelect} />
      )}
      
      <div className={styles.header}>
        <h1 className={styles.title}>VinVideo</h1>
        <nav className={styles.nav}>
          <a href="/" className={styles.navLink}>Home</a>
          <a href="/test-tts" className={styles.navLink}>Script Mode</a>
          <button 
            onClick={() => {
              console.log('Debug toggle clicked, current:', debugMode);
              setDebugMode(!debugMode);
            }}
            className={`${styles.debugToggle} ${debugMode ? styles.active : ''}`}
            title="Toggle debug mode to see agent responses"
          >
            {debugMode ? '🔍 Debug: ON' : '👁️ Debug: OFF'}
          </button>
        </nav>
      </div>

      <div className={styles.chatContainer}>
        <div className={styles.messagesContainer}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`${styles.message} ${
                message.role === 'user' ? styles.userMessage : styles.assistantMessage
              }`}
            >
              <div 
                className={styles.messageContent}
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </div>
          ))}
          {isLoading && (
            <div className={`${styles.message} ${styles.assistantMessage}`}>
              <div className={styles.messageContent}>
                <div className={styles.loadingDots}>
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show pipeline progress when running */}
          {pipelineState.isRunning && pipelineState.pipeline && (
            <PipelineProgress
              pipeline={pipelineState.pipeline}
              stages={pipelineState.stages}
              currentStage={pipelineState.currentStage || undefined}
              generatedImages={pipelineState.generatedImages}
              imageGenerationProgress={pipelineState.imageGenerationProgress}
            />
          )}
          
          {/* Debug Mode Indicator */}
          {debugMode && (
            <div className={styles.debugIndicator}>
              🔍 Debug mode is active - Agent responses will be captured (Total: {Object.keys(agentResponses).length})
            </div>
          )}
          
          {/* Debug Mode: Show Agent Responses */}
          {debugMode && Object.keys(agentResponses).length > 0 && (
            <div className={styles.debugPanel}>
              <div className={styles.debugHeader}>
                <h3 className={styles.debugTitle}>🔍 Agent Responses Debug Panel</h3>
                <button 
                  onClick={() => setAgentResponses({})}
                  className={styles.clearDebugButton}
                  title="Clear debug data"
                >
                  🗑️ Clear
                </button>
              </div>
              {Object.entries(agentResponses).map(([stageName, data]) => (
                <div key={stageName} className={styles.agentResponse}>
                  <div className={styles.agentHeader}>
                    <h4>{data.agent} ({stageName})</h4>
                    <span className={styles.timestamp}>
                      {new Date(data.timestamp).toLocaleTimeString()} • {data.executionTime}ms
                    </span>
                  </div>
                  
                  <div className={styles.responseDetails}>
                    <div className={styles.responseSection}>
                      <h5>📤 Request Data:</h5>
                      <pre className={styles.jsonDisplay}>
                        {JSON.stringify(data.request, null, 2)}
                      </pre>
                    </div>
                    
                    <div className={styles.responseSection}>
                      <h5>📥 Response Data:</h5>
                      <pre className={styles.jsonDisplay}>
                        {JSON.stringify(data.response, null, 2)}
                      </pre>
                    </div>
                    
                    {data.response.rawResponse && (
                      <div className={styles.responseSection}>
                        <h5>🔤 Raw LLM Response:</h5>
                        <pre className={styles.rawResponse}>
                          {data.response.rawResponse}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.inputContainer}>
          {/* Music Upload Section - Show when music_only or voiceover_music is selected */}
          {(selectedVideoType === 'music_only' || selectedVideoType === 'voiceover_music') && (
            <div className={`${styles.musicUploadSection} ${musicAnalysis ? styles.minimized : ''}`}>
              <div className={styles.musicUploadHeader}>
                <span>🎵 Music Upload (Optional)</span>
                {audioFile && (
                  <button 
                    onClick={clearAudioFile}
                    className={styles.clearButton}
                    title="Remove uploaded file"
                  >
                    ✕
                  </button>
                )}
              </div>
              
              {!audioFile ? (
                <div className={styles.fileUploadArea}>
                  <input
                    type="file"
                    id="audioFile"
                    accept="audio/mp3,audio/wav,audio/mpeg,audio/mp4,audio/aac"
                    onChange={handleAudioFileChange}
                    className={styles.fileInput}
                    disabled={pipelineState.isRunning || isAnalyzingMusic}
                  />
                  <label htmlFor="audioFile" className={styles.fileInputLabel}>
                    📁 Choose Audio File
                  </label>
                  <div className={styles.fileInputHint}>
                    Supports MP3, WAV, MP4, AAC (max 50MB)
                  </div>
                </div>
              ) : (
                <div className={styles.uploadedFile}>
                  {isAnalyzingMusic ? (
                    <div className={styles.analyzingMusic}>
                      <span>🎵 Analyzing {audioFileName}...</span>
                      <div className={styles.loadingDots}>
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  ) : musicAnalysis ? (
                    <div className={styles.analyzedMusic}>
                      <span className={styles.fileName}>✅ {audioFileName}</span>
                      <span className={styles.fileSize}>
                        ({audioFile ? (audioFile.size / 1024 / 1024).toFixed(1) : '0'}MB)
                      </span>
                      <div className={styles.musicAnalysisInfo}>
                        🎵 {musicAnalysis.musicAnalysis.bpm} BPM • {musicAnalysis.trackMetadata.duration.toFixed(1)}s
                      </div>
                    </div>
                  ) : (
                    <div className={styles.uploadedFile}>
                      <span className={styles.fileName}>✅ {audioFileName}</span>
                      <span className={styles.fileSize}>
                        ({(audioFile.size / 1024 / 1024).toFixed(1)}MB)
                      </span>
                    </div>
                  )}
                </div>
              )}
              
              {musicUploadError && (
                <div className={styles.uploadError}>
                  {musicUploadError}
                </div>
              )}
            </div>
          )}
          
          <div className={styles.inputWrapper}>
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={pipelineState.isRunning ? "Pipeline is running..." : "Type a message..."}
              className={styles.messageInput}
              rows={1}
              disabled={isLoading || pipelineState.isRunning}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() || isLoading || pipelineState.isRunning}
              className={styles.sendButton}
            >
              Send
            </button>
          </div>
          
          {canProceed && !pipelineState.isRunning && (
            <button
              onClick={handleReadyToProceed}
              disabled={isAnalyzing}
              className={styles.proceedButton}
            >
              {isAnalyzing ? 'Analyzing Requirements...' : '✓ I\'m Ready - Analyze My Requirements'}
            </button>
          )}
          
          {/* Requirements detection display */}
          {Object.keys(extractedRequirements).some(key => extractedRequirements[key as keyof ExtractedRequirements] !== null) && (
            <div className={styles.requirementsDisplay}>
              <div className={styles.requirementsTitle}>Detected Requirements:</div>
              <div className={styles.requirementsList}>
                {extractedRequirements.duration && <span className={styles.requirementTag}>Duration: {extractedRequirements.duration}s</span>}
                {extractedRequirements.style && <span className={styles.requirementTag}>Style: {extractedRequirements.style}</span>}
                {extractedRequirements.pacing && <span className={styles.requirementTag}>Pacing: {extractedRequirements.pacing}</span>}
                {extractedRequirements.hasMusic !== null && <span className={styles.requirementTag}>Music: {extractedRequirements.hasMusic ? 'Yes' : 'No'}</span>}
                {extractedRequirements.hasNarration !== null && <span className={styles.requirementTag}>Narration: {extractedRequirements.hasNarration ? 'Yes' : 'No'}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
