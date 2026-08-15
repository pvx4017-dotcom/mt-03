-- เพิ่ม QR Code ให้บัญชีรับเงินโดยไม่กระทบข้อมูลเดิม
ALTER TABLE public.platform_receiving_accounts
  ADD COLUMN IF NOT EXISTS qr_image TEXT;
