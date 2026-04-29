import React from 'react';
import styles from './PipelineProgress.module.css';

interface Stage {
  name: string;
  agent: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  duration?: number;
}

interface PipelineProgressProps {
  pipeline: string;
  stages: Stage[];
  currentStage?: string;
  generatedImages?: string[];
  imageGenerationProgress?: {
    currentIndex: number;
    totalImages: number;
    percentage: number;
    isGenerating: boolean;
    message: string;
  };
}

export default function PipelineProgress({ 
  pipeline, 
  stages, 
  currentStage,
  generatedImages = [],
  imageGenerationProgress
}: PipelineProgressProps) {
  const getPipelineTitle = () => {
    const titles = {
      'SCRIPT_MODE': 'Creating Video from Script',
      'VISION_ENHANCED': 'Creating Narrated Video',
      'MUSIC_VIDEO': 'Creating Music Video',
      'NO_MUSIC_VIDEO': 'Creating Visual Story'
    };
    return titles[pipeline] || 'Processing Video';
  };

  const getAgentIcon = (agentName: string) => {
    if (agentName.includes('Vision')) return '👁️';
    if (agentName.includes('Producer')) return '🎬';
    if (agentName.includes('Director')) return '🎭';
    if (agentName.includes('DoP')) return '📷';
    if (agentName.includes('Prompt')) return '✍️';
    if (agentName.includes('Image')) return '🎨';
    if (agentName.includes('Music')) return '🎵';
    if (agentName.includes('TTS')) return '🗣️';
    if (agentName.includes('Transcription')) return '📝';
    return '🤖';
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return '✅';
      case 'running': return '⚡';
      case 'error': return '❌';
      default: return '⏳';
    }
  };

  const completedStages = stages.filter(s => s.status === 'completed').length;
  const progress = (completedStages / stages.length) * 100;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>{getPipelineTitle()}</h3>
        <div className={styles.progressBar}>
          <div 
            className={styles.progressFill} 
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className={styles.progressText}>
          {completedStages} of {stages.length} stages complete
        </span>
      </div>

      <div className={styles.stages}>
        {stages.map((stage, index) => (
          <div 
            key={stage.name}
            className={`${styles.stage} ${styles[stage.status]}`}
          >
            <div className={styles.stageIcon}>
              {stage.status === 'running' ? (
                <div className={styles.spinner} />
              ) : (
                getStatusIcon(stage.status)
              )}
            </div>
            
            <div className={styles.stageContent}>
              <div className={styles.stageName}>
                <span className={styles.agentIcon}>{getAgentIcon(stage.agent)}</span>
                {stage.agent}
              </div>
              {stage.status === 'running' && (
                <div className={styles.stageStatus}>Processing...</div>
              )}
              {stage.status === 'completed' && stage.duration && (
                <div className={styles.stageDuration}>
                  {(stage.duration / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Image Generation Progress */}
      {imageGenerationProgress && imageGenerationProgress.isGenerating && (
        <div className={styles.imageGenerationProgress}>
          <h4 className={styles.progressTitle}>🎨 Image Generation Progress</h4>
          <div className={styles.progressBar}>
            <div 
              className={styles.progressFill} 
              style={{ width: `${imageGenerationProgress.percentage}%` }}
            />
          </div>
          <div className={styles.progressText}>
            {imageGenerationProgress.message}
          </div>
        </div>
      )}

      {/* Generated Images Display */}
      {generatedImages.length > 0 && (
        <div className={styles.imagesPreview}>
          <h4 className={styles.imagesTitle}>
            Generated Images ({generatedImages.length}{imageGenerationProgress?.totalImages ? `/${imageGenerationProgress.totalImages}` : ''})
          </h4>
          <div className={styles.imagesGrid}>
            {generatedImages.map((image, index) => (
              <div key={index} className={styles.imageWrapper}>
                <img 
                  src={image} 
                  alt={`Generated ${index + 1}`}
                  className={styles.image}
                  onLoad={() => console.log(`🖼️ Image ${index + 1} loaded: ${image}`)}
                />
                <div className={styles.imageIndex}>{index + 1}</div>
              </div>
            ))}
            {/* Show placeholder boxes for remaining images */}
            {imageGenerationProgress?.isGenerating && generatedImages.length < imageGenerationProgress.totalImages && (
              <>
                {Array.from({ length: imageGenerationProgress.totalImages - generatedImages.length }).map((_, index) => (
                  <div key={`placeholder-${index}`} className={`${styles.imageWrapper} ${styles.placeholder}`}>
                    <div className={styles.placeholderContent}>
                      <div className={styles.spinner} />
                      <span>{generatedImages.length + index + 1}</span>
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}