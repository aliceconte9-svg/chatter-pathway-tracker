import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { leadsStore, type Lead } from "@/lib/storage";
import { useStore } from "@/hooks/use-storage";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Audience Insights — Chatter Tracker" },
      { name: "description", content: "Patterns, goals, and content ideas from your leads." },
    ],
  }),
  component: InsightsPage,
});

// Keyword dictionaries for Italian + English pattern matching
const PROBLEM_KEYWORDS: Record<string, string[]> = {
  "Paura di parlare": ["paura", "ansia", "vergogna", "timido", "timidezza", "shy", "afraid", "anxiety", "speaking anxiety"],
  "Vocabolario limitato": ["vocabolario", "parole", "vocabulary", "words", "lessico"],
  "Grammatica difficile": ["grammatica", "grammar", "regole", "rules", "coniugazioni", "conjugation"],
  "Pronuncia": ["pronuncia", "accento", "pronunciation", "accent"],
  "Mancanza di pratica": ["pratica", "practice", "esercizio", "parlare", "conversazione", "speaking"],
  "Comprensione orale": ["capire", "ascolto", "listening", "understand", "comprensione"],
  "Mancanza di tempo": ["tempo", "time", "impegnato", "busy", "lavoro"],
  "Mancanza di motivazione": ["motivazione", "motivation", "costanza", "consistency", "pigrizia"],
  "Metodo sbagliato": ["metodo", "method", "approccio", "approach", "corso", "course", "app"],
  "Blocco mentale": ["blocco", "block", "panico", "panic", "freeze"],
};

const GOAL_KEYWORDS: Record<string, string[]> = {
  "Lavoro / Carriera": ["lavoro", "work", "job", "career", "carriera", "colloquio", "interview", "professionale", "professional"],
  "Università / Studio": ["università", "university", "studio", "study", "esame", "exam", "erasmus", "master"],
  "Trasferimento all'estero": ["trasferimento", "estero", "abroad", "relocate", "emigrare", "move", "vivere all'estero"],
  "Viaggiare": ["viaggio", "travel", "vacanza", "holiday", "trip"],
  "Relazioni personali": ["partner", "ragazzo", "ragazza", "amici", "friends", "relazione", "relationship", "fidanzato"],
  "Certificazione": ["certificazione", "certification", "ielts", "toefl", "cambridge", "b1", "b2", "c1"],
  "Fiducia in sé": ["fiducia", "confidence", "sicurezza", "self-esteem", "autostima"],
  "Intrattenimento": ["film", "serie", "netflix", "musica", "music", "podcast", "youtube"],
};

const OBJECTION_KEYWORDS: Record<string, string[]> = {
  "Troppo caro": ["caro", "costoso", "expensive", "prezzo", "price", "soldi", "money", "budget"],
  "Non ho tempo": ["tempo", "time", "impegnato", "busy"],
  "Ci devo pensare": ["pensare", "think", "decidere", "decide", "valutare"],
  "Ho già provato": ["provato", "tried", "corso", "app", "duolingo", "già fatto"],
  "Non sono sicuro": ["sicuro", "sure", "dubbio", "doubt", "indeciso"],
  "Non è il momento": ["momento", "moment", "adesso", "now", "dopo", "later"],
};

function extractPatterns(leads: Lead[], dict: Record<string, string[]>): { name: string; count: number; leads: string[] }[] {
  const results: Record<string, Set<string>> = {};
  for (const [pattern, keywords] of Object.entries(dict)) {
    results[pattern] = new Set();
  }
  for (const lead of leads) {
    const text = [lead.notes, lead.bestMessage, lead.objectionCustom].filter(Boolean).join(" ").toLowerCase();
    if (!text.trim()) continue;
    for (const [pattern, keywords] of Object.entries(dict)) {
      if (keywords.some((kw) => text.includes(kw))) {
        results[pattern].add(lead.name);
      }
    }
  }
  return Object.entries(results)
    .map(([name, leadSet]) => ({ name, count: leadSet.size, leads: [...leadSet] }))
    .filter((r) => r.count > 0)
    .sort((a, b) => b.count - a.count);
}

const CONTENT_TEMPLATES = [
  { type: "Hook", template: (problem: string) => `"Se anche tu hai ${problem.toLowerCase()}, questo video è per te..."` },
  { type: "Reel educativo", template: (problem: string) => `3 modi per superare "${problem.toLowerCase()}" — con esempi pratici` },
  { type: "Storia interattiva", template: (problem: string) => `Poll: "Quanto ti blocca ${problem.toLowerCase()}? 🔥 Tanto / 😅 Un po' / ✅ Per niente"` },
  { type: "Carosello", template: (goal: string) => `Da zero a ${goal.toLowerCase()}: i 5 step che funzionano davvero` },
  { type: "Video TikTok", template: (problem: string) => `POV: hai ${problem.toLowerCase()} ma poi scopri questo metodo...` },
  { type: "YouTube", template: (goal: string) => `Come raggiungere "${goal.toLowerCase()}" — La guida completa` },
];

function InsightsPage() {
  const leads = useStore(() => leadsStore.list());
  const [mounted, setMounted] = useState(false);
  useState(() => setMounted(true));

  const problems = useMemo(() => extractPatterns(leads, PROBLEM_KEYWORDS), [leads]);
  const goals = useMemo(() => extractPatterns(leads, GOAL_KEYWORDS), [leads]);
  const objections = useMemo(() => extractPatterns(leads, OBJECTION_KEYWORDS), [leads]);

  const contentIdeas = useMemo(() => {
    const ideas: { type: string; idea: string; source: string }[] = [];
    for (const p of problems.slice(0, 5)) {
      ideas.push({ type: "🎣 Hook", idea: CONTENT_TEMPLATES[0].template(p.name), source: p.name });
      ideas.push({ type: "🎬 Reel", idea: CONTENT_TEMPLATES[1].template(p.name), source: p.name });
      ideas.push({ type: "📱 Storia", idea: CONTENT_TEMPLATES[2].template(p.name), source: p.name });
      ideas.push({ type: "🎵 TikTok", idea: CONTENT_TEMPLATES[4].template(p.name), source: p.name });
    }
    for (const g of goals.slice(0, 3)) {
      ideas.push({ type: "📸 Carosello", idea: CONTENT_TEMPLATES[3].template(g.name), source: g.name });
      ideas.push({ type: "📺 YouTube", idea: CONTENT_TEMPLATES[5].template(g.name), source: g.name });
    }
    return ideas;
  }, [problems, goals]);

  if (!mounted) return null;

  const leadsWithNotes = leads.filter((l) => (l.notes ?? "").trim() || (l.bestMessage ?? "").trim()).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audience Insights</h1>
        <p className="text-sm text-muted-foreground">
          Patterns extracted from {leadsWithNotes} leads with notes — {leads.length} total leads.
        </p>
      </div>

      {leadsWithNotes === 0 && (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">
              Nessun insight disponibile. Aggiungi note ai lead per vedere pattern e suggerimenti di contenuto.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <InsightCard title="🔴 Top Problems" description="Problemi più comuni tra i tuoi lead" items={problems} />
        <InsightCard title="🎯 Top Goals" description="Obiettivi più frequenti" items={goals} />
        <InsightCard title="🚫 Top Objections" description="Obiezioni ricorrenti dalle note" items={objections} />
      </div>

      {contentIdeas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">💡 Content Suggestions</CardTitle>
            <CardDescription>Idee di contenuto generate dai pattern dei tuoi lead</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {contentIdeas.map((idea, i) => (
                <div key={i} className="rounded-lg border p-3 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{idea.type}</Badge>
                    <span className="text-xs text-muted-foreground">da: {idea.source}</span>
                  </div>
                  <p className="text-sm">{idea.idea}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function InsightCard({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: { name: string; count: number; leads: string[] }[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">Nessun pattern trovato</p>
        ) : (
          <div className="space-y-2">
            {items.slice(0, 7).map((item) => (
              <div key={item.name} className="flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{item.name}</div>
                  <div className="text-xs text-muted-foreground truncate">
                    {item.leads.slice(0, 3).join(", ")}
                    {item.leads.length > 3 && ` +${item.leads.length - 3}`}
                  </div>
                </div>
                <Badge variant="outline">{item.count}</Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}