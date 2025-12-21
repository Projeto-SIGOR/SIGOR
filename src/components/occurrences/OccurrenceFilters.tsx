import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Filter, Calendar as CalendarIcon, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  statusLabels,
  priorityLabels,
  occurrenceTypeLabels,
  OccurrenceStatus,
  PriorityLevel,
  OccurrenceType,
} from '@/types/sigor';

export interface OccurrenceFiltersState {
  search: string;
  status: string;
  priority: string;
  type: string;
  organizationId: string;
  dateFrom: Date | undefined;
  dateTo: Date | undefined;
}

interface OccurrenceFiltersProps {
  filters: OccurrenceFiltersState;
  onFiltersChange: (filters: OccurrenceFiltersState) => void;
  organizations?: { id: string; name: string }[];
}

export function OccurrenceFilters({
  filters,
  onFiltersChange,
  organizations = [],
}: OccurrenceFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = (key: keyof OccurrenceFiltersState, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      search: '',
      status: 'all',
      priority: 'all',
      type: 'all',
      organizationId: 'all',
      dateFrom: undefined,
      dateTo: undefined,
    });
  };

  const activeFiltersCount = [
    filters.status !== 'all',
    filters.priority !== 'all',
    filters.type !== 'all',
    filters.organizationId !== 'all',
    filters.dateFrom !== undefined,
    filters.dateTo !== undefined,
  ].filter(Boolean).length;

  return (
    <div className="space-y-4">
      {/* Search and Toggle */}
      <div className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por código, título ou endereço..."
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button
          variant={isExpanded ? 'default' : 'outline'}
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2"
        >
          <Filter className="h-4 w-4" />
          Filtros
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>

        {activeFiltersCount > 0 && (
          <Button variant="ghost" onClick={clearFilters} className="gap-2">
            <X className="h-4 w-4" />
            Limpar
          </Button>
        )}
      </div>

      {/* Expanded Filters */}
      {isExpanded && (
        <Card>
          <CardContent className="pt-4">
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status */}
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={filters.status}
                  onValueChange={(value) => updateFilter('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os status</SelectItem>
                    {Object.entries(statusLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select
                  value={filters.priority}
                  onValueChange={(value) => updateFilter('priority', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as prioridades" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as prioridades</SelectItem>
                    {Object.entries(priorityLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Type */}
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => updateFilter('type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(occurrenceTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Organization */}
              <div className="space-y-2">
                <Label>Organização</Label>
                <Select
                  value={filters.organizationId}
                  onValueChange={(value) => updateFilter('organizationId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as organizações" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as organizações</SelectItem>
                    {organizations.map((org) => (
                      <SelectItem key={org.id} value={org.id}>
                        {org.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date From */}
              <div className="space-y-2">
                <Label>Data Inicial</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateFrom ? (
                        format(filters.dateFrom, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        <span className="text-muted-foreground">Selecionar</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => updateFilter('dateFrom', date)}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Date To */}
              <div className="space-y-2">
                <Label>Data Final</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {filters.dateTo ? (
                        format(filters.dateTo, 'dd/MM/yyyy', { locale: ptBR })
                      ) : (
                        <span className="text-muted-foreground">Selecionar</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
                      onSelect={(date) => updateFilter('dateTo', date)}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Filters Tags */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap gap-2">
          {filters.status !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Status: {statusLabels[filters.status as OccurrenceStatus]}
              <button onClick={() => updateFilter('status', 'all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.priority !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Prioridade: {priorityLabels[filters.priority as PriorityLevel]}
              <button onClick={() => updateFilter('priority', 'all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.type !== 'all' && (
            <Badge variant="secondary" className="gap-1">
              Tipo: {occurrenceTypeLabels[filters.type as OccurrenceType]}
              <button onClick={() => updateFilter('type', 'all')}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateFrom && (
            <Badge variant="secondary" className="gap-1">
              De: {format(filters.dateFrom, 'dd/MM/yyyy', { locale: ptBR })}
              <button onClick={() => updateFilter('dateFrom', undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
          {filters.dateTo && (
            <Badge variant="secondary" className="gap-1">
              Até: {format(filters.dateTo, 'dd/MM/yyyy', { locale: ptBR })}
              <button onClick={() => updateFilter('dateTo', undefined)}>
                <X className="h-3 w-3" />
              </button>
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
