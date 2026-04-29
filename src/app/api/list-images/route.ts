import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

/**
 * API endpoint to list all generated images
 */
export async function GET() {
  try {
    // Default path for generated images
    const imageDir = path.join(process.cwd(), 'public', 'generated-images');
    
    // Check if directory exists
    if (!fs.existsSync(imageDir)) {
      return NextResponse.json(
        { error: 'Generated images directory not found' },
        { status: 404 }
      );
    }
    
    // Read all files in the directory
    const files = fs.readdirSync(imageDir);
    
    // Filter for image files and sort them
    const imageFiles = files
      .filter(file => /\.(jpg|jpeg|png|gif|bmp)$/i.test(file))
      .sort((a, b) => {
        // Extract numbers from filenames for natural sorting
        const numA = parseInt(a.match(/\d+/)?.[0] || '0', 10);
        const numB = parseInt(b.match(/\d+/)?.[0] || '0', 10);
        return numA - numB;
      });
    
    // Create image objects with metadata
    const images = imageFiles.map(file => {
      const filePath = path.join(imageDir, file);
      const stats = fs.statSync(filePath);
      
      return {
        name: file,
        path: `/generated-images/${file}`,
        url: `/generated-images/${file}`,
        size: stats.size,
        created: stats.birthtime
      };
    });
    
    // Return the list of images
    return NextResponse.json({
      success: true,
      count: images.length,
      images
    });
  } catch (error: unknown) {
    console.error('Error listing images:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to list images', details: errorMessage },
      { status: 500 }
    );
  }
} 