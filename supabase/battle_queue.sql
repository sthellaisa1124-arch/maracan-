CREATE TABLE IF NOT EXISTS public.battle_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  agora_channel TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting', 'matched'
  opponent_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.battle_queue ENABLE ROW LEVEL SECURITY;

-- Políticas
DROP POLICY IF EXISTS "Qualquer um pode ver a fila" ON public.battle_queue;
CREATE POLICY "Qualquer um pode ver a fila" ON public.battle_queue
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Qualquer um autenticado pode entrar na fila" ON public.battle_queue;
CREATE POLICY "Qualquer um autenticado pode entrar na fila" ON public.battle_queue
  FOR INSERT WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Qualquer um pode atualizar status de match" ON public.battle_queue;
CREATE POLICY "Qualquer um pode atualizar status de match" ON public.battle_queue
  FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Host pode deletar sua propria entrada" ON public.battle_queue;
CREATE POLICY "Host pode deletar sua propria entrada" ON public.battle_queue
  FOR DELETE USING (auth.uid() = host_id);
