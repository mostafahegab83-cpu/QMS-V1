import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, FileText, ClipboardCheck, AlertTriangle, BarChart3,
  Users, ScrollText, DatabaseBackup, Settings, ShieldCheck, ShieldAlert, ClipboardList,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth } from "@/hooks/use-auth";

const modules = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
  { title: "Documents", url: "/documents", icon: FileText },
  { title: "Audits", url: "/audits", icon: ClipboardCheck },
  { title: "Checklists", url: "/checklists", icon: ClipboardList },
  { title: "My Submissions", url: "/submissions", icon: FileText },
  { title: "CAPA", url: "/capa", icon: AlertTriangle },
  { title: "Risks", url: "/risks", icon: ShieldAlert },
  { title: "KPIs", url: "/kpis", icon: BarChart3 },
];

const admin = [
  { title: "Users", url: "/users", icon: Users, requireAdmin: true },
  { title: "Audit Trail", url: "/audit-logs", icon: ScrollText, requireAdmin: true },
  { title: "Backup", url: "/backup", icon: DatabaseBackup, requireSuper: true },
  { title: "Settings", url: "/settings", icon: Settings, requireAdmin: true },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAdmin, isSuperAdmin } = useAuth();

  const isActive = (url: string) => pathname === url || pathname.startsWith(url + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheck className="h-5 w-5" />
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="text-sm font-semibold text-sidebar-foreground">QMS Pro</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">ISO 9001</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {modules.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={isActive(item.url)}>
                    <Link to={item.url} className="flex items-center gap-2">
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {admin
                  .filter((i) => (i.requireSuper ? isSuperAdmin : true))
                  .map((item) => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <Link to={item.url} className="flex items-center gap-2">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
