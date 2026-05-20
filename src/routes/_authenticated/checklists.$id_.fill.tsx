import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Loader2, Save, Send } from "lucide-react";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Template = Database["public"]["Tables"]["checklist_templates"]["Row"];
type Field = Database["public"]["Tables"]["checklist_fields"]["Row"];
type Submission = Database["public"]["Tables"]["checklist_submissions"]["Row"];

const searchSchema = z.object({ sid: z.string().optional() });

export const Route = createFileRoute("/_authenticated/checklists/$id_/fill")({
  head: () => ({ meta: [{ title: "Fill Checklist — QMS Pro" }] }),
  validateSearch: searchSchema,
  component: FillPage,
});

function FillPage() {
  const { id } = Route.useParams();
  const { sid } = useSearch({ from: Route.id });
  const { user } = useAuth();
  const navigate = useNavigate();

  const [tpl, setTpl] = useState<Template | null>(null);
  const [fields, setFields] = useState<Field[]>([]);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [title, setTitle] = useState("");
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const [tplRes, fldRes] = await Promise.all([
        supabase.from("checklist_templates").select("*").eq("id", id).single(),
        supabase.from("checklist_fields").select("*").eq("template_id", id).order("sort_order"),
      ]);
      if (tplRes.error) toast.error(tplRes.error.message);
      if (fldRes.error) toast.error(fldRes.error.message);
      setTpl(tplRes.data ?? null);
      setFields(fldRes.data ?? []);

      if (sid) {
        const { data, error } = await supabase
          .from("checklist_submissions").select("*").eq("id", sid).single();
        if (error) toast.error(error.message);
        if (data) {
          setSubmission(data);
          setTitle(data.title);
          setAnswers((data.answers as Record<string, unknown>) ?? {});
        }
      } else {
        setTitle(`${tplRes.data?.name ?? "Checklist"} — ${new Date().toLocaleDateString()}`);
      }
      setLoading(false);
    })();
  }, [id, sid]);

  function setAnswer(fieldId: string, value: unknown) {
    setAnswers((p) => ({ ...p, [fieldId]: value }));
  }

  async function save(submit: boolean) {
    if (!user) return;
    if (!title.trim()) return toast.error("Title required");
    if (submit) {
      const missing = fields.filter((f) => f.required && isEmpty(answers[f.id]));
      if (missing.length) return toast.error(`Required: ${missing.map((m) => m.label).join(", ")}`);
    }
    setSaving(true);
    const payload = {
      template_id: id,
      title: title.trim(),
      answers: answers as Database["public"]["Tables"]["checklist_submissions"]["Insert"]["answers"],
      status: submit ? "submitted" : "draft",
      submitted_at: submit ? new Date().toISOString() : null,
      created_by: user.id,
    };
    const res = submission
      ? await supabase.from("checklist_submissions").update(payload).eq("id", submission.id).select().single()
      : await supabase.from("checklist_submissions").insert(payload).select().single();
    setSaving(false);
    if (res.error) return toast.error(res.error.message);
    toast.success(submit ? "Submitted" : "Draft saved");
    if (submit) navigate({ to: "/checklists/$id", params: { id } });
    else if (!submission && res.data) {
      setSubmission(res.data);
      navigate({ to: "/checklists/$id/fill", params: { id }, search: { sid: res.data.id }, replace: true });
    }
  }

  if (loading) return <div className="flex justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  if (!tpl) return <p className="text-sm text-muted-foreground">Template not found.</p>;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2">
          <Link to="/checklists/$id" params={{ id }}><ArrowLeft className="mr-1 h-4 w-4" /> Back to template</Link>
        </Button>
        <h1 className="text-2xl font-semibold">{tpl.name}</h1>
        <div className="flex gap-2 items-center mt-1">
          {tpl.category && <Badge variant="secondary">{tpl.category}</Badge>}
          {submission && <Badge variant={submission.status === "submitted" ? "default" : "outline"}>{submission.status}</Badge>}
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Entry details</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Entry title *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Fields ({fields.length})</CardTitle></CardHeader>
        <CardContent className="space-y-5">
          {fields.length === 0 && <p className="text-sm text-muted-foreground">No fields configured.</p>}
          {fields.map((f) => (
            <FieldInput
              key={f.id}
              field={f}
              value={answers[f.id]}
              onChange={(v) => setAnswer(f.id, v)}
            />
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => save(false)} disabled={saving}>
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
          Save draft
        </Button>
        <Button onClick={() => save(true)} disabled={saving}>
          <Send className="mr-2 h-4 w-4" /> Submit
        </Button>
      </div>
    </div>
  );
}

function isEmpty(v: unknown): boolean {
  if (v === undefined || v === null || v === "") return true;
  if (Array.isArray(v) && v.length === 0) return true;
  return false;
}

function FieldInput({
  field, value, onChange,
}: { field: Field; value: unknown; onChange: (v: unknown) => void }) {
  const opts = Array.isArray(field.options) ? (field.options as string[]) : [];
  const label = (
    <Label className="flex items-center gap-1">
      {field.label}{field.required && <span className="text-destructive">*</span>}
    </Label>
  );
  const desc = field.description && <p className="text-xs text-muted-foreground">{field.description}</p>;

  switch (field.field_type) {
    case "textarea":
      return (
        <div className="space-y-1.5">
          {label}{desc}
          <Textarea rows={3} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "number":
      return (
        <div className="space-y-1.5">
          {label}{desc}
          <Input type="number" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "date":
      return (
        <div className="space-y-1.5">
          {label}{desc}
          <Input type="date" value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
    case "checkbox":
      return (
        <label className="flex items-start gap-2">
          <Checkbox checked={!!value} onCheckedChange={(v) => onChange(!!v)} className="mt-0.5" />
          <div>
            <span className="text-sm font-medium">{field.label}{field.required && <span className="text-destructive ml-0.5">*</span>}</span>
            {field.description && <p className="text-xs text-muted-foreground">{field.description}</p>}
          </div>
        </label>
      );
    case "select":
      return (
        <div className="space-y-1.5">
          {label}{desc}
          <Select value={(value as string) ?? ""} onValueChange={onChange}>
            <SelectTrigger><SelectValue placeholder="Choose..." /></SelectTrigger>
            <SelectContent>
              {opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      );
    case "multiselect": {
      const arr = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-1.5">
          {label}{desc}
          <div className="grid grid-cols-2 gap-2 rounded-md border p-3">
            {opts.map((o) => {
              const checked = arr.includes(o);
              return (
                <label key={o} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => onChange(v ? [...arr, o] : arr.filter((x) => x !== o))}
                  />
                  {o}
                </label>
              );
            })}
          </div>
        </div>
      );
    }
    case "text":
    default:
      return (
        <div className="space-y-1.5">
          {label}{desc}
          <Input value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />
        </div>
      );
  }
}
