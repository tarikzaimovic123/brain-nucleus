"use client"

import React, { useState, useMemo, useCallback } from "react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal,
  ArrowUpDown,
  Search,
  Filter,
  Download,
  Settings2,
  Eye,
  Edit,
  Trash,
  Copy,
  Share2,
  X,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Label } from "@/components/ui/label"

export interface DataGridColumn<T> {
  key: string
  header: string
  accessor?: (item: T) => React.ReactNode
  sortable?: boolean
  filterable?: boolean
  width?: string
  align?: "left" | "center" | "right"
}

interface DataGridProps<T> {
  data: T[]
  columns: DataGridColumn<T>[]
  onEdit?: (item: T) => void
  onDelete?: (item: T) => void
  onView?: (item: T) => void
  selectable?: boolean
  searchable?: boolean
  pageSize?: number
  totalCount?: number
  currentPage?: number
  onPageChange?: (page: number) => void
  isLoading?: boolean
  emptyMessage?: string
  actions?: (item: T) => React.ReactNode
}

export function DataGrid<T extends { id: string | number }>({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
  selectable = false,
  searchable = true,
  pageSize = 10,
  totalCount,
  currentPage = 1,
  onPageChange,
  isLoading = false,
  emptyMessage = "Nema podataka za prikaz",
  actions,
}: DataGridProps<T>) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedRows, setSelectedRows] = useState<Set<string | number>>(new Set())
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")
  const [showColumnSettings, setShowColumnSettings] = useState(false)
  const [visibleColumns, setVisibleColumns] = useState<Set<string>>(
    new Set(columns.map(c => c.key))
  )
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({})
  const [showFilterPopover, setShowFilterPopover] = useState(false)

  // Filter and sort data
  const processedData = useMemo(() => {
    let filtered = [...data]
    
    // Column filters
    Object.entries(columnFilters).forEach(([columnKey, filterValue]) => {
      if (filterValue) {
        filtered = filtered.filter((item) => {
          const column = columns.find(c => c.key === columnKey)
          // Helper function to get nested value
          const getNestedValue = (obj: any, path: string) => {
            return path.split('.').reduce((acc, part) => acc?.[part], obj)
          }
          const value = column?.accessor ? column.accessor(item) : getNestedValue(item, columnKey)
          
          // Extract text from React elements
          const extractText = (element: any): string => {
            if (typeof element === 'string') return element
            if (typeof element === 'number') return String(element)
            if (!element) return ''
            if (React.isValidElement(element)) {
              const props = element.props as any
              if (props?.children) {
                if (Array.isArray(props.children)) {
                  return props.children.map(extractText).join(' ')
                }
                return extractText(props.children)
              }
            }
            return String(element)
          }
          
          const textValue = extractText(value).toLowerCase()
          return textValue.includes(filterValue.toLowerCase())
        })
      }
    })

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter((item) =>
        columns.some((column) => {
          const value = column.accessor ? column.accessor(item) : (item as any)[column.key]
          // Handle React elements and complex objects
          if (React.isValidElement(value)) {
            // Try to extract text from React elements
            const extractText = (element: any): string => {
              if (typeof element === 'string') return element
              if (typeof element === 'number') return String(element)
              if (!element) return ''
              if (element.props?.children) {
                if (Array.isArray(element.props.children)) {
                  return element.props.children.map(extractText).join(' ')
                }
                return extractText(element.props.children)
              }
              return ''
            }
            return extractText(value).toLowerCase().includes(searchTerm.toLowerCase())
          }
          // Handle null/undefined
          if (value === null || value === undefined) return false
          // Convert to string and search
          return String(value).toLowerCase().includes(searchTerm.toLowerCase())
        })
      )
    }

    // Sort
    if (sortColumn) {
      filtered = filtered.sort((a, b) => {
        const column = columns.find(c => c.key === sortColumn)
        if (!column) return 0
        
        // Helper function to get nested value
        const getNestedValue = (obj: any, path: string) => {
          return path.split('.').reduce((acc, part) => acc?.[part], obj)
        }
        
        // Get raw values for sorting
        let aValue = column.accessor ? column.accessor(a) : getNestedValue(a, column.key)
        let bValue = column.accessor ? column.accessor(b) : getNestedValue(b, column.key)
        
        // Handle null/undefined
        if (aValue === null || aValue === undefined) aValue = ''
        if (bValue === null || bValue === undefined) bValue = ''
        
        // Handle numbers
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === "asc" ? aValue - bValue : bValue - aValue
        }
        
        // Handle dates
        if (aValue instanceof Date && bValue instanceof Date) {
          return sortDirection === "asc" 
            ? aValue.getTime() - bValue.getTime() 
            : bValue.getTime() - aValue.getTime()
        }
        
        // Handle strings
        const aStr = String(aValue).toLowerCase()
        const bStr = String(bValue).toLowerCase()
        
        if (aStr < bStr) return sortDirection === "asc" ? -1 : 1
        if (aStr > bStr) return sortDirection === "asc" ? 1 : -1
        return 0
      })
    }

    return filtered
  }, [data, searchTerm, sortColumn, sortDirection, columns, columnFilters])

  const totalPages = Math.ceil((totalCount || processedData.length) / pageSize)
  const paginatedData = totalCount 
    ? processedData 
    : processedData.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(columnKey)
      setSortDirection("asc")
    }
  }

  const handleSelectAll = () => {
    if (selectedRows.size === paginatedData.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(paginatedData.map(item => item.id)))
    }
  }

  const handleSelectRow = (id: string | number) => {
    const newSelection = new Set(selectedRows)
    if (newSelection.has(id)) {
      newSelection.delete(id)
    } else {
      newSelection.add(id)
    }
    setSelectedRows(newSelection)
  }

  const handlePageChange = (page: number) => {
    if (onPageChange) {
      onPageChange(page)
    }
    setSelectedRows(new Set())
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Active Filters Display */}
      {Object.entries(columnFilters).some(([_, value]) => value) && (
        <div className="flex flex-wrap items-center gap-2 mb-2">
          <span className="text-sm text-muted-foreground">Aktivni filteri:</span>
          {Object.entries(columnFilters).map(([key, value]) => {
            if (!value) return null
            const column = columns.find(c => c.key === key)
            return (
              <Badge key={key} variant="secondary" className="gap-1">
                {column?.header}: {value}
                <button
                  onClick={() => {
                    setColumnFilters(prev => {
                      const updated = { ...prev }
                      delete updated[key]
                      return updated
                    })
                  }}
                  className="ml-1 hover:text-destructive"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            )
          })}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setColumnFilters({})}
            className="h-6 px-2 text-xs"
          >
            Obriši sve
          </Button>
        </div>
      )}
      
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4">
        {searchable && (
          <div className="flex-1 max-w-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pretraži..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        )}
        
        <div className="flex items-center gap-2">
          <Popover open={showFilterPopover} onOpenChange={setShowFilterPopover}>
            <PopoverTrigger asChild>
              <Button 
                variant="outline" 
                size="icon"
                className={cn(
                  Object.keys(columnFilters).some(key => columnFilters[key]) && "bg-primary text-primary-foreground hover:bg-primary/90"
                )}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-medium">Filtriraj kolone</h4>
                <div className="space-y-3">
                  {columns
                    .filter(column => column.filterable !== false)
                    .map((column) => (
                      <div key={column.key} className="space-y-2">
                        <Label className="text-sm font-medium">
                          {column.header}
                        </Label>
                        <Input
                          placeholder={`Filtriraj ${column.header.toLowerCase()}...`}
                          value={columnFilters[column.key] || ""}
                          onChange={(e) => {
                            setColumnFilters(prev => ({
                              ...prev,
                              [column.key]: e.target.value
                            }))
                          }}
                        />
                      </div>
                    ))}
                </div>
                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setColumnFilters({})}
                    disabled={Object.keys(columnFilters).every(key => !columnFilters[key])}
                  >
                    Obriši filtere
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setShowFilterPopover(false)}
                  >
                    Primeni
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Settings2 className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuLabel>Kolone</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {columns.map((column) => (
                <DropdownMenuItem key={column.key} onSelect={(e) => e.preventDefault()}>
                  <Checkbox
                    checked={visibleColumns.has(column.key)}
                    onCheckedChange={(checked) => {
                      const newVisible = new Set(visibleColumns)
                      if (checked) {
                        newVisible.add(column.key)
                      } else {
                        newVisible.delete(column.key)
                      }
                      setVisibleColumns(newVisible)
                    }}
                    className="mr-2"
                  />
                  {column.header}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedRows.size === paginatedData.length && paginatedData.length > 0}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
              )}
              {columns
                .filter(column => visibleColumns.has(column.key))
                .map((column) => (
                  <TableHead
                    key={column.key}
                    className={cn(
                      column.width,
                      column.align === "center" && "text-center",
                      column.align === "right" && "text-right",
                      column.sortable && "cursor-pointer select-none"
                    )}
                    onClick={() => column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-2">
                      {column.header}
                      {column.sortable && (
                        <ArrowUpDown 
                          className={cn(
                            "h-4 w-4",
                            sortColumn === column.key 
                              ? "text-foreground" 
                              : "text-muted-foreground opacity-50"
                          )}
                        />
                      )}
                    </div>
                  </TableHead>
                ))}
              {(actions || onView || onEdit || onDelete) && (
                <TableHead className="w-20">Akcije</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.filter(c => visibleColumns.has(c.key)).length +
                    (selectable ? 1 : 0) +
                    (actions || onView || onEdit || onDelete ? 1 : 0)
                  }
                  className="h-32 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              paginatedData.map((item) => (
                <ContextMenu key={item.id}>
                  <ContextMenuTrigger asChild>
                    <TableRow
                      className={cn(
                        selectedRows.has(item.id) && "bg-muted/50",
                        onView ? "cursor-pointer select-none hover:bg-muted/30" : "cursor-default"
                      )}
                      onDoubleClick={() => onView && onView(item)}
                    >
                      {selectable && (
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(item.id)}
                            onCheckedChange={() => handleSelectRow(item.id)}
                          />
                        </TableCell>
                      )}
                      {columns
                        .filter(column => visibleColumns.has(column.key))
                        .map((column) => (
                          <TableCell
                            key={column.key}
                            className={cn(
                              column.align === "center" && "text-center",
                              column.align === "right" && "text-right"
                            )}
                          >
                            {column.accessor ? column.accessor(item) : (item as any)[column.key]}
                          </TableCell>
                        ))}
                      {(actions || onView || onEdit || onDelete) && (
                        <TableCell>
                          {actions ? (
                            actions(item)
                          ) : (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {onView && (
                                  <DropdownMenuItem onClick={() => onView(item)}>
                                    <Eye className="mr-2 h-4 w-4" />
                                    Pregled
                                  </DropdownMenuItem>
                                )}
                                {onEdit && (
                                  <DropdownMenuItem onClick={() => onEdit(item)}>
                                    <Edit className="mr-2 h-4 w-4" />
                                    Izmeni
                                  </DropdownMenuItem>
                                )}
                                <DropdownMenuItem onClick={() => navigator.clipboard.writeText(item.id.toString())}>
                                  <Copy className="mr-2 h-4 w-4" />
                                  Kopiraj ID
                                </DropdownMenuItem>
                                <DropdownMenuItem>
                                  <Share2 className="mr-2 h-4 w-4" />
                                  Podeli
                                </DropdownMenuItem>
                                {onDelete && (
                                  <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      onClick={() => onDelete(item)}
                                      className="text-destructive"
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Obriši
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </TableCell>
                      )}
                    </TableRow>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-56">
                    {onView && (
                      <ContextMenuItem onClick={() => onView(item)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Pregled
                      </ContextMenuItem>
                    )}
                    {onEdit && (
                      <ContextMenuItem onClick={() => onEdit(item)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Izmeni
                      </ContextMenuItem>
                    )}
                    <ContextMenuItem onClick={() => navigator.clipboard.writeText(item.id.toString())}>
                      <Copy className="mr-2 h-4 w-4" />
                      Kopiraj ID
                    </ContextMenuItem>
                    <ContextMenuItem>
                      <Share2 className="mr-2 h-4 w-4" />
                      Podeli
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem 
                      onClick={() => {
                        if (selectedRows.has(item.id)) {
                          const newSelection = new Set(selectedRows)
                          newSelection.delete(item.id)
                          setSelectedRows(newSelection)
                        } else {
                          setSelectedRows(new Set(Array.from(selectedRows).concat([item.id])))
                        }
                      }}
                    >
                      <Checkbox className="mr-2 h-4 w-4" checked={selectedRows.has(item.id)} />
                      {selectedRows.has(item.id) ? 'Poništi izbor' : 'Označi'}
                    </ContextMenuItem>
                    {onDelete && (
                      <>
                        <ContextMenuSeparator />
                        <ContextMenuItem
                          onClick={() => onDelete(item)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash className="mr-2 h-4 w-4" />
                          Obriši
                        </ContextMenuItem>
                      </>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Prikazano {((currentPage - 1) * pageSize) + 1} - {Math.min(currentPage * pageSize, totalCount || processedData.length)} od {totalCount || processedData.length} rezultata
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            >
              <ChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-2">
              <span className="text-sm">Stranica</span>
              <Select
                value={String(currentPage)}
                onValueChange={(value) => handlePageChange(Number(value))}
              >
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <SelectItem key={page} value={String(page)}>
                      {page}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-sm">od {totalPages}</span>
            </div>
            
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            >
              <ChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}