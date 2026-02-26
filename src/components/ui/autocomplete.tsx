import * as React from "react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"

type AutocompleteRenderArgs<T> = {
  option: T
  index: number
  optionId: string
  isHighlighted: boolean
  isSelected: boolean
  selectOption: () => void
}

interface AutocompleteProps<T> {
  value: string
  onValueChange: (value: string) => void
  options: ReadonlyArray<T>
  onSelectOption: (option: T) => void
  getOptionKey: (option: T) => string
  renderOption: (args: AutocompleteRenderArgs<T>) => React.ReactNode
  isOptionSelected?: (option: T) => boolean
  emptyMessage: string
  placeholder?: string
  disabled?: boolean
  id?: string
  name?: string
  ariaLabel: string
  className?: string
  inputClassName?: string
  listClassName?: string
  leftAdornment?: React.ReactNode
  rightAdornment?: React.ReactNode
}

function Autocomplete<T>({
  value,
  onValueChange,
  options,
  onSelectOption,
  getOptionKey,
  renderOption,
  isOptionSelected,
  emptyMessage,
  placeholder,
  disabled = false,
  id,
  name,
  ariaLabel,
  className,
  inputClassName,
  listClassName,
  leftAdornment,
  rightAdornment,
}: AutocompleteProps<T>) {
  const generatedId = React.useId()
  const baseId = id ?? `${generatedId}-autocomplete`
  const listboxId = `${baseId}-listbox`
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)

  const normalizedHighlightedIndex =
    options.length === 0 ? -1 : Math.min(Math.max(highlightedIndex, 0), options.length - 1)
  const highlightedOption =
    normalizedHighlightedIndex >= 0 ? options[normalizedHighlightedIndex] : null
  const activeDescendantId =
    highlightedOption !== null
      ? `${baseId}-option-${getOptionKey(highlightedOption)}`
      : undefined

  const selectOption = React.useCallback(
    (option: T) => {
      onSelectOption(option)
      setIsOpen(false)
      setHighlightedIndex(0)
    },
    [onSelectOption]
  )

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setIsOpen(false)
      return
    }

    if (options.length === 0) {
      return
    }

    if (event.key === "ArrowDown") {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((current) => (current < 0 ? 0 : (current + 1) % options.length))
      return
    }

    if (event.key === "ArrowUp") {
      event.preventDefault()
      setIsOpen(true)
      setHighlightedIndex((current) =>
        current < 0 ? options.length - 1 : (current - 1 + options.length) % options.length
      )
      return
    }

    if (event.key === "Enter") {
      event.preventDefault()
      const selectionIndex = normalizedHighlightedIndex >= 0 ? normalizedHighlightedIndex : 0
      const selectedOption = options[selectionIndex]
      if (selectedOption) {
        selectOption(selectedOption)
      }
    }
  }

  return (
    <div className={cn("relative", className)}>
      {leftAdornment && (
        <div
          className="pointer-events-none absolute left-2.5 top-1/2 z-10 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        >
          {leftAdornment}
        </div>
      )}
      <Input
        id={baseId}
        name={name}
        type="text"
        value={value}
        onChange={(event) => {
          onValueChange(event.target.value)
          setIsOpen(true)
          setHighlightedIndex(0)
        }}
        onFocus={() => setIsOpen(true)}
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        className={cn(leftAdornment && "pl-8", rightAdornment && "pr-8", inputClassName)}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen}
        aria-controls={listboxId}
        aria-activedescendant={activeDescendantId}
        aria-label={ariaLabel}
      />
      {rightAdornment && (
        <div className="absolute right-1 top-1/2 z-10 -translate-y-1/2">{rightAdornment}</div>
      )}

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          className={cn(
            "absolute left-0 right-0 top-[calc(100%+0.4rem)] z-40 max-h-64 space-y-1 overflow-y-auto rounded-lg border border-border/80 bg-background/95 p-1 shadow-xl backdrop-blur-md",
            listClassName
          )}
        >
          {options.length === 0 ? (
            <div className="rounded-md px-3 py-2 text-xs text-muted-foreground">{emptyMessage}</div>
          ) : (
            options.map((option, index) => {
              const optionId = `${baseId}-option-${getOptionKey(option)}`
              const isHighlighted = index === normalizedHighlightedIndex
              const isSelected = isOptionSelected?.(option) ?? false

              return (
                <React.Fragment key={getOptionKey(option)}>
                  {renderOption({
                    option,
                    index,
                    optionId,
                    isHighlighted,
                    isSelected,
                    selectOption: () => selectOption(option),
                  })}
                </React.Fragment>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}

export { Autocomplete }
export type { AutocompleteProps, AutocompleteRenderArgs }
