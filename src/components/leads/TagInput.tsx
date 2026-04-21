import { useState } from "react";
import { X, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { tagsStore } from "@/lib/tags";
import { useStore } from "@/hooks/use-storage";

export function TagInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const available = useStore(() => tagsStore.list());
  const [open, setOpen] = useState(false);
  const [newTag, setNewTag] = useState("");

  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  function addNew() {
    const trimmed = newTag.trim();
    if (!trimmed) return;
    tagsStore.add(trimmed);
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setNewTag("");
  }

  return (
    <div className="space-y-1.5">
      <div className="flex flex-wrap gap-1">
        {value.map((tag) => (
          <Badge key={tag} variant="secondary" className="gap-1 pr-1">
            {tag}
            <button
              type="button"
              onClick={() => toggle(tag)}
              className="ml-0.5 rounded-full p-0.5 hover:bg-muted"
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button type="button" size="sm" variant="outline" className="h-6 gap-1 px-2 text-xs">
              <Plus className="h-3 w-3" />
              Tag
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-52 space-y-2" align="start">
            <div className="text-xs font-medium text-muted-foreground">Select or create tag</div>
            <div className="flex flex-wrap gap-1">
              {available.map((tag) => (
                <Badge
                  key={tag}
                  variant={value.includes(tag) ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => toggle(tag)}
                >
                  {tag}
                </Badge>
              ))}
            </div>
            <div className="flex gap-1">
              <Input
                placeholder="New tag..."
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addNew();
                  }
                }}
                className="h-7 text-xs"
              />
              <Button type="button" size="sm" className="h-7" onClick={addNew}>
                Add
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

export function TagFilter({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const available = useStore(() => tagsStore.list());

  function toggle(tag: string) {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  }

  return (
    <div className="flex flex-wrap gap-1">
      {available.map((tag) => (
        <Badge
          key={tag}
          variant={value.includes(tag) ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => toggle(tag)}
        >
          {tag}
        </Badge>
      ))}
      {value.length > 0 && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-xs"
          onClick={() => onChange([])}
        >
          Clear
        </Button>
      )}
    </div>
  );
}