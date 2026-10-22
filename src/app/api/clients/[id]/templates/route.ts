import { NextResponse } from "next/server";
import { getClientByIdFromDb, createClientTemplateInDb } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientByIdFromDb(id);
    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      data: client.customTemplates || [],
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "DB_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await getClientByIdFromDb(id);
    if (!client) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Client not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    if (!body.title || !body.bodyText) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Template title and bodyText are required" } },
        { status: 400 }
      );
    }

    const customTemplate = await createClientTemplateInDb({
      clientId: client.id,
      clientPhone: client.phone,
      title: body.title.trim(),
      category: body.category || "UTILITY",
      headerText: body.headerText?.trim() || undefined,
      bodyText: body.bodyText,
      footerText: body.footerText?.trim() || undefined,
      variables: body.variables || {
        client_name: client.name,
        company: client.company || "",
        client_phone: client.phone,
        service_type: client.serviceType,
        charges_amount: String(client.chargesAmount),
        due_date: client.dueDate || "",
      },
      mediaType: body.mediaType || "none",
      mediaUrl: body.mediaUrl || undefined,
      buttons: body.buttons || [],
    });

    return NextResponse.json({
      success: true,
      data: customTemplate,
      message: "Custom template created for client " + client.name,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: { code: "SERVER_ERROR", message: (err as Error).message } },
      { status: 500 }
    );
  }
}
