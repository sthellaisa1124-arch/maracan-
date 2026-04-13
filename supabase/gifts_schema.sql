-- ============================================================
-- SISTEMA DE PRESENTES (GIFTS) — IAI CRIA
-- Execute este arquivo no Supabase SQL Editor
-- ============================================================

-- 1. Tabela de transações de presentes
CREATE TABLE IF NOT EXISTS public.gift_transactions (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  recipient_id  UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  gift_id       TEXT NOT NULL,
  gift_name     TEXT NOT NULL,
  gift_price    INTEGER NOT NULL CHECK (gift_price > 0),
  gift_tier     TEXT NOT NULL CHECK (gift_tier IN ('basic','mid','premium','ultra')),
  post_id       UUID NULL,          -- referência opcional ao post/vídeo
  created_at    TIMESTAMPTZ DEFAULT now() NOT NULL
);

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_gift_txn_sender    ON public.gift_transactions(sender_id);
CREATE INDEX IF NOT EXISTS idx_gift_txn_recipient ON public.gift_transactions(recipient_id);
CREATE INDEX IF NOT EXISTS idx_gift_txn_post      ON public.gift_transactions(post_id);
CREATE INDEX IF NOT EXISTS idx_gift_txn_created   ON public.gift_transactions(created_at DESC);

-- 3. Row Level Security
ALTER TABLE public.gift_transactions ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode VER as transações (para ranking, histórico público)
CREATE POLICY "gift_txn_select" ON public.gift_transactions
  FOR SELECT USING (true);

-- Só o remetente pode criar (a lógica de débito fica no RPC send_moral)
CREATE POLICY "gift_txn_insert" ON public.gift_transactions
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Ninguém pode deletar ou alterar (imutável por design)
CREATE POLICY "gift_txn_no_update" ON public.gift_transactions
  FOR UPDATE USING (false);

CREATE POLICY "gift_txn_no_delete" ON public.gift_transactions
  FOR DELETE USING (false);

-- 4. View auxiliar: total de moral recebida por post
CREATE OR REPLACE VIEW public.post_gifts_summary AS
  SELECT
    post_id,
    COUNT(*)                  AS total_gifts,
    SUM(gift_price)           AS total_moral,
    MAX(created_at)           AS last_gift_at
  FROM public.gift_transactions
  WHERE post_id IS NOT NULL
  GROUP BY post_id;

-- 5. View auxiliar: top doadores por usuário
CREATE OR REPLACE VIEW public.top_gifters AS
  SELECT
    sender_id,
    p.username,
    p.avatar_url,
    COUNT(*)         AS gifts_sent,
    SUM(gift_price)  AS total_moral_sent
  FROM public.gift_transactions gt
  JOIN public.profiles p ON p.id = gt.sender_id
  GROUP BY sender_id, p.username, p.avatar_url
  ORDER BY total_moral_sent DESC;

-- 6. Tipo de notificação: garantir que 'gift_received' seja aceito
-- (Se a coluna for um ENUM, adicionar o valor; se for TEXT, não precisa)
-- Se der erro, significa que já existe ou não é ENUM — pode ignorar.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'notification_type'
  ) THEN
    ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'gift_received';
  END IF;
END $$;

-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT 'gift_transactions criada com sucesso ✅' AS status;
