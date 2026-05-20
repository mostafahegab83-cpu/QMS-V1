
-- Audit checklist builder: templates with custom + default fields

CREATE TYPE public.checklist_field_type AS ENUM (
  'text', 'textarea', 'number', 'date', 'select', 'multiselect', 'checkbox'
);

CREATE TABLE public.checklist_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  category text,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view checklist templates"
  ON public.checklist_templates FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or creator insert checklist templates"
  ON public.checklist_templates FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = created_by
    AND (has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin') OR auth.uid() = created_by)
  );

CREATE POLICY "Admin or creator update checklist templates"
  ON public.checklist_templates FOR UPDATE TO authenticated
  USING (auth.uid() = created_by OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Super admin delete checklist templates"
  ON public.checklist_templates FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'super_admin') OR has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_checklist_templates_updated
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE public.checklist_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id uuid NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  label text NOT NULL,
  description text,
  field_type public.checklist_field_type NOT NULL DEFAULT 'text',
  options jsonb,                -- for select/multiselect: ["A","B"]
  required boolean NOT NULL DEFAULT false,
  sort_order int NOT NULL DEFAULT 0,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_checklist_fields_template ON public.checklist_fields(template_id, sort_order);

ALTER TABLE public.checklist_fields ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view checklist fields"
  ON public.checklist_fields FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admin or template owner manage fields - insert"
  ON public.checklist_fields FOR INSERT TO authenticated
  WITH CHECK (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Admin or template owner manage fields - update"
  ON public.checklist_fields FOR UPDATE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.created_by = auth.uid())
  );

CREATE POLICY "Admin or template owner manage fields - delete"
  ON public.checklist_fields FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'super_admin')
    OR EXISTS (SELECT 1 FROM public.checklist_templates t WHERE t.id = template_id AND t.created_by = auth.uid())
  );

CREATE TRIGGER trg_checklist_fields_updated
  BEFORE UPDATE ON public.checklist_fields
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
