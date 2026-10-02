import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export type PageSizeOption = 10 | 20 | 30 | 40 | 'ALL';

interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: PageSizeOption;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: PageSizeOption) => void;
  itemName?: string;
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  itemName = 'rekodi',
}) => {
  const isAll = pageSize === 'ALL';
  const effectiveSize = isAll ? Math.max(totalItems, 1) : pageSize;
  const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalItems / effectiveSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startItem = totalItems === 0 ? 0 : isAll ? 1 : (safeCurrentPage - 1) * effectiveSize + 1;
  const endItem = isAll ? totalItems : Math.min(safeCurrentPage * effectiveSize, totalItems);

  // Generate visible page numbers (max 5)
  const getPageNumbers = () => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (safeCurrentPage <= 3) {
      return [1, 2, 3, 4, 5];
    }
    if (safeCurrentPage >= totalPages - 2) {
      return [totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [
      safeCurrentPage - 2,
      safeCurrentPage - 1,
      safeCurrentPage,
      safeCurrentPage + 1,
      safeCurrentPage + 2,
    ];
  };

  const pageNumbers = getPageNumbers();
  const PAGE_SIZE_OPTIONS: PageSizeOption[] = [10, 20, 30, 40, 'ALL'];

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 bg-white border-t border-slate-200 text-xs">
      {/* Page Size Selector & Range Text */}
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-slate-500">
          <span className="font-semibold text-slate-600">Safu (Rows):</span>
          <div className="inline-flex rounded-lg bg-slate-100 p-0.5 border border-slate-200">
            {PAGE_SIZE_OPTIONS.map((opt) => {
              const active = pageSize === opt;
              return (
                <button
                  key={String(opt)}
                  type="button"
                  onClick={() => {
                    onPageSizeChange(opt);
                    onPageChange(1);
                  }}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                  }`}
                >
                  {opt === 'ALL' ? 'Zote (All)' : opt}
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-slate-300 hidden sm:inline">|</span>

        <span className="text-slate-600 font-medium">
          {totalItems === 0 ? (
            'Hakuna rekodi'
          ) : isAll ? (
            <>
              Inaonyesha zote <strong className="text-slate-900 font-bold">{totalItems}</strong> {itemName}
            </>
          ) : (
            <>
              Inaonyesha <strong className="text-slate-900 font-bold">{startItem}</strong> –{' '}
              <strong className="text-slate-900 font-bold">{endItem}</strong> kati ya{' '}
              <strong className="text-slate-900 font-bold">{totalItems}</strong> {itemName}
            </>
          )}
        </span>
      </div>

      {/* Pagination Controls */}
      {!isAll && totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First Page */}
          <button
            type="button"
            disabled={safeCurrentPage === 1}
            onClick={() => onPageChange(1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
            title="Ukurasa wa Kwanza"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            disabled={safeCurrentPage === 1}
            onClick={() => onPageChange(safeCurrentPage - 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
            title="Ukurasa Uliotangulia"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>

          {/* Numeric Page Buttons */}
          <div className="flex items-center gap-1 px-1">
            {pageNumbers[0] > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => onPageChange(1)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center transition cursor-pointer"
                >
                  1
                </button>
                {pageNumbers[0] > 2 && <span className="text-slate-400 px-0.5">...</span>}
              </>
            )}

            {pageNumbers.map((num) => {
              const active = num === safeCurrentPage;
              return (
                <button
                  key={num}
                  type="button"
                  onClick={() => onPageChange(num)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center transition cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'border border-slate-200 bg-white hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  {num}
                </button>
              );
            })}

            {pageNumbers[pageNumbers.length - 1] < totalPages && (
              <>
                {pageNumbers[pageNumbers.length - 1] < totalPages - 1 && (
                  <span className="text-slate-400 px-0.5">...</span>
                )}
                <button
                  type="button"
                  onClick={() => onPageChange(totalPages)}
                  className="w-7 h-7 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center transition cursor-pointer"
                >
                  {totalPages}
                </button>
              </>
            )}
          </div>

          {/* Next Page */}
          <button
            type="button"
            disabled={safeCurrentPage === totalPages}
            onClick={() => onPageChange(safeCurrentPage + 1)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
            title="Ukurasa Unaofuata"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {/* Last Page */}
          <button
            type="button"
            disabled={safeCurrentPage === totalPages}
            onClick={() => onPageChange(totalPages)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white text-slate-600 transition cursor-pointer disabled:cursor-not-allowed"
            title="Ukurasa wa Mwisho"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};
