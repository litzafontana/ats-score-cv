-- Criar tabela para controlar usos gratuitos por email
CREATE TABLE public.usuarios_gratuitos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  analises_realizadas INTEGER NOT NULL DEFAULT 0,
  analises_limite INTEGER NOT NULL DEFAULT 2,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.usuarios_gratuitos ENABLE ROW LEVEL SECURITY;

-- Create policies (permite leitura/escrita para funções do sistema)
CREATE POLICY "Sistema pode gerenciar usuarios gratuitos" 
ON public.usuarios_gratuitos 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_usuarios_gratuitos_updated_at
BEFORE UPDATE ON public.usuarios_gratuitos
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Índice para melhor performance nas consultas por email
CREATE INDEX idx_usuarios_gratuitos_email ON public.usuarios_gratuitos(email);