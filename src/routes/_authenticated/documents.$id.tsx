import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Download, Upload, Send, Check, X, Trash2, Loader2, History, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Doc = Database["public"]["Tables"]["documents"]["Row"];
type Version = Database["public"]["Tables"]["document_versions"]["Row"];
type Approval = Database["public"]["Tables"]["document_approvals"]["Row"];
type DocStatus = Database["public"]["Enums"]["doc_status"];

const STATUS_STYLES: Record<DocStatus, string> = {
  draft: "bg-muted text-muted-foreground border-muted-foreground/20",
  in_review: "bg-warning/15 text-warning-foreground border-warning/30",
  approved: "bg-success/15 text-success-foreground border-success/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  obsolete: "bg-muted text-muted-foreground border-muted-foreground/20",
};

export const Route = createFileRoute("/_authenticated/documents/$id")({
  head: () => ({ meta: [{ title: "Document — QMS Pro" }] }),
  component: DocumentDetail,
});

function DocumentDetail() {
  const { id } = Route.useParams();
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const navigate = useNavigate();
  const [doc, setDoc] = useState<Doc | null>(null);
  const [versions, setVersions] = useState<Version[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [acting, setActing] = useState(false);

  const isOwner = doc?.owner_id === user?.id;
  const canEdit = isOwner || isAdmin;

  const load = async () => {
    setLoading(true);
    const [d, v, a] = await Promise.all([
      supabase.from("documents").select("*").eq("id", id).single(),
      supabase.from("document_versions").select("*").eq("document_id", id).order("version", { ascending: false }),
      supabase.from("document_approvals").select("*").eq("document_id", id).order("created_at", { ascending: false }),
    ]);
    if (d.error) { toast.error(d.error.message); setLoading(false); return; }
    setDoc(d.data);
    setVersions(v.data ?? []);
    setApprovals(a.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [id]);

  const downloadFile = async (path: string, name: string) => {
    const { data, error } = await supabase.storage.from("documents").createSignedUrl(path, 60);
    if (error) { toast.error(error.message); return; }
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const updateStatus = async (newStatus: DocStatus, comments?: string) => {
    if (!doc || !user) return;
    setActing(true);
    try {
      const { error: e1 } = await supabase.from("documents").update({ status: newStatus }).eq("id", doc.id);
      if (e1) throw e1;
      if (newStatus === "approved" || newStatus === "rejected") {
        await supabase.from("document_approvals").insert({
          document_id: doc.id,
          version: doc.current_version,
          approver_id: user.id,
          action: newStatus === "approved" ? "approved" : "rejected",
          comments: comments ?? null,
          action_at: new Date().toISOString(),
        });
      }
      toast.success(`Document ${newStatus.replace("_", " ")}`);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setActing(false);
    }
  };

  const deleteDoc = async () => {
    if (!doc) return;
    const { error } = await supabase.from("documents").delete().eq("id", doc.id);
    if (error) { toast.error(error.message); return; }
    toast.success("Document deleted");
    navigate({ to: "/documents" });
  };

  if (loading) {
    return <div className="flex items-center justify-center py-16">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>;
  }
  if (!doc) {
    return <div className="text-center py-16 text-muted-foreground">Document not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/documents"><ArrowLeft className="h-4 w-4 mr-1.5" /> Back to documents</Link>
        </Button>
        {isSuperAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive">
                <Trash2 className="h-4 w-4 mr-1.5" /> Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this document?</AlertDialogTitle>
                <AlertDialogDescription>
                  All versions, approvals, and files will be removed. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteDoc} className="bg-destructive">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <FileText className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{doc.doc_number}</span>
            <Badge variant="outline" className={STATUS_STYLES[doc.status]}>
              {doc.status.replace("_", " ")}
            </Badge>
            <Badge variant="secondary" className="capitalize">{doc.category.replace("_", " ")}</Badge>
            <Badge variant="outline">v{doc.current_version}</Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight mt-1">{doc.title}</h1>
          {doc.description && <p className="text-sm text-muted-foreground mt-1">{doc.description}</p>}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Current file</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {doc.current_file_path ? (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{doc.current_file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    Version {doc.current_version} ·{" "}
                    {doc.current_file_size ? `${(doc.current_file_size / 1024).toFixed(1)} KB` : "—"}
                  </p>
                </div>
                <Button variant="outline" size="sm"
                  onClick={() => downloadFile(doc.current_file_path!, doc.current_file_name!)}>
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No file attached yet.</p>
            )}

            {canEdit && (
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-1.5" /> Upload new version
                  </Button>
                </DialogTrigger>
                <UploadVersionDialog doc={doc} userId={user!.id}
                  onDone={() => { setUploadOpen(false); load(); }} />
              </Dialog>
            )}

            <Separator />

            <div className="flex flex-wrap gap-2">
              {canEdit && doc.status === "draft" && (
                <Button size="sm" disabled={acting} onClick={() => updateStatus("in_review")}>
                  <Send className="h-4 w-4 mr-1.5" /> Submit for review
                </Button>
              )}
              {isAdmin && doc.status === "in_review" && (
                <>
                  <Button size="sm" disabled={acting} onClick={() => updateStatus("approved")}>
                    <Check className="h-4 w-4 mr-1.5" /> Approve
                  </Button>
                  <Button size="sm" variant="outline" disabled={acting}
                    onClick={() => updateStatus("rejected")}>
                    <X className="h-4 w-4 mr-1.5" /> Reject
                  </Button>
                </>
              )}
              {isAdmin && doc.status === "approved" && (
                <Button size="sm" variant="outline" disabled={acting}
                  onClick={() => updateStatus("obsolete")}>
                  Mark obsolete
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Metadata</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Meta label="Department" value={doc.department ?? "—"} />
            <Meta label="Effective" value={fmt(doc.effective_date)} />
            <Meta label="Review" value={fmt(doc.review_date)} />
            <Meta label="Expiry" value={fmt(doc.expiry_date)} />
            <Meta label="Created" value={new Date(doc.created_at).toLocaleDateString()} />
            <Meta label="Updated" value={new Date(doc.updated_at).toLocaleDateString()} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <History className="h-4 w-4" /> Version history
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No versions yet.</p>
          ) : versions.map((v) => (
            <div key={v.id} className="flex items-center justify-between gap-3 rounded-md border p-3">
              <div className="min-w-0">
                <p className="text-sm font-medium">v{v.version} — {v.file_name}</p>
                <p className="text-xs text-muted-foreground">
                  {new Date(v.uploaded_at).toLocaleString()}
                  {v.change_summary && ` · ${v.change_summary}`}
                </p>
              </div>
              <Button variant="ghost" size="sm"
                onClick={() => downloadFile(v.file_path, v.file_name)}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Approval history</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {approvals.length === 0 ? (
            <p className="text-sm text-muted-foreground">No approval actions yet.</p>
          ) : approvals.map((a) => (
            <div key={a.id} className="rounded-md border p-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className={
                  a.action === "approved" ? STATUS_STYLES.approved :
                  a.action === "rejected" ? STATUS_STYLES.rejected :
                  STATUS_STYLES.in_review
                }>
                  {a.action}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  v{a.version} · {a.action_at ? new Date(a.action_at).toLocaleString() : "pending"}
                </span>
              </div>
              {a.comments && <p className="text-sm mt-2">{a.comments}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function UploadVersionDialog({ doc, userId, onDone }: { doc: Doc; userId: string; onDone: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) { toast.error("Pick a file"); return; }
    setBusy(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const newVersion = doc.current_version + 1;
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("documents").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;

      const { error: vErr } = await supabase.from("document_versions").insert({
        document_id: doc.id,
        version: newVersion,
        file_path: path,
        file_name: file.name,
        file_size: file.size,
        change_summary: summary || null,
        uploaded_by: userId,
      });
      if (vErr) throw vErr;

      const { error: dErr } = await supabase.from("documents").update({
        current_version: newVersion,
        current_file_path: path,
        current_file_name: file.name,
        current_file_size: file.size,
        status: "draft",
      }).eq("id", doc.id);
      if (dErr) throw dErr;

      toast.success(`Uploaded version ${newVersion}`);
      onDone();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Upload version {doc.current_version + 1}</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <Label htmlFor="ver-file">File *</Label>
          <Input id="ver-file" type="file" required
            onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <Label htmlFor="summary">Change summary</Label>
          <Textarea id="summary" rows={3} maxLength={500}
            placeholder="What changed in this version?"
            value={summary} onChange={(e) => setSummary(e.target.value)} />
        </div>
        <p className="text-xs text-muted-foreground">
          Uploading a new version resets status to Draft. Submit for review when ready.
        </p>
        <DialogFooter>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin mr-1.5" />}
            Upload
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function fmt(d: string | null) {
  return d ? new Date(d).toLocaleDateString() : "—";
}
