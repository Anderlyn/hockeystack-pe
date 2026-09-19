import type { Row } from "../events";

const STYLES = {
    wrapper: {
        maxWidth: "100%",
        overflowX: "auto",
    } satisfies React.CSSProperties,
    table: {
        borderCollapse: "collapse",
        minWidth: "100%",
        textAlign: "left",
    } satisfies React.CSSProperties,
    cell: {
        borderBottom: "1px solid #dfe4f0",
        padding: "10px 12px",
        whiteSpace: "nowrap",
    } satisfies React.CSSProperties,
    header: {
        color: "#44506a",
        fontSize: "12px",
        textTransform: "uppercase",
    } satisfies React.CSSProperties,
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
