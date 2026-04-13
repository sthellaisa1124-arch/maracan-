-- ============================================================
-- PAINEL ADMIN V2 - MUDANÇAS DE CARGOS, SELOS E ECONOMIA
-- ============================================================

-- 1. Adicionar novas colunas na tabela perfis, garantindo que não sobrescrevam se existirem
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS account_role TEXT DEFAULT 'user',
ADD COLUMN IF NOT EXISTS badges JSONB DEFAULT '[]'::jsonb;

-- Retrocompatibilidade: garantir que account_role reflita is_admin inicialmente (se não existirem CEOs)
UPDATE public.profiles SET account_role = 'admin' WHERE is_admin = true AND account_role = 'user';

-- 2. Tabela de Logs Administrativos (Auditoria)
CREATE TABLE IF NOT EXISTS public.admin_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  target_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- RLS nos logs
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Somente admins ou CEOS podem visualizar os logs de auditoria
CREATE POLICY "admin_logs_select_policy" ON public.admin_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND (account_role IN ('admin', 'ceo') OR is_admin = true)
    )
  );

-- O sistema insere logs através da RPC abaixo (SECURITY DEFINER)
CREATE POLICY "admin_logs_insert_policy" ON public.admin_logs
  FOR INSERT WITH CHECK (false); 

-- 3. Função RPC Unificada e Segura para Administrar Usuário
CREATE OR REPLACE FUNCTION public.admin_manage_user(
  p_target_id UUID,
  p_new_role TEXT DEFAULT NULL,
  p_new_badges JSONB DEFAULT NULL,
  p_coin_adjustment INTEGER DEFAULT NULL,
  p_reason TEXT DEFAULT ''
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_admin_role TEXT;
  v_admin_is_legacy_admin BOOLEAN;
  v_current_balance INTEGER;
  v_amount INTEGER;
  v_action_list jsonb := '[]'::jsonb;
BEGIN
  -- 1. Obter cargo de quem está chamando
  SELECT account_role, is_admin INTO v_admin_role, v_admin_is_legacy_admin
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_admin_role NOT IN ('ceo', 'admin') AND NOT v_admin_is_legacy_admin THEN
    RETURN jsonb_build_object('success', false, 'error', 'Você não é um Administrador.');
  END IF;

  -- 2. Modificação de Cargo (Permitida APENAS para CEO)
  IF p_new_role IS NOT NULL THEN
    IF v_admin_role <> 'ceo' THEN
       RETURN jsonb_build_object('success', false, 'error', 'Apenas o CEO pode alterar cargos (roles) dos usuários.');
    END IF;
    
    -- Opcional: Se já existe um CEO e estamos criando outro, talvez barrar? A regra diz "1 CEO", então vamos prevenir outro
    IF p_new_role = 'ceo' AND EXISTS(SELECT 1 FROM public.profiles WHERE account_role = 'ceo' AND id <> p_target_id) THEN
       RETURN jsonb_build_object('success', false, 'error', 'Já existe um CEO no sistema. Remova-o antes de designar outro.');
    END IF;

    UPDATE public.profiles SET account_role = p_new_role, is_admin = (p_new_role IN ('admin', 'ceo')) WHERE id = p_target_id;
    v_action_list := v_action_list || jsonb_build_object('action', 'change_role', 'role', p_new_role);
  END IF;

  -- 3. Modificação de Selos/Badges (Permitida para Admin e CEO)
  IF p_new_badges IS NOT NULL THEN
    UPDATE public.profiles SET badges = p_new_badges WHERE id = p_target_id;
    v_action_list := v_action_list || jsonb_build_object('action', 'change_badges', 'badges', p_new_badges);
  END IF;

  -- 4. Modificação de Economia (Permitida para Admin e CEO)
  IF p_coin_adjustment IS NOT NULL AND p_coin_adjustment <> 0 THEN
    -- Resgatar saldo atual
    SELECT moral_balance INTO v_current_balance FROM public.profiles WHERE id = p_target_id;
    
    -- Não deixar o saldo ficar negativo
    v_amount := p_coin_adjustment;
    IF v_current_balance + v_amount < 0 THEN
       v_amount := -v_current_balance; -- Se tirar mais do que tem, tira só até zerar
    END IF;

    UPDATE public.profiles SET moral_balance = moral_balance + v_amount WHERE id = p_target_id;
    
    -- Inserir na tabela de transações da economia
    INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
    VALUES (auth.uid(), p_target_id, v_amount, 'admin_ajuste', COALESCE(p_reason, 'Ajuste feito via Painel Admin'));

    v_action_list := v_action_list || jsonb_build_object('action', 'adjust_coins', 'adjustment', v_amount);
  END IF;

  -- 5. Gravar Log Geral na Admin Logs se algo ocorreu
  IF jsonb_array_length(v_action_list) > 0 THEN
     INSERT INTO public.admin_logs (admin_id, target_user_id, action, details)
     VALUES (auth.uid(), p_target_id, 'admin_modification', jsonb_build_object('changes', v_action_list, 'reason', p_reason));
  END IF;

  RETURN jsonb_build_object('success', true, 'message', 'Modificações aplicadas com sucesso!');
END;
$$;

-- ============================================================
-- DEFINIÇÃO DOS USUÁRIOS DE TESTE INICIAIS
-- ============================================================

-- Tornar o @maneurei o CEO do sistema
UPDATE public.profiles 
SET account_role = 'ceo', 
    is_admin = true,
    badges = '["ceo"]'::jsonb
WHERE username = 'maneurei';

-- Dar selo rosa personalizado para a usuária de teste
UPDATE public.profiles 
SET account_role = 'user',
    badges = '["special_pink"]'::jsonb
WHERE username = 'isabranca';
