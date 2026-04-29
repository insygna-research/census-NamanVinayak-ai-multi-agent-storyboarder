'use client';

import { useState } from 'react';
import styles from './page.module.css';

interface PipelineResponse {
  detected_video_type?: string;
  routing_decision?: string;
  next_stage?: string;
  stage_output?: any;
  images?: string[];
  error?: string;
}

export default function UniversalVideoChat() {
  const [messages, setMessages] = useState<Array<{role: string, content: string}>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentStage, setCurrentStage] = useState('router');
  const [pipelineData, setPipelineData] = useState<any>(null);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Start with pipeline router
      const response = await fetch('/api/pipeline-router', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: [...messages, userMessage].map(m => `${m.role}: ${m.content}`).join('\n'),
          user_request: input
        })
      });

      const data: PipelineResponse = await response.json();
      
      if (data.error) {
        setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${data.error}` }]);
        return;
      }

      // Add router response
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Detected: ${data.detected_video_type}\nRouting: ${data.routing_decision}` 
      }]);

      // If music video detected, continue pipeline
      if (data.detected_video_type === 'music_video' && data.next_stage) {
        setPipelineData(data);
        setCurrentStage(data.next_stage);
        await continueMusikVideoPipeline(data, [...messages, userMessage]);
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Error: ${error}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  const continueMusikVideoPipeline = async (data: any, conversation: any[]) => {
    try {
      // Vision Understanding (Stage 1)
      setMessages(prev => [...prev, { role: 'system', content: 'Running Vision Understanding...' }]);
      
      const visionResponse = await fetch('/api/vision-understanding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput: conversation.map(m => `${m.role}: ${m.content}`).join('\n'),
          conversationHistory: conversation
        })
      });

      const visionData = await visionResponse.json();
      
      if (visionData.needs_clarification) {
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: `Vision clarification needed: ${visionData.stage1_vision_analysis?.requires_user_clarification}` 
        }]);
        return;
      }

      // Music Producer (Stage 3) - Skip Stage 2 Music Analysis for now
      setMessages(prev => [...prev, { role: 'system', content: 'Running Music Producer...' }]);
      
      // Mock music analysis for now
      const mockMusicAnalysis = {
        bpm: 120,
        beats: [0, 0.5, 1.0, 1.5, 2.0],
        downbeats: [0, 2.0, 4.0],
        sections: [{ start: 0, end: 60, type: 'main' }],
        natural_cut_points: [4, 8, 12, 16, 20, 24],
        phrase_boundaries: [8, 16, 24, 32],
        emotional_peaks: [{ time: 30, intensity: 0.8 }],
        total_duration: 180,
        intensity_curve: [0.3, 0.5, 0.7, 0.8, 0.6]
      };
      
      const producerResponse = await fetch('/api/music-producer-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vision_document: visionData.stage1_vision_analysis?.vision_document,
          music_analysis: mockMusicAnalysis
        })
      });

      const producerData = await producerResponse.json();

      // Music Director (Stage 4)
      setMessages(prev => [...prev, { role: 'system', content: 'Running Music Director...' }]);
      
      const directorResponse = await fetch('/api/music-director-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversation: conversation.map(m => `${m.role}: ${m.content}`).join('\n'),
          music_analysis: mockMusicAnalysis,
          vision_document: visionData.stage1_vision_analysis?.vision_document,
          producer_output: producerData.stage_output
        })
      });

      const directorData = await directorResponse.json();
      
      // Music DoP (Stage 5)
      setMessages(prev => [...prev, { role: 'system', content: 'Running Music DoP...' }]);
      
      const dopResponse = await fetch('/api/music-dop-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          director_output: directorData.stage_output || directorData.response,
          music_analysis: data.music_analysis || 'No music analysis available'
        })
      });

      const dopData = await dopResponse.json();

      // Prompt Engineer (Stage 6)
      setMessages(prev => [...prev, { role: 'system', content: 'Running Prompt Engineer...' }]);
      
      const promptResponse = await fetch('/api/music-prompt-engineer-agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dop_output: dopData.stage_output || dopData.response,
          music_context: data.music_analysis || 'No music analysis available'
        })
      });

      const promptData = await promptResponse.json();

      // Image Generation Orchestrator (Stage 7)
      setMessages(prev => [...prev, { role: 'system', content: 'Generating Images...' }]);
      
      const orchestratorResponse = await fetch('/api/music-video-orchestrator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          flux_prompts: promptData.stage_output?.flux_prompts || promptData.flux_prompts || [],
          music_analysis: data.music_analysis || 'No music analysis available'
        })
      });

      const orchestratorData = await orchestratorResponse.json();

      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `Pipeline Complete! Generated ${orchestratorData.images?.length || 0} images` 
      }]);

      if (orchestratorData.images?.length > 0) {
        setMessages(prev => [...prev, { 
          role: 'images', 
          content: JSON.stringify(orchestratorData.images) 
        }]);
      }

    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Pipeline Error: ${error}` }]);
    }
  };

  return (
    <div className={styles.container}>
      <h1>Universal Video Pipeline Chat</h1>
      
      <div className={styles.chatContainer}>
        {messages.map((message, index) => (
          <div key={index} className={`${styles.message} ${styles[message.role]}`}>
            <strong>{message.role}:</strong>
            {message.role === 'images' ? (
              <div className={styles.imageGrid}>
                {JSON.parse(message.content).map((img: string, i: number) => (
                  <img key={i} src={img} alt={`Generated ${i}`} className={styles.generatedImage} />
                ))}
              </div>
            ) : (
              <pre>{message.content}</pre>
            )}
          </div>
        ))}
        {isLoading && <div className={styles.loading}>Processing...</div>}
      </div>

      <div className={styles.inputContainer}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Describe the video you want to create..."
          className={styles.input}
        />
        <button onClick={handleSendMessage} disabled={isLoading} className={styles.button}>
          Send
        </button>
      </div>

      <div className={styles.stageIndicator}>
        Current Stage: {currentStage}
      </div>
    </div>
  );
}