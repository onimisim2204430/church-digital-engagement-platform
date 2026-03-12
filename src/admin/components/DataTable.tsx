/**
 * Enterprise DataTable Component
 * Professional table with search, sort, pagination, and status badges
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  SearchIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
  FilterIcon,
  MoreVerticalIcon
} from './Icons';
import './DataTable.css';

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  render?: (value: any, row: T, index: number) => React.ReactNode;
  width?: string;
  align?: 'left' | 'center' | 'right';
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  searchable?: boolean;
  searchPlaceholder?: string;
  itemsPerPage?: number;
  onRowClick?: (row: T, index: number) => void;
  actions?: (row: T, index: number) => React.ReactNode;
  loading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function DataTable<T extends Record<string, any>>({
  data,
  columns,
  searchable = true,
  searchPlaceholder = 'Search...',
  itemsPerPage = 10,
  onRowClick,
  actions,
  loading = false,
  emptyMessage = 'No data available',
  className = ''
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter data by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return data;

    const query = searchQuery.toLowerCase();
    return data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [data, searchQuery]);

  // Sort data
  const sortedData = useMemo(() => {
    if (!sortColumn) return filteredData;

    return [...filteredData].sort((a, b) => {
      const aVal = a[sortColumn];
      const bVal = b[sortColumn];

      if (aVal === bVal) return 0;
      
      const comparison = aVal > bVal ? 1 : -1;
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortColumn, sortDirection]);

  // Paginate data
  const totalPages = Math.ceil(sortedData.length / itemsPerPage);
  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedData.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedData, currentPage, itemsPerPage]);

  // Handle sort
  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  // Handle page change
  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const renderSortIcon = (columnKey: string) => {
    if (sortColumn !== columnKey) return null;
    return sortDirection === 'asc' ? (
      <ChevronUpIcon size={16} />
    ) : (
      <ChevronDownIcon size={16} />
    );
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, sortedData.length);

  return (
    <div className={`datatable-container ${className}`}>
      {/* Header */}
      {searchable && (
        <div className="datatable-header">
          <div className="datatable-search">
            <SearchIcon size={18} />
            <input
              type="text"
              className="datatable-search-input"
              placeholder={searchPlaceholder}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          <button className="datatable-filter-btn" title="Filters">
            <FilterIcon size={18} />
            <span>Filters</span>
          </button>
        </div>
      )}

      {/* Table */}
      <div className="datatable-wrapper">
        <table className="datatable">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  style={{ width: column.width, textAlign: column.align || 'left' }}
                  className={column.sortable ? 'sortable' : ''}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="th-content">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <span className="sort-icon">
                        {renderSortIcon(column.key)}
                      </span>
                    )}
                  </div>
                </th>
              ))}
              {actions && <th style={{ width: '60px' }}></th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="datatable-loading">
                  <div className="loading-spinner"></div>
                  <span>Loading...</span>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (actions ? 1 : 0)} className="datatable-empty">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, index) => (
                <tr
                  key={index}
                  className={onRowClick ? 'clickable' : ''}
                  onClick={() => onRowClick?.(row, index)}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      style={{ textAlign: column.align || 'left' }}
                    >
                      {column.render
                        ? column.render(row[column.key], row, index)
                        : row[column.key]}
                    </td>
                  ))}
                  {actions && (
                    <td className="datatable-actions-cell">
                      {actions(row, index)}
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Footer / Pagination */}
      {!loading && sortedData.length > 0 && (
        <div className="datatable-footer">
          <div className="datatable-info">
            Showing {startItem} to {endItem} of {sortedData.length} results
          </div>
          <div className="datatable-pagination">
            <button
              className="pagination-btn"
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              title="First page"
            >
              <ChevronsLeftIcon size={16} />
            </button>
            <button
              className="pagination-btn"
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              title="Previous page"
            >
              <ChevronLeftIcon size={16} />
            </button>
            
            <div className="pagination-pages">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => {
                  // Show first, last, current, and 2 pages around current
                  return (
                    page === 1 ||
                    page === totalPages ||
                    Math.abs(page - currentPage) <= 1
                  );
                })
                .map((page, index, array) => {
                  // Add ellipsis
                  const prevPage = array[index - 1];
                  const showEllipsis = prevPage && page - prevPage > 1;

                  return (
                    <React.Fragment key={page}>
                      {showEllipsis && <span className="pagination-ellipsis">...</span>}
                      <button
                        className={`pagination-page ${page === currentPage ? 'active' : ''}`}
                        onClick={() => goToPage(page)}
                      >
                        {page}
                      </button>
                    </React.Fragment>
                  );
                })}
            </div>

            <button
              className="pagination-btn"
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              title="Next page"
            >
              <ChevronRightIcon size={16} />
            </button>
            <button
              className="pagination-btn"
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              title="Last page"
            >
              <ChevronsRightIcon size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Status Badge Component
interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, variant = 'default' }) => (
  <span className={`status-badge status-${variant}`}>{status}</span>
);

// Action Menu Component
interface ActionMenuProps {
  actions: Array<{
    label: string;
    onClick: () => void;
    icon?: React.ReactNode;
    danger?: boolean;
  }>;
}

export const ActionMenu: React.FC<ActionMenuProps> = ({ actions }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [dropdownStyles, setDropdownStyles] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Calculate immediately
      calculatePosition();
      
      // Recalculate on next frame to get accurate dropdown height after render
      requestAnimationFrame(() => calculatePosition());
      
      // Add scroll listener to recalculate position on scroll
      const handleScroll = () => calculatePosition();
      const handleResize = () => calculatePosition();
      
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }
    return undefined;
  }, [isOpen]);

  const calculatePosition = () => {
    if (!triggerRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const dropdownWidth = 180;
    const dropdownHeight = dropdownRef.current?.offsetHeight || 200;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;
    const padding = 10;

    // Calculate available space
    const spaceBelow = viewportHeight - triggerRect.bottom;
    const spaceAbove = triggerRect.top;
    const spaceRight = viewportWidth - triggerRect.right;
    const spaceLeft = triggerRect.left;

    // Determine vertical positioning
    let top: number;
    if (spaceBelow >= dropdownHeight + padding) {
      // Open downward
      top = triggerRect.bottom + 4;
    } else if (spaceAbove >= dropdownHeight + padding) {
      // Open upward
      top = triggerRect.top - dropdownHeight - 4;
    } else {
      // Not enough space either way - position to maximize visibility
      top = spaceBelow > spaceAbove 
        ? triggerRect.bottom + 4 
        : Math.max(padding, triggerRect.top - dropdownHeight - 4);
    }

    // Determine horizontal positioning
    let left: number;
    if (spaceRight >= dropdownWidth + padding) {
      // Align to right of trigger
      left = triggerRect.right - dropdownWidth;
    } else if (spaceLeft >= dropdownWidth + padding) {
      // Align to left of trigger
      left = triggerRect.left;
    } else {
      // Not enough space - align to left edge with padding
      left = Math.max(padding, Math.min(
        triggerRect.right - dropdownWidth,
        viewportWidth - dropdownWidth - padding
      ));
    }

    // Ensure dropdown stays within viewport bounds
    top = Math.max(padding, Math.min(top, viewportHeight - dropdownHeight - padding));
    left = Math.max(padding, Math.min(left, viewportWidth - dropdownWidth - padding));

    setDropdownStyles({
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      minWidth: `${dropdownWidth}px`,
      maxHeight: `${Math.min(300, viewportHeight - top - padding)}px`,
      zIndex: 9999,
    });
  };

  return (
    <>
      <div className="action-menu">
        <button
          ref={triggerRef}
          className="action-menu-trigger"
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(!isOpen);
          }}
        >
          <MoreVerticalIcon size={16} />
        </button>
      </div>
      {isOpen && createPortal(
        <>
          <div className="action-menu-overlay" onClick={() => setIsOpen(false)} />
          <div
            ref={dropdownRef}
            className="action-menu-dropdown-portal"
            style={dropdownStyles}
          >
            {actions.map((action, index) => (
              <button
                key={index}
                className={`action-menu-item ${action.danger ? 'danger' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  action.onClick();
                  setIsOpen(false);
                }}
              >
                {action.icon && <span className="action-icon">{action.icon}</span>}
                <span>{action.label}</span>
              </button>
            ))}
          </div>
        </>,
        document.body
      )}
    </>
  );
};

export default DataTable;
