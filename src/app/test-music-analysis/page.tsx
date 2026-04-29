'use client';

import React, { useState } from 'react';
import styles from './page.module.css';

interface MusicAnalysisState {
  loading: boolean;
  error: string | null;
  analysisResult: any;
  executionTime: number;
  fileName: string;
}

export default function TestMusicAnalysisPage() {
  const [state, setState] = useState<MusicAnalysisState>({
    loading: false,
    error: null,
    analysisResult: null,
    executionTime: 0,
    fileName: ''
  });

  const [audioFile, setAudioFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = ['audio/mp3', 'audio/wav', 'audio/mpeg', 'audio/mp4', 'audio/aac'];
      if (!allowedTypes.includes(file.type)) {
        setState(prev => ({ 
          ...prev, 
          error: `Unsupported file type: ${file.type}. Please use MP3, WAV, MP4, or AAC files.` 
        }));
        return;
      }
      
      // Validate file size (max 50MB)
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        setState(prev => ({ 
          ...prev, 
          error: `File too large: ${(file.size / 1024 / 1024).toFixed(1)}MB. Maximum size is 50MB.` 
        }));
        return;
      }

      setAudioFile(file);
      setState(prev => ({ ...prev, error: null, fileName: file.name }));
    }
  };

  const analyzeMusic = async () => {
    if (!audioFile) {
      setState(prev => ({ ...prev, error: 'Please select an audio file first' }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));
    const startTime = Date.now();

    try {
      const formData = new FormData();
      formData.append('audio', audioFile);
      formData.append('musicPreference', 'upload');
      
      // Create a mock vision document for testing
      const mockVisionDocument = {
        core_concept: "Test analysis",
        emotion_arc: ["testing", "analysis", "validation"],
        pacing: "moderate",
        visual_style: "cinematic",
        duration: 30,
        content_classification: { type: "abstract_thematic" },
        music_mood_hints: ["analytical", "testing"]
      };
      
      formData.append('visionDocument', JSON.stringify(mockVisionDocument));

      const response = await fetch('/api/music-analysis', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();
      const executionTime = Date.now() - startTime;
      
      if (result.success) {
        setState(prev => ({
          ...prev,
          loading: false,
          analysisResult: result,
          executionTime
        }));
      } else {
        throw new Error(result.error || 'Music analysis failed');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Analysis failed: ${error}`,
        executionTime: Date.now() - startTime
      }));
    }
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1>🎵 Advanced Music Analysis Test</h1>
        <p>Test the enhanced music analysis features for user-uploaded audio</p>
      </header>

      <div className={styles.uploadSection}>
        <h2>Upload Audio File</h2>
        <div className={styles.fileUploadContainer}>
          <input
            type="file"
            accept="audio/mp3,audio/wav,audio/mpeg,audio/mp4,audio/aac"
            onChange={handleFileChange}
            className={styles.fileInput}
          />
          {state.fileName && (
            <div className={styles.uploadedFile}>
              <span>✅ {state.fileName}</span>
              <button 
                onClick={() => {
                  setAudioFile(null);
                  setState(prev => ({ ...prev, fileName: '', error: null, analysisResult: null }));
                }}
                className={styles.removeFile}
              >
                ✕
              </button>
            </div>
          )}
        </div>

        <button 
          onClick={analyzeMusic}
          disabled={!audioFile || state.loading}
          className={styles.analyzeButton}
        >
          {state.loading ? '🔄 Analyzing...' : '🎯 Analyze Music'}
        </button>
      </div>

      {state.error && (
        <div className={styles.error}>
          <h3>❌ Error</h3>
          <p>{state.error}</p>
        </div>
      )}

      {state.loading && (
        <div className={styles.loadingIndicator}>
          <div className={styles.spinner}></div>
          <p>Performing advanced music analysis...</p>
        </div>
      )}

      {state.analysisResult && (
        <div className={styles.results}>
          <h2>📊 Analysis Results</h2>
          <div className={styles.executionStats}>
            <div className={styles.stat}>
              <strong>Execution Time:</strong> {state.executionTime}ms
            </div>
            <div className={styles.stat}>
              <strong>Analysis Status:</strong> {state.analysisResult.success ? '✅ Success' : '❌ Failed'}
            </div>
          </div>

          {/* Basic Track Info */}
          <div className={styles.section}>
            <h3>🎵 Track Information</h3>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <strong>File:</strong> {state.analysisResult.stage2_music_analysis?.trackMetadata?.title}
              </div>
              <div className={styles.dataItem}>
                <strong>Duration:</strong> {state.analysisResult.stage2_music_analysis?.trackMetadata?.duration?.toFixed(1)}s
              </div>
              <div className={styles.dataItem}>
                <strong>Source:</strong> {state.analysisResult.stage2_music_analysis?.trackMetadata?.source}
              </div>
            </div>
          </div>

          {/* Enhanced Tempo Analysis */}
          <div className={styles.section}>
            <h3>🥁 Enhanced Tempo Analysis</h3>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <strong>BPM:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.bpm?.toFixed(1)}
              </div>
              <div className={styles.dataItem}>
                <strong>Tempo Stability:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.tempoStability?.toFixed(3)}
              </div>
              <div className={styles.dataItem}>
                <strong>Beat Count:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.beats?.length}
              </div>
              <div className={styles.dataItem}>
                <strong>Downbeat Count:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.downbeats?.length}
              </div>
            </div>
            
            {state.analysisResult.stage2_music_analysis?.musicAnalysis?.tempoVariations?.length > 0 && (
              <div className={styles.tempoVariations}>
                <h4>Tempo Changes Detected:</h4>
                {state.analysisResult.stage2_music_analysis.musicAnalysis.tempoVariations.map((variation: any, index: number) => (
                  <div key={index} className={styles.variation}>
                    <strong>@{variation.time?.toFixed(1)}s:</strong> {variation.fromBpm?.toFixed(1)} → {variation.toBpm?.toFixed(1)} BPM 
                    (Δ{variation.change?.toFixed(1)})
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Harmonic Analysis */}
          <div className={styles.section}>
            <h3>🎼 Harmonic Analysis</h3>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <strong>Key:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.key || 'Unknown'}
              </div>
              <div className={styles.dataItem}>
                <strong>Mode:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.mode || 'Unknown'}
              </div>
              <div className={styles.dataItem}>
                <strong>Key Confidence:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.keyConfidence?.toFixed(3)}
              </div>
              <div className={styles.dataItem}>
                <strong>Harmonic Complexity:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.harmonicComplexity?.toFixed(3)}
              </div>
            </div>
          </div>

          {/* Spectral Features */}
          <div className={styles.section}>
            <h3>🌊 Spectral Features</h3>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <strong>Spectral Centroid Frames:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.spectralCentroid?.length || 'N/A'}
              </div>
              <div className={styles.dataItem}>
                <strong>Zero Crossing Rate Frames:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.zeroCrossingRate?.length || 'N/A'}
              </div>
              <div className={styles.dataItem}>
                <strong>Intensity Curve Points:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.intensityCurve?.length}
              </div>
              <div className={styles.dataItem}>
                <strong>Emotional Peaks:</strong> {state.analysisResult.stage2_music_analysis?.musicAnalysis?.emotionalPeaks?.length}
              </div>
            </div>
          </div>

          {/* Musical Structure */}
          <div className={styles.section}>
            <h3>🏗️ Musical Structure</h3>
            <div className={styles.structureGrid}>
              {Object.entries(state.analysisResult.stage2_music_analysis?.musicAnalysis?.sections || {}).map(([section, times]: [string, any]) => (
                <div key={section} className={styles.structureItem}>
                  <strong>{section.toUpperCase()}:</strong> {Array.isArray(times) ? `${times[0]?.toFixed(1)}s - ${times[1]?.toFixed(1)}s` : 'N/A'}
                </div>
              ))}
            </div>
          </div>

          {/* Producer Output */}
          <div className={styles.section}>
            <h3>🎬 Producer Analysis</h3>
            <div className={styles.dataGrid}>
              <div className={styles.dataItem}>
                <strong>Segment Start:</strong> {state.analysisResult.stage3_producer_output?.segmentSelection?.startTime?.toFixed(1)}s
              </div>
              <div className={styles.dataItem}>
                <strong>Segment End:</strong> {state.analysisResult.stage3_producer_output?.segmentSelection?.endTime?.toFixed(1)}s
              </div>
              <div className={styles.dataItem}>
                <strong>Total Cuts:</strong> {state.analysisResult.stage3_producer_output?.cutStrategy?.totalCuts}
              </div>
              <div className={styles.dataItem}>
                <strong>Avg Cut Length:</strong> {state.analysisResult.stage3_producer_output?.cutStrategy?.averageCutLength?.toFixed(1)}s
              </div>
            </div>
          </div>

          {/* Cut Points Preview */}
          {state.analysisResult.stage3_producer_output?.cutPoints && (
            <div className={styles.section}>
              <h3>✂️ Cut Points (Producer Output)</h3>
              <div className={styles.cutPointsGrid}>
                {state.analysisResult.stage3_producer_output.cutPoints.slice(0, 10).map((cut: any, index: number) => (
                  <div key={index} className={styles.cutPoint}>
                    <div className={styles.cutNumber}>#{cut.cutNumber || index + 1}</div>
                    <div className={styles.cutTime}>{cut.cutTime?.toFixed(2)}s</div>
                    <div className={styles.cutReason}>{cut.reason || 'Musical alignment'}</div>
                  </div>
                ))}
                {state.analysisResult.stage3_producer_output.cutPoints.length > 10 && (
                  <div className={styles.cutPoint}>
                    <div className={styles.cutNumber}>...</div>
                    <div className={styles.cutTime}>+{state.analysisResult.stage3_producer_output.cutPoints.length - 10} more</div>
                    <div className={styles.cutReason}>See raw data</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Raw Data Display */}
          <div className={styles.section}>
            <h3>🔍 Raw Analysis Data</h3>
            <details className={styles.rawDataDetails}>
              <summary>Complete Music Analysis Output</summary>
              <pre className={styles.rawDataPre}>
                {JSON.stringify(state.analysisResult, null, 2)}
              </pre>
            </details>
          </div>
        </div>
      )}
    </div>
  );
}