import { useState, useMemo, useCallback } from 'react';

export interface PaginationState {
    page: number;
    pageSize: number;
}

export interface UsePaginationOptions {
    totalItems: number;
    initialPage?: number;
    pageSize?: number;
}

export interface UsePaginationReturn {
    pagination: PaginationState;
    totalPages: number;
    startIndex: number;
    endIndex: number;
    setPage: (page: number) => void;
    setPageSize: (pageSize: number) => void;
    goToNextPage: () => void;
    goToPreviousPage: () => void;
    goToFirstPage: () => void;
    goToLastPage: () => void;
    getPageItems: <T>(items: T[]) => T[];
}

export const DEFAULT_PAGE_SIZE = 50;

export function usePagination(options: UsePaginationOptions): UsePaginationReturn {
    const { totalItems, initialPage = 1, pageSize = DEFAULT_PAGE_SIZE } = options;

    const [pagination, setPagination] = useState<PaginationState>({
        page: initialPage,
        pageSize,
    });

    const totalPages = useMemo(() => {
        return Math.ceil(totalItems / pagination.pageSize);
    }, [totalItems, pagination.pageSize]);

    const startIndex = useMemo(() => {
        return (pagination.page - 1) * pagination.pageSize;
    }, [pagination.page, pagination.pageSize]);

    const endIndex = useMemo(() => {
        return Math.min(startIndex + pagination.pageSize, totalItems);
    }, [startIndex, pagination.pageSize, totalItems]);

    const setPage = useCallback((page: number) => {
        setPagination((prev) => ({
            ...prev,
            page: Math.max(1, Math.min(page, totalPages)),
        }));
    }, [totalPages]);

    const setPageSize = useCallback((pageSize: number) => {
        setPagination({
            pageSize,
            page: 1, // Reset to first page when page size changes
        });
    }, []);

    const goToNextPage = useCallback(() => {
        setPagination((prev) => ({
            ...prev,
            page: Math.min(prev.page + 1, totalPages),
        }));
    }, [totalPages]);

    const goToPreviousPage = useCallback(() => {
        setPagination((prev) => ({
            ...prev,
            page: Math.max(prev.page - 1, 1),
        }));
    }, []);

    const goToFirstPage = useCallback(() => {
        setPagination((prev) => ({
            ...prev,
            page: 1,
        }));
    }, []);

    const goToLastPage = useCallback(() => {
        setPagination((prev) => ({
            ...prev,
            page: totalPages,
        }));
    }, [totalPages]);

    const getPageItems = useCallback(<T,>(items: T[]): T[] => {
        return items.slice(startIndex, endIndex);
    }, [startIndex, endIndex]);

    return {
        pagination,
        totalPages,
        startIndex,
        endIndex,
        setPage,
        setPageSize,
        goToNextPage,
        goToPreviousPage,
        goToFirstPage,
        goToLastPage,
        getPageItems,
    };
}
