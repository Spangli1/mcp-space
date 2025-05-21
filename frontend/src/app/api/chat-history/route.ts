import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabase/supabase";

export async function GET(request: NextRequest) {
  try {
    // Get query parameters
    const url = new URL(request.url);
    const session_id = url.searchParams.get("session_id");
    const user_id = url.searchParams.get("user_id");

    // Validate required parameters
    if (!session_id || !user_id) {
      return NextResponse.json(
        { error: "session_id and user_id are required parameters" },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("session_id", session_id)
      .eq("user_id", user_id)
      .order("timestamp", { ascending: true });

    if (error) {
      console.error("Error fetching chat history:", error);
      return NextResponse.json(
        { error: "Failed to fetch chat history" },
        { status: 500 }
      );
    }

    // console.log("Fetched chat history:", data);

    return NextResponse.json(data || []);
  } catch (error) {
    console.error("Error in chat-history API route:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
}
