import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface AutocompleteProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: Array<{ value: string; label: string; description?: string }>
  loading?: boolean
  className?: string
}

export function Autocomplete({
  value,
  onValueChange,
  placeholder = "Buscar...",
  options,
  loading = false,
  className
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)
  const [searchValue, setSearchValue] = React.useState("")

  const filteredOptions = React.useMemo(() => {
    if (!searchValue) return options.slice(0, 10) // Show first 10 when no search
    return options.filter(option =>
      option.label.toLowerCase().includes(searchValue.toLowerCase()) ||
      option.description?.toLowerCase().includes(searchValue.toLowerCase())
    ).slice(0, 20) // Limit to 20 results
  }, [options, searchValue])

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? options.find(option => option.value === value)?.label : placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput
            placeholder={placeholder}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {loading ? (
              <CommandEmpty>Cargando...</CommandEmpty>
            ) : filteredOptions.length === 0 ? (
              <CommandEmpty>No se encontraron resultados.</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={handleSelect}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      {option.description && (
                        <span className="text-sm text-muted-foreground">
                          {option.description}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
