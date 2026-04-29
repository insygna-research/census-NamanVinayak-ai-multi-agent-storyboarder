import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

/**
 * Initialize a new project for a script
 * Creates a unique folder to store all related assets (audio, images, XML)
 */
export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    const { script } = body;
    
    if (!script || typeof script !== 'string') {
      return NextResponse.json({ error: 'Script is required' }, { status: 400 });
    }
    
    // Generate a unique folder ID
    const folderId = generateUniqueFolderId();
    console.log(`Initializing project with folder ID: ${folderId}`);
    
    // Create the directory for this script's assets
    const publicDir = path.join(process.cwd(), 'public', folderId);
    
    try {
      await fs.mkdir(publicDir, { recursive: true });
      console.log(`Created directory: ${publicDir}`);
      
      // Optionally save the original script as a text file for reference
      await fs.writeFile(path.join(publicDir, 'original-script.txt'), script);
    } catch (error) {
      console.error('Error creating directory:', error);
      return NextResponse.json({ error: 'Failed to create project directory' }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      folderId,
      message: 'Project initialized successfully'
    });
    
  } catch (error) {
    console.error('Error in init-project endpoint:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
    return NextResponse.json({
      error: errorMessage
    }, { status: 500 });
  }
}

/**
 * Generates a unique folder ID based on timestamp and random data
 */
function generateUniqueFolderId(): string {
  const timestamp = new Date().getTime();
  const randomBytes = crypto.randomBytes(4).toString('hex');
  return `script-${timestamp}-${randomBytes}`;
} 