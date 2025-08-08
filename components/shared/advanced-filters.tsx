"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Filter, X, Plus } from "lucide-react"
import { DatePickerWithRange } from "@/components/ui/date-range-picker"
import { DateRange } from "react-day-picker"

export interface FilterConfig {
  key: string
  label: string
  type: "text" | "select" | "number" | "date" | "daterange" | "boolean"
  options?: { value: string; label: string }[]
}

export interface FilterValue {
  key: string
  operator: "equals" | "contains" | "greater" | "less" | "between" | "in"
  value: any
}

interface AdvancedFiltersProps {
  filters: FilterConfig[]
  values: FilterValue[]
  onChange: (values: FilterValue[]) => void
}

export function AdvancedFilters({ filters, values, onChange }: AdvancedFiltersProps) {
  const [open, setOpen] = useState(false)
  const [tempFilters, setTempFilters] = useState<FilterValue[]>(values)

  const addFilter = () => {
    const newFilter: FilterValue = {
      key: filters[0].key,
      operator: "contains",
      value: "",
    }
    setTempFilters([...tempFilters, newFilter])
  }

  const removeFilter = (index: number) => {
    setTempFilters(tempFilters.filter((_, i) => i !== index))
  }

  const updateFilter = (index: number, updates: Partial<FilterValue>) => {
    const updated = [...tempFilters]
    updated[index] = { ...updated[index], ...updates }
    setTempFilters(updated)
  }

  const applyFilters = () => {
    onChange(tempFilters)
    setOpen(false)
  }

  const clearFilters = () => {
    setTempFilters([])
    onChange([])
  }

  const getFilterConfig = (key: string) => {
    return filters.find(f => f.key === key)
  }

  const renderFilterValue = (filter: FilterValue, index: number) => {
    const config = getFilterConfig(filter.key)
    if (!config) return null

    switch (config.type) {
      case "text":
        return (
          <Input
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder={`Unesite ${config.label.toLowerCase()}...`}
          />
        )
      
      case "select":
        return (
          <Select
            value={filter.value}
            onValueChange={(value) => updateFilter(index, { value })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Izaberite..." />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      
      case "number":
        return (
          <Input
            type="number"
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder={`Unesite ${config.label.toLowerCase()}...`}
          />
        )
      
      case "daterange":
        return (
          <DatePickerWithRange
            value={filter.value as DateRange}
            onChange={(date) => updateFilter(index, { value: date })}
          />
        )
      
      default:
        return (
          <Input
            value={filter.value}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder={`Unesite ${config.label.toLowerCase()}...`}
          />
        )
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" />
            Filteri
            {values.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {values.length}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-4" align="start">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Napredni filteri</h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                disabled={tempFilters.length === 0}
              >
                Obriši sve
              </Button>
            </div>

            <div className="space-y-3">
              {tempFilters.map((filter, index) => {
                const config = getFilterConfig(filter.key)
                return (
                  <div key={index} className="space-y-2 p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <Select
                        value={filter.key}
                        onValueChange={(key) => updateFilter(index, { key })}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filters.map((f) => (
                            <SelectItem key={f.key} value={f.key}>
                              {f.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select
                        value={filter.operator}
                        onValueChange={(operator) => updateFilter(index, { operator: operator as any })}
                      >
                        <SelectTrigger className="w-[120px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="contains">Sadrži</SelectItem>
                          <SelectItem value="equals">Jednako</SelectItem>
                          <SelectItem value="greater">Veće od</SelectItem>
                          <SelectItem value="less">Manje od</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeFilter(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {renderFilterValue(filter, index)}
                  </div>
                )
              })}

              {tempFilters.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nema aktivnih filtera
                </p>
              )}
            </div>

            <div className="flex items-center justify-between pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={addFilter}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Dodaj filter
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOpen(false)}
                >
                  Otkaži
                </Button>
                <Button
                  size="sm"
                  onClick={applyFilters}
                >
                  Primeni
                </Button>
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {values.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {values.map((filter, index) => {
            const config = getFilterConfig(filter.key)
            return (
              <Badge key={index} variant="secondary" className="gap-1">
                {config?.label}: {filter.value}
                <button
                  onClick={() => {
                    const newValues = values.filter((_, i) => i !== index)
                    onChange(newValues)
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      )}
    </div>
  )
}