import { NextRequest, NextResponse } from "next/server";
import { execSync } from "child_process";
import fs from "fs";

export async function GET(req: NextRequest) {
  try {
    execSync(
      "agent-browser screenshot page.jpg --screenshot-format jpeg --screenshot-quality 20",
    );
    const image = fs.readFileSync("page.jpg");
    const base64Data = image.toString("base64");
    return NextResponse.json({
      success: true,
      image: `data:image/jpeg;base64,${base64Data}`,
    });
  } catch (error) {
    return NextResponse.json({ success: false });
  }
}
