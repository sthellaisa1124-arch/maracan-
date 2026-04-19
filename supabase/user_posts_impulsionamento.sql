-- 1. Adicionar colunas de impulsionamento na tabela user_posts
ALTER TABLE public.user_posts 
ADD COLUMN IF NOT EXISTS last_bumped_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pinned_until TIMESTAMP WITH TIME ZONE;

-- 2. Inicializar last_bumped_at com created_at para posts existentes
UPDATE public.user_posts 
SET last_bumped_at = created_at 
WHERE last_bumped_at IS NULL;

-- 3. Atualizar a constraint de tipos de transação de Moral para incluir os novos tipos
-- Primeiro removemos a antiga (precisa saber o nome, geralmente é gerado automaticamente se não especificado)
-- Como o nome pode variar, vamos apenas adicionar tipos se a tabela permitir (CHECK constraint)
DO $$
BEGIN
    ALTER TABLE public.moral_transactions DROP CONSTRAINT IF EXISTS moral_transactions_type_check;
    ALTER TABLE public.moral_transactions ADD CONSTRAINT moral_transactions_type_check 
    CHECK (type IN ('bonus', 'compra', 'enviado_avista', 'chat_ia', 'saque', 'admin_ajuste', 'post_divulgacao', 'bump_post', 'pin_post'));
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Não foi possível atualizar a constraint de tipo. Verifique a tabela moral_transactions.';
END $$;

-- 4. Função para limpar status de 'is_pinned' expirado (pode ser chamada periodicamente ou via cron)
CREATE OR REPLACE FUNCTION public.cleanup_expired_pins()
RETURNS void AS $$
BEGIN
    UPDATE public.user_posts
    SET is_pinned = false
    WHERE is_pinned = true AND pinned_until < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
