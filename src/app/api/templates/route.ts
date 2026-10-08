import { NextResponse } from "next/server";
import { initialTemplates } from "@/lib/data/store";
import { templateSchema, extractTemplateVariables } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Template } from "@/types";

let templatesList = [...initialTemplates];

export async function GET() {
  return NextResponse.json({
    success: true,
    data: templatesList,
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
      status: "Approved", // Auto-approved in evolution mode or draft in meta mode
      bodyText: validated.bodyText,
      variables,
      mediaType: validated.mediaType,
      mediaUrl: validated.mediaUrl || undefined,
      buttons: validated.buttons || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Forward sync to n8n if required
    forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
      method: "POST",
      body: { action: "create", template: newTemplate },
    }).catch(() => null);

    templatesList = [newTemplate, ...templatesList];

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
