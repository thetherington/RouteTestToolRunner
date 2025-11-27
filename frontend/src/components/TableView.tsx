import { useRef, type FC, type ReactElement } from "react";
import {
    SimpleTable,
    type HeaderObject,
    type Row,
    type TableRefType,
} from "simple-table-core";
import "simple-table-core/styles.css";
import IconXBold from "../icons/IconXBold";
import type { SlabLogs } from "../types/output";
import styles from "./Output.module.css";
import Button from "./Button";
import IconDisk from "../icons/IconDisk";
import { createCSVFileName } from "../util/utils";

type TableViewProps = {
    outputData?: SlabLogs;
    scheduleTime?: string;
};

const headers: HeaderObject[] = [
    {
        accessor: "route",
        width: 100,
        label: "Route",
        isSortable: true,
        type: "string",
    },
    {
        accessor: "scheduleStart",
        label: "Schedule Start",
        minWidth: 80,
        width: 250,
        isSortable: false,
        type: "string",
    },
    {
        accessor: "source",
        label: "Source",
        width: 250,
        type: "string",
    },
    {
        accessor: "multicast",
        label: "Multicast",
        width: 250,
        type: "string",
    },
    {
        accessor: "destination",
        label: "Destination",
        width: 250,
        isSortable: true,
        expandable: true,
        filterable: true,
        type: "string",
    },
    {
        accessor: "slabDevice",
        label: "Slab Device",
        width: 250,
        isSortable: true,
        filterable: true,
        type: "string",
    },
    {
        accessor: "slabLogTime",
        label: "Slab Log Time",
        width: 250,
        isSortable: false,
        type: "string",
        cellRenderer: ({ row }) => {
            const value = row.slabLogTime as string;

            if (value) {
                return <span>{value}</span>;
            } else {
                return (
                    <span
                        style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                            height: "10px",
                            width: "10px",
                        }}
                    >
                        <IconXBold />
                    </span>
                );
            }
        },
    },
];

interface LogRow extends Row {
    route: string;
    scheduleStart: string;
    source: string;
    multicast: string;
    destination: string;
    slabDevice?: string;
    slabLogTime?: string;
    slabs: Slab[];
}

interface Slab {
    slabDevice: string;
    slabLogTime: string;
}

const emptyStateElement = (
    <div
        style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 24px",
            gap: "12px",
        }}
    >
        <svg
            style={{ width: 48, height: 48, color: "#9ca3af" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
        </svg>
        <p
            style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 500,
                color: "#6b7280",
            }}
        >
            No data available
        </p>
    </div>
);

const TableView: FC<TableViewProps> = ({
    outputData,
    scheduleTime,
}): ReactElement => {
    const tableRef = useRef<TableRefType>(null);

    let logCount = 0;

    const LOG_DATA: LogRow[] = [];

    if (outputData) {
        for (const destId in outputData.destinations) {
            logCount++;

            const row: LogRow = {
                route: logCount.toString(),
                source: outputData.source,
                multicast: outputData.mcast,
                scheduleStart: scheduleTime || "N/A",
                destination: destId,
                slabs: [],
            };

            for (const slabId in outputData.destinations[destId].slabs) {
                const logLines = outputData.destinations[destId].slabs[slabId];

                if (row.slabDevice === undefined) {
                    row.slabDevice = slabId;
                    row.slabLogTime = logLines[0];
                } else {
                    row.slabs.push({
                        slabDevice: slabId,
                        slabLogTime: logLines[0],
                    });
                }
            }

            LOG_DATA.push(row);
        }
    }

    return (
        <div className={styles["table-view"]}>
            {LOG_DATA.length > 0 && (
                <div className={styles["table-view__controls"]}>
                    <Button
                        variant="save"
                        icon
                        size="md"
                        onClick={() =>
                            tableRef.current?.exportToCSV({
                                filename: createCSVFileName(
                                    scheduleTime || Date()
                                ),
                            })
                        }
                    >
                        <IconDisk />
                        Export to CSV
                    </Button>
                </div>
            )}
            <SimpleTable
                defaultHeaders={headers}
                columnResizing
                columnReordering
                height="100%"
                rowIdAccessor="route"
                rows={LOG_DATA}
                rowHeight={32}
                rowGrouping={["slabs"]}
                theme="custom"
                tableEmptyStateRenderer={emptyStateElement}
                tableRef={tableRef}
                useOddEvenRowBackground
            />
        </div>
    );
};

export default TableView;
