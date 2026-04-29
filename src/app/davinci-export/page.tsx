"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import styles from "../page.module.css";

interface ImageInfo {
  name: string;
  path: string;
  url: string;
  size: number;
  created: string;
}

interface XMLInfo {
  success: boolean;
  message: string;
  xmlPath: string;
  absolutePath: string;
  downloadUrl: string;
  imageCount: number;
}

export default function DaVinciExport() {
  const [images, setImages] = useState<ImageInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [xmlGenerated, setXmlGenerated] = useState(false);
  const [xmlInfo, setXmlInfo] = useState<XMLInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load list of images from API
    fetchImages();
  }, []);

  const fetchImages = async () => {
    try {
      const response = await fetch("/api/list-images");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch images");
      }
      
      const data = await response.json();
      setImages(data.images);
    } catch (err) {
      console.error("Error fetching images:", err);
      setError(err instanceof Error ? err.message : "Failed to load images");
    }
  };

  const generateXML = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/generate-davinci-xml");
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate XML");
      }
      
      const data = await response.json();
      setXmlInfo(data);
      setXmlGenerated(true);
    } catch (err) {
      console.error("Error generating XML:", err);
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setLoading(false);
    }
  };

  const downloadXML = () => {
    if (!xmlInfo) return;
    
    // Create a link to download the XML
    const a = document.createElement("a");
    a.href = xmlInfo.downloadUrl;
    a.download = "davinci_resolve_timeline.fcpxml";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>DaVinci Resolve XML Export</h1>
        <Link href="/" className={styles.backLink}>
          Back to Home
        </Link>
      </header>

      <main className={styles.main}>
        <section className={styles.section}>
          <h2>Create DaVinci Resolve XML</h2>
          <p>
            Generate a DaVinci Resolve compatible XML file using the images created in the previous steps.
            This file can be imported into DaVinci Resolve to create a timeline with all images in sequence.
          </p>
          
          <div className={styles.actions}>
            <button 
              className={styles.button} 
              onClick={generateXML}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate DaVinci Resolve XML"}
            </button>
          </div>
          
          {error && <div className={styles.error}>{error}</div>}
          
          {xmlGenerated && xmlInfo && (
            <div className={styles.result}>
              <h3>XML Generated Successfully!</h3>
              <p>Your DaVinci Resolve XML file has been created with {xmlInfo.imageCount} images.</p>
              
              <div className={styles.actions}>
                <button 
                  className={styles.button} 
                  onClick={downloadXML}
                >
                  Download XML
                </button>
                <p className={styles.filePath}>
                  File saved at: {xmlInfo.absolutePath}
                </p>
              </div>
            </div>
          )}
        </section>
        
        <section className={styles.section}>
          <h2>Available Images ({images.length})</h2>
          <div className={styles.imageGrid}>
            {images.map((image, index) => (
              <div key={index} className={styles.imageCard}>
                <img 
                  src={image.url} 
                  alt={`Image ${index + 1}`} 
                  className={styles.thumbnail}
                />
                <p>{image.name}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
} 