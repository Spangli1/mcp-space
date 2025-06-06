import { writeFileSync } from "fs";
import { join } from "path";
import { execSync } from "child_process";
import { NextResponse } from "next/server";
import tmp from "tmp";
import { deployments, createDeploymentStatus } from "@/utils/deployments-store";

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.files || typeof data.files !== "object") {
      return NextResponse.json(
        { error: "Missing required files" },
        { status: 400 }
      );
    }

    let deploymentId = data.deploymentId;

    console.log("Received deployment ID:", deploymentId);

    // Create a new deployment record with server_id if provided
    const server_id = data.server_id || undefined;
    const deploymentStatus = createDeploymentStatus(deploymentId, server_id);
    deploymentStatus.message = "Preparing deployment files";
    
    // Save to persistent storage
    await deployments.set(deploymentId, deploymentStatus);

    console.log("Deployment set");

    // Start the deployment process in a non-blocking way
    startDeployment(deploymentId, data.files).catch(async (error) => {
      // Update deployment status on error - get fresh data first
      const deployment = await deployments.get(deploymentId);
      if (deployment) {
        deployment.status = "error";
        deployment.error = `Deployment failed: ${
          error instanceof Error ? error.message : String(error)
        }`;
        // Update the deployment in the persistent store
        await deployments.set(deploymentId, deployment);
      }
    });

    // Return the deployment ID immediately
    return NextResponse.json({ 
      deploymentId, 
      message: "Deployment started", 
      server_id: server_id 
    });
  } catch (error) {
    console.error("Error starting deployment:", error);
    return NextResponse.json(
      {
        error: `Error starting deployment: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}

async function startDeployment(
  deploymentId: string,
  files: Record<string, string>
) {
  // Get the current deployment status
  let deployment = await deployments.get(deploymentId);
  if (!deployment) return;

  try {
    // Update status
    deployment.status = "in-progress";
    deployment.message = "Creating temporary directory";
    
    // Save the updated status
    await deployments.set(deploymentId, deployment);    // Create temp dir (auto-cleaned up when script exits)
    const tmpDir = tmp.dirSync({ unsafeCleanup: true }).name;
    deployment.tmpdir = tmpDir;
    
    // Save the updated status with tmpdir
    await deployments.set(deploymentId, deployment);

    // Update status
    deployment.message = "Writing deployment files";
    await deployments.set(deploymentId, deployment);
    
    // Create src directory for wrangler
    const srcDir = join(tmpDir, "src");
    try {
      // Create src directory if it doesn't exist
      const { mkdirSync } = require("fs");
      mkdirSync(srcDir, { recursive: true });
    } catch (error) {
      console.error("Error creating src directory:", error);
    }
    
    // Write all provided files to the temp directory with proper paths
    Object.entries(files).forEach(([filename, content]) => {
      // Put index file in the src directory as expected by wrangler
      if (filename === "index.ts" || filename === "index.tsx") {
        // Save as index.ts specifically as required by wrangler
        writeFileSync(join(srcDir, "index.ts"), content);
      } else {
        // Other files go in the root directory
        writeFileSync(join(tmpDir, filename), content);
      }
    });

    // Update status
    deployment.message = "Installing dependencies and deploying";
    await deployments.set(deploymentId, deployment);

    try {
      // First install dependencies if package.json exists
      if (files["package.json"]) {
        execSync("npm install", {
          cwd: tmpDir,
          stdio: "pipe",
        });
      }
      
      deployment.message = "Deploying with wrangler...";
      await deployments.set(deploymentId, deployment);

      // Then deploy with wrangler
      const deployOutput = execSync("npx wrangler deploy", {
        cwd: tmpDir,
        stdio: "pipe",
      }).toString();

      console.log("Deployment output:", deployOutput);

      // Extract URL from output
      const match = deployOutput.match(/https:\/\/[^\s]+\.workers\.dev/);
      const deploymentUrl = match ? match[0] : null;

      if (!deploymentUrl) {
        console.warn(
          "Could not extract deployment URL from output:",
          deployOutput
        );
      }

      // Update status to complete
      deployment.status = "complete";
      deployment.message = "Deployment successful";
      deployment.url = deploymentUrl as string;
      deployment.log = deployOutput as string;
      
      // Save the updated status with deployment results
      await deployments.set(deploymentId, deployment);

    } catch (execError: any) {
      console.error("Execution error during deployment:", execError);

      let errorMessage = execError.message || "Error during deployment";
      let outputMessage = "";

      if (execError.stdout) {
        outputMessage += execError.stdout.toString();
      }

      if (execError.stderr) {
        outputMessage += " " + execError.stderr.toString();
      }

      // Update deployment status with error details
      deployment.status = "error";
      deployment.error = errorMessage;
      deployment.log = outputMessage;
      
      // Save the error status
      await deployments.set(deploymentId, deployment);

      throw new Error(
        `Deployment execution failed: ${errorMessage}\n\n${outputMessage}`
      );
    }
  } catch (error) {
    console.error("Error during deployment process:", error);

    // Get the latest deployment status before updating
    deployment = await deployments.get(deploymentId) || deployment;
    
    // Update deployment status
    deployment.status = "error";
    deployment.message = "Deployment failed";
    deployment.error = `Deployment process error: ${
      error instanceof Error ? error.message : String(error)
    }`;
    
    // Save the error status
    await deployments.set(deploymentId, deployment);

    throw error;
  }
}
