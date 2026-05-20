
CREATE TABLE public.checklist_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.checklist_templates(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  answers JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);

CREATE INDEX idx_checklist_submissions_template ON public.checklist_submissions(template_id);
CREATE INDEX idx_checklist_submissions_creator ON public.checklist_submissions(created_by);

ALTER TABLE public.checklist_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can view submissions"
  ON public.checklist_submissions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users can create their own submissions"
  ON public.checklist_submissions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owner or admin can update submissions"
  ON public.checklist_submissions FOR UPDATE
  TO authenticated USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Owner or admin can delete submissions"
  ON public.checklist_submissions FOR DELETE
  TO authenticated USING (
    auth.uid() = created_by
    OR public.has_role(auth.uid(), 'super_admin')
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE TRIGGER update_checklist_submissions_updated_at
  BEFORE UPDATE ON public.checklist_submissions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
