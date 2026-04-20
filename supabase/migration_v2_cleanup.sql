-- ============================================================
-- MIGRAÇÃO V2: LIMPEZA DE PLANOS E AJUSTE DE ECONOMIA
-- ============================================================

-- 1. Remover tabela de solicitações de planos (obsoleta)
DROP TABLE IF EXISTS public.plan_requests CASCADE;

-- 2. Remover coluna plan_type da tabela profiles (obsoleta)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS plan_type;

-- 3. Atualizar a função de Trigger para novos usuários
-- Define bônus inicial em 40 MORAL e remove referência a plan_type
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

  -- Registrar bônus inicial na tabela de transações
  INSERT INTO public.moral_transactions (sender_id, receiver_id, amount, type, description)
  VALUES (NULL, new.id, 40, 'bonus', 'Bônus de boas-vindas — 40 Moral 🎉');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Atualizar a política de UPDATE da tabela profiles
-- Removemos a verificação de plan_type que impedia atualizações
DROP POLICY IF EXISTS "Usuários atualizam apenas nome e foto" ON profiles;
CREATE POLICY "Usuários atualizam apenas nome e foto" ON profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    is_admin() OR (
      is_admin = (SELECT is_admin FROM profiles WHERE id = auth.uid())
      -- plan_type removido daqui
    )
  );

-- 5. Comentário de auditoria
COMMENT ON TABLE public.profiles IS 'Perfis de usuários migrados para economia MORAL (V2).';
