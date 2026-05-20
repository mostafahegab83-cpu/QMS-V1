// My Submissions page — lists all checklist submissions across templates
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FileText, Trash2, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Submission = Database["public"]["Tables"]["checklist_submissions"]["Row"];
type Template = Pick<Database["public"]["Tables"]["checklist_templates"]["Row"], "id" | "name" | "category">;

export const Route = createFileRoute("/_authenticated/submissions")({
  head: () => ({ meta: [{ title: "My Submissions — QMS Pro" }] }),
  component: SubmissionsPage,
});

function SubmissionsPage() {
  const { user, isAdmin } = useAuth();
  const [rows, setRows] = useState<(Submission & { template: Template | null })[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [status, setStatus] = useState<"all" | "draft" | "submitted">("all");
  const [tplFilter, setTplFilter] = useState<string>("all");
  const [q, setQ] = useState("");

  async function load() {
    if (!user) return;
    setLoading(true);
    let query = supabase
      .from("checklist_submissions")
      .select("*, template:checklist_templates(id, name, category)")
      .order("updated_at", { ascending: false });
    if (scope === "mine") query = query.eq("created_by", user.id);
    if (status !== "all") query = query.eq("status", status);
    if (tplFilter !== "all") query = query.eq("template_id", tplFilter);
    const [subRes, tplRes] = await Promise.all([
      query,
      supabase.from("checklist_templates").select("id, name, category").order("name"),
    ]);
    if (subRes.error) toast.error(subRes.error.message);
    if (tplRes.error) toast.error(tplRes.error.message);
    setRows((subRes.data ?? []) as never);
    setTemplates(tplRes.data ?? []);
    setLoading(false);
  }
  useEffect(() => { void load(); }, [user, scope, status, tplFilter]);

  const filtered = rows.filter((r) => !q.trim() || r.title.toLowerCase().includes(q.toLowerCase()));

  async function remove(s: Submission) {
    if (!confirm(`Delete submission "${s.title}"?`)) return;
    const { error } = await supabase.from("checklist_submissions").delete().eq("id", s.id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">My Submissions</h1>
          <p className="text-sm text-muted-foreground">All checklist entries across every template.</p>
        </div>
        <Button asChild variant="outline">
          <Link to="/checklists"><ClipboardList className="mr-2 h-4 w-4" /> Browse templates</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input placeholder="Search title..." value={q} onChange={(e) => setQ(e.target.value)} />
          <Select value={tplFilter} onValueChange={setTplFilter}>
            <SelectTrigger><SelectValue placeholder="Template" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All templates</SelectItem>
              {templates.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="submitted">Submitted</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="mine">My submissions</SelectItem>
                <SelectItem value="all">All users</SelectItem>
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Results ({filtered.length})</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No submissions found.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.title}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {s.template?.name ?? "—"}
                      {s.template?.category && <Badge variant="secondary" className="ml-2 text-[10px]">{s.template.category}</Badge>}
                    </TableCell>
                    <TableCell>
                      <Badge variant={s.status === "submitted" ? "default" : "outline"}>{s.status}</Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(s.updated_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button asChild size="sm" variant="ghost">
                          <Link to="/checklists/$id/fill" params={{ id: s.template_id }} search={{ sid: s.id }}>
                            <FileText className="mr-1 h-4 w-4" /> Open
                          </Link>
                        </Button>
                        {(s.created_by === user?.id || isAdmin) && (
                          <Button size="icon" variant="ghost" onClick={() => remove(s)}>
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
