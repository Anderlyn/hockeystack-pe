import { useEffect, useRef } from "react";
import { axisBottom, axisLeft, max, scaleBand, scaleLinear, select } from "d3";

export interface GroupedBarDatum {
    label: string;
    values: Record<string, number>;
}

export interface D3GroupedBarChartProps {
    data: readonly GroupedBarDatum[];
    series: readonly string[];
    width?: number;
    height?: number;
}

const margin = { top: 20, right: 24, bottom: 72, left: 56 };
const STYLES: Record<string, React.CSSProperties> = {
    svg: {
        display: "block",
        width: "100%",
        minWidth: "560px",
        height: "auto",
    },
} as const;

export const D3GroupedBarChart = ({
    data,
    series,
    width = 760,
    height = 390,
}: D3GroupedBarChartProps): React.JSX.Element => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0 || series.length === 0) return;
        const innerWidth = Math.max(width - margin.left - margin.right, 240);
        const innerHeight = Math.max(height - margin.top - margin.bottom, 180);
        const svg = select(svgRef.current);
        svg.selectAll("*").remove();
        const chart = svg
            .attr("width", width)
            .attr("height", height)
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        const x = scaleBand<string>()
            .domain(data.map((item) => item.label))
            .range([0, innerWidth])
            .padding(0.25);
        const innerX = scaleBand<string>()
            .domain(series.slice())
            .range([0, x.bandwidth()])
            .padding(0.08);
        const y = scaleLinear()
            .domain([
                0,
                max(data, (item) =>
                    max(series, (key) => item.values[key] ?? 0),
                ) ?? 0,
            ])
            .nice()
            .range([innerHeight, 0]);
        chart
            .append("g")
            .attr("class", "chart-grid")
            .style("stroke", "#e3e7f0")
            .style("stroke-dasharray", "3 4")
            .call(
                axisLeft(y)
                    .tickSize(-innerWidth)
                    .tickFormat(() => ""),
            );
        chart
            .append("g")
            .attr("class", "chart-axis")
            .style("color", "#68738a")
            .style("font-size", "11px")
            .call(axisLeft(y).ticks(6));
        chart
            .append("g")
            .attr("class", "chart-axis")
            .style("color", "#68738a")
            .style("font-size", "11px")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(axisBottom(x))
            .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-28)")
            .attr("dx", "-0.6em")
            .attr("dy", "0.35em");
        chart
            .selectAll("g.group")
            .data(data)
            .join("g")
            .attr("class", "group")
            .attr("transform", (item) => `translate(${x(item.label) ?? 0},0)`)
            .selectAll("rect")
            .data((item) =>
                series.map((key) => ({
                    label: item.label,
                    key,
                    value: item.values[key] ?? 0,
                })),
            )
            .join("rect")
            .attr("class", "chart-bar")
            .style("fill", "#315efb")
            .style("rx", "4px")
            .attr("x", (item) => innerX(item.key) ?? 0)
            .attr("y", (item) => y(item.value))
            .attr("width", innerX.bandwidth())
            .attr("height", (item) => innerHeight - y(item.value))
            .append("title")
            .text(
                (item) =>
                    `${item.label} ${item.key}: ${item.value.toLocaleString()}`,
            );
    }, [data, height, series, width]);

    return (
        <svg
            style={STYLES.svg}
            ref={svgRef}
            role="img"
            aria-label="Grouped bar chart"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
        />
    );
};
