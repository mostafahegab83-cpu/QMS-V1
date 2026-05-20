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
import { ShieldAlert, Plus, Search, Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Risk = Database["public"]["Tables"]["risks"]["Row"];
type RiskLevel = Database["public"]["Enums"]["risk_level"];
type MitStatus = Database["public"]["Enums"]["risk_mitigation_status"];
type RiskStatus = Database["public"]["Enums"]["risk_status"];
type CapaLite = { id: string; capa_number: string };

const LEVELS: { value: RiskLevel; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
];
const MIT: { value: MitStatus; label: string }[] = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "implemented", label: "Implemented" },
  { value: "verified_effective", label: "Verified Effective" },
];
const STATUSES: { value: RiskStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "mitigated", label: "Mitigated" },
  { value: "closed", label: "Closed" },
  { value: "accepted", label: "Accepted" },
];

const LEVEL_STYLES: Record<RiskLevel, string> = {
  low: "bg-muted text-muted-foreground border-muted-foreground/20",
  medium: "bg-primary/15 text-primary border-primary/30",
  high: "bg-warning/15 text-warning-foreground border-warning/30",
  critical: "bg-destructive/15 text-destructive border-destructive/30",
};
const STATUS_STYLES: Record<RiskStatus, string> = {
  open: "bg-warning/15 text-warning-foreground border-warning/30",
  mitigated: "bg-primary/15 text-primary border-primary/30",
  closed: "bg-success/15 text-success-foreground border-success/30",
  accepted: "bg-muted text-muted-foreground border-muted-foreground/20",
};

export const Route = createFileRoute("/_authenticated/risks")({
  head: () => ({ meta: [{ title: "Risk Register — QMS Pro" }] }),
  component: RisksPage,
});

async function generateNextRiskNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `RISK-${year}-`;
  const { data } = await supabase
    .from("risks")
    .select("risk_number")
    .ilike("risk_number", `${prefix}%`)
    .order("risk_number", { ascending: false })
    .limit(1);
  const last = data?.[0]?.risk_number;
  const lastSeq = last ? parseInt(last.slice(prefix.length), 10) : 0;
  const next = (Number.isFinite(lastSeq) ? lastSeq : 0) + 1;
  return `${prefix}${String(next).padStart(3, "0")}`;
}

function RisksPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Risk[]>([]);
  const [capas, setCapas] = useState<CapaLite[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Risk | null>(null);

  const load = async () => {
    setLoading(true);
    const [r, c] = await Promise.all([
      supabase.from("risks").select("*").order("opened_at", { ascending: false }),
      supabase.from("capas").select("id, capa_number").order("capa_number", { ascending: false }),
    ]);
    if (r.error) toast.error(r.error.message);
    setItems(r.data ?? []);
    setCapas(c.data ?? []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(
    () => items.filter((r) => {
      if (levelFilter !== "all" && r.risk_level !== levelFilter) return false;
      if (statusFilter !== "all" && r.current_status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.risk_number.toLowerCase().includes(q) &&
          !r.description.toLowerCase().includes(q) &&
          !(r.affected_department ?? "").toLowerCase().includes(q)
        ) return false;
      }
      return true;
    }),
    [items, levelFilter, statusFilter, search],
  );

  const capaLabel = (id: string | null) =>
    id ? capas.find((c) => c.id === id)?.capa_number ?? "—" : "—";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-destructive/15 text-destructive">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Risk Register</h1>
            <p className="text-sm text-muted-foreground">
              Master log of risks with controls, mitigation status, and linked CAPAs.
            </p>
          </div>
        </div>
        {user && (
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-1" /> New Risk</Button>
            </DialogTrigger>
            <RiskFormDialog
              mode="create"
              userId={user.id}
              capas={capas}
              onSaved={() => { setCreateOpen(false); load(); }}
            />
          </Dialog>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by number, description, or department…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={levelFilter} onValueChange={setLevelFilter}>
          <SelectTrigger className="sm:w-[160px]"><SelectValue placeholder="Level" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All levels</SelectItem>
            {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
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
              No risks yet. Click <span className="font-medium">New Risk</span> to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Risk ID</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Process</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Mitigation</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>CAPA</TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.risk_number}</TableCell>
                    <TableCell className="max-w-[280px] truncate font-medium" title={r.description}>
                      {r.description}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.affected_department ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{r.affected_process ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={LEVEL_STYLES[r.risk_level]}>
                        {r.risk_level}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground capitalize">
                      {MIT.find((m) => m.value === r.mitigation_status)?.label}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={STATUS_STYLES[r.current_status]}>
                        {STATUSES.find((s) => s.value === r.current_status)?.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {capaLabel(r.linked_capa_id)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => setEditing(r)} aria-label="Edit risk">
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
        {editing && user && (
          <RiskFormDialog
            mode="edit"
            userId={user.id}
            risk={editing}
            capas={capas}
            onSaved={() => { setEditing(null); load(); }}
          />
        )}
      </Dialog>
    </div>
  );
}

const NO_CAPA = "__none__";

function RiskFormDialog({
  mode, userId, risk, capas, onSaved,
}: {
  mode: "create" | "edit";
  userId: string;
  risk?: Risk;
  capas: CapaLite[];
  onSaved: () => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    risk_number: risk?.risk_number ?? "",
    description: risk?.description ?? "",
    nc_id: risk?.nc_id ?? "",
    affected_department: risk?.affected_department ?? "",
    affected_process: risk?.affected_process ?? "",
    impact_area: risk?.impact_area ?? "",
    risk_level: (risk?.risk_level ?? "medium") as RiskLevel,
    existing_controls: risk?.existing_controls ?? "",
    mitigation_status: (risk?.mitigation_status ?? "not_started") as MitStatus,
    current_status: (risk?.current_status ?? "open") as RiskStatus,
    linked_capa_id: risk?.linked_capa_id ?? "",
    opened_at: risk?.opened_at ?? todayStr,
    target_date: risk?.target_date ?? "",
    closed_at: risk?.closed_at ?? "",
  });

  useEffect(() => {
    if (mode === "create") {
      generateNextRiskNumber().then((n) =>
        setForm((f) => (f.risk_number ? f : { ...f, risk_number: n })),
      );
    }
  }, [mode]);

  const update = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.risk_number.trim() || !form.description.trim()) {
      toast.error("Risk ID and description are required");
      return;
    }
    setSaving(true);
    const payload = {
      risk_number: form.risk_number.trim(),
      description: form.description.trim(),
      nc_id: form.nc_id.trim() || null,
      affected_department: form.affected_department.trim() || null,
      affected_process: form.affected_process.trim() || null,
      impact_area: form.impact_area.trim() || null,
      risk_level: form.risk_level,
      existing_controls: form.existing_controls.trim() || null,
      mitigation_status: form.mitigation_status,
      current_status: form.current_status,
      linked_capa_id: form.linked_capa_id || null,
      opened_at: form.opened_at,
      target_date: form.target_date || null,
      closed_at: form.closed_at || null,
    };

    let error: { message: string; code?: string } | null = null;
    if (mode === "create") {
      for (let attempt = 0; attempt < 2; attempt++) {
        const res = await supabase.from("risks").insert({
          ...payload,
          risk_owner_id: userId,
          created_by: userId,
        });
        error = res.error;
        if (!error) break;
        if (error.code === "23505" && attempt === 0) {
          payload.risk_number = await generateNextRiskNumber();
          continue;
        }
        break;
      }
    } else if (risk) {
      const res = await supabase.from("risks").update(payload).eq("id", risk.id);
      error = res.error;
    }
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(mode === "create" ? "Risk created" : "Risk updated");
    onSaved();
  };

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>{mode === "create" ? "New Risk" : `Edit ${risk?.risk_number}`}</DialogTitle>
        <DialogDescription>
          Capture the risk, affected area, existing controls, mitigation, and linked CAPA.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 py-2">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rnum">Risk ID *</Label>
            <Input id="rnum" placeholder="RISK-2026-001"
              value={form.risk_number}
              onChange={(e) => update("risk_number", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="ropen">Date Opened *</Label>
            <Input id="ropen" type="date" value={form.opened_at}
              onChange={(e) => update("opened_at", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rtarget">Target Date</Label>
            <Input id="rtarget" type="date" value={form.target_date}
              onChange={(e) => update("target_date", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rdesc">Risk Description *</Label>
          <Textarea id="rdesc" rows={2} value={form.description}
            onChange={(e) => update("description", e.target.value)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rnc">NC ID</Label>
            <Input id="rnc" placeholder="NC-2026-04" value={form.nc_id}
              onChange={(e) => update("nc_id", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rimpact">Impact Area</Label>
            <Input id="rimpact" placeholder="e.g. Patient safety, Compliance"
              value={form.impact_area}
              onChange={(e) => update("impact_area", e.target.value)} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="rdept">Affected Department</Label>
            <Input id="rdept" value={form.affected_department}
              onChange={(e) => update("affected_department", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rproc">Affected Process</Label>
            <Input id="rproc" value={form.affected_process}
              onChange={(e) => update("affected_process", e.target.value)} />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="rctrl">Existing Controls</Label>
          <Textarea id="rctrl" rows={2}
            placeholder="What controls are already in place?"
            value={form.existing_controls}
            onChange={(e) => update("existing_controls", e.target.value)} />
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1.5">
            <Label>Risk Level</Label>
            <Select value={form.risk_level} onValueChange={(v) => update("risk_level", v as RiskLevel)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Mitigation Status</Label>
            <Select value={form.mitigation_status} onValueChange={(v) => update("mitigation_status", v as MitStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {MIT.map((m) => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Current Status</Label>
            <Select value={form.current_status} onValueChange={(v) => update("current_status", v as RiskStatus)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Linked CAPA</Label>
            <Select
              value={form.linked_capa_id || NO_CAPA}
              onValueChange={(v) => update("linked_capa_id", v === NO_CAPA ? "" : v)}
            >
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_CAPA}>None</SelectItem>
                {capas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.capa_number}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rclosed">Closed Date</Label>
            <Input id="rclosed" type="date" value={form.closed_at}
              onChange={(e) => update("closed_at", e.target.value)} />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button onClick={submit} disabled={saving}>
          {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
          {mode === "create" ? "Create Risk" : "Save Changes"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
