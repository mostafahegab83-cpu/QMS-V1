
CREATE TYPE public.risk_level AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.risk_mitigation_status AS ENUM ('not_started', 'in_progress', 'implemented', 'verified_effective');
CREATE TYPE public.risk_status AS ENUM ('open', 'mitigated', 'closed', 'accepted');

CREATE TABLE public.risks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  risk_number TEXT NOT NULL UNIQUE,
  description TEXT NOT NULL,
  nc_id TEXT,
  affected_department TEXT,
  affected_process TEXT,
  impact_area TEXT,
  risk_level public.risk_level NOT NULL DEFAULT 'medium',
  existing_controls TEXT,
  risk_owner_id UUID NOT NULL,
  mitigation_status public.risk_mitigation_status NOT NULL DEFAULT 'not_started',
  linked_capa_id UUID REFERENCES public.capas(id) ON DELETE SET NULL,
  current_status public.risk_status NOT NULL DEFAULT 'open',
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  target_date DATE,
  closed_at DATE,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_risks_owner ON public.risks(risk_owner_id);
CREATE INDEX idx_risks_capa ON public.risks(linked_capa_id);

ALTER TABLE public.risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view risks"
  ON public.risks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or owner insert risks"
  ON public.risks FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (
      public.has_role(auth.uid(), 'admin')
      OR public.has_role(auth.uid(), 'super_admin')
      OR auth.uid() = risk_owner_id
    )
  );

CREATE POLICY "Admin or owner update risks"
  ON public.risks FOR UPDATE TO authenticated
  USING (
    auth.uid() = risk_owner_id
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'super_admin')
  );

CREATE POLICY "Super admin delete risks"
  ON public.risks FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER risks_touch_updated_at
  BEFORE UPDATE ON public.risks
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
