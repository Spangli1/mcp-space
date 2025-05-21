import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { path: dirPath } = await req.json();
    
    if (!dirPath) {
      return NextResponse.json({ success: false, error: 'No path provided' }, { status: 400 });
    }

    // Ensure the path is safe
    const safePath = path.join(process.cwd(), dirPath);
    
    // Create directory recursively if it doesn't exist
    if (!fs.existsSync(safePath)) {
      fs.mkdirSync(safePath, { recursive: true });
    }
    
    return NextResponse.json({ success: true, path: dirPath });
  } catch (error) {
    console.error('Error creating directory:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
