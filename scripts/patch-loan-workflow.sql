-- Run once in the Supabase SQL editor for an existing project.
-- Makes loan approval atomic and prevents duplicate active applications.

ALTER TABLE public.loan_applications
  ADD COLUMN IF NOT EXISTS processed_by BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS decision_note TEXT,
  ADD COLUMN IF NOT EXISTS decision_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS disbursed_at TIMESTAMPTZ;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loan_applications_amount_range'
      AND conrelid = 'public.loan_applications'::regclass
  ) THEN
    ALTER TABLE public.loan_applications
      ADD CONSTRAINT loan_applications_amount_range
      CHECK (amount BETWEEN 1000 AND 500000) NOT VALID;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'loan_applications_status_allowed'
      AND conrelid = 'public.loan_applications'::regclass
  ) THEN
    ALTER TABLE public.loan_applications
      ADD CONSTRAINT loan_applications_status_allowed
      CHECK (status IN ('pending', 'reviewing', 'approved', 'rejected')) NOT VALID;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS loan_applications_one_active_per_user
  ON public.loan_applications (user_id)
  WHERE status IN ('pending', 'reviewing');

CREATE OR REPLACE FUNCTION public.process_loan_application(
  p_actor_id BIGINT,
  p_loan_id BIGINT,
  p_status TEXT,
  p_decision_note TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  actor public.users%ROWTYPE;
  borrower public.users%ROWTYPE;
  loan public.loan_applications%ROWTYPE;
  balance_after NUMERIC(14,2);
BEGIN
  SELECT * INTO actor FROM public.users WHERE id = p_actor_id;
  IF NOT FOUND OR actor.role NOT IN ('admin', 'super_admin') OR actor.status <> 'active' THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่มีสิทธิ์ดำเนินการสินเชื่อ');
  END IF;

  IF p_status NOT IN ('reviewing', 'approved', 'rejected') THEN
    RETURN jsonb_build_object('success', false, 'message', 'สถานะสินเชื่อไม่ถูกต้อง');
  END IF;

  SELECT * INTO loan
  FROM public.loan_applications
  WHERE id = p_loan_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่พบคำขอสินเชื่อ');
  END IF;

  SELECT * INTO borrower
  FROM public.users
  WHERE id = loan.user_id
  FOR UPDATE;
  IF NOT FOUND OR borrower.role IN ('admin', 'super_admin') THEN
    RETURN jsonb_build_object('success', false, 'message', 'ไม่สามารถดำเนินการกับบัญชีผู้ดูแลได้');
  END IF;

  IF loan.status = p_status THEN
    RETURN jsonb_build_object('success', true, 'message', 'รายการอยู่ในสถานะนี้แล้ว');
  END IF;
  IF loan.status NOT IN ('pending', 'reviewing') THEN
    RETURN jsonb_build_object('success', false, 'message', 'รายการนี้ดำเนินการเสร็จแล้ว ไม่สามารถเปลี่ยนสถานะย้อนหลังได้');
  END IF;

  IF p_status = 'approved' THEN
    UPDATE public.users
    SET wallet_balance = wallet_balance + loan.amount
    WHERE id = loan.user_id
    RETURNING wallet_balance INTO balance_after;

    UPDATE public.loan_applications
    SET status = 'approved',
        processed_by = p_actor_id,
        decision_note = NULLIF(trim(p_decision_note), ''),
        decision_at = NOW(),
        disbursed_at = NOW(),
        updated_at = NOW()
    WHERE id = loan.id;

    RETURN jsonb_build_object(
      'success', true,
      'message', 'อนุมัติสินเชื่อและเพิ่มวงเงินเข้ากระเป๋าแล้ว',
      'balance_after', balance_after
    );
  END IF;

  UPDATE public.loan_applications
  SET status = p_status,
      processed_by = p_actor_id,
      decision_note = CASE WHEN p_status = 'rejected' THEN NULLIF(trim(p_decision_note), '') ELSE decision_note END,
      decision_at = CASE WHEN p_status = 'rejected' THEN NOW() ELSE decision_at END,
      updated_at = NOW()
  WHERE id = loan.id;

  RETURN jsonb_build_object(
    'success', true,
    'message', CASE WHEN p_status = 'rejected'
      THEN 'ปฏิเสธคำขอสินเชื่อแล้ว'
      ELSE 'เปลี่ยนสถานะเป็นกำลังพิจารณาแล้ว'
    END
  );
END;
$$;

NOTIFY pgrst, 'reload schema';
