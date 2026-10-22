import { GET as whatsappGet, POST as whatsappPost } from "@/app/api/webhooks/whatsapp/route";

// Dedicated OTP Webhook endpoint mirroring WhatsApp webhook handling
export const GET = whatsappGet;
export const POST = whatsappPost;
