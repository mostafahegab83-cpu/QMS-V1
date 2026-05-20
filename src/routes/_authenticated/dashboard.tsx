import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { FileText, ClipboardCheck, AlertTriangle, BarChart3, Users, ShieldCheck, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — QMS Pro" }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user, roles, isSuperAdmin } = useAuth();
  const [userCount, setUserCount] = useState<number | null>(null);

  useEffect(() => {
    if (!isSuperAdmin) return;
    supabase.from("profiles").select("id", { count: "exact", head: true })
      .then(({ count }) => setUserCount(count ?? 0));
  }, [isSuperAdmin]);

  const stats = [
    { label: "Documents", value: "—", icon: FileText, hint: "Phase 2" },
    { label: "Open Audits", value: "—", icon: ClipboardCheck, hint: "Phase 2" },
    { label: "Open CAPA", value: "—", icon: AlertTriangle, hint: "Phase 2" },
    { label: "KPI Compliance", value: "—", icon: BarChart3, hint: "Phase 2" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Welcome back{user?.email ? `, ${user.email.split("@")[0]}` : ""}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Your ISO 9001 quality management overview
          </p>
        </div>
        <div className="flex gap-2">
          {roles.map((r) => (
            <Badge key={r} variant="secondary" className="uppercase text-[10px]">
              {r.replace("_", " ")}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{s.value}</p>
                </div>
                <div className="rounded-md bg-primary/10 p-2 text-primary">
                  <s.icon className="h-4 w-4" />
                </div>
              </div>
              <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{s.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Phase 1 status</CardTitle>
            <CardDescription>Foundation, authentication, and role-based access control</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <Row icon={ShieldCheck} label="Authentication" value="Active (email & password)" ok />
            <Row icon={Users} label="Role-based access" value="Super Admin · Admin · Auditor · Employee" ok />
            <Row icon={TrendingUp} label="Audit trail" value="Database table ready" ok />
            <Row icon={FileText} label="Module 1 — Documents" value="Scaffold only" />
            <Row icon={ClipboardCheck} label="Module 2 — Audits" value="Scaffold only" />
            <Row icon={AlertTriangle} label="Module 3 — CAPA" value="Scaffold only" />
            <Row icon={BarChart3} label="Module 4 — KPIs" value="Scaffold only" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your workspace</CardTitle>
            <CardDescription>Account details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium truncate">{user?.email}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Roles</p>
              <p className="font-medium">{roles.join(", ") || "—"}</p>
            </div>
            {isSuperAdmin && (
              <div>
                <p className="text-xs text-muted-foreground">Total users</p>
                <p className="font-medium">{userCount ?? "…"}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value, ok }: { icon: any; label: string; value: string; ok?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b last:border-0 pb-2 last:pb-0">
      <div className="flex items-center gap-2 min-w-0">
        <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="truncate">{label}</span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">{value}</span>
        {ok ? <Badge variant="secondary" className="bg-success/15 text-success-foreground border-success/30">Live</Badge>
            : <Badge variant="outline">Soon</Badge>}
      </div>
    </div>
  );
}
