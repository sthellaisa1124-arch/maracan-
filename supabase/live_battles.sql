-- Tabela de Batalhas de Live (CONFRONTO)
CREATE TABLE IF NOT EXISTS live_battles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_a_id UUID REFERENCES auth.users(id) NOT NULL,
    host_b_id UUID REFERENCES auth.users(id) NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'finished', 'declined', 'cancelled')),
    score_a INTEGER DEFAULT 0,
    score_b INTEGER DEFAULT 0,
    started_at TIMESTAMPTZ,
    ends_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Channel reference para conectar os dois
    agora_channel_a TEXT,
    agora_channel_b TEXT
);

-- Enable RLS
ALTER TABLE live_battles ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
CREATE POLICY "Qualquer um pode ler batalhas" ON live_battles FOR SELECT USING (true);

CREATE POLICY "Criadores podem iniciar batalhas" ON live_battles FOR INSERT 
WITH CHECK (auth.uid() = host_a_id);

CREATE POLICY "Participantes podem atualizar batalhas" ON live_battles FOR UPDATE 
USING (auth.uid() = host_a_id OR auth.uid() = host_b_id)
WITH CHECK (auth.uid() = host_a_id OR auth.uid() = host_b_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_battles;
