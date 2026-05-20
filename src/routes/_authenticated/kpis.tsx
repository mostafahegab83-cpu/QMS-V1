import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import { AlertTriangle, CheckCircle2, Clock, Download, FileText } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const todayStamp = () => new Date().toISOString().slice(0, 10);
const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

export const Route = createFileRoute("/_authenticated/kpis")({
  head: () => ({ meta: [{ title: "KPI Dashboard — QMS Pro" }] }),
  component: KpisPage,
});

type DocRow = {
  id: string;
  status: "draft" | "in_review" | "approved" | "obsolete" | "rejected";
  category: "policy" | "sop" | "work_instruction" | "form" | "manual" | "record";
  review_date: string | null;
  expiry_date: string | null;
};

const STATUS_COLORS: Record<DocRow["status"], string> = {
  draft: "hsl(var(--muted-foreground))",
  in_review: "hsl(var(--chart-2, 220 70% 50%))",
  approved: "hsl(var(--chart-1, 142 70% 45%))",
  obsolete: "hsl(var(--chart-4, 30 80% 55%))",
  rejected: "hsl(var(--destructive))",
};

const STATUS_LABEL: Record<DocRow["status"], string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  obsolete: "Obsolete",
  rejected: "Rejected",
};

const CATEGORY_LABEL: Record<DocRow["category"], string> = {
  policy: "Policy",
  sop: "SOP",
  work_instruction: "Work Instruction",
  form: "Form",
  manual: "Manual",
  record: "Record",
};

function KpisPage() {
  const [docs, setDocs] = useState<DocRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("documents")
      .select("id,status,category,review_date,expiry_date")
      .then(({ data, error }) => {
        if (error) setError(error.message);
        else setDocs((data ?? []) as DocRow[]);
      });
  }, []);

  const metrics = useMemo(() => {
    if (!docs) return null;
    const today = new Date().toISOString().slice(0, 10);
    const total = docs.length;
    const approved = docs.filter((d) => d.status === "approved").length;
    const inReview = docs.filter((d) => d.status === "in_review").length;
    const expired = docs.filter((d) => d.expiry_date && d.expiry_date < today).length;
    const dueReview = docs.filter((d) => d.review_date && d.review_date <= today).length;
    const overduePct = total === 0 ? 0 : Math.round((expired / total) * 100);

    const statusMix = (Object.keys(STATUS_LABEL) as DocRow["status"][])
      .map((s) => ({ key: s, name: STATUS_LABEL[s], value: docs.filter((d) => d.status === s).length }))
      .filter((d) => d.value > 0);

    const categoryMix = (Object.keys(CATEGORY_LABEL) as DocRow["category"][]).map((c) => ({
      name: CATEGORY_LABEL[c],
      count: docs.filter((d) => d.category === c).length,
    }));

    return { total, approved, inReview, expired, dueReview, overduePct, statusMix, categoryMix };
  }, [docs]);

  // CAPA / Audits tables not implemented yet — surface as 0 with a hint.
  const openCapa = 0;
  const openAudits = 0;

  const handleExportCsv = () => {
    if (!metrics) return;
    const rows: string[][] = [
      ["Metric", "Value"],
      ["Generated at", new Date().toISOString()],
      ["Total documents", String(metrics.total)],
      ["Approved", String(metrics.approved)],
      ["In review", String(metrics.inReview)],
      ["Due for review", String(metrics.dueReview)],
      ["Expired", String(metrics.expired)],
      ["Overdue %", `${metrics.overduePct}%`],
      ["Open CAPA", String(openCapa)],
      ["Open audits", String(openAudits)],
      [],
      ["Status", "Count"],
      ...metrics.statusMix.map((s) => [s.name, String(s.value)]),
      [],
      ["Category", "Count"],
      ...metrics.categoryMix.map((c) => [c.name, String(c.count)]),
    ];
    const csv = rows
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8;" }), `kpi-report-${todayStamp()}.csv`);
    toast.success("CSV exported");
  };

  const handleExportPdf = () => {
    if (!metrics) return;
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const margin = 48;
    let y = margin;

    doc.setFontSize(18);
    doc.text("KPI Dashboard Report", margin, y);
    y += 22;
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Generated ${new Date().toLocaleString()}`, margin, y);
    doc.setTextColor(0);
    y += 28;

    const section = (title: string) => {
      doc.setFontSize(13);
      doc.text(title, margin, y);
      y += 16;
      doc.setFontSize(11);
    };
    const row = (label: string, value: string | number) => {
      doc.text(label, margin, y);
      doc.text(String(value), margin + 320, y);
      y += 16;
    };

    section("Summary");
    row("Total documents", metrics.total);
    row("Approved", metrics.approved);
    row("In review", metrics.inReview);
    row("Due for review", metrics.dueReview);
    row("Expired", metrics.expired);
    row("Overdue %", `${metrics.overduePct}%`);
    row("Open CAPA", openCapa);
    row("Open audits", openAudits);
    y += 10;

    section("Status mix");
    if (metrics.statusMix.length === 0) row("No documents", "—");
    else metrics.statusMix.forEach((s) => row(s.name, s.value));
    y += 10;

    section("Documents by category");
    metrics.categoryMix.forEach((c) => row(c.name, c.count));

    doc.save(`kpi-report-${todayStamp()}.pdf`);
    toast.success("PDF exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">KPI Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live overview of documents, CAPA, and audits across the QMS.
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={!metrics}>
              <Download className="h-4 w-4" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportPdf}>Download PDF</DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportCsv}>Download CSV</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardContent className="pt-6 text-sm text-destructive">Failed to load KPIs: {error}</CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi
          label="Total documents"
          value={metrics?.total}
          icon={FileText}
          tone="primary"
          hint={metrics ? `${metrics.approved} approved` : undefined}
        />
        <Kpi
          label="Open CAPA"
          value={openCapa}
          icon={AlertTriangle}
          tone="warning"
          hint="Module pending"
        />
        <Kpi
          label="Overdue %"
          value={metrics ? `${metrics.overduePct}%` : undefined}
          icon={Clock}
          tone={metrics && metrics.overduePct > 10 ? "destructive" : "success"}
          hint={metrics ? `${metrics.expired} expired docs` : undefined}
        />
        <Kpi
          label="Open audits"
          value={openAudits}
          icon={CheckCircle2}
          tone="primary"
          hint="Module pending"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Document status mix</CardTitle>
            <CardDescription>Distribution across lifecycle states</CardDescription>
          </CardHeader>
          <CardContent>
            {!metrics ? (
              <Skeleton className="h-[260px] w-full" />
            ) : metrics.statusMix.length === 0 ? (
              <EmptyState message="No documents yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={metrics.statusMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    label={(e) => `${e.name} (${e.value})`}
                  >
                    {metrics.statusMix.map((entry) => (
                      <Cell key={entry.key} fill={STATUS_COLORS[entry.key]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Documents by category</CardTitle>
            <CardDescription>Count of documents per category</CardDescription>
          </CardHeader>
          <CardContent>
            {!metrics ? (
              <Skeleton className="h-[260px] w-full" />
            ) : metrics.total === 0 ? (
              <EmptyState message="No documents yet." />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metrics.categoryMix}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-15} textAnchor="end" height={50} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Compliance health</CardTitle>
          <CardDescription>Quick signals that need attention</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <HealthRow label="Approved documents" value={metrics?.approved ?? "…"} tone="success" />
          <HealthRow label="In review" value={metrics?.inReview ?? "…"} tone="primary" />
          <HealthRow label="Due for review" value={metrics?.dueReview ?? "…"} tone="warning" />
        </CardContent>
      </Card>
    </div>
  );
}

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
  tone,
}: {
  label: string;
  value: number | string | undefined;
  icon: typeof FileText;
  hint?: string;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneClass = {
    primary: "bg-primary/10 text-primary",
    success: "bg-success/15 text-success",
    warning: "bg-warning/15 text-warning",
    destructive: "bg-destructive/15 text-destructive",
  }[tone];
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
            <p className="mt-2 text-3xl font-semibold">{value ?? "…"}</p>
          </div>
          <div className={`rounded-md p-2 ${toneClass}`}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
        {hint && <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function HealthRow({ label, value, tone }: { label: string; value: number | string; tone: "primary" | "success" | "warning" }) {
  const dot = { primary: "bg-primary", success: "bg-success", warning: "bg-warning" }[tone];
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-2">
        <span className={`inline-block h-2 w-2 rounded-full ${dot}`} />
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-lg font-semibold">{value}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}
