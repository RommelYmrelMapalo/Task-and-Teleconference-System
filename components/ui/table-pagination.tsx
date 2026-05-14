type TablePaginationProps = {
  className?: string;
  currentPage: number;
  rowsPerPage: number;
  rowsPerPageOptions: readonly number[];
  totalPages: number;
  onNext: () => void;
  onPrevious: () => void;
  onRowsPerPageChange: (value: number) => void;
};

function PaginationChevronIcon({ direction }: { direction: "down" | "left" | "right" }) {
  const path =
    direction === "left" ? "m14 7-5 5 5 5" : direction === "right" ? "m10 7 5 5-5 5" : "m7 10 5 5 5-5";

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d={path}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function TablePagination({
  className,
  currentPage,
  rowsPerPage,
  rowsPerPageOptions,
  totalPages,
  onNext,
  onPrevious,
  onRowsPerPageChange,
}: TablePaginationProps) {
  const rootClassName = ["table-pagination", className].filter(Boolean).join(" ");

  return (
    <div className={rootClassName}>
      <div className="table-pagination-rows">
        <span>Rows per page</span>
        <label className="table-pagination-select">
          <select
            value={rowsPerPage}
            onChange={(event) => onRowsPerPageChange(Number(event.target.value))}
            aria-label="Rows per page"
          >
            {rowsPerPageOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          <span className="table-pagination-select-icon">
            <PaginationChevronIcon direction="down" />
          </span>
        </label>
      </div>

      <div className="table-pagination-actions" aria-label={`Page ${currentPage} of ${totalPages}`}>
        <button
          type="button"
          className="table-pagination-button"
          onClick={onPrevious}
          disabled={currentPage === 1}
          aria-label="Previous page"
        >
          <PaginationChevronIcon direction="left" />
          <span>Previous</span>
        </button>
        <button
          type="button"
          className="table-pagination-button"
          onClick={onNext}
          disabled={currentPage === totalPages}
          aria-label="Next page"
        >
          <span>Next</span>
          <PaginationChevronIcon direction="right" />
        </button>
      </div>
    </div>
  );
}
