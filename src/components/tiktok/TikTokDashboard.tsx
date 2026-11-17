import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/hooks/use-storage";
import { tiktokStore, computeStats, TT_SOURCES, TT_STAGES, type TTFilters } from "@/lib/tiktok";

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent></Card>
  );
}
function Rate({ label, value, num, den, numL, denL }: { label: string; value: number | null; num: number; den: number; numL: string; denL: string }) {
  return (
    <Card><CardContent className="p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-2xl font-bold">{value === null ? <span className="text-base text-muted-foreground">Dati insufficienti</span> : `${value.toFixed(1)}%`}</div>
      <div className="text-xs text-muted-foreground">{numL} ({num}) / {denL} ({den})</div>
    </CardContent></Card>
  );
}

export function TikTokDashboard() {
  const contacts = useStore(() => tiktokStore.list());
  const [f, setF] = useState<TTFilters>({ source: "all", stage: "all" });
  const today = format(new Date(), "yyyy-MM-dd");
  const s = computeStats(contacts, f, today);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">TikTok — Limitless Academy</CardTitle>
          <Button asChild size="sm"><Link to="/tiktok">Gestisci contatti</Link></Button>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-5">
          <div><Label className="text-xs">Dal</Label><Input type="date" value={f.from ?? ""} onChange={(e) => setF({ ...f, from: e.target.value || undefined })} /></div>
          <div><Label className="text-xs">Al</Label><Input type="date" value={f.to ?? ""} onChange={(e) => setF({ ...f, to: e.target.value || undefined })} /></div>
          <div><Label className="text-xs">Provenienza</Label>
            <Select value={f.source} onValueChange={(v) => setF({ ...f, source: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tutte</SelectItem>{TT_SOURCES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Fase</Label>
            <Select value={f.stage} onValueChange={(v) => setF({ ...f, stage: v })}><SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="all">Tutte</SelectItem>{TT_STAGES.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select></div>
          <div><Label className="text-xs">Risorsa richiesta</Label><Input value={f.resource ?? ""} placeholder="es. guida" onChange={(e) => setF({ ...f, resource: e.target.value })} /></div>
        </CardContent>
      </Card>
      {contacts.length === 0 && (
        <p className="text-sm text-muted-foreground">Nessun contatto TikTok registrato. <Link to="/tiktok" className="underline">Aggiungi il primo</Link>.</p>
      )}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-5">
        <Stat label="Nuovi contatti" value={s.newContacts} />
        <Stat label="Primi DM inviati" value={s.firstDms} />
        <Stat label="Hanno risposto" value={s.replied} />
        <Stat label="Call proposte" value={s.proposed} />
        <Stat label="Call prenotate" value={s.booked} />
        <Stat label="Call svolte" value={s.held} />
        <Stat label="Acquisti" value={s.purchases} />
        <Stat label="Follow-up da fare oggi" value={s.followUpsDue} />
        <Stat label="Follow-up scaduti" value={s.followUpsOverdue} />
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Rate label="Tasso di risposta" value={s.replyRate} num={s.replied} den={s.firstDms} numL="Risposte" denL="Primi DM" />
        <Rate label="Tasso di prenotazione" value={s.bookingRate} num={s.booked} den={s.proposed} numL="Prenotate" denL="Proposte" />
        <Rate label="Tasso di acquisto" value={s.purchaseRate} num={s.purchases} den={s.held} numL="Acquisti" denL="Call svolte" />
      </div>
    </div>
  );
}
