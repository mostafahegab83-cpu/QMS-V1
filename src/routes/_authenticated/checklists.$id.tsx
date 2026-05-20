import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Loader2, Pencil, Trash2, ArrowUp, ArrowDown, ClipboardList, FileText } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["checklist_templates"]["Row"];
type Field = Database["public"]["Tables"]["checklist_fields"]["Row"];
type Submission = Database["public"]["Tables"]["checklist_submissions"]["Row"];
type FieldType = Database["public"]["Enums"]["checklist_field_type"];

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "select", label: "Dropdown (single)" },
  { value: "multiselect", label: "Dropdown (multi)" },
  { value: "checkbox", label: "Checkbox" },
];

export const Route = createFileRoute("/_authenticated/checklists/$id")({
  head: () => ({ meta: [{ title: "Checklist Fields — QMS Pro" }] }),
  component: ChecklistDetailPage,
});

function ChecklistDetailPage() {
  const { id } = Route.useParams();
  const { user, isAdmin } = useAuth();
  const [tpl, setTpl] = useState<Template | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [editField, setEditField] = useState<Field | null>(null);
  const [showNew, setShowNew] = useState(false);

  const canEdit = !!tpl && (isAdmin || tpl.created_by === user?.id);

  async function load() {
    setLoading(true);
    const [tplRes, fldRes, subRes] = await Promise.all([
      supabase.from("checklist_templates").select("*").eq("id", id).single(),
      supabase.from("checklist_fields").select("*").eq("template_id", id).order("sort_order", { ascending: true }),
      supabase.from("checklist_submissions").select("*").eq("template_id", id).order("created_at", { ascending: false }),
    ]);
    if (tplRes.error) toast.error(tplRes.error.message);
    if (fldRes.error) toast.error(fldRes.error.message);
    if (subRes.error) toast.error(subRes.error.message);
    setTpl(tplRes.data ?? null);
    setFields(fldRes.data ?? []);
    setSubmissions(subRes.data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [id]);

  async function move(idx: number, dir: -1 | 1) {
    const next = idx + dir;
    if (next < 0 || next >= fields.length) return;
    const a = fields[idx], b = fields[next];
    const updates = await Promise.all([
      supabase.from("checklist_fields").update({ sort_order: b.sort_order }).eq("id", a.id),
      supabase.from("checklist_fields").update({ sort_order: a.sort_order }).eq("id", b.id),
    ]);
    if (updates.some((r) => r.error)) toast.error("Reorder failed");
    void load();
  }

  async function remove(f: Field) {
    if (!confirm(`Remove field "${f.label}"?`)) return;
    const { error } = await supabase.from("checklist_fields").delete().eq("id", f.id);
    if (error) return toast.error(error.message);
    toast.success("Field removed");
    void load();
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!tpl) return <p className="text-sm text-muted-foreground">Template not found.</p>;

  return (
    <div className="space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/checklists"><ArrowLeft className="mr-1 h-4 w-4" /> All templates</Link>
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-semibold">{tpl.name}</h1>
            <div className="flex gap-2 items-center mt-1">
              {tpl.category && <Badge variant="secondary">{tpl.category}</Badge>}
              <Badge variant={tpl.is_active ? "default" : "secondary"}>{tpl.is_active ? "Active" : "Inactive"}</Badge>
            </div>
            {tpl.description && <p className="text-sm text-muted-foreground mt-2 max-w-2xl">{tpl.description}</p>}
          </div>
          <div className="flex gap-2">
            <Button asChild variant="default">
              <Link to="/checklists/$id/fill" params={{ id }}>
                <ClipboardList className="mr-2 h-4 w-4" /> Fill Out
              </Link>
            </Button>
            {canEdit && (
              <Button variant="outline" onClick={() => setShowNew(true)}>
                <Plus className="mr-2 h-4 w-4" /> Add Field
              </Button>
            )}
          </div>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Fields ({fields.length})</CardTitle></CardHeader>
        <CardContent>
          {fields.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No fields yet. Add your first one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Label</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Required</TableHead>
                  <TableHead>Options</TableHead>
                  <TableHead className="w-44 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((f, idx) => (
                  <TableRow key={f.id}>
                    <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium flex items-center gap-2">
                        {f.label}
                        {f.is_default && <Badge variant="outline" className="text-[10px]">default</Badge>}
                      </div>
                      {f.description && <div className="text-xs text-muted-foreground line-clamp-2 max-w-md">{f.description}</div>}
                    </TableCell>
                    <TableCell><Badge variant="secondary">{FIELD_TYPES.find((t) => t.value === f.field_type)?.label ?? f.field_type}</Badge></TableCell>
                    <TableCell>{f.required ? "Yes" : "No"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {Array.isArray(f.options) ? (f.options as string[]).join(", ") : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <>
                            <Button size="icon" variant="ghost" onClick={() => move(idx, -1)} disabled={idx === 0}>
                              <ArrowUp className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => move(idx, 1)} disabled={idx === fields.length - 1}>
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => setEditField(f)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={() => remove(f)}>
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Submissions ({submissions.length})</CardTitle>
          <Button asChild size="sm">
            <Link to="/checklists/$id/fill" params={{ id }}>
              <Plus className="mr-1 h-4 w-4" /> New Entry
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No submissions yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {submissions.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell>
                      <Badge variant={s.status === "submitted" ? "default" : "outline"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/checklists/$id/fill" params={{ id }} search={{ sid: s.id }}>
                            <FileText className="mr-1 h-4 w-4" /> Open
                          </Link>
                        </Button>
                        <Button size="icon" variant="ghost" onClick={async () => {
                          if (!confirm(`Delete submission "${s.title}"?`)) return;
                          const { error } = await supabase.from("checklist_submissions").delete().eq("id", s.id);
                          if (error) return toast.error(error.message);
                          toast.success("Submission deleted");
                          void load();
                        }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {showNew && (
        <FieldDialog
          open={showNew}
          onOpenChange={setShowNew}
          templateId={id}
          nextOrder={fields.length}
          onSaved={() => { setShowNew(false); void load(); }}
        />
      )}
      {editField && (
        <FieldDialog
          open={!!editField}
          onOpenChange={(v) => !v && setEditField(null)}
          templateId={id}
          existing={editField}
          nextOrder={editField.sort_order}
          onSaved={() => { setEditField(null); void load(); }}
        />
      )}
    </div>
  );
}

function FieldDialog({
  open, onOpenChange, templateId, existing, nextOrder, onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  templateId: string;
  existing?: Field;
  nextOrder: number;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    label: existing?.label ?? "",
    description: existing?.description ?? "",
    field_type: (existing?.field_type ?? "text") as FieldType,
    required: existing?.required ?? false,
    options: Array.isArray(existing?.options) ? (existing!.options as string[]).join(", ") : "",
  });
  const [saving, setSaving] = useState(false);
  const needsOptions = form.field_type === "select" || form.field_type === "multiselect";

  async function submit() {
    if (!form.label.trim()) return toast.error("Label required");
    setSaving(true);
    const opts = needsOptions
      ? form.options.split(",").map((s) => s.trim()).filter(Boolean)
      : null;
    if (needsOptions && (!opts || opts.length === 0)) {
      setSaving(false);
      return toast.error("Provide at least one option");
    }
    const payload = {
      template_id: templateId,
      label: form.label.trim(),
      description: form.description.trim() || null,
      field_type: form.field_type,
      required: form.required,
      options: opts,
      sort_order: nextOrder,
    };
    const res = existing
      ? await supabase.from("checklist_fields").update(payload).eq("id", existing.id)
      : await supabase.from("checklist_fields").insert(payload);
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(existing ? "Field updated" : "Field added");
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Field" : "Add Field"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Label *</Label>
            <Input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label>Type</Label>
            <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v as FieldType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {needsOptions && (
            <div>
              <Label>Options (comma-separated)</Label>
              <Input
                value={form.options}
                onChange={(e) => setForm({ ...form, options: e.target.value })}
                placeholder="Option A, Option B, Option C"
              />
            </div>
          )}
          <label className="flex items-center gap-2 text-sm">
            <Checkbox checked={form.required} onCheckedChange={(v) => setForm({ ...form, required: !!v })} />
            Required field
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} {existing ? "Save" : "Add"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
