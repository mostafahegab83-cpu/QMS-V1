import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Search, Loader2, Eye } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Doc = Database["public"]["Tables"]["documents"]["Row"];
type DocCategory = Database["public"]["Enums"]["doc_category"];
type DocStatus = Database["public"]["Enums"]["doc_status"];

const CATEGORIES: { value: DocCategory; label: string }[] = [
  { value: "policy", label: "Policy" },
  { value: "sop", label: "SOP" },
  { value: "work_instruction", label: "Work Instruction" },
  { value: "form", label: "Form" },
  { value: "manual", label: "Manual" },
  { value: "record", label: "Record" },
];

const STATUS_STYLES: Record<DocStatus, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  in_review: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-success-foreground border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  obsolete: "bg-muted text-muted-foreground border-muted-foreground/20",
};

export const Route = createFileRoute("/_authenticated/documents/")({
  head: () => ({ meta: [{ title: "Document Control — QMS Pro" }] }),
  component: DocumentsPage,
});

function DocumentsPage() {
  const { user, isAdmin } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("updated_at", { ascending: false });
    if (error) toast.error(error.message);
    setDocs(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = docs.filter((d) => {
    if (catFilter !== "all" && d.category !== catFilter) return false;
    if (statusFilter !== "all" && d.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!d.title.toLowerCase().includes(q) && !d.doc_number.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="rounded-lg bg-primary/10 p-3 text-primary">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Document Control</h1>
            <p className="text-sm text-muted-foreground mt-1">
              ISO 9001 controlled documents — policies, SOPs, work instructions, forms, manuals.
            </p>
          </div>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1.5" /> New document</Button>
          </DialogTrigger>
          <CreateDocumentDialog
            userId={user!.id}
            onCreated={() => { setCreateOpen(false); load(); }}
          />
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by title or number…"
                className="pl-8"
              />
            </div>
            <Select value={catFilter} onValueChange={setCatFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="in_review">In Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="obsolete">Obsolete</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-sm text-muted-foreground">
              {docs.length === 0
                ? "No documents yet. Create your first controlled document."
                : "No documents match your filters."}
            </div>
          ) : (
            <>
              <div className="divide-y md:hidden">
                {filtered.map((d) => (
                  <div key={d.id} className="space-y-3 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <p className="font-mono text-xs text-muted-foreground">{d.doc_number}</p>
                        <Link to="/documents/$id" params={{ id: d.id }} className="block truncate font-medium hover:underline">
                          {d.title}
                        </Link>
                      </div>
                      <Badge variant="outline" className={STATUS_STYLES[d.status]}>
                        {d.status.replace("_", " ")}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                      <span className="capitalize">{d.category.replace("_", " ")}</span>
                      <span>v{d.current_version} · {new Date(d.updated_at).toLocaleDateString()}</span>
                    </div>
                    <Button asChild size="sm" variant="outline" className="w-full">
                      <Link to="/documents/$id" params={{ id: d.id }}>
                        <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                      </Link>
                    </Button>
                  </div>
                ))}
              </div>
              <div className="hidden md:block">
                <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead className="w-[140px]">Category</TableHead>
                  <TableHead className="w-[110px]">Status</TableHead>
                  <TableHead className="w-[70px]">Ver.</TableHead>
                  <TableHead className="w-[120px]">Updated</TableHead>
                  <TableHead className="w-[100px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono text-xs">
                      <Link to="/documents/$id" params={{ id: d.id }} className="hover:underline">
                        {d.doc_number}
                      </Link>
                      <div className="mt-2 sm:hidden">
                        <Button asChild size="sm" variant="outline" className="h-8 px-3 font-sans text-xs">
                          <Link to="/documents/$id" params={{ id: d.id }}>
                            <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                          </Link>
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Link to="/documents/$id" params={{ id: d.id }} className="hover:underline font-medium">
                        {d.title}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm capitalize">
                      {d.category.replace("_", " ")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[d.status]}>
                        {d.status.replace("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm">v{d.current_version}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(d.updated_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button asChild size="sm" variant="outline">
                        <Link to="/documents/$id" params={{ id: d.id }}>
                          <Eye className="h-3.5 w-3.5 mr-1.5" /> View
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {!isAdmin && (
        <p className="text-xs text-muted-foreground">
          You can view all documents and edit ones you own. Only admins can approve or change status.
        </p>
      )}
    </div>
  );
}

function CreateDocumentDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    doc_number: "",
    title: "",
    description: "",
    category: "sop" as DocCategory,
    department: "",
    effective_date: "",
    review_date: "",
    expiry_date: "",
  });
  const [file, setFile] = useState<File | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.doc_number.trim() || !form.title.trim()) {
      toast.error("Document number and title are required");
      return;
    }
    setSubmitting(true);
    try {
      let filePath: string | null = null;
      let fileName: string | null = null;
      let fileSize: number | null = null;

      if (file) {
        const ext = file.name.split(".").pop() ?? "bin";
        filePath = `${userId}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("documents")
          .upload(filePath, file, { contentType: file.type });
        if (upErr) throw upErr;
        fileName = file.name;
        fileSize = file.size;
      }

      const { data: doc, error } = await supabase
        .from("documents")
        .insert({
          doc_number: form.doc_number.trim(),
          title: form.title.trim(),
          description: form.description.trim() || null,
          category: form.category,
          department: form.department.trim() || null,
          effective_date: form.effective_date || null,
          review_date: form.review_date || null,
          expiry_date: form.expiry_date || null,
          owner_id: userId,
          created_by: userId,
          current_version: 1,
          current_file_path: filePath,
          current_file_name: fileName,
          current_file_size: fileSize,
        })
        .select()
        .single();
      if (error) throw error;

      if (filePath && doc) {
        await supabase.from("document_versions").insert({
          document_id: doc.id,
          version: 1,
          file_path: filePath,
          file_name: fileName!,
          file_size: fileSize,
          change_summary: "Initial version",
          uploaded_by: userId,
        });
      }

      toast.success("Document created");
      onCreated();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create document");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>New controlled document</DialogTitle>
        <DialogDescription>
          Create a document. You can attach a file now or upload it later as version 1.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="doc_number">Document number *</Label>
            <Input
              id="doc_number" required
              placeholder="e.g. SOP-QA-001"
              value={form.doc_number}
              onChange={(e) => setForm({ ...form, doc_number: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="category">Category *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as DocCategory })}>
              <SelectTrigger id="category"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div>
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title" required maxLength={200}
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description" rows={2} maxLength={1000}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </div>
        <div>
          <Label htmlFor="department">Department</Label>
          <Input
            id="department" maxLength={100}
            value={form.department}
            onChange={(e) => setForm({ ...form, department: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <Label htmlFor="effective">Effective date</Label>
            <Input id="effective" type="date" value={form.effective_date}
              onChange={(e) => setForm({ ...form, effective_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="review">Review date</Label>
            <Input id="review" type="date" value={form.review_date}
              onChange={(e) => setForm({ ...form, review_date: e.target.value })} />
          </div>
          <div>
            <Label htmlFor="expiry">Expiry date</Label>
            <Input id="expiry" type="date" value={form.expiry_date}
              onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} />
          </div>
        </div>
        <div>
          <Label htmlFor="file">Attach file (optional)</Label>
          <Input id="file" type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <p className="text-xs text-muted-foreground mt-1">
            Word, Excel, PDF, images — stored as version 1.
          </p>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={submitting}>
            {submitting && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Create document
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
