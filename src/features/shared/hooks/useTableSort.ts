import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export type SortConfig = {
  key: string;
  direction: SortDirection;
};

export function useTableSort<T>(data: T[], defaultSort?: { key: keyof T; direction: SortDirection }) {
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(
    defaultSort ? { key: String(defaultSort.key), direction: defaultSort.direction } : null
  );

  const sortedData = useMemo(() => {
    if (!sortConfig || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = (a as Record<string, unknown>)[sortConfig.key];
      const bValue = (b as Record<string, unknown>)[sortConfig.key];

      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return sortConfig.direction === 'asc' ? -1 : 1;
      if (bValue == null) return sortConfig.direction === 'asc' ? 1 : -1;

      // Handle different data types
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortConfig.direction === 'asc' 
          ? aValue.localeCompare(bValue, 'pt-BR')
          : bValue.localeCompare(aValue, 'pt-BR');
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortConfig.direction === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Fallback to string comparison
      const aStr = String(aValue);
      const bStr = String(bValue);
      return sortConfig.direction === 'asc' 
        ? aStr.localeCompare(bStr, 'pt-BR')
        : bStr.localeCompare(aStr, 'pt-BR');
    });
  }, [data, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(prevConfig => {
      if (prevConfig?.key === key) {
        // Cycle through: asc -> desc -> null -> asc
        if (prevConfig.direction === 'asc') {
          return { key, direction: 'desc' };
        } else if (prevConfig.direction === 'desc') {
          return null;
        }
      }
      return { key, direction: 'asc' };
    });
  };

  const getSortDirection = (key: string): SortDirection => {
    return sortConfig?.key === key ? sortConfig.direction : null;
  };

  const getSortIcon = (key: string): string => {
    const direction = getSortDirection(key);
    switch (direction) {
      case 'asc': return '↑';
      case 'desc': return '↓';
      default: return '↕';
    }
  };

  return {
    sortedData,
    sortConfig,
    handleSort,
    getSortDirection,
    getSortIcon,
  };
}
