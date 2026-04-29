/**
 * UserContext - Universal context passed to all agents containing user requirements
 * This ensures all agents have direct access to what the user actually requested
 */

export interface UserContext {
  // Original user input without any interpretation
  originalPrompt: string;
  
  // User-selected settings from the UI
  settings: {
    duration: number;  // 15, 30, 60, 90 seconds
    pacing: 'slow' | 'medium' | 'fast';
    visualStyle: 'cinematic' | 'documentary' | 'artistic' | 'minimal';
    contentType?: string;  // Optional content classification
    voiceSelection?: string;  // For TTS voice selection
  };
  
  // Pipeline metadata
  pipeline: {
    mode: 'vision_enhanced' | 'legacy_script' | 'music_video' | 'no_music';
    timestamp: string;  // ISO timestamp when request was initiated
    sessionId: string;  // Unique session identifier
  };
  
  // Constraints for agent compliance
  constraints: {
    mustMatchDuration: boolean;  // Whether to enforce strict duration matching
    durationTolerance: number;  // Percentage tolerance (fixed at 5)
  };
}