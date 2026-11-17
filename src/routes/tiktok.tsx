import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ExternalLink, Pencil, Search, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useStore } from "@/hooks/use-storage";
import { uid } from "@/lib/storage";
import {
  tiktokStore, normalizeUsername, profileUrl, findDuplicate, applyStageChange, filterContacts,
  TT_SOURCES, TT_STAGES, TT_OUTCOMES, TT_DM_STATUSES, type TikTokContact,
} from "@/lib/tiktok";

export const Route = createFileRoute("/tiktok")({
  head: () => ({
    meta: [
      { title: "Contatti TikTok — Limitless Academy CRM" },
      { name: "description", content: "CRM delle conversazioni TikTok di Limitless Academy: contatti, fasi, DM e follow-up." },
      { property: "og:title", content: "Contatti TikTok — Limitless Academy CRM" },
      { property: "og:description", content: "Traccia contatti, conversazioni e follow-up TikTok." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TikTokPage,
});

const today = () => format(new Date(), "yyyy-MM-dd");
const empty = (): TikTokContact => ({
  id: uid(), platform: "tiktok", username: "", displayName: "", createdAt: today(),
  stage: "Contatto inserito", outcome: "Aperta", dmStatus: "Da contattare", stageDates: {},
});

function Pick<T extends string>({ label, value, options, onChange, allowNone }: { label: string; value?: T; options: readonly T[]; onChange: (v: T | undefined) => void; allowNone?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value ?? "__none"} onValueChange={(v) => onChange(v === "__none" ? undefined : (v as T))}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {allowNone && <SelectItem value="__none">—</SelectItem>}
          {options.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function TikTokPage() {
  const contacts = useStore(() => tiktokStore.list());
  const [form, setForm] = useState<TikTokContact>(empty);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState("");
  const [stageF, setStageF] = useState("all");
  const [sourceF, setSourceF] = useState("all");
  const [dmF, setDmF] = useState("all");
  const [outcomeF, setOutcomeF] = useState("all");

  const dup = form.username ? findDuplicate(contacts, form.username, form.id) : undefined;
  const set = (p: Partial<TikTokContact>) => setForm((f) => ({ ...f, ...p }));

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase().replace(/^@/, "");
    return filterContacts(contacts, { stage: stageF, source: sourceF })
      .filter((c) => dmF === "all" || c.dmStatus === dmF)
      .filter((c) => outcomeF === "all" || c.outcome === outcomeF)
      .filter((c) => !s || [c.username, c.displayName, c.notes, c.keyword, c.resource, c.sourceContent].some((v) => (v ?? "").toLowerCase().includes(s)))
      .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  }, [contacts, q, stageF, sourceF, dmF, outcomeF]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const u = normalizeUsername(form.username);
    if (!u) return toast.error("Inserisci lo username TikTok");
    if (dup) return toast.error(`@${u} esiste già (${dup.displayName || "senza nome"})`);
    let c = { ...form, username: u };
    if (!c.stageDates?.[c.stage]) c = applyStageChange(c, c.stage, today());
    if (!c.stageDates?.["Contatto inserito"]) c.stageDates = { ...c.stageDates, "Contatto inserito": c.createdAt };
    tiktokStore.upsert(c);
    toast.success(editing ? "Contatto aggiornato" : "Contatto aggiunto");
    setForm(empty()); setEditing(false);
  }

  function quick(c: TikTokContact, p: Partial<TikTokContact>, stage?: TikTokContact["stage"]) {
    let n = { ...c, ...p };
    if (stage) n = applyStageChange(n, stage, today());
    tiktokStore.upsert(n);
  }

  const t = today();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Contatti TikTok</h1>
        <p className="text-sm text-muted-foreground">Inserimento e aggiornamento manuale. I lead Instagram restano nella pagina Instagram.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">{editing ? "Modifica contatto" : "Nuovo contatto TikTok"}</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="u">Username TikTok *</Label>
                <Input id="u" placeholder="@username" value={form.username} onChange={(e) => set({ username: e.target.value })} />
                {form.username && <a className="text-xs text-muted-foreground underline" href={profileUrl(form.username)} target="_blank" rel="noreferrer">{profileUrl(form.username)}</a>}
                {dup && <p className="text-xs text-destructive">Già presente: @{dup.username} — {dup.stage}</p>}
              </div>
              <div className="space-y-1.5"><Label>Nome visualizzato</Label><Input value={form.displayName ?? ""} onChange={(e) => set({ displayName: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Data di inserimento</Label><Input type="date" value={form.createdAt} onChange={(e) => set({ createdAt: e.target.value })} /></div>
              <Pick label="Provenienza" value={form.source} options={TT_SOURCES} allowNone onChange={(v) => set({ source: v })} />
              <div className="space-y-1.5"><Label>Video o live di provenienza</Label><Input value={form.sourceContent ?? ""} onChange={(e) => set({ sourceContent: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Parola chiave commentata</Label><Input value={form.keyword ?? ""} onChange={(e) => set({ keyword: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Risorsa richiesta / inviata</Label><Input value={form.resource ?? ""} onChange={(e) => set({ resource: e.target.value })} /></div>
              <Pick label="Fase" value={form.stage} options={TT_STAGES} onChange={(v) => v && set({ stage: v })} />
              <Pick label="Stato / esito" value={form.outcome} options={TT_OUTCOMES} onChange={(v) => v && set({ outcome: v })} />
              <Pick label="Stato DM" value={form.dmStatus} options={TT_DM_STATUSES} onChange={(v) => v && set({ dmStatus: v })} />
              <div className="space-y-1.5"><Label>Ultimo messaggio inviato</Label><Input type="date" value={form.lastSentAt ?? ""} onChange={(e) => set({ lastSentAt: e.target.value || undefined })} /></div>
              <div className="space-y-1.5"><Label>Ultima risposta ricevuta</Label><Input type="date" value={form.lastReplyAt ?? ""} onChange={(e) => set({ lastReplyAt: e.target.value || undefined })} /></div>
              <div className="space-y-1.5"><Label>Prossima azione</Label><Input value={form.nextAction ?? ""} onChange={(e) => set({ nextAction: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Scadenza</Label><Input type="date" value={form.nextActionDue ?? ""} onChange={(e) => set({ nextActionDue: e.target.value || undefined })} /></div>
              <div className="space-y-1.5"><Label>Limitazioni di contatto</Label><Input value={form.contactLimits ?? ""} onChange={(e) => set({ contactLimits: e.target.value })} /></div>
            </div>
            <div className="space-y-1.5"><Label>Note</Label><Textarea rows={3} value={form.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} /></div>
            <div className="flex gap-2">
              <Button type="submit">{editing ? "Salva" : "Aggiungi contatto"}</Button>
              {editing && <Button type="button" variant="outline" onClick={() => { setForm(empty()); setEditing(false); }}>Annulla</Button>}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Contatti ({rows.length})</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-5">
            <div className="relative"><Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Cerca" value={q} onChange={(e) => setQ(e.target.value)} /></div>
            {([["Fase", stageF, setStageF, TT_STAGES], ["Provenienza", sourceF, setSourceF, TT_SOURCES], ["Stato DM", dmF, setDmF, TT_DM_STATUSES], ["Esito", outcomeF, setOutcomeF, TT_OUTCOMES]] as const).map(([l, v, fn, opts]) => (
              <Select key={l} value={v} onValueChange={fn}><SelectTrigger><SelectValue placeholder={l} /></SelectTrigger>
                <SelectContent><SelectItem value="all">{l}: tutti</SelectItem>{opts.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select>
            ))}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Contatto</TableHead><TableHead>Fase</TableHead><TableHead>DM</TableHead>
                <TableHead>Ultimo invio</TableHead><TableHead>Ultima risposta</TableHead><TableHead>Prossima azione</TableHead><TableHead />
              </TableRow></TableHeader>
              <TableBody>
                {rows.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground">Nessun contatto</TableCell></TableRow>}
                {rows.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>
                      <a href={profileUrl(c.username)} target="_blank" rel="noreferrer" className="font-medium hover:underline inline-flex items-center gap-1">@{c.username}<ExternalLink className="h-3 w-3" /></a>
                      {c.displayName && <div className="text-xs text-muted-foreground">{c.displayName}</div>}
                      {c.source && <div className="text-xs text-muted-foreground">{c.source}{c.resource ? ` · ${c.resource}` : ""}</div>}
                    </TableCell>
                    <TableCell>
                      <Select value={c.stage} onValueChange={(v) => quick(c, {}, v as TikTokContact["stage"])}><SelectTrigger className="h-8 w-48 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>{TT_STAGES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select>
                      {c.outcome !== "Aperta" && <Badge variant="secondary" className="mt-1">{c.outcome}</Badge>}
                    </TableCell>
                    <TableCell className="text-xs">{c.dmStatus}{c.contactLimits && <div className="text-muted-foreground">{c.contactLimits}</div>}</TableCell>
                    <TableCell className="text-xs">{c.lastSentAt ?? "—"}</TableCell>
                    <TableCell className="text-xs">{c.lastReplyAt ?? "—"}</TableCell>
                    <TableCell className="text-xs">
                      {c.nextAction || "—"}
                      {c.nextActionDue && <div className={c.nextActionDue < t ? "text-destructive" : "text-muted-foreground"}>{c.nextActionDue}</div>}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      <Button size="sm" variant="ghost" title="Messaggio inviato oggi" onClick={() => quick(c, { lastSentAt: t, dmStatus: c.dmStatus === "Da contattare" ? "Richiesta di messaggio inviata" : c.dmStatus, outcome: "In attesa di risposta" }, c.stage === "Contatto inserito" ? "Primo DM inviato" : undefined)}>Inviato</Button>
                      <Button size="sm" variant="ghost" title="Risposta ricevuta oggi" onClick={() => quick(c, { lastReplyAt: t, dmStatus: "Conversazione avviata", outcome: "Aperta" }, TT_STAGES.indexOf(c.stage) < 2 ? "Risposta ricevuta" : undefined)}>Risposta</Button>
                      <Button size="icon" variant="ghost" onClick={() => { setForm(c); setEditing(true); window.scrollTo({ top: 0, behavior: "smooth" }); }}><Pencil className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => confirm(`Eliminare @${c.username}?`) && tiktokStore.remove(c.id)}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
