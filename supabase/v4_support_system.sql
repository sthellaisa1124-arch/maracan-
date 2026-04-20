-- ============================================================
-- SISTEMA DE SUPORTE E TICKETS — VELLAR PAY
-- ============================================================

-- 1. Tabela de Tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- NULL se for suporte público via session externa (futuro)
    type TEXT NOT NULL CHECK (type IN ('account_issue', 'human_support', 'feedback')),
    subject TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'closed')),
    assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- ID do atendente
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- 2. Tabela de Mensagens do Ticket
CREATE TABLE IF NOT EXISTS public.support_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    is_staff_reply BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- 3. Habilitar RLS
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- 4. Políticas para Tickets
CREATE POLICY "Usuários veem seus próprios tickets"
    ON public.support_tickets FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Usuários criam seus próprios tickets"
    ON public.support_tickets FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Staff e CEO veem todos os tickets"
    ON public.support_tickets FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (account_role IN ('ceo', 'support', 'staff') OR is_admin = true)
        )
    );

CREATE POLICY "Staff e CEO atualizam tickets"
    ON public.support_tickets FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (account_role IN ('ceo', 'support', 'staff') OR is_admin = true)
        )
    );

-- 5. Políticas para Mensagens
CREATE POLICY "Usuários veem mensagens de seus tickets"
    ON public.support_messages FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid()
        )
    );

CREATE POLICY "Usuários inserem mensagens em seus tickets"
    ON public.support_messages FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM support_tickets 
            WHERE id = ticket_id AND user_id = auth.uid() AND status <> 'closed'
        )
    );

CREATE POLICY "Staff vê e insere todas as mensagens"
    ON public.support_messages FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND (account_role IN ('ceo', 'support', 'staff') OR is_admin = true)
        )
    );

-- 6. Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_support_ticket_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_ticket_modtime
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION update_support_ticket_timestamp();

-- 7. Função para abrir ticket e mensagem inicial em uma transação (via RPC)
CREATE OR REPLACE FUNCTION public.open_support_ticket(
    p_type TEXT,
    p_subject TEXT,
    p_message TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_ticket_id UUID;
BEGIN
    -- Criar ticket
    INSERT INTO public.support_tickets (user_id, type, subject, description, status)
    VALUES (auth.uid(), p_type, p_subject, p_message, 'pending')
    RETURNING id INTO v_ticket_id;

    -- Inserir primeira mensagem
    INSERT INTO public.support_messages (ticket_id, sender_id, message, is_staff_reply)
    VALUES (v_ticket_id, auth.uid(), p_message, FALSE);

    RETURN jsonb_build_object('success', true, 'ticket_id', v_ticket_id);
EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;
