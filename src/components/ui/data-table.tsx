import { useMemo, useState } from "react";
import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
} from "@mui/material";

export interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  className?: string;
  width?: number;
  minWidth?: number;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  getRowId?: (row: T) => string | number;
}

function getCellValue<T>(row: T, accessor: keyof T | ((row: T) => React.ReactNode)) {
  if (typeof accessor === "function") {
    return accessor(row);
  }
  return row[accessor] as React.ReactNode;
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  actions,
  getRowId,
}: DataTableProps<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const visibleRows = useMemo(() => {
    const start = page * rowsPerPage;
    return data.slice(start, start + rowsPerPage);
  }, [data, page, rowsPerPage]);

  const handlePageChange = (_event: unknown, nextPage: number) => {
    setPage(nextPage);
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(Number(event.target.value));
    setPage(0);
  };

  return (
    <Box
      sx={{
        border: "1px solid rgba(0, 0, 0, 0.08)",
        borderRadius: "12px",
        overflow: "hidden",
        backgroundColor: "#fff",
      }}
    >
      <TableContainer>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: "rgba(0, 0, 0, 0.02)" }}>
              {columns.map((column) => (
                <TableCell
                  key={column.header}
                  sx={{
                    width: column.width,
                    minWidth: column.minWidth ?? 100,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "rgba(0, 0, 0, 0.6)",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                    letterSpacing: "0.05em",
                  }}
                >
                  {column.header}
                </TableCell>
              ))}
              {actions && (
                <TableCell
                  align="right"
                  sx={{
                    width: 120,
                    minWidth: 100,
                    fontWeight: 600,
                    fontSize: "0.75rem",
                    textTransform: "uppercase",
                    color: "rgba(0, 0, 0, 0.6)",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                    letterSpacing: "0.05em",
                  }}
                >
                  Actions
                </TableCell>
              )}
            </TableRow>
          </TableHead>

          <TableBody>
            {visibleRows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columns.length + (actions ? 1 : 0)}
                  sx={{
                    py: 6,
                    textAlign: "center",
                    color: "text.secondary",
                    borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                  }}
                >
                  No records found.
                </TableCell>
              </TableRow>
            ) : (
              visibleRows.map((row, index) => {
                const rowId = getRowId
                  ? getRowId(row)
                  : row.id !== undefined && row.id !== null
                    ? row.id
                    : index;

                return (
                  <TableRow
                    hover
                    key={rowId}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    sx={{
                      cursor: onRowClick ? "pointer" : "default",
                      transition: "background-color 0.15s ease",
                      "&:hover": {
                        backgroundColor: onRowClick
                          ? "rgba(22, 100, 29, 0.04)"
                          : "inherit",
                      },
                    }}
                  >
                    {columns.map((column) => {
                      const value = getCellValue(row, column.accessor);

                      return (
                        <TableCell
                          key={`${rowId}-${column.header}`}
                          sx={{
                            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                            padding: "16px",
                            verticalAlign: "middle",
                          }}
                        >
                          {column.className ? (
                            <div className={column.className}>{value ?? ""}</div>
                          ) : (
                            value ?? ""
                          )}
                        </TableCell>
                      );
                    })}

                    {actions && (
                      <TableCell
                        align="right"
                        sx={{
                          borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
                          padding: "16px",
                          verticalAlign: "middle",
                        }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        {actions(row)}
                      </TableCell>
                    )}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={data.length}
        page={page}
        onPageChange={handlePageChange}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={handleRowsPerPageChange}
        rowsPerPageOptions={[10, 25, 50]}
        sx={{
          borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
            fontSize: "0.875rem",
          },
        }}
      />
    </Box>
  );
}
