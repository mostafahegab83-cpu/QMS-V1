
-- ============ ENUMS ============
CREATE TYPE public.doc_category AS ENUM ('policy','sop','work_instruction','form','manual','record');
CREATE TYPE public.doc_status AS ENUM ('draft','in_review','approved','obsolete','rejected');
CREATE TYPE public.approval_action AS ENUM ('pending','approved','rejected');

-- ============ DOCUMENTS ============
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_number TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT,
  category public.doc_category NOT NULL DEFAULT 'sop',
  status public.doc_status NOT NULL DEFAULT 'draft',
  current_version INTEGER NOT NULL DEFAULT 1,
  effective_date DATE,
  review_date DATE,
  expiry_date DATE,
  owner_id UUID NOT NULL,
  department TEXT,
  current_file_path TEXT,
  current_file_name TEXT,
  current_file_size BIGINT,
  created_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_documents_status ON public.documents(status);
CREATE INDEX idx_documents_category ON public.documents(category);
CREATE INDEX idx_documents_owner ON public.documents(owner_id);

-- ============ DOCUMENT VERSIONS ============
CREATE TABLE public.document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT,
  change_summary TEXT,
  uploaded_by UUID NOT NULL,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(document_id, version)
);

CREATE INDEX idx_versions_document ON public.document_versions(document_id);

-- ============ DOCUMENT APPROVALS ============
CREATE TABLE public.document_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  approver_id UUID NOT NULL,
  action public.approval_action NOT NULL DEFAULT 'pending',
  comments TEXT,
  action_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_approvals_document ON public.document_approvals(document_id);
CREATE INDEX idx_approvals_approver ON public.document_approvals(approver_id);

-- ============ TIMESTAMPS ============
CREATE TRIGGER trg_documents_updated
BEFORE UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ============ RLS ============
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_approvals ENABLE ROW LEVEL SECURITY;

-- documents policies
CREATE POLICY "Authenticated view documents"
  ON public.documents FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Owner or admin insert documents"
  ON public.documents FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = created_by AND (
      auth.uid() = owner_id
      OR public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'super_admin')
    )
  );

CREATE POLICY "Owner or admin update documents"
  ON public.documents FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = owner_id
    OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
  );

CREATE POLICY "Super admin delete documents"
  ON public.documents FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(),'super_admin'));

-- versions policies
CREATE POLICY "Authenticated view versions"
  ON public.document_versions FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Owner or admin insert versions"
  ON public.document_versions FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = uploaded_by AND EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.id = document_id AND (
        d.owner_id = auth.uid()
        OR public.has_role(auth.uid(),'admin')
        OR public.has_role(auth.uid(),'super_admin')
      )
    )
  );

-- approvals policies
CREATE POLICY "Authenticated view approvals"
  ON public.document_approvals FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Admin manage approvals"
  ON public.document_approvals FOR ALL
  TO authenticated
  USING (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
  )
  WITH CHECK (
    public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'super_admin')
  );

-- ============ STORAGE BUCKET ============
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents','documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated read documents bucket"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'documents');

CREATE POLICY "Authenticated upload documents bucket"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Owner update documents bucket"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'documents' AND auth.uid() = owner);

CREATE POLICY "Admin delete documents bucket"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'documents' AND (
      public.has_role(auth.uid(),'admin')
      OR public.has_role(auth.uid(),'super_admin')
    )
  );
