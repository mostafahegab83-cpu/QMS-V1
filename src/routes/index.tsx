import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, ClipboardCheck, AlertTriangle, BarChart3, Lock } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QMS Pro — ISO 9001 Quality Management System" },
      { name: "description", content: "Manage your ISO 9001 certification, audits, CAPA, documents, and KPIs in one secure enterprise platform." },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate({ to: "/dashboard" });
  }, [user, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="leading-tight">
              <div className="text-sm font-semibold">QMS Pro</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">ISO 9001</div>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost"><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/signup">Get started</Link></Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <div className="max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Lock className="h-3 w-3" /> Enterprise-grade compliance platform
          </div>
          <h1 className="mt-6 text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
            ISO 9001 certification, <span className="text-primary-glow">managed end-to-end</span>.
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            Prepare, achieve, and maintain ISO 9001 certification with a unified workspace for documents,
            audits, corrective actions, and KPIs — built for quality teams.
          </p>
          <div className="mt-8 flex gap-3">
            <Button asChild size="lg"><Link to="/signup">Start free</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/login">Sign in</Link></Button>
          </div>
        </div>

        <div className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: FileText, title: "Document Control", desc: "Versioned policies, SOPs, and work instructions with approval workflows." },
            { icon: ClipboardCheck, title: "Audit Management", desc: "Plan, conduct, and track internal and supplier audits." },
            { icon: AlertTriangle, title: "CAPA Tracking", desc: "Root-cause analysis and corrective actions, end to end." },
            { icon: BarChart3, title: "KPI Dashboards", desc: "Real-time quality metrics with traffic-light status." },
          ].map((f) => (
            <div key={f.title} className="rounded-lg border bg-card p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10 text-primary">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t mt-10">
        <div className="mx-auto max-w-6xl px-6 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} QMS Pro. Secure, multi-user, audit-trail enabled.
        </div>
      </footer>
    </div>
  );
}
