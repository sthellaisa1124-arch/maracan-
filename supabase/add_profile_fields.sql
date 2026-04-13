-- Adiciona as colunas website e show_suggestions na tabela profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS website TEXT,
ADD COLUMN IF NOT EXISTS show_suggestions BOOLEAN DEFAULT true;
