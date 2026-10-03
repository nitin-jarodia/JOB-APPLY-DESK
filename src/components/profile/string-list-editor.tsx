"use client";

import { PlusIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type StringListEditorProps = {
  label: string;
  items: string[];
  onChange: (next: string[]) => void;
  addLabel: string;
  emptyLabel: string;
  placeholder?: string;
  multiline?: boolean;
  disabled?: boolean;
};

export function StringListEditor({
  label,
  items,
  onChange,
  addLabel,
  emptyLabel,
  placeholder,
  multiline = false,
  disabled = false,
}: StringListEditorProps) {
  function updateAt(index: number, value: string) {
    onChange(items.map((item, i) => (i === index ? value : item)));
  }

  function removeAt(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              {multiline ? (
                <Textarea
                  aria-label={`${label} ${index + 1}`}
                  value={item}
                  placeholder={placeholder}
                  disabled={disabled}
                  onChange={(event) => updateAt(index, event.target.value)}
                  className="min-h-16"
                />
              ) : (
                <Input
                  aria-label={`${label} ${index + 1}`}
                  value={item}
                  placeholder={placeholder}
                  disabled={disabled}
                  onChange={(event) => updateAt(index, event.target.value)}
                />
              )}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${label.toLowerCase()} ${index + 1}`}
                disabled={disabled}
                onClick={() => removeAt(index)}
                className="mt-0.5 shrink-0"
              >
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onChange([...items, ""])}
        >
          <PlusIcon />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}
