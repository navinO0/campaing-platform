import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";
import { templateSchema, extractTemplateVariables } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";
import type { Template } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templates = db.getTemplates();
  const template = templates.find((t) => t.id === id);

  if (!template) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, data: template });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const validated = templateSchema.parse(json);

    const templates = db.getTemplates();
    const index = templates.findIndex((t) => t.id === id);

    if (index === -1) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    const variables = extractTemplateVariables(validated.bodyText);

    const updatedTemplate: Template = {
      ...templates[index],
      name: validated.name,
      language: validated.language,
      category: validated.category,
      bodyText: validated.bodyText,
      variables,
      mediaType: validated.mediaType,
      mediaUrl: validated.mediaUrl || undefined,
      buttons: validated.buttons || [],
      updatedAt: new Date().toISOString(),
    };

    templates[index] = updatedTemplate;
    db.setTemplates(templates);

    forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
      method: "POST",
      body: { action: "update", template: updatedTemplate },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updatedTemplate,
      message: "Template updated successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_ERROR", message: (err as Error).message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const templates = db.getTemplates();
  const index = templates.findIndex((t) => t.id === id);

  if (index === -1) {
    return NextResponse.json(
      { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
      { status: 404 }
    );
  }

  const deleted = templates.splice(index, 1)[0];
  db.setTemplates(templates);

  forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
    method: "POST",
    body: { action: "delete", templateId: id },
  }).catch(() => null);

  return NextResponse.json({
    success: true,
    data: deleted,
    message: "Template deleted successfully",
  });
}
