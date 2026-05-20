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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardList, Plus, Search, Loader2, ArrowRight, Trash2, Sparkles } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["checklist_templates"]["Row"];

// Default fields from the Process Assurance template
const DEFAULT_FIELDS: Array<{
  label: string;
  description: string;
  field_type: Database["public"]["Enums"]["checklist_field_type"];
  options?: string[];
  required?: boolean;
}> = [
  { label: "Day / Week", description: "Specific day or week when the process step should be executed.", field_type: "text" },
  { label: "Process Phase", description: "Stage of the overall process where the checklist item applies.", field_type: "text" },
  { label: "Control / Checklist Item", description: "The control, step, or requirement being assessed.", field_type: "textarea", required: true },
  { label: "Responsible Dept", description: "Department accountable for performing the checklist item.", field_type: "text" },
  { label: "Sub-Department", description: "Unit or function within the department responsible.", field_type: "text" },
  { label: "Owner", description: "Role or position responsible for ensuring completion.", field_type: "text" },
  { label: "Required Evidence", description: "Documents, system records, or logs needed as proof.", field_type: "textarea" },
  { label: "Target SLA / Days", description: "Expected time frame to complete the checklist item.", field_type: "number" },
  { label: "Actual SLA", description: "Actual time taken to complete the checklist item.", field_type: "number" },
  { label: "Compliance Status", description: "Whether the item complied with requirements.", field_type: "select", options: ["Compliant", "Non-Compliant", "Partially Compliant"] },
  { label: "NC Description", description: "Factual description of the non-conformance, if any.", field_type: "textarea" },
  { label: "Risk Exist", description: "Whether non-compliance introduces a risk.", field_type: "checkbox" },
  { label: "Risk Type", description: "Nature of the risk.", field_type: "select", options: ["Operational", "Compliance", "Financial", "Reputational"] },
  { label: "Risk Level", description: "Severity of the risk.", field_type: "select", options: ["High", "Medium", "Low"] },
  { label: "Findings / Gaps", description: "Observed weaknesses, deviations, or improvements.", field_type: "textarea" },
  { label: "CAPA Needed", description: "Whether corrective or preventive action is required.", field_type: "checkbox" },
  { label: "CAPA Type", description: "Corrective (fix existing) or preventive (avoid future).", field_type: "select", options: ["Corrective", "Preventive"] },
  { label: "Due Date", description: "Target date for completing the CAPA.", field_type: "date" },
  { label: "Effectiveness", description: "Whether the CAPA successfully resolved the issue.", field_type: "select", options: ["Effective", "Partially Effective", "Ineffective"] },
  { label: "Comments", description: "Additional notes, clarifications, or context.", field_type: "textarea" },
];

export const Route = createFileRoute("/_authenticated/checklists/")({
  head: () => ({ meta: [{ title: "Checklist Builder — QMS Pro" }] }),
  component: ChecklistsPage,
});

function ChecklistsPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("checklist_templates")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, []);

  async function createStandardPA() {
    if (!user?.id) return toast.error("Not signed in");
    setSeeding(true);
    const { data: tpl, error } = await supabase
      .from("checklist_templates")
      .insert({
        name: "Process Assurance Checklist",
        description: "Standard 20-field audit checklist covering compliance, risk, and CAPA tracking.",
        category: "Internal Audit",
        created_by: user.id,
      })
      .select()
      .single();
    if (error || !tpl) { setSeeding(false); return toast.error(error?.message ?? "Failed"); }
    const rows = DEFAULT_FIELDS.map((f, idx) => ({
      template_id: tpl.id, label: f.label, description: f.description, field_type: f.field_type,
      options: f.options ?? null, required: f.required ?? false, sort_order: idx, is_default: true,
    }));
    const { error: fErr } = await supabase.from("checklist_fields").insert(rows);
    setSeeding(false);
    if (fErr) return toast.error(`Template created but fields failed: ${fErr.message}`);
    toast.success("Standard Process Assurance template created");
    navigate({ to: "/checklists/$id", params: { id: tpl.id } });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this checklist template? All fields will be removed.")) return;
    const { error } = await supabase.from("checklist_templates").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Template deleted");
    void load();
  }

  const filtered = items.filter((t) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || (t.category ?? "").toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-primary" />
            Audit Checklist Builder
          </h1>
          <p className="text-sm text-muted-foreground">Create reusable checklist templates and customize fields to your needs.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={createStandardPA} disabled={seeding}>
            {seeding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
            Use Standard PA Template
          </Button>
          <NewTemplateDialog
            open={open}
            onOpenChange={setOpen}
            userId={user?.id}
            onCreated={() => { setOpen(false); void load(); }}
          />
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search templates…" className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No checklist templates yet. Create your first one.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">
                      <div>{t.name}</div>
                      {t.description && <div className="text-xs text-muted-foreground line-clamp-1">{t.description}</div>}
                    </TableCell>
                    <TableCell>{t.category ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={t.is_active ? "default" : "secondary"}>{t.is_active ? "Active" : "Inactive"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/checklists/$id" params={{ id: t.id }}>
                            Open <ArrowRight className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                        {(isAdmin || t.created_by === user?.id) && (
                          <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
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
    </div>
  );
}

function NewTemplateDialog({
  open, onOpenChange, userId, onCreated,
}: { open: boolean; onOpenChange: (v: boolean) => void; userId?: string; onCreated: () => void }) {
  const [form, setForm] = useState({ name: "", description: "", category: "", seedDefaults: true });
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!userId) return toast.error("Not signed in");
    if (!form.name.trim()) return toast.error("Name is required");
    setSaving(true);
    const { data: tpl, error } = await supabase
      .from("checklist_templates")
      .insert({ name: form.name.trim(), description: form.description.trim() || null, category: form.category.trim() || null, created_by: userId })
      .select()
      .single();
    if (error || !tpl) { setSaving(false); return toast.error(error?.message ?? "Failed"); }

    if (form.seedDefaults) {
      const rows = DEFAULT_FIELDS.map((f, idx) => ({
        template_id: tpl.id,
        label: f.label,
        description: f.description,
        field_type: f.field_type,
        options: f.options ?? null,
        required: f.required ?? false,
        sort_order: idx,
        is_default: true,
      }));
      const { error: fErr } = await supabase.from("checklist_fields").insert(rows);
      if (fErr) toast.error(`Template created but fields failed: ${fErr.message}`);
    }

    setSaving(false);
    setForm({ name: "", description: "", category: "", seedDefaults: true });
    toast.success("Template created");
    onCreated();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <Button><Plus className="mr-2 h-4 w-4" /> New Template</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Checklist Template</DialogTitle>
          <DialogDescription>Add a template, then customize fields on the next screen.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Name *</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Process Assurance Checklist" />
          </div>
          <div>
            <Label>Category</Label>
            <Input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} placeholder="e.g. Internal Audit" />
          </div>
          <div>
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={3} />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.seedDefaults}
              onChange={(e) => setForm({ ...form, seedDefaults: e.target.checked })}
            />
            Seed with the 20 standard Process Assurance fields
          </label>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
