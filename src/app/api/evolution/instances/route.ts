import { NextResponse } from "next/server";
import { env } from "@/config/env";

export interface EvolutionInstanceSummary {
  id?: string;
  name: string;
  connectionStatus: string;
  number?: string;
  profileName?: string;
  profilePicUrl?: string;
  apiUrl: string;
  isDefault: boolean;
}

/**
 * GET /api/evolution/instances
 * Safely fetches available Evolution API instances using server-side credentials.
 * Falls back to the environment variable configured instance if the Evolution API is unreachable.
 */
export async function GET() {
  const evolutionApiUrl = (env.EVOLUTION_API_URL || "").replace(/\/+$/, "");
  const defaultInstanceName = env.EVOLUTION_INSTANCE_NAME || "Default";
  const apiKey = env.EVOLUTION_API_KEY || "";

  if (!evolutionApiUrl) {
    return NextResponse.json({
      success: true,
      defaultInstance: defaultInstanceName,
      defaultApiUrl: "",
      instances: [],
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    const response = await fetch(`${evolutionApiUrl}/instance/fetchInstances`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        apikey: apiKey,
      },
      signal: controller.signal,
      cache: "no-store",
    });

    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data) && data.length > 0) {
        const instances: EvolutionInstanceSummary[] = data.map((inst: any) => ({
          id: inst.id || inst.instanceId,
          name: inst.name,
          connectionStatus: inst.connectionStatus || "unknown",
          number: inst.number || inst.ownerJid?.split("@")[0] || "",
          profileName: inst.profileName || "",
          profilePicUrl: inst.profilePicUrl || "",
          apiUrl: evolutionApiUrl,
          isDefault: inst.name === defaultInstanceName,
        }));

        return NextResponse.json({
          success: true,
          defaultInstance: defaultInstanceName,
          defaultApiUrl: evolutionApiUrl,
          instances,
        });
      }
    }

    // Fallback if empty or non-200 response
    return NextResponse.json({
      success: true,
      defaultInstance: defaultInstanceName,
      defaultApiUrl: evolutionApiUrl,
      instances: [
        {
          name: defaultInstanceName,
          connectionStatus: "open",
          apiUrl: evolutionApiUrl,
          isDefault: true,
        },
      ],
    });
  } catch (error) {
    console.warn("Could not query Evolution API directly, returning default instance from env:", error);
    return NextResponse.json({
      success: true,
      defaultInstance: defaultInstanceName,
      defaultApiUrl: evolutionApiUrl,
      instances: [
        {
          name: defaultInstanceName,
          connectionStatus: "open",
          apiUrl: evolutionApiUrl,
          isDefault: true,
        },
      ],
    });
  }
}
