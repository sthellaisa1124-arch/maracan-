-- Supabase RLS and RPC Security Rules for IAI CRIA
-- Execute this script in the Supabase SQL Editor.

-- 1. Security definition for `admin_resolve_withdraw`
-- We want to ensure that only the CEO can successfully call this function.

CREATE OR REPLACE FUNCTION admin_resolve_withdraw(
  p_request_id uuid,
  p_action text,
  p_reason text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_caller_role text;
  v_caller_is_admin boolean;
  v_withdraw_record record;
BEGIN
  -- 1. Check if the caller is CEO
  SELECT account_role, is_admin INTO v_caller_role, v_caller_is_admin 
  FROM public.profiles 
  WHERE id = auth.uid();

  IF NOT v_caller_is_admin OR v_caller_role != 'ceo' THEN
    RETURN json_build_object('success', false, 'error', 'Acesso Restrito: Apenas o Gabinete do CEO pode resolver saques. Tentativa bloqueada e alertada.');
  END IF;

  -- 2. Fetch the request
  SELECT * INTO v_withdraw_record
  FROM public.withdraw_requests
  WHERE id = p_request_id;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação não encontrada.');
  END IF;

  IF v_withdraw_record.status != 'pending' THEN
    RETURN json_build_object('success', false, 'error', 'Solicitação já foi resolvida anteriomente.');
  END IF;

  -- 3. Execute logic based on action
  IF p_action = 'approve' THEN
    UPDATE public.withdraw_requests
    SET status = 'approved', updated_at = now()
    WHERE id = p_request_id;
    
    INSERT INTO public.admin_logs (admin_id, target_user_id, action, details)
    VALUES (auth.uid(), v_withdraw_record.user_id, 'Approve Withdraw', json_build_object('amount', v_withdraw_record.moral_amount));
    
  ELSIF p_action = 'reject' THEN
    UPDATE public.withdraw_requests
    SET status = 'rejected', updated_at = now()
    WHERE id = p_request_id;
    
    -- Refund the moral
    UPDATE public.profiles
    SET moral_balance = moral_balance + v_withdraw_record.moral_amount
    WHERE id = v_withdraw_record.user_id;
    
    INSERT INTO public.admin_logs (admin_id, target_user_id, action, details)
    VALUES (auth.uid(), v_withdraw_record.user_id, 'Reject Withdraw', json_build_object('reason', p_reason, 'refunded', v_withdraw_record.moral_amount));
    
    -- Notify user
    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (v_withdraw_record.user_id, 'system', 'Saque Estornado', 'Seu saque foi rejeitado. Motivo: ' || COALESCE(p_reason, 'Não especificado.'));
  ELSE
    RETURN json_build_object('success', false, 'error', 'Ação inválida.');
  END IF;

  RETURN json_build_object('success', true);
END;
$$;


-- 2. Guard against negative transactions in `send_moral`
CREATE OR REPLACE FUNCTION send_moral(
  p_sender_id uuid,
  p_receiver_id uuid,
  p_amount numeric,
  p_reference_id uuid DEFAULT NULL,
  p_reference_type text DEFAULT NULL,
  p_description text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance numeric;
BEGIN
  -- Security check: amount must be positive!
  IF p_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Valor inválido para envio.');
  END IF;

  -- Prevent forged sender_id (Caller MUST be the sender)
  IF p_sender_id != auth.uid() THEN
     RETURN json_build_object('success', false, 'error', 'Operação não autorizada. Tentativa de manipulação bloqueada.');
  END IF;

  -- Prevent sending to self
  IF p_sender_id = p_receiver_id THEN
    RETURN json_build_object('success', false, 'error', 'Você não pode enviar para si mesmo.');
  END IF;

  -- Verify balance
  SELECT moral_balance INTO v_sender_balance
  FROM public.profiles
  WHERE id = p_sender_id;

  IF v_sender_balance < p_amount THEN
    RETURN json_build_object('success', false, 'error', 'Saldo de Moral insuficiente.');
  END IF;

  -- Debit sender
  UPDATE public.profiles
  SET moral_balance = moral_balance - p_amount
  WHERE id = p_sender_id;

  -- Credit receiver
  UPDATE public.profiles
  SET moral_balance = moral_balance + p_amount
  WHERE id = p_receiver_id;

  -- Record transaction
  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description, reference_id, reference_type)
  VALUES (p_sender_id, p_receiver_id, p_amount, 'enviado_avista', p_description, p_reference_id, p_reference_type);

  RETURN json_build_object('success', true);
END;
$$;


-- 3. Guard against negative values in `request_withdraw`
CREATE OR REPLACE FUNCTION request_withdraw(
  p_moral_amount numeric,
  p_pix_key text,
  p_pix_type text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_balance numeric;
BEGIN
  -- Strict block on forged negative amounts
  IF p_moral_amount <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'O valor não pode ser nulo ou negativo.');
  END IF;

  -- Strict block on minimum withdraw
  IF p_moral_amount < 10000 THEN
    RETURN json_build_object('success', false, 'error', 'O mínimo para saque é 10.000 M.');
  END IF;

  -- Verify user actual balance directly inside the DB (impervious to UI manipulation)
  SELECT moral_balance INTO v_user_balance
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_user_balance < p_moral_amount THEN
    RETURN json_build_object('success', false, 'error', 'Você não possui essa quantia de Moral. Tentativa de manipulação BLoqueada!');
  END IF;

  -- Lock the Moral from the balance permanently until approved or rejected
  UPDATE public.profiles
  SET moral_balance = moral_balance - p_moral_amount
  WHERE id = auth.uid();

  -- Register withdraw request
  INSERT INTO public.withdraw_requests (user_id, moral_amount, real_amount_bruto, real_amount_liquido, pix_key, pix_type, status)
  VALUES (
    auth.uid(), 
    p_moral_amount, 
    p_moral_amount * 0.01, 
    (p_moral_amount * 0.01) * 0.65, 
    p_pix_key, 
    p_pix_type, 
    'pending'
  );

  RETURN json_build_object('success', true);
END;
$$;
