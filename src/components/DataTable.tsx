import React, { useState, useMemo } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';

export interface Column<T> {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  className?: string;
}

export interface DataTableProps<T> {
  id?: string;
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchKeys?: (keyof T | string)[];
  pageSize?: number;
}

export function DataTable<T extends { id: string }>({
  id,
  data,
  columns,
  emptyMessage = 'Aucune donnée disponible',
  searchable = true,
  searchPlaceholder = 'Rechercher...',
  searchKeys,
  pageSize = 15,
}: DataTableProps<T>) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    if (!searchTerm.trim()) return data;
    const query = searchTerm.toLowerCase().trim();

    return data.filter((item) => {
      if (searchKeys && searchKeys.length > 0) {
        return searchKeys.some((k) => {
          const val = (item as any)[k];
          return val != null && String(val).toLowerCase().includes(query);
        });
      }

      // Par défaut, cherche dans toutes les valeurs de l'objet
      return Object.values(item).some((val) => {
        return val != null && String(val).toLowerCase().includes(query);
      });
    });
  }, [data, searchTerm, searchKeys]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / pageSize));
  const currentSafePage = Math.min(currentPage, totalPages);

  const paginatedData = useMemo(() => {
    const startIndex = (currentSafePage - 1) * pageSize;
    return filteredData.slice(startIndex, startIndex + pageSize);
  }, [filteredData, currentSafePage, pageSize]);

  return (
    <div id={id} className="space-y-3">
      {searchable && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              placeholder={searchPlaceholder}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-xs"
            />
          </div>
          <span className="text-xs text-gray-500 font-medium self-center sm:self-auto">
            {filteredData.length} élément{filteredData.length > 1 ? 's' : ''} trouvé{filteredData.length > 1 ? 's' : ''}
          </span>
        </div>
      )}

      {filteredData.length === 0 ? (
        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/50 text-gray-500">
          <p className="text-sm font-medium">{emptyMessage}</p>
          {searchTerm && (
            <p className="text-xs text-gray-400 mt-1">
              Aucun résultat pour "{searchTerm}". Essayez un autre mot-clé.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/80">
                <tr>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.className || ''}`}
                    >
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {paginatedData.map((row) => (
                  <tr key={row.id} className="hover:bg-blue-50/40 transition-colors">
                    {columns.map((col, i) => (
                      <td
                        key={i}
                        className={`px-4 py-3 text-sm text-gray-700 whitespace-nowrap ${col.className || ''}`}
                      >
                        {col.render 
                          ? col.render(row) 
                          : String((row as any)[col.key] ?? '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {totalPages > 1 && (
            <div className="px-4 py-3 bg-gray-50/60 border-t border-gray-200 flex items-center justify-between text-xs text-gray-600">
              <span>
                Page {currentSafePage} sur {totalPages} ({(currentSafePage - 1) * pageSize + 1} - {Math.min(currentSafePage * pageSize, filteredData.length)} sur {filteredData.length})
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={currentSafePage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Page précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  disabled={currentSafePage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-1.5 rounded-md hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  title="Page suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
