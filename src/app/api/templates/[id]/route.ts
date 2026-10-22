import { NextResponse } from "next/server";
import { getTemplateByIdFromDb, updateTemplateInDb, deleteTemplateFromDb } from "@/lib/db";
import { templateSchema, extractTemplateVariables } from "@/lib/validation";
import { forwardToN8n } from "@/lib/api/n8n-client";
import { env } from "@/config/env";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const template = await getTemplateByIdFromDb(id);

    if (!template) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: template });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const json = await request.json();
    const validated = templateSchema.parse(json);
    const variables = extractTemplateVariables(validated.bodyText);

    const updated = await updateTemplateInDb(id, {
      name: validated.name,
      description: validated.description,
      language: validated.language,
      category: validated.category,
      headerText: validated.headerText,
      bodyText: validated.bodyText,
      footerText: validated.footerText,
      variables,
      exampleValues: validated.exampleValues || {},
      mediaType: validated.mediaType,
      mediaUrl: validated.mediaUrl || undefined,
      buttons: validated.buttons || [],
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
      method: "POST",
      body: { action: "update", template: updated },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "Template updated successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "VALIDATION_OR_DB_ERROR", message: (err as Error).message } },
      { status: 400 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = await deleteTemplateFromDb(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Template not found" } },
        { status: 404 }
      );
    }

    forwardToN8n(env.N8N_TEMPLATES_WEBHOOK, {
      method: "POST",
      body: { action: "delete", templateId: id },
    }).catch(() => null);

    return NextResponse.json({
      success: true,
      message: "Template deleted successfully",
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
