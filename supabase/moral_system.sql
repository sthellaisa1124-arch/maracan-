-- ============================================================
-- SISTEMA DE MOEDAS "MORAL" — IAÍ CRIA
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- 1. Adicionar coluna de saldo na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS moral_balance INTEGER NOT NULL DEFAULT 0;

-- 2. Criar tabela de transações com sender, receiver e referência
CREATE TABLE IF NOT EXISTS public.moral_transactions (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  receiver_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('bonus', 'compra', 'enviado_avista', 'chat_ia', 'saque', 'admin_ajuste')),
  reference_id TEXT,         -- ID do post/vídeo/mensagem relacionado (opcional)
  reference_type TEXT,       -- 'avista_post' | 'chat_message' | null
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.moral_transactions ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de acesso
CREATE POLICY "Usuário vê suas próprias transações"
  ON public.moral_transactions FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Sistema pode inserir transações"
  ON public.moral_transactions FOR INSERT
  WITH CHECK (true); -- Controlado via SECURITY DEFINER function

CREATE POLICY "Admins veem tudo"
  ON public.moral_transactions FOR ALL
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true));

-- 5. Função SEGURA para enviar Moral (anti-spam, anti-auto-envio, anti-negativo)
CREATE OR REPLACE FUNCTION public.send_moral(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount INTEGER,
  p_reference_id TEXT DEFAULT NULL,
  p_reference_type TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_sender_balance INTEGER;
  v_last_send TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Bloquear auto-envio
  IF p_sender_id = p_receiver_id THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não pode mandar Moral pra você mesmo, cria!');
  END IF;

  -- Verificar saldo
  SELECT moral_balance INTO v_sender_balance
  FROM public.profiles
  WHERE id = p_sender_id;

  IF v_sender_balance < p_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem moral pra isso 😅');
  END IF;

  -- Anti-spam: verificar se enviou nos últimos 3 segundos
  SELECT created_at INTO v_last_send
  FROM public.moral_transactions
  WHERE sender_id = p_sender_id
    AND type IN ('enviado_avista', 'chat_ia')
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_send IS NOT NULL AND (NOW() - v_last_send) < INTERVAL '3 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Calma aí parceiro, espera um segundo antes de mandar de novo!');
  END IF;

  -- Atualizar saldo do remetente (garantir não-negativo)
  UPDATE public.profiles
  SET moral_balance = GREATEST(0, moral_balance - p_amount)
  WHERE id = p_sender_id;

  -- Atualizar saldo do destinatário (somente se tiver receiver)
  IF p_receiver_id IS NOT NULL THEN
    UPDATE public.profiles
    SET moral_balance = moral_balance + p_amount
    WHERE id = p_receiver_id;
  END IF;

  -- Registrar transação do remetente (débito)
  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, reference_id, reference_type, description)
  VALUES (p_sender_id, p_receiver_id, -p_amount, COALESCE(p_reference_type, 'enviado_avista'), p_reference_id, p_reference_type, COALESCE(p_description, 'Moral enviada'));

  -- Registrar transação do destinatário (crédito)
  IF p_receiver_id IS NOT NULL THEN
    INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, reference_id, reference_type, description)
    VALUES (p_sender_id, p_receiver_id, p_amount, COALESCE(p_reference_type, 'enviado_avista'), p_reference_id, p_reference_type, 'Moral recebida');
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Tu ganhou moral, cria 🔥');

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 6. Função para debitar Moral do Chat IA (sem receiver)
CREATE OR REPLACE FUNCTION public.debit_chat_moral(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_balance INTEGER;
  v_last_send TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT moral_balance INTO v_balance
  FROM public.profiles
  WHERE id = p_user_id;

  IF v_balance < 5 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Sem moral pra trocar ideia 😅 Carrega tua carteira!');
  END IF;

  -- Anti-spam: máximo 1 mensagem por 2 segundos
  SELECT created_at INTO v_last_send
  FROM public.moral_transactions
  WHERE sender_id = p_user_id AND type = 'chat_ia'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_last_send IS NOT NULL AND (NOW() - v_last_send) < INTERVAL '2 seconds' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Peraí! Você tá enviando mensagens rápido demais.');
  END IF;

  UPDATE public.profiles
  SET moral_balance = GREATEST(0, moral_balance - 5)
  WHERE id = p_user_id;

  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
  VALUES (p_user_id, NULL, -5, 'chat_ia', 'Chat com a IA — 5 Moral');

  RETURN jsonb_build_object('success', true);

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 7. Função de compra de Moral (simulada, pronta para hook real depois)
CREATE OR REPLACE FUNCTION public.purchase_moral(
  p_user_id UUID,
  p_amount INTEGER,
  p_reais NUMERIC
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.profiles
  SET moral_balance = moral_balance + p_amount
  WHERE id = p_user_id;

  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
  VALUES (NULL, p_user_id, p_amount, 'compra', 'Compra de R$' || p_reais::TEXT || ' → ' || p_amount::TEXT || ' Moral');

  RETURN jsonb_build_object('success', true, 'new_balance', (SELECT moral_balance FROM public.profiles WHERE id = p_user_id));

EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- 8. Função admin para ajuste manual
CREATE OR REPLACE FUNCTION public.admin_adjust_moral(
  p_user_id UUID,
  p_amount INTEGER,
  p_description TEXT DEFAULT 'Ajuste manual pelo Admin'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Somente admins
  IF NOT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_admin = true) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Acesso negado');
  END IF;

  UPDATE public.profiles
  SET moral_balance = GREATEST(0, moral_balance + p_amount)
  WHERE id = p_user_id;

  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
  VALUES (auth.uid(), p_user_id, p_amount, 'admin_ajuste', p_description);

  RETURN jsonb_build_object('success', true);
END;
$$;

-- 9. Atualizar trigger de novo usuário para dar 100 Moral automaticamente
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name, username, moral_balance)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'first_name',
    new.raw_user_meta_data->>'last_name',
    new.raw_user_meta_data->>'username',
    40   -- Bônus inicial reduzido para 40 conforme pedido
  )
  ON CONFLICT (id) DO NOTHING;

  -- Registrar bônus inicial
  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
  VALUES (NULL, new.id, 40, 'bonus', 'Bônus de boas-vindas — 40 Moral 🎉');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Dar 100 Moral para usuários EXISTENTES que ainda têm saldo 0 (one-time, safe)
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT p.id
    FROM public.profiles p
    WHERE p.moral_balance = 0
      AND NOT EXISTS (
        SELECT 1 FROM public.moral_transactions mt
        WHERE mt.receiver_id = p.id AND mt.type = 'bonus'
      )
  LOOP
    UPDATE public.profiles SET moral_balance = 100 WHERE id = rec.id;
    INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
    VALUES (NULL, rec.id, 40, 'bonus', 'Bônus retroativo de boas-vindas — 40 Moral 🎉');
  END LOOP;
END;
$$;

-- 11. Taxa de saque futura: configuração salva em tabela de settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

INSERT INTO public.platform_settings (key, value)
VALUES ('moral_withdrawal_fee_pct', '30')  -- 30% de taxa de saque por padrão
ON CONFLICT (key) DO NOTHING;
