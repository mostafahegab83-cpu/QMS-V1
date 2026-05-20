import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Loader2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/users")({
  head: () => ({ meta: [{ title: "Users — QMS Pro" }] }),
  component: UsersPage,
});

interface ProfileRow {
  id: string;
  email: string;
  full_name: string | null;
  department: string | null;
  is_active: boolean;
  created_at: string;
}

function UsersPage() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileRow[]>([]);
  const [rolesByUser, setRolesByUser] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) { setLoading(false); return; }
    Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("user_roles").select("user_id, role"),
    ]).then(([p, r]) => {
      setProfiles((p.data ?? []) as ProfileRow[]);
      const map: Record<string, string[]> = {};
      (r.data ?? []).forEach((row) => {
        map[row.user_id] = [...(map[row.user_id] ?? []), row.role];
      });
      setRolesByUser(map);
      setLoading(false);
    });
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <Alert>
        <AlertTitle>Access denied</AlertTitle>
        <AlertDescription>You need administrator privileges to view users.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-primary/10 p-3 text-primary">
          <Users className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage workspace members and their permissions.</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Members ({profiles.length})</CardTitle>
          <CardDescription>Phase 2 will add invite, role assignment, and deactivation actions.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.full_name ?? "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.email}</TableCell>
                    <TableCell className="text-sm">{p.department ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {(rolesByUser[p.id] ?? []).map((r) => (
                          <Badge key={r} variant="secondary" className="text-[10px] uppercase">{r.replace("_", " ")}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.is_active
                        ? <Badge className="bg-success/15 text-success-foreground border-success/30">Active</Badge>
                        : <Badge variant="outline">Inactive</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
                {profiles.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">No users yet</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
