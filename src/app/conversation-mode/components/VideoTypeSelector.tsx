import React from 'react';
import styles from './VideoTypeSelector.module.css';

interface VideoTypeSelectorProps {
  onSelect: (type: 'music_only' | 'voiceover_music' | 'pure_visuals') => void;
}

export default function VideoTypeSelector({ onSelect }: VideoTypeSelectorProps) {
  const handleSelect = (type: 'music_only' | 'voiceover_music' | 'pure_visuals') => {
    console.log('🎬 VideoTypeSelector: Selected type:', type);
    onSelect(type);
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.container}>
        <h2 className={styles.title}>
          Would you like background music or a voiceover in the video?
        </h2>
        
        <div className={styles.options}>
          <button 
            className={styles.optionCard}
            onClick={() => handleSelect('music_only')}
          >
            <div className={styles.iconWrapper}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 18V6L20 8V16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="10" cy="18" r="2" stroke="currentColor" strokeWidth="2"/>
                <circle cx="18" cy="16" r="2" stroke="currentColor" strokeWidth="2"/>
              </svg>
            </div>
            <h3 className={styles.optionTitle}>Music only</h3>
            <p className={styles.optionDescription}>
              Create a music video with visuals synced to your soundtrack
            </p>
          </button>

          <button 
            className={styles.optionCard}
            onClick={() => handleSelect('voiceover_music')}
          >
            <div className={styles.iconWrapper}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1C8.5 1 6 4 6 8V12C6 15.5 8.5 18 12 18C15.5 18 18 15.5 18 12V8C18 4 15.5 1 12 1Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 18V22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M8 22H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 10V8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M20 16V14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <h3 className={styles.optionTitle}>Voiceover and background music</h3>
            <p className={styles.optionDescription}>
              Narrated content with atmospheric music enhancement
            </p>
          </button>

          <button 
            className={styles.optionCard}
            onClick={() => handleSelect('pure_visuals')}
          >
            <div className={styles.iconWrapper}>
              <svg className={styles.icon} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2"/>
                <path d="M3 9L12 16L21 9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="8.5" cy="7" r="1.5" fill="currentColor"/>
              </svg>
            </div>
            <h3 className={styles.optionTitle}>Pure visuals</h3>
            <p className={styles.optionDescription}>
              Silent visual storytelling without audio elements
            </p>
          </button>
        </div>

        <button 
          className={styles.skipButton}
          onClick={() => handleSelect('voiceover_music')}
        >
          Continue to chat
        </button>
      </div>
    </div>
  );
}