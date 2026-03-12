import React from 'react';
import { Button } from '@complianceos/ui/ui/button';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    startIndex: number;
    endIndex: number;
    pageSize: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (pageSize: number) => void;
    pageSizeOptions?: number[];
}

export function Pagination({
    currentPage,
    totalPages,
    totalItems,
    startIndex,
    endIndex,
    pageSize,
    onPageChange,
    onPageSizeChange,
    pageSizeOptions = [25, 50, 100, 200],
}: PaginationProps) {
    if (totalItems === 0) {
        return null;
    }

    // Don't show pagination if there's only 1 page
    if (totalPages <= 1) {
        return (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{totalItems}</span> {totalItems === 1 ? 'item' : 'items'}
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-4 py-3 border-t border-gray-200 bg-white">
            {/* Page info and page size selector */}
            <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                    Showing <span className="font-medium">{startIndex + 1}</span> to{' '}
                    <span className="font-medium">{endIndex}</span> of{' '}
                    <span className="font-medium">{totalItems}</span> results
                </div>

                {onPageSizeChange && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Per page:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        >
                            {pageSizeOptions.map((size) => (
                                <option key={size} value={size}>
                                    {size}
                                </option>
                            ))}
                        </select>
                    </div>
                )}
            </div>

            {/* Page navigation */}
            <div className="flex items-center gap-1">
                {/* First page button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                    title="First page"
                >
                    <ChevronsLeft className="h-4 w-4" />
                </Button>

                {/* Previous page button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 w-8 p-0"
                    title="Previous page"
                >
                    <ChevronLeft className="h-4 w-4" />
                </Button>

                {/* Page numbers */}
                <div className="flex items-center gap-1 mx-2">
                    {(() => {
                        const pages: (number | string)[] = [];
                        const maxVisible = 5;

                        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                        let end = Math.min(totalPages, start + maxVisible - 1);

                        if (end - start + 1 < maxVisible) {
                            start = Math.max(1, end - maxVisible + 1);
                        }

                        if (start > 1) {
                            pages.push(1);
                            if (start > 2) {
                                pages.push('...');
                            }
                        }

                        for (let i = start; i <= end; i++) {
                            pages.push(i);
                        }

                        if (end < totalPages) {
                            if (end < totalPages - 1) {
                                pages.push('...');
                            }
                            pages.push(totalPages);
                        }

                        return pages.map((page, index) => {
                            if (page === '...') {
                                return (
                                    <span key={`ellipsis-${index}`} className="px-2 text-muted-foreground">
                                        ...
                                    </span>
                                );
                            }

                            const pageNum = page as number;
                            const isActive = pageNum === currentPage;

                            return (
                                <Button
                                    key={pageNum}
                                    variant={isActive ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => onPageChange(pageNum)}
                                    className={`h-8 w-8 p-0 ${isActive ? 'bg-[#1C4D8D] hover:bg-[#1C4D8D]/90' : ''}`}
                                >
                                    {pageNum}
                                </Button>
                            );
                        });
                    })()}
                </div>

                {/* Next page button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Next page"
                >
                    <ChevronRight className="h-4 w-4" />
                </Button>

                {/* Last page button */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onPageChange(totalPages)}
                    disabled={currentPage === totalPages}
                    className="h-8 w-8 p-0"
                    title="Last page"
                >
                    <ChevronsRight className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}

export default Pagination;
