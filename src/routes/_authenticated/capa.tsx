import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
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
import { AlertTriangle, Plus, Search, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Capa = Database["public"]["Tables"]["capas"]["Row"];
type CapaType = Database["public"]["Enums"]["capa_type"];
type CapaSource = Database["public"]["Enums"]["capa_source"];
type CapaSeverity = Database["public"]["Enums"]["capa_severity"];
type CapaStatus = Database["public"]["Enums"]["capa_status"];

const TYPES: { value: CapaType; label: string }[] = [
  { value: "corrective", label: "Corrective" },
  { value: "preventive", label: "Preventive" },
];
const SOURCES: { value: CapaSource; label: string }[] = [
  { value: "audit", label: "Audit" },
  { value: "complaint", label: "Complaint" },
  { value: "deviation", label: "Deviation" },
  { value: "internal", label: "Internal" },
  { value: "other", label: "Other" },
];
const SEVERITIES: { value: CapaSeverity; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const STATUSES: { value: CapaStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "pending_verification", label: "Pending Verification" },
  { value: "closed", label: "Closed" },
  { value: "cancelled", label: "Cancelled" },
];

const STATUS_STYLES: Record<CapaStatus, string> = {
  open: "bg-warning/15 text-warning-foreground border-warning/30",
  in_progress: "bg-primary/15 text-primary border-primary/30",
  pending_verification: "bg-accent/30 text-accent-foreground border-accent",
  closed: "bg-success/15 text-success-foreground border-success/30",
  cancelled: "bg-muted text-muted-foreground border-muted-foreground/20",
};
const SEVERITY_STYLES: Record<CapaSeverity, string> = {
  low: "bg-muted text-muted-foreground border-muted-foreground/20",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-warning/15 text-warning-foreground border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};

export const Route = createFileRoute("/_authenticated/capa")({
  head: () => ({ meta: [{ title: "CAPA Management — QMS Pro" }] }),
  component: CapaPage,
});

function CapaPage() {
  const { user, isAdmin } = useAuth();
  const [items, setItems] = useState<Capa[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Capa | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("capas")
      .select("*")
      .order("opened_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => items.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) return false;
      if (typeFilter !== "all" && c.type !== typeFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (!c.title.toLowerCase().includes(q) && !c.capa_number.toLowerCase().includes(q)) return false;
      }
      return true;
    }),
    [items, statusFilter, typeFilter, search],
  );

  const today = new Date().toISOString().slice(0, 10);
  const isOverdue = (c: Capa) =>
    c.due_date && c.due_date < today && c.status !== "closed" && c.status !== "cancelled";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-warning/15 text-warning-foreground">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">CAPA Management</h1>
            <p className="text-sm text-muted-foreground">Corrective and preventive actions with effectiveness verification.</p>
          </div>
        </div>
        {user && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New CAPA</Button>
            </DialogTrigger>
            <CreateCapaDialog
              userId={user.id}
              onCreated={() => { setCreateOpen(false); load(); }}
            />
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="sm:w-[160px]"><SelectValue placeholder="Type" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="sm:w-[180px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No CAPAs yet. Click <span className="font-medium">New CAPA</span> to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-xs">{c.capa_number}</TableCell>
                    <TableCell className="font-medium">{c.title}</TableCell>
                    <TableCell className="capitalize text-muted-foreground">{c.type}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={SEVERITY_STYLES[c.severity]}>
                        {c.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[c.status]}>
                        {STATUSES.find((s) => s.value === c.status)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className={isOverdue(c) ? "text-destructive font-medium" : "text-muted-foreground"}>
                      {c.due_date ?? "—"}{isOverdue(c) && " (overdue)"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(c)} aria-label="Edit CAPA">
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        {editing && (
          <EditCapaDialog
            capa={editing}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </Dialog>
    </div>
  );
}

async function generateNextCapaNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `CAPA-${year}-`;
  const { data } = await supabase
    .from("capas")
    .select("capa_number")
    .ilike("capa_number", `${prefix}%`)
    .order("capa_number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.capa_number;
  const lastSeq = last ? parseInt(last.slice(prefix.length), 10) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function CreateCapaDialog({ userId, onCreated }: { userId: string; onCreated: () => void }) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    capa_number: "",
    title: "",
    description: "",
    type: "corrective" as CapaType,
    source: "internal" as CapaSource,
    source_reference: "",
    severity: "medium" as CapaSeverity,
    root_cause: "",
    action_plan: "",
    effectiveness_criteria: "",
    opened_at: todayStr,
    due_date: "",
  });

  useEffect(() => {
    generateNextCapaNumber().then((n) => setForm((f) => (f.capa_number ? f : { ...f, capa_number: n })));
  }, []);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.capa_number.trim() || !form.title.trim()) {
      toast.error("CAPA number and title are required");
      return;
    }
    if (!form.opened_at) {
      toast.error("Date opened is required");
      return;
    }
    setSaving(true);
    // Retry once on unique-constraint collision (race when two users create at once)
    let capaNumber = form.capa_number.trim();
    let error: { message: string; code?: string } | null = null;
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await supabase.from("capas").insert({
        capa_number: capaNumber,
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        source: form.source,
        source_reference: form.source_reference.trim() || null,
        severity: form.severity,
        root_cause: form.root_cause.trim() || null,
        action_plan: form.action_plan.trim() || null,
        effectiveness_criteria: form.effectiveness_criteria.trim() || null,
        opened_at: form.opened_at,
        due_date: form.due_date || null,
        owner_id: userId,
        created_by: userId,
      });
      error = res.error;
      if (!error) break;
      if (error.code === "23505" && attempt === 0) {
        capaNumber = await generateNextCapaNumber();
        continue;
      }
      break;
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("CAPA created");
    onCreated();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>New CAPA</DialogTitle>
        <DialogDescription>Capture the issue, planned action, effectiveness criteria, and timeline.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="num">CAPA Number *</Label>
            <Input id="num" placeholder="CAPA-2026-001" value={form.capa_number}
              onChange={(e) => update("capa_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="opened">Date Opened *</Label>
            <Input id="opened" type="date" value={form.opened_at}
              onChange={(e) => update("opened_at", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="due">Due Date</Label>
            <Input id="due" type="date" value={form.due_date}
              onChange={(e) => update("due_date", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="title">Title *</Label>
          <Input id="title" value={form.title}
            onChange={(e) => update("title", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="desc">Description / Problem Statement</Label>
          <Textarea id="desc" rows={2} value={form.description}
            onChange={(e) => update("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v as CapaType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => update("source", v as CapaSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => update("severity", v as CapaSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="srcref">Source Reference</Label>
          <Input id="srcref" placeholder="e.g. Audit AUD-2026-04, Complaint #221"
            value={form.source_reference}
            onChange={(e) => update("source_reference", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rc">Root Cause</Label>
          <Textarea id="rc" rows={2} placeholder="5 Whys / fishbone summary…"
            value={form.root_cause}
            onChange={(e) => update("root_cause", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ap">Action Plan</Label>
          <Textarea id="ap" rows={3} placeholder="What actions will be taken, by whom, in what order…"
            value={form.action_plan}
            onChange={(e) => update("action_plan", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="ec">Effectiveness Criteria</Label>
          <Textarea id="ec" rows={2}
            placeholder="How will we measure that the action worked? (e.g. zero recurrences in 90 days)"
            value={form.effectiveness_criteria}
            onChange={(e) => update("effectiveness_criteria", e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Create CAPA
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function EditCapaDialog({ capa, onSaved }: { capa: Capa; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: capa.title,
    description: capa.description ?? "",
    type: capa.type,
    source: capa.source,
    source_reference: capa.source_reference ?? "",
    severity: capa.severity,
    status: capa.status,
    root_cause: capa.root_cause ?? "",
    action_plan: capa.action_plan ?? "",
    effectiveness_criteria: capa.effectiveness_criteria ?? "",
    effectiveness_result: capa.effectiveness_result ?? "",
    opened_at: capa.opened_at,
    due_date: capa.due_date ?? "",
    completed_at: capa.completed_at ?? "",
    verified_at: capa.verified_at ?? "",
  });

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title.trim()) { toast.error("Title is required"); return; }
    setSaving(true);
    const { error } = await supabase
      .from("capas")
      .update({
        title: form.title.trim(),
        description: form.description.trim() || null,
        type: form.type,
        source: form.source,
        source_reference: form.source_reference.trim() || null,
        severity: form.severity,
        status: form.status,
        root_cause: form.root_cause.trim() || null,
        action_plan: form.action_plan.trim() || null,
        effectiveness_criteria: form.effectiveness_criteria.trim() || null,
        effectiveness_result: form.effectiveness_result.trim() || null,
        opened_at: form.opened_at,
        due_date: form.due_date || null,
        completed_at: form.completed_at || null,
        verified_at: form.verified_at || null,
      })
      .eq("id", capa.id);
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success("CAPA updated");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Edit {capa.capa_number}</DialogTitle>
        <DialogDescription>Update status, dates, description, and effectiveness details.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="space-y-1.5">
          <Label htmlFor="e-title">Title *</Label>
          <Input id="e-title" value={form.title} onChange={(e) => update("title", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-desc">Description</Label>
          <Textarea id="e-desc" rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => update("status", v as CapaStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Severity</Label>
            <Select value={form.severity} onValueChange={(v) => update("severity", v as CapaSeverity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Type</Label>
            <Select value={form.type} onValueChange={(v) => update("type", v as CapaType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Source</Label>
            <Select value={form.source} onValueChange={(v) => update("source", v as CapaSource)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {SOURCES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-srcref">Source Reference</Label>
          <Input id="e-srcref" value={form.source_reference} onChange={(e) => update("source_reference", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="e-opened">Opened</Label>
            <Input id="e-opened" type="date" value={form.opened_at} onChange={(e) => update("opened_at", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-due">Due Date</Label>
            <Input id="e-due" type="date" value={form.due_date} onChange={(e) => update("due_date", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-comp">Completed</Label>
            <Input id="e-comp" type="date" value={form.completed_at} onChange={(e) => update("completed_at", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="e-ver">Verified</Label>
            <Input id="e-ver" type="date" value={form.verified_at} onChange={(e) => update("verified_at", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-rc">Root Cause</Label>
          <Textarea id="e-rc" rows={2} value={form.root_cause} onChange={(e) => update("root_cause", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-ap">Action Plan</Label>
          <Textarea id="e-ap" rows={3} value={form.action_plan} onChange={(e) => update("action_plan", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-ec">Effectiveness Criteria</Label>
          <Textarea id="e-ec" rows={2} value={form.effectiveness_criteria} onChange={(e) => update("effectiveness_criteria", e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="e-er">Effectiveness Result</Label>
          <Textarea id="e-er" rows={2} placeholder="What was actually observed against the criteria?"
            value={form.effectiveness_result} onChange={(e) => update("effectiveness_result", e.target.value)} />
        </div>
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          Save changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
