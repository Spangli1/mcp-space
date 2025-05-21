import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST(req: Request) {
  try {
    const { path: filePath, content } = await req.json();
    
    if (!filePath) {
      return NextResponse.json({ success: false, error: 'No file path provided' }, { status: 400 });
    }
    
    if (content === undefined) {
      return NextResponse.json({ success: false, error: 'No content provided' }, { status: 400 });
    }

    // Ensure the path is safe
    const safePath = path.join(process.cwd(), filePath);
    
    // Ensure directory exists
    const dir = path.dirname(safePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(safePath, content, 'utf8');
    
    return NextResponse.json({ success: true, path: filePath });
  } catch (error) {
    console.error('Error writing file:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
