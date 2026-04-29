/**
 * ScriptModeUserContext - Parallel to Vision Enhanced UserContext
 * Contains user's exact script + preferences for intelligent agent processing
 */

export interface ScriptModeUserContext {
  // Original user input without any interpretation  
  originalScript: string;  // The exact script as user pasted it
  originalPrompt?: string; // Any additional context user provided
  
  // User-selected settings from the UI
  settings: {
    calculatedDuration?: number;  // Auto-calculated from TTS generation
    pacing: 'slow' | 'medium' | 'fast';  // 8-10s, 5-7s, 1-4s
    visualStyle: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
    contentType?: string;  // Optional content classification
    voiceSelection?: string;  // For TTS voice selection
  };
  
  // Pipeline metadata
  pipeline: {
    mode: 'enhanced_script' | 'legacy_script';
    timestamp: string;  // ISO timestamp when request was initiated
    sessionId: string;  // Unique session identifier
  };
  
  // Constraints for agent compliance
  constraints: {
    scriptFidelity: 'exact';     // Must use exact script content
    adaptToTTSDuration: boolean; // Must adapt cuts to actual TTS duration
  };
  
  // Script-specific context (populated by Script Formatting Agent)
  scriptContext?: {
    formatted_script_for_tts: string;  // Cleaned spoken text only
    script_analysis: {
      content_type: 'educational' | 'commercial' | 'narrative' | 'tutorial';
      speaker_count: number;
      natural_breaks: string[];
      emphasis_points: string[];
      engagement_opportunities: string[];
    };
  };
}

export interface ScriptFormattingOutput {
  formatted_script_for_tts: string;
  script_analysis: {
    content_type: 'educational' | 'commercial' | 'narrative' | 'tutorial';
    speaker_count: number;
    natural_breaks: string[];
    emphasis_points: string[];
    engagement_opportunities: string[];
  };
}