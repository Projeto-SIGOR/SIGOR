-- Criar tabela de preferências do usuário
CREATE TABLE public.user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  sound_enabled BOOLEAN NOT NULL DEFAULT true,
  sound_volume NUMERIC NOT NULL DEFAULT 0.5 CHECK (sound_volume >= 0 AND sound_volume <= 1),
  critical_alerts BOOLEAN NOT NULL DEFAULT true,
  high_priority_alerts BOOLEAN NOT NULL DEFAULT true,
  email_notifications BOOLEAN NOT NULL DEFAULT false,
  push_notifications BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view own preferences" 
ON public.user_preferences 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" 
ON public.user_preferences 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" 
ON public.user_preferences 
FOR UPDATE 
USING (user_id = auth.uid());

-- Trigger para atualizar updated_at
CREATE TRIGGER update_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Adicionar tabela ao realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_preferences;