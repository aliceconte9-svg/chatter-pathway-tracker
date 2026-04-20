import { useState } from "react";
import { format, addDays, parseISO } from "date-fns";
import { CheckCircle2, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { leadsStore, type Lead } from "@/lib/storage";

function igUrl(handle?: string): string | null {
  if (!handle) return null;
  const clean = handle.trim().replace(/^@/, "");
  if (!clean) return null;
  return `https://instagram.com/${clean}`;
}

export function LeadRowActions({ lead, compact = false }: { lead: Lead; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [customDate, setCustomDate] = useState(
    lead.nextFollowUpAt ?? format(addDays(new Date(), 1), "yyyy-MM-dd"),
  );
  const ig = igUrl(lead.igUsername);

  function snooze(days: number) {
    const date = format(addDays(new Date(), days), "yyyy-MM-dd");
    leadsStore.reschedule(lead.id, date);
    toast.success(`Snoozed to ${format(parseISO(date), "EEE, MMM d")}`);
    setOpen(false);
  }

  function applyCustom() {
    if (!customDate) return;
    leadsStore.reschedule(lead.id, customDate);
    toast.success(`Follow-up set for ${format(parseISO(customDate), "EEE, MMM d")}`);
    setOpen(false);
  }

  function markContacted() {
    leadsStore.markContacted(lead.id);
    toast.success(`Marked ${lead.name} as contacted`);
  }

  const size = compact ? "sm" : "default";

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size={size} variant="default" onClick={markContacted}>
        <CheckCircle2 className="h-4 w-4" />
        <span className={compact ? "hidden sm:inline" : ""}>Contacted</span>
      </Button>

      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size={size} variant="outline">
            <Clock className="h-4 w-4" />
            <span className={compact ? "hidden sm:inline" : ""}>Snooze</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-60 space-y-2" align="end">
          <div className="text-xs font-medium text-muted-foreground">Reschedule follow-up</div>
          <div className="grid grid-cols-3 gap-1.5">
            <Button size="sm" variant="secondary" onClick={() => snooze(1)}>
              +1d
            </Button>
            <Button size="sm" variant="secondary" onClick={() => snooze(3)}>
              +3d
            </Button>
            <Button size="sm" variant="secondary" onClick={() => snooze(7)}>
              +7d
            </Button>
          </div>
          <div className="space-y-1.5 pt-1">
            <Input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
            />
            <Button size="sm" className="w-full" onClick={applyCustom}>
              Set date
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {ig && (
        <Button size={size} variant="ghost" asChild>
          <a href={ig} target="_blank" rel="noreferrer" aria-label="Open IG profile">
            <ExternalLink className="h-4 w-4" />
            <span className={compact ? "hidden sm:inline" : ""}>IG</span>
          </a>
        </Button>
      )}
    </div>
  );
}
