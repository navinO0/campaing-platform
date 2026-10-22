import { Template, Customer, CustomerSegment, Campaign, CampaignLog, DashboardStats } from "@/types";

export const initialTemplates: Template[] = [
  {
    id: "tpl_service_maintenance_charges_01",
    name: "Service Maintenance & Charges Notice",
    description: "Scheduled maintenance notification with service breakdown, charges due, payment link, and ignore-if-paid notice.",
    language: "en",
    category: "UTILITY",
    status: "Approved",
    headerText: "🛠️ Scheduled Service & Maintenance",
    bodyText:
      "Dear {{customer_name}},\n\nThis is a gentle reminder regarding the upcoming scheduled maintenance for your {{service_name}}.\n\n📋 *Service Details:*\n• Service / Equipment: {{service_name}}\n• Scheduled Date: {{maintenance_date}}\n• Invoice Reference: {{invoice_number}}\n• Total Charges: {{amount_due}}\n• Payment Due Date: {{due_date}}\n\n💳 *Pay securely online:*\n{{payment_link}}\n\n⚠️ *Note:* If you have already completed this payment, please disregard this notice with our sincere appreciation.\n\nFor rescheduling, queries, or assistance, feel free to reply to this message directly.",
    footerText: "Official Service Maintenance Alert • Support: +91 98765 43210",
    variables: ["customer_name", "service_name", "maintenance_date", "invoice_number", "amount_due", "due_date", "payment_link"],
    exampleValues: {
      customer_name: "Aarav Sharma",
      service_name: "Annual HVAC / AC Servicing",
      maintenance_date: "28th Oct 2026",
      invoice_number: "INV-2026-8912",
      amount_due: "₹1,499.00",
      due_date: "31st Oct 2026",
      payment_link: "https://pay.example.com/inv/8912",
    },
    mediaType: "none",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Pay Charges",
        url: "https://pay.example.com",
      },
      {
        id: "btn_2",
        type: "call_phone",
        text: "Call Support",
        phoneNumber: "+919876543210",
      },
    ],
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "tpl_customer_welcome_greet_02",
    name: "Customer Welcome & Service Introduction",
    description: "Warm welcome message introducing business capabilities, support channels, and customer portal.",
    language: "en",
    category: "UTILITY",
    status: "Approved",
    headerText: "👋 Welcome to {{business_name}}",
    bodyText:
      "Hello {{customer_name}},\n\nWelcome to {{business_name}}! 🎉 We are truly delighted to have you with us.\n\nWe are dedicated to providing you with dependable service and uninterrupted support. You can use this official WhatsApp channel to:\n• Track active services and bookings\n• Access invoices and service receipts\n• Request on-demand maintenance or emergency support\n\n🌐 *Access your customer portal & service catalog:*\n👉 {{portal_link}}\n\nIf you have any questions or require assistance, simply reply to this chat anytime.\n\nWarm regards,\nTeam {{business_name}}",
    footerText: "Customer Success Team • We are here to help",
    variables: ["customer_name", "business_name", "portal_link"],
    exampleValues: {
      customer_name: "Priya Patel",
      business_name: "Apex Service Solutions",
      portal_link: "https://portal.example.com/welcome",
    },
    mediaType: "none",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Explore Services",
        url: "https://portal.example.com",
      },
      {
        id: "btn_2",
        type: "visit_website",
        text: "Help & FAQ",
        url: "https://example.com/help",
      },
    ],
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "tpl_festival_wishes_offer_03",
    name: "Festive Greetings & Special Celebration Offer",
    description: "Auspicious festive greetings with an exclusive promotional discount, coupon code, and validity period.",
    language: "en",
    category: "MARKETING",
    status: "Approved",
    headerText: "✨ Happy {{festival_name}}! 🪔",
    bodyText:
      "Wishing you and your family abundant joy, prosperity, and good health on the auspicious occasion of {{festival_name}}! 🌟🎊\n\nDear {{customer_name}},\n\nTo celebrate this festive season with you, {{business_name}} is pleased to present our Festive Celebration Privilege:\nEnjoy *{{discount_percentage}} OFF* across all services, maintenance packages, and products!\n\n🎁 *Promo Code:* *{{coupon_code}}*\n📅 *Valid Until:* {{valid_until}}\n\nClaim your festive offer now:\n👉 {{offer_link}}\n\nMay this season illuminate your home and business with happiness and success!",
    footerText: "Festive Wishes • Terms & Conditions Apply",
    variables: ["festival_name", "customer_name", "business_name", "discount_percentage", "coupon_code", "valid_until", "offer_link"],
    exampleValues: {
      festival_name: "Diwali",
      customer_name: "Rohan Verma",
      business_name: "Apex Enterprise",
      discount_percentage: "25%",
      coupon_code: "FESTIVE25",
      valid_until: "15th Nov 2026",
      offer_link: "https://example.com/festive-deal",
    },
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Claim Festive Deal",
        url: "https://example.com/festive-deal",
      },
      {
        id: "btn_2",
        type: "copy_coupon",
        text: "Copy FESTIVE25",
        couponCode: "FESTIVE25",
      },
    ],
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "tpl_routine_maintenance_due_04",
    name: "Routine Periodic Maintenance Due Notice",
    description: "Periodic servicing notification advising customers to schedule preventative maintenance before breakdown.",
    language: "en",
    category: "UTILITY",
    status: "Approved",
    headerText: "⏰ Maintenance Service Due",
    bodyText:
      "Hello {{customer_name}},\n\nOur system records indicate that your {{equipment_or_service}} is due for its periodic maintenance inspection.\n\nRegular servicing ensures peak operational efficiency, equipment safety, and prevents unexpected downtime.\n\n📋 *Inspection Details:*\n• Asset / Equipment: {{equipment_or_service}}\n• Previous Service Date: {{last_service_date}}\n• Recommended Timeframe: {{recommended_timeframe}}\n\n📅 *Book your preferred service slot:*\n👉 {{booking_link}}\n\nNeed immediate technician dispatch? Reply to this message directly.",
    footerText: "Preventative Maintenance Desk • 24/7 Helpline",
    variables: ["customer_name", "equipment_or_service", "last_service_date", "recommended_timeframe", "booking_link"],
    exampleValues: {
      customer_name: "Ananya Iyer",
      equipment_or_service: "Water Treatment & RO Plant",
      last_service_date: "20th April 2026",
      recommended_timeframe: "Within the next 7 days",
      booking_link: "https://example.com/schedule-service",
    },
    mediaType: "none",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Book Slot Now",
        url: "https://example.com/schedule-service",
      },
      {
        id: "btn_2",
        type: "call_phone",
        text: "Call Helpline",
        phoneNumber: "+919876543210",
      },
    ],
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "tpl_payment_confirmation_receipt_05",
    name: "Payment Receipt & Service Confirmation",
    description: "Official payment acknowledgement providing transaction reference and downloadable PDF tax invoice.",
    language: "en",
    category: "UTILITY",
    status: "Approved",
    headerText: "✅ Payment Confirmation",
    bodyText:
      "Dear {{customer_name}},\n\nWe have successfully received your payment of *{{amount_paid}}* towards {{service_name}}.\n\n🧾 *Transaction Summary:*\n• Receipt Number: {{receipt_number}}\n• Payment Date: {{payment_date}}\n• Service Status: {{service_status}}\n\n📄 *Download your official receipt / tax invoice:*\n👉 {{receipt_link}}\n\nThank you for your prompt payment and continued partnership with us!",
    footerText: "Accounts & Finance Team",
    variables: ["customer_name", "amount_paid", "service_name", "receipt_number", "payment_date", "service_status", "receipt_link"],
    exampleValues: {
      customer_name: "Aarav Sharma",
      amount_paid: "₹1,499.00",
      service_name: "Annual HVAC / AC Servicing",
      receipt_number: "REC-99412",
      payment_date: "22nd Oct 2026",
      service_status: "Paid & Confirmed",
      receipt_link: "https://example.com/receipt/99412.pdf",
    },
    mediaType: "none",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Download Invoice",
        url: "https://example.com/receipt/99412.pdf",
      },
    ],
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "tpl_service_completion_feedback_06",
    name: "Service Completion & Experience Feedback",
    description: "Follow-up request sent after service completion to collect satisfaction score and Google/Trustpilot review.",
    language: "en",
    category: "UTILITY",
    status: "Approved",
    headerText: "⭐ How was your service experience?",
    bodyText:
      "Hello {{customer_name}},\n\nOur technician has completed the scheduled maintenance service for your {{service_name}}.\n\nYour satisfaction is our highest priority! Could you please take 30 seconds to share your feedback?\n\n🌟 *Rate our service:*\n👉 {{feedback_link}}\n\nIf anything did not meet your expectations, please reply to this chat so our customer operations lead can assist you immediately.",
    footerText: "Quality Assurance Team • Powered by CustomerCare",
    variables: ["customer_name", "service_name", "feedback_link"],
    exampleValues: {
      customer_name: "Vikram Malhotra",
      service_name: "Commercial Diesel Generator Servicing",
      feedback_link: "https://example.com/feedback",
    },
    mediaType: "none",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Rate Service",
        url: "https://example.com/feedback",
      },
    ],
    createdAt: "2026-10-22T10:00:00Z",
    updatedAt: "2026-10-22T10:00:00Z",
  },
  {
    id: "tpl_festive_sale_01",
    name: "Festive Season Discount Offer",
    description: "Seasonal promotional campaign with coupon code and direct catalog link.",
    language: "en",
    category: "MARKETING",
    status: "Approved",
    headerText: "🎉 Mega Festive Sale is LIVE!",
    bodyText:
      "Hello {{customer_name}},\n\nSpecial Festive Sale is LIVE now! Enjoy {{discount}} OFF on our latest collection.\n\nShop our curated styles:\n{{product_link}}\n\nUse coupon {{coupon_code}} at checkout.",
    footerText: "Limited period festive privilege",
    variables: ["customer_name", "discount", "product_link", "coupon_code"],
    exampleValues: {
      customer_name: "Aarav Sharma",
      discount: "25%",
      product_link: "https://example.com/collection",
      coupon_code: "FESTIVE25",
    },
    mediaType: "image",
    mediaUrl: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
    buttons: [
      {
        id: "btn_1",
        type: "visit_website",
        text: "Shop Now",
        url: "https://example.com/collection",
      },
      {
        id: "btn_2",
        type: "copy_coupon",
        text: "Copy Coupon",
        couponCode: "FESTIVE25",
      },
    ],
    createdAt: "2026-09-15T10:00:00Z",
    updatedAt: "2026-10-01T12:00:00Z",
  },
];

export const initialCustomers: Customer[] = [
  {
    id: "cust_001",
    name: "Aarav Sharma",
    phone: "+919876543210",
    email: "aarav.sharma@example.com",
    countryCode: "91",
    tags: ["VIP", "fashion", "frequent-buyer"],
    segment: "VIP Customers",
    source: "Store Checkout",
    optedIn: true,
    optedOut: false,
    purchaseCount: 14,
    totalSpent: 42500,
    lastContactedAt: "2026-10-02T11:20:00Z",
    lastMessageStatus: "read",
    createdAt: "2026-06-10T09:00:00Z",
    updatedAt: "2026-10-02T11:20:00Z",
  },
  {
    id: "cust_002",
    name: "Priya Patel",
    phone: "+919823456789",
    email: "priya.patel@example.com",
    countryCode: "91",
    tags: ["fashion", "sarees"],
    segment: "Customers who purchased Sarees",
    source: "Website Signup",
    optedIn: true,
    optedOut: false,
    purchaseCount: 6,
    totalSpent: 18400,
    lastContactedAt: "2026-09-28T15:45:00Z",
    lastMessageStatus: "delivered",
    createdAt: "2026-07-14T10:30:00Z",
    updatedAt: "2026-09-28T15:45:00Z",
  },
  {
    id: "cust_003",
    name: "Rohan Verma",
    phone: "+919811223344",
    email: "rohan.v@example.com",
    countryCode: "91",
    tags: ["kurtis", "festive"],
    segment: "Customers who purchased Kurtis",
    source: "Instagram Ad",
    optedIn: true,
    optedOut: false,
    purchaseCount: 3,
    totalSpent: 6200,
    lastContactedAt: "2026-09-10T12:00:00Z",
    lastMessageStatus: "read",
    createdAt: "2026-08-01T14:15:00Z",
    updatedAt: "2026-09-10T12:00:00Z",
  },
  {
    id: "cust_004",
    name: "Ananya Iyer",
    phone: "+919877665544",
    email: "ananya.iyer@example.com",
    countryCode: "91",
    tags: ["inactive"],
    segment: "Inactive Customers",
    source: "Website Signup",
    optedIn: true,
    optedOut: false,
    purchaseCount: 1,
    totalSpent: 1500,
    lastContactedAt: "2026-06-15T10:00:00Z",
    lastMessageStatus: "delivered",
    createdAt: "2026-05-12T16:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
  },
  {
    id: "cust_005",
    name: "Vikram Malhotra",
    phone: "+919844332211",
    email: "vikram.m@example.com",
    countryCode: "91",
    tags: ["unsubscribed"],
    segment: "All Customers",
    source: "Store Checkout",
    optedIn: false,
    optedOut: true,
    optedOutAt: "2026-09-18T09:12:00Z",
    optOutReason: "User requested STOP",
    purchaseCount: 2,
    totalSpent: 4800,
    lastContactedAt: "2026-09-18T09:10:00Z",
    lastMessageStatus: "failed",
    createdAt: "2026-04-20T11:00:00Z",
    updatedAt: "2026-09-18T09:12:00Z",
  },
  {
    id: "cust_006",
    name: "Elena Rostova",
    phone: "+447700900123",
    email: "elena.r@example.co.uk",
    countryCode: "44",
    tags: ["VIP", "international"],
    segment: "VIP Customers",
    source: "Global Store",
    optedIn: true,
    optedOut: false,
    purchaseCount: 9,
    totalSpent: 68000,
    lastContactedAt: "2026-10-04T16:00:00Z",
    lastMessageStatus: "read",
    createdAt: "2026-03-10T14:00:00Z",
    updatedAt: "2026-10-04T16:00:00Z",
  },
];

export const initialSegments: CustomerSegment[] = [
  {
    id: "seg_all",
    name: "All Customers",
    description: "Every registered customer regardless of tags",
    customerCount: 6,
    filter: {},
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
  },
  {
    id: "seg_vip",
    name: "VIP Customers",
    description: "High lifetime value customers with > ₹20,000 spend",
    customerCount: 2,
    filter: { optedIn: true, minSpent: 20000 },
    createdAt: "2026-02-01T00:00:00Z",
    updatedAt: "2026-09-10T00:00:00Z",
  },
  {
    id: "seg_sarees",
    name: "Customers who purchased Sarees",
    description: "Shoppers interested in ethnic saree collections",
    customerCount: 1,
    filter: { optedIn: true, tags: ["sarees"] },
    createdAt: "2026-03-01T00:00:00Z",
    updatedAt: "2026-08-20T00:00:00Z",
  },
  {
    id: "seg_kurtis",
    name: "Customers who purchased Kurtis",
    description: "Shoppers who bought daily wear and formal kurtis",
    customerCount: 1,
    filter: { optedIn: true, tags: ["kurtis"] },
    createdAt: "2026-04-01T00:00:00Z",
    updatedAt: "2026-08-20T00:00:00Z",
  },
  {
    id: "seg_inactive",
    name: "Inactive Customers",
    description: "Customers who haven't ordered in the last 90 days",
    customerCount: 1,
    filter: { optedIn: true, lastContactedBefore: "2026-07-01T00:00:00Z" },
    createdAt: "2026-05-01T00:00:00Z",
    updatedAt: "2026-09-01T00:00:00Z",
  },
];

export const initialCampaigns: Campaign[] = [
  {
    id: "cmp_festive_blitz_101",
    name: "Diwali Festive Mega Launch",
    description: "Promotional blast for ethnic clothing catalog",
    status: "Running",
    templateId: "tpl_festive_sale_01",
    templateName: "Festive Season Discount Offer",
    audience: {
      type: "segment",
      segmentId: "seg_vip",
    },
    variables: {
      discount: "25%",
      coupon_code: "DIWALI25",
      product_link: "https://example.com/diwali-sale",
    },
    media: {
      type: "image",
      url: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80",
      caption: "Diwali Special Offer",
    },
    tracking: {
      utm_source: "whatsapp",
      utm_medium: "campaign",
      utm_campaign: "diwali-mega-launch",
    },
    schedule: {
      type: "immediate",
    },
    throttling: {
      batchSize: 10,
      delaySeconds: 5,
      maxPerMinute: 60,
    },
    stats: {
      totalAudience: 5000,
      queued: 2400,
      sent: 2600,
      delivered: 2420,
      read: 1850,
      failed: 180,
      optedOut: 8,
    },
    createdAt: "2026-10-08T08:00:00Z",
    updatedAt: "2026-10-08T11:30:00Z",
    startedAt: "2026-10-08T08:15:00Z",
  },
  {
    id: "cmp_saree_showcase_102",
    name: "Weekend Silk Saree Showcase",
    description: "Targeted to recent saree buyers",
    status: "Completed",
    templateId: "tpl_festive_sale_01",
    templateName: "Festive Season Discount Offer",
    audience: {
      type: "segment",
      segmentId: "seg_sarees",
    },
    variables: {
      discount: "20%",
      coupon_code: "SILK20",
      product_link: "https://example.com/sarees",
    },
    schedule: {
      type: "immediate",
    },
    stats: {
      totalAudience: 1250,
      queued: 0,
      sent: 1250,
      delivered: 1210,
      read: 980,
      failed: 40,
      optedOut: 3,
    },
    createdAt: "2026-10-05T10:00:00Z",
    updatedAt: "2026-10-05T14:00:00Z",
    startedAt: "2026-10-05T10:05:00Z",
    completedAt: "2026-10-05T13:45:00Z",
  },
  {
    id: "cmp_vip_preview_103",
    name: "VIP Exclusive Preview Blast",
    description: "Exclusive new arrivals preview for VIP members",
    status: "Draft",
    templateId: "tpl_vip_exclusive_03",
    templateName: "VIP Members Exclusive Preview",
    audience: {
      type: "all_opted_in",
    },
    variables: {
      discount: "30%",
      product_link: "https://example.com/vip-exclusive",
    },
    schedule: {
      type: "scheduled",
      scheduledAt: "2026-10-10T10:00:00Z",
    },
    stats: {
      totalAudience: 1500,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      failed: 0,
      optedOut: 0,
    },
    createdAt: "2026-10-07T16:00:00Z",
    updatedAt: "2026-10-07T16:00:00Z",
  },
];

export const initialCampaignLogs: CampaignLog[] = [
  {
    id: "log_001",
    campaignId: "cmp_festive_blitz_101",
    customerId: "cust_001",
    customerName: "Aarav Sharma",
    phone: "+919876543210",
    message: "Hello Aarav Sharma, Special Festive Sale is LIVE now! Enjoy 25% OFF...",
    templateName: "Festive Season Discount Offer",
    status: "read",
    timestamp: "2026-10-08T08:16:30Z",
  },
  {
    id: "log_002",
    campaignId: "cmp_festive_blitz_101",
    customerId: "cust_002",
    customerName: "Priya Patel",
    phone: "+919823456789",
    message: "Hello Priya Patel, Special Festive Sale is LIVE now! Enjoy 25% OFF...",
    templateName: "Festive Season Discount Offer",
    status: "delivered",
    timestamp: "2026-10-08T08:17:15Z",
  },
  {
    id: "log_003",
    campaignId: "cmp_festive_blitz_101",
    customerId: "cust_006",
    customerName: "Elena Rostova",
    phone: "+447700900123",
    message: "Hello Elena Rostova, Special Festive Sale is LIVE now! Enjoy 25% OFF...",
    templateName: "Festive Season Discount Offer",
    status: "read",
    timestamp: "2026-10-08T08:18:00Z",
  },
  {
    id: "log_004",
    campaignId: "cmp_festive_blitz_101",
    customerId: "cust_005",
    customerName: "Vikram Malhotra",
    phone: "+919844332211",
    message: "Hello Vikram Malhotra...",
    templateName: "Festive Season Discount Offer",
    status: "opted_out",
    error: "Customer has opted out (Suppression list matched)",
    timestamp: "2026-10-08T08:19:10Z",
  },
];

export const initialStats: DashboardStats = {
  totalCustomers: 5000,
  optedInCustomers: 4890,
  campaignsSent: 12,
  messagesSent: 28450,
  delivered: 27150,
  read: 19800,
  failed: 850,
  optedOut: 110,
  deliveryRate: 0.954,
  readRate: 0.696,
  failureRate: 0.03,
  optOutRate: 0.004,
};

// Global in-memory storage manager
declare global {
  var __db_customers: Customer[] | undefined;
  var __db_campaigns: Campaign[] | undefined;
  var __db_templates: Template[] | undefined;
  var __db_segments: CustomerSegment[] | undefined;
}

export const db = {
  getCustomers: (): Customer[] => {
    if (!global.__db_customers) {
      global.__db_customers = [...initialCustomers];
    }
    return global.__db_customers;
  },
  setCustomers: (customers: Customer[]) => {
    global.__db_customers = customers;
  },
  getCampaigns: (): Campaign[] => {
    if (!global.__db_campaigns) {
      global.__db_campaigns = [...initialCampaigns];
    }
    return global.__db_campaigns;
  },
  setCampaigns: (campaigns: Campaign[]) => {
    global.__db_campaigns = campaigns;
  },
  getTemplates: (): Template[] => {
    if (!global.__db_templates) {
      global.__db_templates = [...initialTemplates];
    }
    return global.__db_templates;
  },
  setTemplates: (templates: Template[]) => {
    global.__db_templates = templates;
  },
  getSegments: (): CustomerSegment[] => {
    if (!global.__db_segments) {
      global.__db_segments = [...initialSegments];
    }
    return global.__db_segments;
  },
  setSegments: (segments: CustomerSegment[]) => {
    global.__db_segments = segments;
  },
};
