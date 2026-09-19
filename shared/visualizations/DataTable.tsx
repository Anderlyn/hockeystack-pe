import type { Row } from "../events";

const STYLES: Record<string, React.CSSProperties> = {
    wrapper: {
        maxWidth: "100%",
        overflowX: "auto",
    },
    table: {
        borderCollapse: "collapse",
        minWidth: "100%",
        textAlign: "left",
    },
    cell: {
        borderBottom: "1px solid #dfe4f0",
        padding: "10px 12px",
        whiteSpace: "nowrap",
    },
    header: {
        color: "#44506a",
        fontSize: "12px",
        textTransform: "uppercase",
    },
} as const;

export interface DataTableProps {
    columns: readonly string[];
    rows: readonly Row[];
}

export const DataTable = ({
    columns,
    rows,
}: DataTableProps): React.JSX.Element => (
    <div style={STYLES.wrapper}>
        <table style={STYLES.table}>
            <thead>
                <tr>
                    {columns.map((column) => (
                        <th
                            key={column}
                            scope="col"
                            style={{ ...STYLES.cell, ...STYLES.header }}
                        >
                            {column}
                        </th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, index) => (
                    <tr key={index}>
                        {columns.map((column) => (
                            <td key={column} style={STYLES.cell}>
                                {String(row[column] ?? "")}
                            </td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);
