-- Sistema de Saques Manuais (Withdrawals)

CREATE TABLE IF NOT EXISTS public.withdraw_requests (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    moral_amount INTEGER NOT NULL,
    real_amount_bruto NUMERIC(10, 2) NOT NULL,
    real_amount_liquido NUMERIC(10, 2) NOT NULL,
    pix_key TEXT NOT NULL,
    pix_type TEXT NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- RLS
ALTER TABLE public.withdraw_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários veem seus próprios pedidos de saque" ON public.withdraw_requests;
CREATE POLICY "Usuários veem seus próprios pedidos de saque" 
ON public.withdraw_requests FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins e CEO veem todos os saques" ON public.withdraw_requests;
CREATE POLICY "Admins e CEO veem todos os saques" 
ON public.withdraw_requests FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND (profiles.account_role = 'admin' OR profiles.account_role = 'ceo')
  )
);

-- RPC para solicitar o Saque
CREATE OR REPLACE FUNCTION public.request_withdraw(
    p_moral_amount INTEGER,
    p_pix_key TEXT,
    p_pix_type TEXT
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_balance INTEGER;
    v_bruto NUMERIC(10, 2);
    v_liquido NUMERIC(10, 2);
    v_fee_percentage NUMERIC := 0.35; -- 35% de taxa
    v_conversion_rate NUMERIC := 0.01; -- 1 Moral = R$ 0,01
BEGIN
    IF p_moral_amount < 10000 THEN
        RETURN json_build_object('success', false, 'error', 'Saque minímo é de R$ 100,00 (10.000 Moral).');
    END IF;

    SELECT moral_balance INTO v_balance FROM profiles WHERE id = auth.uid();
    
    IF v_balance < p_moral_amount THEN
        RETURN json_build_object('success', false, 'error', 'Saldo insuficiente de Moral.');
    END IF;

    -- Subtrair o saldo do usuário
    UPDATE profiles SET moral_balance = moral_balance - p_moral_amount WHERE id = auth.uid();

    -- Registrar transação do débito na conta
    INSERT INTO moral_transactions (sender_id, receiver_id, amount, type, description)
    VALUES (auth.uid(), auth.uid(), -p_moral_amount, 'saque', 'Saque solicitado (Pendente)');

    -- Cálculos
    v_bruto := p_moral_amount * v_conversion_rate;
    v_liquido := v_bruto - (v_bruto * v_fee_percentage);

    -- Criar o Request de Saque
    INSERT INTO withdraw_requests (user_id, moral_amount, real_amount_bruto, real_amount_liquido, pix_key, pix_type)
    VALUES (auth.uid(), p_moral_amount, v_bruto, v_liquido, p_pix_key, p_pix_type);

    RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM);
END;
$$;


-- RPC para Admin Aprovar/Rejeitar o Saque
CREATE OR REPLACE FUNCTION public.admin_resolve_withdraw(
    p_request_id UUID,
    p_action TEXT, -- 'approve' ou 'reject'
    p_reason TEXT DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_admin_role TEXT;
    v_req_status TEXT;
    v_req_user_id UUID;
    v_moral_amount INTEGER;
BEGIN
    SELECT account_role INTO v_admin_role FROM profiles WHERE id = auth.uid();
    
    IF v_admin_role NOT IN ('ceo', 'admin') THEN
        RETURN json_build_object('success', false, 'error', 'Permissão negada. Apenas Admins podem resolver saques.');
    END IF;

    SELECT status, user_id, moral_amount INTO v_req_status, v_req_user_id, v_moral_amount 
    FROM withdraw_requests WHERE id = p_request_id;

    IF v_req_status IS NULL THEN
        RETURN json_build_object('success', false, 'error', 'Pedido não encontrado.');
    END IF;

    IF v_req_status != 'pending' THEN
        RETURN json_build_object('success', false, 'error', 'Este pedido já foi resolvido.');
    END IF;

    IF p_action = 'approve' THEN
        UPDATE withdraw_requests SET status = 'approved', updated_at = TIMEZONE('utc', NOW()) WHERE id = p_request_id;
        
        -- Notificar usuário sobre a aprovação
        INSERT INTO notifications (user_id, title, message) 
        VALUES (v_req_user_id, '💸 Saque PIX Realizado!', 'Seu pedido de saque foi aprovado e o PIX já caiu (ou está a caminho) da sua conta! Aproveite o dindin.');
        
        RETURN json_build_object('success', true);
        
    ELSIF p_action = 'reject' THEN
        UPDATE withdraw_requests SET status = 'rejected', updated_at = TIMEZONE('utc', NOW()) WHERE id = p_request_id;
        
        -- ESTORNAR (Devolver) o dinheiro
        UPDATE profiles SET moral_balance = moral_balance + v_moral_amount WHERE id = v_req_user_id;

        -- Registrar transação do estorno no extrato
        INSERT INTO moral_transactions (sender_id, receiver_id, amount, type, description)
        VALUES (v_req_user_id, v_req_user_id, v_moral_amount, 'saque', 'Saque rejeitado: Estorno');

        -- Notificar usuário sobre a rejeição
        INSERT INTO notifications (user_id, title, message) 
        VALUES (v_req_user_id, '❌ Saque PIX Rejeitado', 'Seu saque foi rejeitado pelo CEO. Motivo: ' || COALESCE(p_reason, 'Inconsistência nos dados.') || ' O valor foi devolvido para a sua carteira Moral.');

        RETURN json_build_object('success', true);
    ELSE
        RETURN json_build_object('success', false, 'error', 'Ação inválida.');
    END IF;
END;
$$;
