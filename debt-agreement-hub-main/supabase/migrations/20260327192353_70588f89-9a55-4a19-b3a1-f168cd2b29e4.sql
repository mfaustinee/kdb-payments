
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Debtors table
CREATE TABLE public.debtors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.debtors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view debtors" ON public.debtors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert debtors" ON public.debtors FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update debtors" ON public.debtors FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_debtors_updated_at BEFORE UPDATE ON public.debtors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Agreements table
CREATE TYPE public.agreement_status AS ENUM ('draft', 'pending', 'signed', 'completed', 'cancelled');

CREATE TABLE public.agreements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  debtor_id UUID NOT NULL REFERENCES public.debtors(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  debt_amount NUMERIC(12,2) NOT NULL,
  total_with_interest NUMERIC(12,2) NOT NULL,
  interest_rate NUMERIC(5,2) NOT NULL DEFAULT 0,
  num_installments INTEGER NOT NULL DEFAULT 1,
  installment_amount NUMERIC(12,2) NOT NULL,
  payment_frequency TEXT NOT NULL DEFAULT 'monthly',
  start_date DATE NOT NULL,
  terms TEXT,
  status public.agreement_status NOT NULL DEFAULT 'draft',
  pdf_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.agreements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view agreements" ON public.agreements FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert agreements" ON public.agreements FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Authenticated users can update agreements" ON public.agreements FOR UPDATE TO authenticated USING (true);
CREATE TRIGGER update_agreements_updated_at BEFORE UPDATE ON public.agreements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Signatures table
CREATE TABLE public.signatures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agreement_id UUID NOT NULL REFERENCES public.agreements(id) ON DELETE CASCADE,
  signer_type TEXT NOT NULL DEFAULT 'debtor',
  file_url TEXT NOT NULL,
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.signatures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can view signatures" ON public.signatures FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert signatures" ON public.signatures FOR INSERT TO authenticated WITH CHECK (true);

-- Storage buckets for signatures and PDFs
INSERT INTO storage.buckets (id, name, public) VALUES ('signatures', 'signatures', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('agreements', 'agreements', true);

CREATE POLICY "Authenticated users can upload signatures" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'signatures');
CREATE POLICY "Anyone can view signatures" ON storage.objects FOR SELECT USING (bucket_id = 'signatures');
CREATE POLICY "Authenticated users can upload agreements" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'agreements');
CREATE POLICY "Anyone can view agreements" ON storage.objects FOR SELECT USING (bucket_id = 'agreements');
