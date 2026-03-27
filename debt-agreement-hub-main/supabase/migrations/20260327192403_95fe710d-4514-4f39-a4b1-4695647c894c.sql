
-- Tighten UPDATE policies to require authenticated user
DROP POLICY "Authenticated users can update debtors" ON public.debtors;
CREATE POLICY "Authenticated users can update debtors" ON public.debtors FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY "Authenticated users can update agreements" ON public.agreements;
CREATE POLICY "Authenticated users can update agreements" ON public.agreements FOR UPDATE TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Tighten signature insert policy
DROP POLICY "Authenticated users can insert signatures" ON public.signatures;
CREATE POLICY "Authenticated users can insert signatures" ON public.signatures FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
