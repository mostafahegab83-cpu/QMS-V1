import { createFileRoute } from "@tanstack/react-router";
import { DatabaseBackup } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";
import { useAuth } from "@/hooks/use-auth";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export const Route = createFileRoute("/_authenticated/backup")({
  head: () => ({ meta: [{ title: "Backup & Restore — QMS Pro" }] }),
  component: BackupPage,
});

function BackupPage() {
  const { isSuperAdmin } = useAuth();
  if (!isSuperAdmin) {
    return (
      <Alert>
        <AlertTitle>Super Admin only</AlertTitle>
        <AlertDescription>Backup and restore is restricted to the Super Admin role.</AlertDescription>
      </Alert>
    );
  }
  return (
    <ModulePlaceholder
      title="Backup & Restore"
      icon={DatabaseBackup}
      description="Database backup, scheduled exports, and point-in-time restore for the entire QMS dataset."
      features={[
        "Manual on-demand backup",
        "Scheduled automatic backups",
        "Download backup file",
        "Restore from previous backup",
        "Backup history log",
        "Includes: Documents, Audits, CAPA, KPI, Users, Settings",
      ]}
    />
  );
}
