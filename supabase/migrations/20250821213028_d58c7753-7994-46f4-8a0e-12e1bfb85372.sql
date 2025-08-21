-- Create tables for ATS diagnostics system

-- Table to store CV diagnostics
CREATE TABLE public.diagnosticos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  email TEXT NOT NULL,
  cv_content TEXT,
  job_description TEXT,
  nota_ats INTEGER,
  alertas_top2 JSONB,
  resultado_completo JSONB,
  pago BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to store payments
CREATE TABLE public.pagamentos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id UUID REFERENCES public.diagnosticos(id),
  stripe_session_id TEXT UNIQUE,
  stripe_payment_intent_id TEXT,
  external_id TEXT UNIQUE,
  valor_centavos INTEGER,
  moeda TEXT DEFAULT 'brl',
  status TEXT DEFAULT 'pending',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table to store uploaded files
CREATE TABLE public.arquivos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostico_id UUID REFERENCES public.diagnosticos(id),
  nome_arquivo TEXT NOT NULL,
  tipo_mime TEXT,
  tamanho_bytes INTEGER,
  storage_path TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.diagnosticos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arquivos ENABLE ROW LEVEL SECURITY;

-- RLS Policies for diagnosticos
CREATE POLICY "Users can view their own diagnosticos" ON public.diagnosticos
  FOR SELECT USING (
    user_id = auth.uid() OR 
    (user_id IS NULL AND email = auth.email())
  );

CREATE POLICY "Anyone can create diagnosticos" ON public.diagnosticos
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update diagnosticos" ON public.diagnosticos
  FOR UPDATE USING (true);

-- RLS Policies for pagamentos  
CREATE POLICY "Users can view their own pagamentos" ON public.pagamentos
  FOR SELECT USING (
    diagnostico_id IN (
      SELECT id FROM public.diagnosticos 
      WHERE user_id = auth.uid() OR (user_id IS NULL AND email = auth.email())
    )
  );

CREATE POLICY "System can manage pagamentos" ON public.pagamentos
  FOR ALL USING (true);

-- RLS Policies for arquivos
CREATE POLICY "Users can view their own arquivos" ON public.arquivos
  FOR SELECT USING (
    diagnostico_id IN (
      SELECT id FROM public.diagnosticos 
      WHERE user_id = auth.uid() OR (user_id IS NULL AND email = auth.email())
    )
  );

CREATE POLICY "System can manage arquivos" ON public.arquivos
  FOR ALL USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_diagnosticos_updated_at
  BEFORE UPDATE ON public.diagnosticos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_pagamentos_updated_at
  BEFORE UPDATE ON public.pagamentos
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();