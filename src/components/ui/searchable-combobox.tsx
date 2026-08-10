"use client";

import { Check, ChevronDown, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SearchableComboboxOption = {
  value: string;
  label: string;
  description?: string;
  searchText?: string;
};

type SearchableComboboxProps = {
  label: string;
  options: readonly SearchableComboboxOption[];
  value: string;
  placeholder: string;
  emptyMessage?: string;
  disabled?: boolean;
  required?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange: (value: string) => void;
};

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr-FR");
}

export function SearchableCombobox({
  label,
  options,
  value,
  placeholder,
  emptyMessage = "Aucun résultat.",
  disabled = false,
  required = false,
  invalid = false,
  describedBy,
  onChange,
}: SearchableComboboxProps) {
  const id = useId();
  const listboxId = `${id}-listbox`;
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const selected = options.find((option) => option.value === value) ?? null;
  const filteredOptions = useMemo(() => {
    const normalizedQuery = normalizeSearch(query.trim());
    if (!normalizedQuery) return [...options];
    return options.filter((option) =>
      normalizeSearch(
        `${option.label} ${option.description ?? ""} ${option.searchText ?? ""}`,
      ).includes(normalizedQuery),
    );
  }, [options, query]);

  useEffect(() => {
    function closeOnOutsideClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  useEffect(() => {
    setActiveIndex((current) =>
      filteredOptions.length ? Math.min(current, filteredOptions.length - 1) : 0,
    );
  }, [filteredOptions.length]);

  function select(optionValue: string) {
    onChange(optionValue);
    setQuery("");
    setOpen(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        filteredOptions.length ? (current + 1) % filteredOptions.length : 0,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) =>
        filteredOptions.length
          ? (current - 1 + filteredOptions.length) % filteredOptions.length
          : 0,
      );
    } else if (event.key === "Enter" && open && filteredOptions[activeIndex]) {
      event.preventDefault();
      select(filteredOptions[activeIndex].value);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      setQuery("");
    }
  }

  const visibleValue = open ? query : selected?.label ?? "";

  return (
    <div ref={rootRef} className="relative grid gap-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="relative">
        <input
          ref={inputRef}
          id={id}
          role="combobox"
          type="text"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listboxId}
          aria-expanded={open}
          aria-activedescendant={
            open && filteredOptions[activeIndex]
              ? `${id}-option-${activeIndex}`
              : undefined
          }
          aria-invalid={invalid}
          aria-describedby={describedBy}
          aria-required={required}
          disabled={disabled}
          value={visibleValue}
          placeholder={placeholder}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
            setActiveIndex(0);
          }}
          onKeyDown={handleKeyDown}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pr-20 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            invalid && "border-destructive",
          )}
        />
        <div className="absolute inset-y-0 right-1 flex items-center gap-0.5">
          {value ? (
            <button
              type="button"
              aria-label={`Réinitialiser ${label.toLocaleLowerCase("fr-FR")}`}
              disabled={disabled}
              onClick={() => {
                onChange("");
                setQuery("");
                setOpen(true);
                inputRef.current?.focus();
              }}
              className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : null}
          <button
            type="button"
            aria-label={open ? `Fermer ${label.toLocaleLowerCase("fr-FR")}` : `Ouvrir ${label.toLocaleLowerCase("fr-FR")}`}
            disabled={disabled}
            onClick={() => {
              setQuery("");
              setOpen((current) => !current);
              inputRef.current?.focus();
            }}
            className="flex h-8 w-8 items-center justify-center rounded-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
          </button>
        </div>
      </div>
      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label}
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-y-auto rounded-md border bg-white p-1 shadow-lg"
        >
          {filteredOptions.length ? (
            filteredOptions.map((option, index) => (
              <button
                key={option.value}
                id={`${id}-option-${index}`}
                type="button"
                role="option"
                aria-selected={option.value === value}
                onMouseDown={(event) => event.preventDefault()}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => select(option.value)}
                className={cn(
                  "flex min-h-11 w-full items-center gap-3 rounded-sm px-3 py-2 text-left text-sm outline-none transition-colors",
                  index === activeIndex ? "bg-emerald-50 text-emerald-950" : "hover:bg-muted/60",
                )}
              >
                <Check
                  className={cn(
                    "h-4 w-4 shrink-0 text-emerald-700",
                    option.value === value ? "opacity-100" : "opacity-0",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className="block font-medium">{option.label}</span>
                  {option.description ? (
                    <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                      {option.description}
                    </span>
                  ) : null}
                </span>
              </button>
            ))
          ) : (
            <p className="px-3 py-4 text-sm text-muted-foreground">{emptyMessage}</p>
          )}
        </div>
      ) : null}
    </div>
  );
}
