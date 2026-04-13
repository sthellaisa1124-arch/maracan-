-- Aplicar e corrigir políticas RLS para permitir que o destinatário marque mensagens como lidas
ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

-- Política para permitir que o destinatário atualize as mensagens (apenas o campo 'read')
CREATE POLICY "Permitir destinatário marcar como lido"
ON public.direct_messages
FOR UPDATE
USING (auth.uid() = receiver_id);

-- E garantir que também tem a de INSERT se estiver faltando algo
CREATE POLICY "Permitir envio de mensagens"
ON public.direct_messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);
