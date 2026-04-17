ALTER TABLE public.live_sessions 
ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    is_system BOOLEAN DEFAULT false,
    gift_data JSONB
);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live chat messages" 
ON public.live_chat_messages FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can insert chat messages" 
ON public.live_chat_messages FOR INSERT 
WITH CHECK (auth.uid() = profile_id);

-- Habilitar o realtime
alter publication supabase_realtime add table live_chat_messages;
