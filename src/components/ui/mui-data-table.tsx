import { DataGrid, GridColDef, GridRenderCellParams, GridActionsColDef } from "@mui/x-data-grid";
import { ReactElement } from "react";

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

function getCellValue(row: any, accessor: keyof any | ((row: any) => React.ReactNode)): React.ReactNode {
  if (typeof accessor === "function") {
    return accessor(row);
  }
  return row[accessor];
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  actions,
  getRowId,
}: DataTableProps<T>) {
  const muiColumns: (GridColDef | GridActionsColDef)[] = [
    ...columns.map((col): GridColDef => ({
      field: col.accessor.toString().replace(/\(\)/g, ""),
      headerName: col.header,
      width: col.width ?? 180,
      minWidth: col.minWidth ?? 100,
      sortable: true,
      resizable: true,
      renderCell: (params: GridRenderCellParams) => {
        const value = getCellValue(params.row, col.accessor);
        if (col.className) {
          return <div className={col.className}>{value ?? ""}</div>;
        }
        return value ?? "";
      },
    })),
    ...(actions
      ? [
          {
            field: "actions",
            headerName: "Actions",
            width: 120,
            minWidth: 100,
            sortable: false,
            filterable: false,
            disableColumnMenu: true,
            renderCell: (params: GridRenderCellParams) => (
              <div className="text-right">{actions(params.row as T)}</div>
            ),
            align: "right",
            headerAlign: "right",
          } as GridActionsColDef,
        ]
      : []),
  ];

  return (
    <div style={{ width: "100%", height: "100%", minHeight: "400px" }}>
      <DataGrid
        rows={data.map((row, i) => ({
          ...row,
          id: getRowId ? getRowId(row) : (row.id !== undefined && row.id !== null ? row.id : i),
        }))}
        columns={muiColumns}
        getRowId={(row) => row.id}
        onRowClick={onRowClick ? (params) => onRowClick(params.row as T) : undefined}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        sx={{
          border: 0,
          borderRadius: "12px",
          "& .MuiDataGrid-row": {
            cursor: onRowClick ? "pointer" : "default",
            transition: "background-color 0.15s ease",
            "&:hover": {
              backgroundColor: "rgba(22, 100, 29, 0.04) !important",
            },
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            color: "rgba(0, 0, 0, 0.6)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
            padding: "16px",
            display: "flex",
            alignItems: "center",
          },
          "& .MuiDataGrid-footerContainer": {
            borderTop: "1px solid rgba(0, 0, 0, 0.08)",
          },
          "& .MuiTablePagination-root": {
            fontSize: "0.875rem",
          },
          "& .MuiIconButton-root": {
            color: "rgba(0, 0, 0, 0.54)",
          },
        }}
        disableColumnMenu
        autoHeight
        pagination
      />
    </div>
  );
}


interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (row: T) => void;
  actions?: (row: T) => React.ReactNode;
  getRowId?: (row: T) => string | number;
}

function getValue(row: any, accessor: keyof any | ((row: any) => React.ReactNode)) {
  if (typeof accessor === "function") {
    return accessor(row);
  }
  return row[accessor];
}

export function DataTable<T extends { id?: string | number }>({
  columns,
  data,
  onRowClick,
  actions,
  getRowId,
}: DataTableProps<T>) {
  const muiColumns: GridColDef[] = [
    ...columns.map((col, index) => ({
      field: col.accessor.toString(),
      headerName: col.header,
      width: col.width ?? 180,
      minWidth: col.minWidth ?? 100,
      sortable: true,
      renderCell: (params: GridRenderCellParams) => {
        const value = getValue(params.row, col.accessor);
        if (col.className) {
          return <div className={col.className}>{value}</div>;
        }
        return value ?? "";
      },
    })),
    ...(actions
      ? [
          {
            field: "actions",
            headerName: "Actions",
            width: 120,
            sortable: false,
            filterable: false,
            renderCell: (params: GridRenderCellParams) => (
              <div className="text-right">{actions(params.row as T)}</div>
            ),
            align: "right",
            headerAlign: "right",
          } as GridColDef,
        ]
      : []),
  ];

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <MUIDataTable
        rows={data.map((row, i) => ({
          ...row,
          id: getRowId ? getRowId(row) : row.id ?? i,
        }))}
        columns={muiColumns}
        getRowId={(row) => row.id}
        onRowClick={onRowClick ? (params) => onRowClick(params.row as T) : undefined}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        sx={{
          "& .MuiDataGrid-row": {
            cursor: onRowClick ? "pointer" : "default",
            "&:hover": {
              backgroundColor: "rgba(22, 100, 29, 0.04)",
            },
          },
          "& .MuiDataGrid-columnHeader": {
            backgroundColor: "rgba(0, 0, 0, 0.02)",
            fontWeight: 600,
            fontSize: "0.75rem",
            textTransform: "uppercase",
            color: "rgba(0, 0, 0, 0.6)",
          },
          "& .MuiDataGrid-cell": {
            borderBottom: "1px solid rgba(0, 0, 0, 0.08)",
            padding: "16px",
          },
          border: "1px solid rgba(0, 0, 0, 0.12)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
        disableColumnMenu
        autoHeight
      />
    </div>
  );
}
