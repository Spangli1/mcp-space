import { NextResponse } from "next/server";
import { deployments } from "@/utils/deployments-store";


export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    console.log("Fetching deployment status for ID:", id);

    const deployment = await deployments.get(id);

    console.log("Deployment found:", deployment);

    if (!deployment) {
      return NextResponse.json(
        { error: "Deployment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: deployment.id,
      status: deployment.status,
      message: deployment.message,
      url: deployment.url,
      error: deployment.error,
      server_id: deployment.server_id,
    });
  } catch (error) {
    console.error("Error retrieving deployment status:", error);
    return NextResponse.json(
      {
        error: `Error retrieving deployment status: ${
          error instanceof Error ? error.message : String(error)
        }`,
      },
      { status: 500 }
    );
  }
}
