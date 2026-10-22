import { NextResponse } from "next/server";
import { getTemplatesFromDb, createTemplateInDb } from "@/lib/db";
import { templateSchema, extractTemplateVariables } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Template } from "@/types";

export async function GET() {
  try {
    const templates = await getTemplatesFromDb();
    return NextResponse.json({
      success: true,
      data: templates,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const validated = templateSchema.parse(json);
    const variables = extractTemplateVariables(validated.bodyText);

    const newTemplate: Template = {
      id: `tpl_${Date.now()}`,
      name: validated.name,
      description: validated.description,
      language: validated.language,
      category: validated.category,
      status: "Approved",
      headerText: validated.headerText,
      bodyText: validated.bodyText,
      footerText: validated.footerText,
      variables,
      exampleValues: validated.exampleValues || {},
      mediaType: validated.mediaType,
      mediaUrl: validated.mediaUrl || undefined,
      buttons: validated.buttons || [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await createTemplateInDb(newTemplate);

    forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
      method: "POST",
      body: { action: "create", template: saved },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: saved,
      message: "Template created successfully in PostgreSQL",
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
