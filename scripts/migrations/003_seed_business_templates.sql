-- Migration 003: Seed Production Business Templates
-- Includes:
-- 1. Service Maintenance & Charges Notice (with "ignore if already paid" clause)
-- 2. Customer Welcome & Greeting
-- 3. Festival Wishes & Celebration Offer
-- 4. Routine Periodic Maintenance Due Notice
-- 5. Payment Receipt & Service Confirmation
-- 6. Service Completion & Feedback Request

INSERT INTO whatsapp_campaign.templates (
  id, name, description, language, category, status,
  header_text, body_text, footer_text, variables, example_values,
  media_type, media_url, buttons
) VALUES
(
  'tpl_service_maintenance_charges_01',
  'Service Maintenance & Charges Notice',
  'Scheduled maintenance notification with service breakdown, charges due, payment link, and ignore-if-paid notice.',
  'en',
  'UTILITY',
  'Approved',
  '🛠️ Scheduled Service & Maintenance',
  'Dear {{customer_name}},

This is a gentle reminder regarding the upcoming scheduled maintenance for your {{service_name}}.

📋 *Service Details:*
• Service / Equipment: {{service_name}}
• Scheduled Date: {{maintenance_date}}
• Invoice Reference: {{invoice_number}}
• Total Charges: {{amount_due}}
• Payment Due Date: {{due_date}}

💳 *Pay securely online:*
{{payment_link}}

⚠️ *Note:* If you have already completed this payment, please disregard this notice with our sincere appreciation.

For rescheduling, queries, or assistance, feel free to reply to this message directly.',
  'Official Service Maintenance Alert • Support: +91 98765 43210',
  ARRAY['customer_name', 'service_name', 'maintenance_date', 'invoice_number', 'amount_due', 'due_date', 'payment_link'],
  '{"customer_name": "Aarav Sharma", "service_name": "Annual HVAC / AC Servicing", "maintenance_date": "28th Oct 2026", "invoice_number": "INV-2026-8912", "amount_due": "₹1,499.00", "due_date": "31st Oct 2026", "payment_link": "https://pay.example.com/inv/8912"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Pay Charges","url":"https://pay.example.com"},{"id":"btn_2","type":"call_phone","text":"Call Support","phoneNumber":"+919876543210"}]'::jsonb
),
(
  'tpl_customer_welcome_greet_02',
  'Customer Welcome & Service Introduction',
  'Warm welcome message introducing business capabilities, support channels, and customer portal.',
  'en',
  'UTILITY',
  'Approved',
  '👋 Welcome to {{business_name}}',
  'Hello {{customer_name}},

Welcome to {{business_name}}! 🎉 We are truly delighted to have you with us.

We are dedicated to providing you with dependable service and uninterrupted support. You can use this official WhatsApp channel to:
• Track active services and bookings
• Access invoices and service receipts
• Request on-demand maintenance or emergency support

🌐 *Access your customer portal & service catalog:*
👉 {{portal_link}}

If you have any questions or require assistance, simply reply to this chat anytime.

Warm regards,
Team {{business_name}}',
  'Customer Success Team • We are here to help',
  ARRAY['customer_name', 'business_name', 'portal_link'],
  '{"customer_name": "Priya Patel", "business_name": "Apex Service Solutions", "portal_link": "https://portal.example.com/welcome"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Explore Services","url":"https://portal.example.com"},{"id":"btn_2","type":"visit_website","text":"Help & FAQ","url":"https://example.com/help"}]'::jsonb
),
(
  'tpl_festival_wishes_offer_03',
  'Festive Greetings & Special Celebration Offer',
  'Auspicious festive greetings with an exclusive promotional discount, coupon code, and validity period.',
  'en',
  'MARKETING',
  'Approved',
  '✨ Happy {{festival_name}}! 🪔',
  'Wishing you and your family abundant joy, prosperity, and good health on the auspicious occasion of {{festival_name}}! 🌟🎊

Dear {{customer_name}},

To celebrate this festive season with you, {{business_name}} is pleased to present our Festive Celebration Privilege:
Enjoy *{{discount_percentage}} OFF* across all services, maintenance packages, and products!

🎁 *Promo Code:* *{{coupon_code}}*
📅 *Valid Until:* {{valid_until}}

Claim your festive offer now:
👉 {{offer_link}}

May this season illuminate your home and business with happiness and success!',
  'Festive Wishes • Terms & Conditions Apply',
  ARRAY['festival_name', 'customer_name', 'business_name', 'discount_percentage', 'coupon_code', 'valid_until', 'offer_link'],
  '{"festival_name": "Diwali", "customer_name": "Rohan Verma", "business_name": "Apex Enterprise", "discount_percentage": "25%", "coupon_code": "FESTIVE25", "valid_until": "15th Nov 2026", "offer_link": "https://example.com/festive-deal"}'::jsonb,
  'image',
  'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=800&auto=format&fit=crop&q=80',
  '[{"id":"btn_1","type":"visit_website","text":"Claim Festive Deal","url":"https://example.com/festive-deal"},{"id":"btn_2","type":"copy_coupon","text":"Copy FESTIVE25","couponCode":"FESTIVE25"}]'::jsonb
),
(
  'tpl_routine_maintenance_due_04',
  'Routine Periodic Maintenance Due Notice',
  'Periodic servicing notification advising customers to schedule preventative maintenance before breakdown.',
  'en',
  'UTILITY',
  'Approved',
  '⏰ Maintenance Service Due',
  'Hello {{customer_name}},

Our system records indicate that your {{equipment_or_service}} is due for its periodic maintenance inspection.

Regular servicing ensures peak operational efficiency, equipment safety, and prevents unexpected downtime.

📋 *Inspection Details:*
• Asset / Equipment: {{equipment_or_service}}
• Previous Service Date: {{last_service_date}}
• Recommended Timeframe: {{recommended_timeframe}}

📅 *Book your preferred service slot:*
👉 {{booking_link}}

Need immediate technician dispatch? Reply to this message directly.',
  'Preventative Maintenance Desk • 24/7 Helpline',
  ARRAY['customer_name', 'equipment_or_service', 'last_service_date', 'recommended_timeframe', 'booking_link'],
  '{"customer_name": "Ananya Iyer", "equipment_or_service": "Water Treatment & RO Plant", "last_service_date": "20th April 2026", "recommended_timeframe": "Within the next 7 days", "booking_link": "https://example.com/schedule-service"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Book Slot Now","url":"https://example.com/schedule-service"},{"id":"btn_2","type":"call_phone","text":"Call Helpline","phoneNumber":"+919876543210"}]'::jsonb
),
(
  'tpl_payment_confirmation_receipt_05',
  'Payment Receipt & Service Confirmation',
  'Official payment acknowledgement providing transaction reference and downloadable PDF tax invoice.',
  'en',
  'UTILITY',
  'Approved',
  '✅ Payment Confirmation',
  'Dear {{customer_name}},

We have successfully received your payment of *{{amount_paid}}* towards {{service_name}}.

🧾 *Transaction Summary:*
• Receipt Number: {{receipt_number}}
• Payment Date: {{payment_date}}
• Service Status: {{service_status}}

📄 *Download your official receipt / tax invoice:*
👉 {{receipt_link}}

Thank you for your prompt payment and continued partnership with us!',
  'Accounts & Finance Team',
  ARRAY['customer_name', 'amount_paid', 'service_name', 'receipt_number', 'payment_date', 'service_status', 'receipt_link'],
  '{"customer_name": "Aarav Sharma", "amount_paid": "₹1,499.00", "service_name": "Annual HVAC / AC Servicing", "receipt_number": "REC-99412", "payment_date": "22nd Oct 2026", "service_status": "Paid & Confirmed", "receipt_link": "https://example.com/receipt/99412.pdf"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Download Invoice","url":"https://example.com/receipt/99412.pdf"}]'::jsonb
),
(
  'tpl_service_completion_feedback_06',
  'Service Completion & Experience Feedback',
  'Follow-up request sent after service completion to collect satisfaction score and Google/Trustpilot review.',
  'en',
  'UTILITY',
  'Approved',
  '⭐ How was your service experience?',
  'Hello {{customer_name}},

Our technician has completed the scheduled maintenance service for your {{service_name}}.

Your satisfaction is our highest priority! Could you please take 30 seconds to share your feedback?

🌟 *Rate our service:*
👉 {{feedback_link}}

If anything did not meet your expectations, please reply to this chat so our customer operations lead can assist you immediately.',
  'Quality Assurance Team • Powered by CustomerCare',
  ARRAY['customer_name', 'service_name', 'feedback_link'],
  '{"customer_name": "Vikram Malhotra", "service_name": "Commercial Diesel Generator Servicing", "feedback_link": "https://example.com/feedback"}'::jsonb,
  'none',
  NULL,
  '[{"id":"btn_1","type":"visit_website","text":"Rate Service","url":"https://example.com/feedback"}]'::jsonb
),
(
  'tpl_festive_sale_01',
  'Festive Season Discount Offer',
  'Seasonal promotional campaign with coupon code and direct catalog link.',
  'en',
  'MARKETING',
  'Approved',
  '🎉 Mega Festive Sale is LIVE!',
  'Hello {{customer_name}},

Special Festive Sale is LIVE now! Enjoy {{discount}} OFF on our latest collection and services.

Shop our curated catalog:
{{product_link}}

Use coupon code *{{coupon_code}}* at checkout.',
  'Limited period festive privilege',
  ARRAY['customer_name', 'discount', 'product_link', 'coupon_code'],
  '{"customer_name": "Aarav Sharma", "discount": "25%", "product_link": "https://example.com/collection", "coupon_code": "FESTIVE25"}'::jsonb,
  'image',
  'https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=800&auto=format&fit=crop&q=80',
  '[{"id":"btn_1","type":"visit_website","text":"Shop Now","url":"https://example.com/collection"},{"id":"btn_2","type":"copy_coupon","text":"Copy Coupon","couponCode":"FESTIVE25"}]'::jsonb
)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  language = EXCLUDED.language,
  category = EXCLUDED.category,
  status = EXCLUDED.status,
  header_text = EXCLUDED.header_text,
  body_text = EXCLUDED.body_text,
  footer_text = EXCLUDED.footer_text,
  variables = EXCLUDED.variables,
  example_values = EXCLUDED.example_values,
  media_type = EXCLUDED.media_type,
  media_url = EXCLUDED.media_url,
  buttons = EXCLUDED.buttons,
  updated_at = NOW();

