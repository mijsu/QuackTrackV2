"use client"

import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface MultiSelectOption {
  value: string
  label: string
  hint?: string
}

interface MultiSelectProps {
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  allLabel?: string
  className?: string
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select...",
  allLabel = "All",
  className,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)

  const allSelected = selected.length === options.length
  const noneSelected = selected.length === 0

  const toggleAll = () => {
    if (allSelected) {
      onChange([])
    } else {
      onChange(options.map(o => o.value))
    }
  }

  const toggleOption = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const clearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange([])
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between bg-secondary border-border text-foreground font-normal",
            noneSelected && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-1.5 truncate">
            {noneSelected ? (
              <span>{placeholder}</span>
            ) : allSelected ? (
              <span>{allLabel}</span>
            ) : (
              <div className="flex items-center gap-1 flex-wrap">
                {selected.slice(0, 3).map((v) => {
                  const opt = options.find(o => o.value === v)
                  return opt ? (
                    <Badge
                      key={v}
                      variant="secondary"
                      className="text-[10px] px-1.5 py-0 font-normal bg-secondary/50 border-border"
                    >
                      {opt.label}
                    </Badge>
                  ) : null
                })}
                {selected.length > 3 && (
                  <Badge
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0 font-normal bg-secondary/50 border-border"
                  >
                    +{selected.length - 3}
                  </Badge>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!noneSelected && (
              <span
                role="button"
                tabIndex={0}
                onClick={clearSelection}
                className="size-4 rounded-sm opacity-60 hover:opacity-100 transition-opacity flex items-center justify-center"
              >
                <X className="size-3" />
              </span>
            )}
            <ChevronDown className="size-4 opacity-50" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover border-border"
        align="start"
      >
        <Command>
          <CommandList>
            <CommandGroup>
              {/* Select All / Deselect All toggle */}
              <CommandItem
                onSelect={toggleAll}
                className="flex items-center gap-2 cursor-pointer text-foreground aria-selected:bg-accent"
              >
                <div
                  className={cn(
                    "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                    allSelected
                      ? "bg-[#10B981] border-[#10B981]"
                      : "border-border"
                  )}
                >
                  {allSelected && <Check className="size-3 text-white" />}
                </div>
                <span className={allSelected ? "text-[#10B981] font-medium" : ""}>
                  {allSelected ? "Deselect All" : "Select All"}
                </span>
              </CommandItem>

              {/* Individual options */}
              {options.map((opt) => {
                const isSelected = selected.includes(opt.value)
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => toggleOption(opt.value)}
                    className="flex items-center gap-2 cursor-pointer text-foreground aria-selected:bg-accent"
                  >
                    <div
                      className={cn(
                        "size-4 rounded border flex items-center justify-center shrink-0 transition-colors",
                        isSelected
                          ? "bg-[#10B981] border-[#10B981]"
                          : "border-border"
                      )}
                    >
                      {isSelected && <Check className="size-3 text-white" />}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm">{opt.label}</span>
                      {opt.hint && (
                        <span className="text-[10px] text-muted-foreground">{opt.hint}</span>
                      )}
                    </div>
                  </CommandItem>
                )
              })}
            </CommandGroup>
            {options.length === 0 && (
              <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                No items available
              </CommandEmpty>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
