import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { templateSchema, extractTemplateVariables } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Template } from "@/types";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: db.getTemplates(),
  });
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validated = templateSchema.parse(json);
    const variables = extractTemplateVariables(validated.bodyText);

    const newTemplate: Template = {
      id: `tpl_${Date.now()}`,
      name: validated.name,
      language: validated.language,
      category: validated.category,
      status: "Approved",
      bodyText: validated.bodyText,
      variables,
      mediaType: validated.mediaType,
      mediaUrl: validated.mediaUrl || undefined,
      buttons: validated.buttons || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
      method: "POST",
      body: { action: "create", template: newTemplate },
    }).catch(() => null);

    const templates = db.getTemplates();
    templates.unshift(newTemplate);
    db.setTemplates(templates);

    return NextResponse.json({
      success: true,
      data: newTemplate,
      message: "Template created successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: (err as Error).message,
        },
      },
      { status: 400 }
    );
  }
}
