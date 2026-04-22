-- ============================================================
-- MIGRAÇÃO V3: INTEGRAÇÃO DE PAGAMENTOS REAIS (VELLAR PAY)
-- ============================================================

-- 1. Melhorar a tabela de transações para suportar referências externas
ALTER TABLE public.moral_transactions 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS external_provider TEXT, -- 'pushinpay', 'stripe', etc
ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'completed'; -- 'pending', 'completed', 'failed'

-- 2. Criar tabela para logs de tentativas de pagamento (Checkout)
CREATE TABLE IF NOT EXISTS public.payment_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) NOT NULL,
    amount_reais NUMERIC(10, 2) NOT NULL,
    moral_amount INTEGER NOT NULL,
    external_id TEXT UNIQUE, -- ID gerado pelo Gateway
    status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'expired', 'refunded'
    pix_code TEXT, -- Copy-paste code
    pix_qr_url TEXT,
    payload JSONB, -- Resposta completa da API
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilitar RLS para payment_logs
ALTER TABLE public.payment_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios logs de pagamento"
    ON public.payment_logs FOR SELECT
    USING (auth.uid() = user_id);

-- 4. Função para processar o recebimento do pagamento (Webhook)
-- Esta função será chamada pelo seu servidor/webhook quando o gateway avisar o pagamento
CREATE OR REPLACE FUNCTION public.confirm_payment(
    p_external_id TEXT,
    p_provider TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_log_record RECORD;
    v_user_id UUID;
    v_amount INTEGER;
    v_reais NUMERIC;
BEGIN
    -- 1. Localizar o log do pagamento
    SELECT * INTO v_log_record 
    FROM public.payment_logs 
    WHERE external_id = p_external_id AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false, 'error', 'Pagamento não encontrado ou já processado.');
    END IF;

    v_user_id := v_log_record.user_id;
    v_amount := v_log_record.moral_amount;
    v_reais := v_log_record.amount_reais;

    -- 2. Atualizar status do log
    UPDATE public.payment_logs 
    SET status = 'paid', updated_at = NOW()
    WHERE id = v_log_record.id;

    -- 3. Creditar no saldo do usuário e gerar transação
    -- Usamos a função purchase_moral já existente, mas de forma segura
    PERFORM public.purchase_moral(v_user_id, v_amount, v_reais);

    -- 4. Atualizar a transação gerada com o external_id
    UPDATE public.moral_transactions 
    SET external_id = p_external_id, external_provider = p_provider
    WHERE id = (
        SELECT id 
        FROM public.moral_transactions 
        WHERE receiver_id = v_user_id AND type = 'compra' AND external_id IS NULL
        ORDER BY created_at DESC 
        LIMIT 1
    );

    RETURN jsonb_build_object('success', true, 'message', 'Pagamento confirmado e Moral creditada!');

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 5. Atualizar a tabela withdraw_requests para ter o external_id também
ALTER TABLE public.withdraw_requests 
ADD COLUMN IF NOT EXISTS external_id TEXT,
ADD COLUMN IF NOT EXISTS processing_log TEXT;

COMMENT ON TABLE public.payment_logs IS 'Registro de intenções de compra e status de Gateways externos (Vellar Pay).';
