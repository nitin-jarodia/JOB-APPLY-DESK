"use client";

import { SearchIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { SOURCE_LABELS, type SourceName } from "@/lib/jobs/types";
import { ROLE_FAMILY_FILTERS } from "@/lib/scoring/types";

export type SortKey = "score" | "newest";

export type JobFilterState = {
  search: string;
  family: string;
  location: string;
  source: string;
  minScore: number;
  sort: SortKey;
};

export const EMPTY_FILTERS: JobFilterState = {
  search: "",
  family: "any",
  location: "",
  source: "all",
  minScore: 0,
  sort: "score",
};

export function isFiltered(filters: JobFilterState): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.family !== EMPTY_FILTERS.family ||
    filters.location.trim() !== "" ||
    filters.source !== EMPTY_FILTERS.source ||
    filters.minScore !== EMPTY_FILTERS.minScore
  );
}

export function JobFilters({
  filters,
  onChange,
  availableSources,
}: {
  filters: JobFilterState;
  onChange: (next: JobFilterState) => void;
  availableSources: SourceName[];
}) {
  const set = <K extends keyof JobFilterState>(key: K, value: JobFilterState[K]) =>
    onChange({ ...filters, [key]: value });

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex flex-col gap-2">
        <Label htmlFor="filter-search">Search title and company</Label>
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="filter-search"
            value={filters.search}
            placeholder="Intern, Rubrik, frontend…"
            className="pl-9"
            onChange={(event) => set("search", event.target.value)}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-family">Role family</Label>
          <Select value={filters.family} onValueChange={(value) => set("family", value)}>
            <SelectTrigger id="filter-family" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_FAMILY_FILTERS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-location">Location contains</Label>
          <Input
            id="filter-location"
            value={filters.location}
            placeholder="Bengaluru, India, remote…"
            onChange={(event) => set("location", event.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-source">Source</Label>
          <Select value={filters.source} onValueChange={(value) => set("source", value)}>
            <SelectTrigger id="filter-source" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sources</SelectItem>
              {availableSources.map((source) => (
                <SelectItem key={source} value={source}>
                  {SOURCE_LABELS[source]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* The focusable element is the slider thumb, which htmlFor cannot
            reach, so the control is named with a labelled group instead. */}
        <div role="group" aria-label="Minimum score" className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm leading-none font-medium">Minimum score</span>
            <span className="text-sm tabular-nums text-muted-foreground">
              {filters.minScore}
            </span>
          </div>
          <Slider
            value={[filters.minScore]}
            min={0}
            max={100}
            step={5}
            onValueChange={([value]) => set("minScore", value ?? 0)}
            className="py-2"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Label htmlFor="filter-sort">Sort by</Label>
          <Select
            value={filters.sort}
            onValueChange={(value) => set("sort", value as SortKey)}
          >
            <SelectTrigger id="filter-sort" className="w-56">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="score">Score, highest first</SelectItem>
              <SelectItem value="newest">Newest first</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isFiltered(filters) ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...EMPTY_FILTERS, sort: filters.sort })}
          >
            <XIcon />
            Clear filters
          </Button>
        ) : null}
      </div>
    </div>
  );
}
