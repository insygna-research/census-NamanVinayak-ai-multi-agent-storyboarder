'use client';

import { useState, useEffect } from 'react';
import styles from './page.module.css';

export default function TestFormat() {
  const [script, setScript] = useState<string>('Have you ever been alone at night and heard something outside your door? On 5/12/2023 at 21:45, I experienced something strange that changed my life forever.');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [formattedScript, setFormattedScript] = useState<string | null>(null);
  const [processingStage, setProcessingStage] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [loadingDots, setLoadingDots] = useState<string>('');
  const [stats, setStats] = useState<{
    scriptLength?: number;
    formattedLength?: number;
    formattingTime?: number;
  } | null>(null);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setFormattedScript(null);
    setStats(null);
    setProcessingStage('Formatting script with Google Gemini');
    setElapsedTime(0);

    try {
      // Start the request
      const response = await fetch('/api/test-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ script }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to format script');
      }

      const data = await response.json();
      
      setProcessingStage('Formatting complete!');
      setFormattedScript(data.formattedScript);
      setStats({
        scriptLength: data.stats?.scriptLength,
        formattedLength: data.stats?.formattedLength,
        formattingTime: data.stats?.formattingTime
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setTimeout(() => {
        setLoading(false);
        setProcessingStage(null);
      }, 1000); // Keep the "Processing complete" message visible for a moment
    }
  };

  // Format time display (mm:ss)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' + secs : secs}`;
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Test Script Formatting</h1>
      <p className={styles.description}>
        This page tests OpenAI GPT-4o-mini for optimizing scripts for TTS.
      </p>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="script" className={styles.label}>Enter Script:</label>
          <textarea
            id="script"
            value={script}
            onChange={(e) => setScript(e.target.value)}
            className={styles.textarea}
            rows={8}
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
          {loading ? 'Formatting...' : 'Format Script'}
        </button>
      </form>

      {processingStage && (
        <div className={styles.processingStage}>
          <div className={styles.progressHeader}>
            <p>{processingStage}{loadingDots}</p>
            <span className={styles.timer}>{formatTime(elapsedTime)}</span>
          </div>
          {loading && (
            <div className={styles.progressBar}>
              <div className={styles.progressIndeterminate}></div>
            </div>
          )}
        </div>
      )}
      
      {error && (
        <div className={styles.error}>
          <h2>Error:</h2>
          <p>{error}</p>
        </div>
      )}
      
      {stats && (
        <div className={styles.stats}>
          <h3>Processing Stats:</h3>
          <ul>
            <li>Original Length: {stats.scriptLength} characters</li>
            <li>Formatted Length: {stats.formattedLength} characters</li>
            <li>Processing Time: {stats.formattingTime} seconds</li>
          </ul>
        </div>
      )}
      
      {formattedScript && (
        <div className={styles.result}>
          <h2>Formatted Script:</h2>
          <div className={styles.formattedScript}>
            {formattedScript}
          </div>
          <button
            onClick={() => {
              navigator.clipboard.writeText(formattedScript);
              alert('Formatted script copied to clipboard!');
            }}
            className={styles.copyButton}
          >
            Copy to Clipboard
          </button>
        </div>
      )}
    </div>
  );
} 