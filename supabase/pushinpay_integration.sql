-- ============================================================
-- INTEGRAÇÃO REAL PUSHINPAY — VELLAR
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Tabela para salvar configurações sensíveis (Admin only)
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Apenas CEOs podem ver configurações"
  ON public.platform_settings FOR SELECT
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND account_role = 'ceo'));

-- 2. Tabela de Log de Compras PIX (Crucial para o Webhook)
CREATE TABLE IF NOT EXISTS public.moral_purchases_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  reais NUMERIC NOT NULL,
  external_id TEXT UNIQUE, -- ID retornado pela PushinPay
  pix_code TEXT,           -- QR Code (Copy/Paste)
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'expired')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.moral_purchases_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários veem seus próprios logs de compra"
  ON public.moral_purchases_log FOR SELECT
  USING (auth.uid() = user_id);

-- 3. Função para registrar o início de uma compra (chamada pelo Frontend)
CREATE OR REPLACE FUNCTION public.log_moral_purchase_attempt(
  p_amount INTEGER,
  p_reais NUMERIC,
  p_external_id TEXT,
  p_pix_code TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.moral_purchases_log (user_id, amount, reais, external_id, pix_code, status)
  VALUES (auth.uid(), p_amount, p_reais, p_external_id, p_pix_code, 'pending');
END;
$$;

-- 4. Inserir chaves vazias para o usuário preencher depois (opcional)
INSERT INTO public.platform_settings (key, value)
VALUES ('pushinpay_token', 'COLE_AQUI_SEU_TOKEN_DEPOIS')
ON CONFLICT (key) DO NOTHING;
