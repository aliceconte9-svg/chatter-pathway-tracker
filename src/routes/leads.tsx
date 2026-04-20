import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Trash2, Pencil, Plus, Search } from "lucide-react";
import { LeadRowActions } from "@/components/leads/LeadRowActions";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  leadsStore,
  uid,
  LEAD_STATUSES,
  LEAD_SOURCES,
  CONTACT_STAGES,
  OBJECTIONS,
  type Lead,
  type LeadStatus,
  type LeadSource,
  type ContactStage,
  type Objection,
} from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";

export const Route = createFileRoute("/leads")({
  head: () => ({
    meta: [
      { title: "Leads — Chatter Tracker" },
      { name: "description", content: "Manage individual prospects in your pipeline." },
    ],
  }),
  component: LeadsPage,
});

const emptyForm = (): Lead => ({
  id: uid(),
  name: "",
  igUsername: "",
  source: "Follower",
  contactStage: "Conversazione iniziata",
  dateContacted: format(new Date(), "yyyy-MM-dd"),
  lastContactedAt: format(new Date(), "yyyy-MM-dd"),
  nextFollowUpAt: "",
  status: "New",
  objection: "",
  objectionCustom: "",
  bestMessage: "",
  notes: "",
});

const STAGE_COLORS: Record<ContactStage, string> = {
  "Messaggio mandato": "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  "Conversazione iniziata": "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "Follow-up mandato": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Da ricontattare": "bg-rose-500/15 text-rose-600 dark:text-rose-400",
};

const STATUS_COLORS: Record<LeadStatus, string> = {
  New: "bg-slate-500/15 text-slate-600 dark:text-slate-400",
  Contacted: "bg-muted text-foreground",
  Replied: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
  "In Conversation": "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
  Qualified: "bg-violet-500/15 text-violet-600 dark:text-violet-400",
  "Call Booked": "bg-amber-500/15 text-amber-600 dark:text-amber-400",
  "Closed Won": "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
  "Closed Lost": "bg-destructive/15 text-destructive",
};

function LeadsPage() {
  const leads = useStore(() => leadsStore.list());
  const [form, setForm] = useState<Lead>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return leads
      .filter((l) => statusFilter === "all" || l.status === statusFilter)
      .filter(
        (l) =>
          !search ||
          l.name.toLowerCase().includes(q) ||
          (l.igUsername ?? "").toLowerCase().includes(q),
      )
      .sort((a, b) => b.dateContacted.localeCompare(a.dateContacted));
  }, [leads, statusFilter, search]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    leadsStore.upsert(form);
    toast.success(editing ? "Lead updated" : "Lead added");
    setForm(emptyForm());
    setEditing(false);
    setShowForm(false);
  }

  function edit(lead: Lead) {
    setForm({ ...lead });
    setEditing(true);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Delete this lead?")) return;
    leadsStore.remove(id);
    toast.success("Deleted");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads Pipeline</h1>
          <p className="text-sm text-muted-foreground">
            Track each prospect by status and objection.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(emptyForm());
            setEditing(false);
            setShowForm((s) => !s);
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Close" : "New lead"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? "Edit lead" : "New lead"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name / handle *</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    placeholder="@username"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="igUsername">IG username</Label>
                  <Input
                    id="igUsername"
                    value={form.igUsername ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, igUsername: e.target.value }))
                    }
                    placeholder="@handle"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="dateContacted">First contacted</Label>
                  <Input
                    id="dateContacted"
                    type="date"
                    value={form.dateContacted}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, dateContacted: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="lastContactedAt">Last contacted</Label>
                  <Input
                    id="lastContactedAt"
                    type="date"
                    value={form.lastContactedAt ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, lastContactedAt: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="nextFollowUpAt">Next follow-up (Da ricontattare)</Label>
                  <Input
                    id="nextFollowUpAt"
                    type="date"
                    value={form.nextFollowUpAt ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, nextFollowUpAt: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Source</Label>
                  <Select
                    value={form.source ?? "Follower"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, source: v as LeadSource }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_SOURCES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Contact stage</Label>
                  <Select
                    value={form.contactStage ?? "Conversazione iniziata"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, contactStage: v as ContactStage }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTACT_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((f) => ({ ...f, status: v as LeadStatus }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {LEAD_STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Objection / reason</Label>
                  <Select
                    value={form.objection || "none"}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, objection: (v === "none" ? "" : v) as Objection }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {OBJECTIONS.map((o) => (
                        <SelectItem key={o} value={o}>
                          {o}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {form.objection === "Other" && (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="objectionCustom">Custom objection</Label>
                    <Input
                      id="objectionCustom"
                      value={form.objectionCustom ?? ""}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, objectionCustom: e.target.value }))
                      }
                      placeholder="What did they say?"
                    />
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bestMessage">Best message used</Label>
                <Textarea
                  id="bestMessage"
                  rows={2}
                  value={form.bestMessage ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, bestMessage: e.target.value }))}
                  placeholder="Opener or message that worked best"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1.5">
                  <Label htmlFor="ttfr">Time to 1st reply (min)</Label>
                  <Input
                    id="ttfr"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.timeToFirstReplyMin ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        timeToFirstReplyMin: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="e.g. 12"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="msgs">Messages to booking</Label>
                  <Input
                    id="msgs"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.messagesToBooking ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        messagesToBooking: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="e.g. 8"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="convlen">Conversation length</Label>
                  <Input
                    id="convlen"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={form.conversationLength ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        conversationLength: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                    placeholder="total messages"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  rows={2}
                  value={form.notes ?? ""}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit">{editing ? "Save changes" : "Add lead"}</Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(false);
                    setForm(emptyForm());
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Pipeline ({filtered.length})</CardTitle>
            <LeadsStats leads={leads} />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {LEAD_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {filtered.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-muted-foreground">
              No leads match. Add one above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>IG</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last contacted</TableHead>
                  <TableHead>Next follow-up</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((l) => {
                  const today = format(new Date(), "yyyy-MM-dd");
                  const overdue = l.nextFollowUpAt && l.nextFollowUpAt <= today;
                  return (
                    <TableRow key={l.id}>
                      <TableCell className="font-medium">{l.name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.igUsername || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className={STATUS_COLORS[l.status]}>
                          {l.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                        {l.lastContactedAt ? format(new Date(l.lastContactedAt), "MMM d") : "—"}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">
                        {l.nextFollowUpAt ? (
                          <span
                            className={
                              overdue
                                ? "font-semibold text-rose-600 dark:text-rose-400"
                                : "text-muted-foreground"
                            }
                          >
                            {format(new Date(l.nextFollowUpAt), "MMM d")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {l.contactStage ? (
                          <Badge variant="secondary" className={STAGE_COLORS[l.contactStage]}>
                            {l.contactStage}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {l.source || "—"}
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate text-sm text-muted-foreground">
                        {l.notes || l.bestMessage || "—"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <LeadRowActions lead={l} compact />
                          <Button size="icon" variant="ghost" onClick={() => edit(l)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button size="icon" variant="ghost" onClick={() => remove(l.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function LeadsStats({ leads }: { leads: Lead[] }) {
  const ttfrs = leads.map((l) => l.timeToFirstReplyMin).filter((x): x is number => typeof x === "number");
  const msgs = leads.map((l) => l.messagesToBooking).filter((x): x is number => typeof x === "number");
  const lens = leads.map((l) => l.conversationLength).filter((x): x is number => typeof x === "number");
  const avg = (arr: number[]) =>
    arr.length ? (arr.reduce((s, n) => s + n, 0) / arr.length).toFixed(1) : "—";
  return (
    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
      <span>
        Avg time to 1st reply: <span className="font-semibold text-foreground">{avg(ttfrs)} min</span>
      </span>
      <span>
        Avg msgs to booking: <span className="font-semibold text-foreground">{avg(msgs)}</span>
      </span>
      <span>
        Avg convo length: <span className="font-semibold text-foreground">{avg(lens)}</span>
      </span>
    </div>
  );
}
