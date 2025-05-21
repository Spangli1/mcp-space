import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ServerNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-4">
      <h1 className="text-4xl font-bold">Server Not Found</h1>
      <p className="text-lg text-center text-muted-foreground max-w-md">
        The server you are looking for doesn't exist or you don't have access to it.
      </p>
      <Button asChild>
        <Link href="/dashboard">Go back to Dashboard</Link>
      </Button>
    </div>
  );
}
