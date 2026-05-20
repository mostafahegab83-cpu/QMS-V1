
-- Enums
CREATE TYPE public.capa_type AS ENUM ('corrective', 'preventive');
CREATE TYPE public.capa_source AS ENUM ('audit', 'complaint', 'deviation', 'internal', 'other');
CREATE TYPE public.capa_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE public.capa_status AS ENUM ('open', 'in_progress', 'pending_verification', 'closed', 'cancelled');
CREATE TYPE public.capa_action_status AS ENUM ('pending', 'in_progress', 'done', 'blocked');

-- CAPA table
CREATE TABLE public.capas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  type public.capa_type NOT NULL DEFAULT 'corrective',
  source public.capa_source NOT NULL DEFAULT 'internal',
  source_reference TEXT,
  severity public.capa_severity NOT NULL DEFAULT 'medium',
  status public.capa_status NOT NULL DEFAULT 'open',
  owner_id UUID NOT NULL,
  root_cause TEXT,
  action_plan TEXT,
  effectiveness_criteria TEXT,
  effectiveness_result TEXT,
  linked_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  opened_at DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE,
  completed_at DATE,
  verified_at DATE,
  verified_by UUID,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view capas" ON public.capas
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or owner insert capas" ON public.capas
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      auth.uid() = owner_id
    )
  );

CREATE POLICY "Admin or owner update capas" ON public.capas
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role)
  );

CREATE POLICY "Super admin delete capas" ON public.capas
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin'::app_role));

CREATE TRIGGER capas_updated_at
  BEFORE UPDATE ON public.capas
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- CAPA actions
CREATE TABLE public.capa_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  capa_id UUID NOT NULL REFERENCES public.capas(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  owner_id UUID NOT NULL,
  due_date DATE,
  completed_at DATE,
  status public.capa_action_status NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.capa_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view capa actions" ON public.capa_actions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or capa owner insert actions" ON public.capa_actions
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      has_role(auth.uid(), 'admin'::app_role) OR
      has_role(auth.uid(), 'super_admin'::app_role) OR
      EXISTS (SELECT 1 FROM public.capas c WHERE c.id = capa_id AND c.owner_id = auth.uid())
    )
  );

CREATE POLICY "Admin or owner update actions" ON public.capa_actions
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = owner_id OR
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.capas c WHERE c.id = capa_id AND c.owner_id = auth.uid())
  );

CREATE POLICY "Admin or capa owner delete actions" ON public.capa_actions
  FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    has_role(auth.uid(), 'super_admin'::app_role) OR
    EXISTS (SELECT 1 FROM public.capas c WHERE c.id = capa_id AND c.owner_id = auth.uid())
  );

CREATE TRIGGER capa_actions_updated_at
  BEFORE UPDATE ON public.capa_actions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX idx_capas_status ON public.capas(status);
CREATE INDEX idx_capas_owner ON public.capas(owner_id);
CREATE INDEX idx_capas_due_date ON public.capas(due_date);
CREATE INDEX idx_capa_actions_capa ON public.capa_actions(capa_id);
