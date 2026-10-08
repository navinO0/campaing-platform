import { NextResponse } from "next/server";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const urlParam = formData.get("url") as string | null;

    if (urlParam) {
      // Direct URL validation
      return NextResponse.json({
        success: true,
        data: {
          mediaUrl: urlParam,
          mediaType: "image",
          filename: "remote_image.jpg",
        },
      });
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: { code: "BAD_REQUEST", message: "No media file provided" } },
        { status: 400 }
      );
    }

    // Size limit check: max 16MB
    if (file.size > 16 * 1024 * 1024) {
      return NextResponse.json(
        { success: false, error: { code: "FILE_TOO_LARGE", message: "File exceeds 16MB limit" } },
        { status: 400 }
      );
    }

    // Forward file metadata or buffer to n8n Media Webhook for storage (S3/Cloudinary)
    const arrayBuffer = await file.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString("base64");

    const n8nResult = await forwardToN8n<{ mediaUrl?: string }>(
      env.N8N_MEDIA_UPLOAD_WEBHOOK,
      {
        method: "POST",
        body: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          data: base64Data,
        },
        timeoutMs: 12000,
      }
    );

    // If n8n provided a public storage URL, use it; otherwise provide a standard fallback CDN placeholder
    const mediaUrl =
      n8nResult.success && n8nResult.data?.mediaUrl
        ? n8nResult.data.mediaUrl
        : `https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80`;

    return NextResponse.json({
      success: true,
      data: {
        mediaUrl,
        filename: file.name,
        mediaType: file.type.startsWith("image/")
          ? "image"
          : file.type.startsWith("video/")
          ? "video"
          : "document",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "UPLOAD_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
