-- Função RPC para processar impulsionamento de posts
-- Essa função debita a Moral e atualiza o post em uma única transação atômica.
-- SECURITY DEFINER permite que a função ignore RLS para atualizar posts de terceiros.

CREATE OR REPLACE FUNCTION public.boost_post(
  p_user_id UUID,
  p_post_id UUID,
  p_boost_type TEXT -- 'bump' ou 'pin'
)
RETURNS JSONB AS $$
DECLARE
  v_amount INTEGER;
  v_user_balance INTEGER;
  v_description TEXT;
  v_ref_type TEXT;
  v_active_pin_id UUID;
BEGIN
  -- 1. Definir valores com base no tipo
  IF p_boost_type = 'bump' THEN
    v_amount := 5000;
    v_description := 'Subir post para o topo 🚀';
    v_ref_type := 'bump_post';
  ELSIF p_boost_type = 'pin' THEN
    v_amount := 100000;
    v_description := 'Fixar post no topo por 24h 📌';
    v_ref_type := 'pin_post';
    
    -- Verificar se já existe um post fixado ativo
    SELECT id INTO v_active_pin_id 
    FROM public.user_posts 
    WHERE is_pinned = true AND pinned_until > NOW();
    
    IF v_active_pin_id IS NOT NULL THEN
      RETURN jsonb_build_object('success', false, 'error', 'Já existe um post fixado no topo. Tente novamente mais tarde.');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Tipo de impulsionamento inválido.');
  END IF;

  -- 2. Verificar saldo do usuário
  SELECT moral_balance INTO v_user_balance FROM public.profiles WHERE id = p_user_id;
  IF v_user_balance < v_amount THEN
    RETURN jsonb_build_object('success', false, 'error', 'Saldo de Moral insuficiente.');
  END IF;

  -- 3. Executar o débito (usando a lógica da send_moral para manter consistência)
  -- Débito do remetente
  UPDATE public.profiles
  SET moral_balance = moral_balance - v_amount
  WHERE id = p_user_id;

  -- Registrar transação
  INSERT INTO public.moral_transactions (
    user_id,
    type,
    amount,
    reference_id,
    reference_type,
    description
  ) VALUES (
    p_user_id,
    v_ref_type,
    v_amount,
    p_post_id,
    v_ref_type,
    v_description
  );

  -- 4. Atualizar o post
  IF p_boost_type = 'bump' THEN
    UPDATE public.user_posts
    SET last_bumped_at = NOW()
    WHERE id = p_post_id;
  ELSIF p_boost_type = 'pin' THEN
    -- Desmarcar qualquer pin antigo que possa ter sobrado (limpeza preventiva)
    UPDATE public.user_posts SET is_pinned = false WHERE is_pinned = true;
    
    -- Marcar o novo pin
    UPDATE public.user_posts
    SET 
      is_pinned = true,
      pinned_at = NOW(),
      pinned_until = NOW() + INTERVAL '24 hours',
      last_bumped_at = NOW() -- Também sobe no critério de desempate
    WHERE id = p_post_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'new_balance', v_user_balance - v_amount);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
