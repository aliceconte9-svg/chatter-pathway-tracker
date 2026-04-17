import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Plus, Trash2, Pencil, MessageSquare, HelpCircle, Target } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import { playbookStore, uid, type PlaybookEntry, type PlaybookCategory } from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";

export const Route = createFileRoute("/playbook")({
  head: () => ({
    meta: [
      { title: "Playbook — Chatter Tracker" },
      { name: "description", content: "Your winning openers, qualification questions, and closes." },
    ],
  }),
  component: PlaybookPage,
});

const CATEGORIES: { value: PlaybookCategory; label: string; icon: typeof MessageSquare }[] = [
  { value: "opener", label: "Winning openers", icon: MessageSquare },
  { value: "qualification", label: "Best qualification questions", icon: HelpCircle },
  { value: "closing", label: "Best closing lines", icon: Target },
];

const emptyForm = (): PlaybookEntry => ({
  id: uid(),
  category: "opener",
  title: "",
  body: "",
  createdAt: new Date().toISOString(),
});

function PlaybookPage() {
  const all = useStore(() => playbookStore.list());
  const [form, setForm] = useState<PlaybookEntry>(emptyForm);
  const [editing, setEditing] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<PlaybookCategory>("opener");

  const grouped = useMemo(() => {
    const map: Record<PlaybookCategory, PlaybookEntry[]> = {
      opener: [],
      qualification: [],
      closing: [],
    };
    for (const e of all) map[e.category].push(e);
    for (const k of Object.keys(map) as PlaybookCategory[]) {
      map[k].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    }
    return map;
  }, [all]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    playbookStore.upsert(form);
    toast.success(editing ? "Updated" : "Saved to playbook");
    setForm({ ...emptyForm(), category: form.category });
    setEditing(false);
    setShowForm(false);
  }

  function edit(x: PlaybookEntry) {
    setForm({ ...x });
    setEditing(true);
    setShowForm(true);
    setTab(x.category);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function remove(id: string) {
    if (!confirm("Delete this entry?")) return;
    playbookStore.remove(id);
    toast.success("Deleted");
  }

  function copy(text: string) {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Winning Playbook</h1>
          <p className="text-sm text-muted-foreground">
            Save what works. Reuse it. Refine it.
          </p>
        </div>
        <Button
          onClick={() => {
            setForm({ ...emptyForm(), category: tab });
            setEditing(false);
            setShowForm((s) => !s);
          }}
        >
          <Plus className="h-4 w-4" />
          {showForm ? "Close" : "New entry"}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{editing ? "Edit entry" : "New entry"}</CardTitle>
            <CardDescription>Capture the exact wording that worked.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, category: v as PlaybookCategory }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="e.g. Curiosity opener v2"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="body">Message</Label>
                <Textarea
                  id="body"
                  rows={4}
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Paste the exact message..."
                  required
                />
              </div>
              <div className="flex items-center gap-2">
                <Button type="submit">{editing ? "Save changes" : "Save"}</Button>
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

      <Tabs value={tab} onValueChange={(v) => setTab(v as PlaybookCategory)}>
        <TabsList className="grid w-full grid-cols-3">
          {CATEGORIES.map((c) => {
            const Icon = c.icon;
            return (
              <TabsTrigger key={c.value} value={c.value} className="gap-1.5">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{c.label}</span>
                <span className="sm:hidden capitalize">{c.value}</span>
                <Badge variant="secondary" className="ml-1">
                  {grouped[c.value].length}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>
        {CATEGORIES.map((c) => (
          <TabsContent key={c.value} value={c.value} className="space-y-3">
            {grouped[c.value].length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-sm text-muted-foreground">
                  No entries yet. Save your best {c.label.toLowerCase()} here.
                </CardContent>
              </Card>
            ) : (
              grouped[c.value].map((x) => (
                <Card key={x.id}>
                  <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0 pb-2">
                    <CardTitle className="text-base">{x.title}</CardTitle>
                    <div className="flex gap-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copy(x.body)}
                      >
                        Copy
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => edit(x)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => remove(x.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="whitespace-pre-wrap text-sm text-foreground/90">{x.body}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
