import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import path from 'path';
import util from 'util';
import fs from 'fs';

const execPromise = util.promisify(exec);

// Extended timeout for deployment operations
const EXEC_TIMEOUT = 300000; // 5 minutes

export async function POST(req: Request) {
  try {
    const { path: deployPath } = await req.json();
    
    if (!deployPath) {
      return NextResponse.json({ success: false, error: 'No deployment path provided' }, { status: 400 });
    }

    // Ensure the path is safe and exists
    const safePath = path.join(process.cwd(), deployPath);
    
    if (!fs.existsSync(safePath)) {
      return NextResponse.json({ success: false, error: 'Deployment path does not exist' }, { status: 400 });
    }
    
    // Create log file for the deployment process
    const logPath = path.join(safePath, 'deployment.log');
    
    // Log deployment start
    fs.writeFileSync(logPath, `Deployment started: ${new Date().toISOString()}\n`, 'utf8');
    
    try {
      // Log step
      fs.appendFileSync(logPath, `\nInstalling dependencies...\n`, 'utf8');
      
      // Install dependencies first
      const installResult = await execPromise(`cd "${safePath}" && npm install`, { 
        timeout: EXEC_TIMEOUT,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for output
      });
      
      fs.appendFileSync(logPath, `npm install stdout:\n${installResult.stdout}\n`, 'utf8');
      
      if (installResult.stderr) {
        fs.appendFileSync(logPath, `npm install stderr:\n${installResult.stderr}\n`, 'utf8');
      }
      
      // Log step
      fs.appendFileSync(logPath, `\nDeploying with wrangler...\n`, 'utf8');
      
      // Run wrangler deploy command
      const deployResult = await execPromise(`cd "${safePath}" && npx wrangler deploy`, { 
        timeout: EXEC_TIMEOUT,
        maxBuffer: 1024 * 1024 * 10 // 10MB buffer for output
      });
      
      fs.appendFileSync(logPath, `wrangler deploy stdout:\n${deployResult.stdout}\n`, 'utf8');
      
      if (deployResult.stderr) {
        fs.appendFileSync(logPath, `wrangler deploy stderr:\n${deployResult.stderr}\n`, 'utf8');
      }
      
      // Extract deployment URL from output
      // Cloudflare Workers URLs typically follow the pattern: https://[name].[account].workers.dev
      const urlRegex = /https:\/\/[a-zA-Z0-9-]+\.workers\.dev/;
      const urlMatch = deployResult.stdout.match(urlRegex);
      const deploymentUrl = urlMatch ? urlMatch[0] : '';
      
      // Extract additional deployment information
      const deployInfoMatch = deployResult.stdout.match(/Published\s+([^\s]+)\s+\(([^)]+)\)/);
      const deployInfo = deployInfoMatch ? {
        name: deployInfoMatch[1],
        version: deployInfoMatch[2]
      } : null;
      
      // Log completion
      fs.appendFileSync(logPath, `\nDeployment completed: ${new Date().toISOString()}\n`, 'utf8');
      fs.appendFileSync(logPath, `Deployment URL: ${deploymentUrl}\n`, 'utf8');
      
      // Check for errors
      if (deployResult.stderr && !deploymentUrl) {
        console.error('Deployment stderr:', deployResult.stderr);
        return NextResponse.json({ 
          success: false, 
          error: deployResult.stderr || 'Unknown error during deployment',
          output: deployResult.stdout,
          logPath
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        url: deploymentUrl,
        deployInfo,
        output: deployResult.stdout,
        logPath
      });
    } catch (execError: any) {
      console.error('Execution error:', execError);
      
      // Log error
      fs.appendFileSync(logPath, `\nDEPLOYMENT ERROR: ${new Date().toISOString()}\n`, 'utf8');
      fs.appendFileSync(logPath, `Error message: ${execError.message || 'Unknown error'}\n`, 'utf8');
      
      if (execError.stdout) {
        fs.appendFileSync(logPath, `Error stdout:\n${execError.stdout}\n`, 'utf8');
      }
      
      if (execError.stderr) {
        fs.appendFileSync(logPath, `Error stderr:\n${execError.stderr}\n`, 'utf8');
      }
      
      return NextResponse.json({ 
        success: false, 
        error: execError.message || 'Execution error',
        stdout: execError.stdout || '',
        stderr: execError.stderr || '',
        logPath
      });
    }
  } catch (error) {
    console.error('Error in deployment API:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error) 
    }, { status: 500 });
  }
}
