import { createFileRoute } from "@tanstack/react-router";
import { ClipboardCheck } from "lucide-react";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const Route = createFileRoute("/_authenticated/audits")({
  head: () => ({ meta: [{ title: "Audit Management — QMS Pro" }] }),
  component: () => (
    <ModulePlaceholder
      title="Audit Management"
      icon={ClipboardCheck}
      description="Plan, conduct, and track internal, external, supplier, and surveillance audits with full traceability to ISO clauses."
      features={[
        "Audit planning calendar",
        "Assign auditors and add checklists",
        "Findings classification (Major NC, Minor NC, Observation, OFI)",
        "Evidence upload and CAPA linking",
        "Audit types: Internal, External, Supplier, Surveillance",
        "Status tracking: Planned → In Progress → Completed → Closed",
        "Dashboard widgets: upcoming audits, open findings, compliance scores",
        "Clause-wise findings & department audit score reports",
      ]}
    />
  ),
});
