import { useEffect, useRef } from "react";
import { axisBottom, axisLeft, max, scaleBand, scaleLinear, select } from "d3";

export interface BarDatum {
    label: string;
    value: number;
}

export interface D3BarChartProps {
    data: readonly BarDatum[];
    width?: number;
    height?: number;
}

const margin = { top: 20, right: 24, bottom: 72, left: 56 };
const maxLabelLength = 18;
const STYLES: Record<string, React.CSSProperties> = {
    svg: {
        display: "block",
        width: "100%",
        minWidth: "560px",
        height: "auto",
    },
} as const;

const shortenLabel = (label: string): string =>
    label.length > maxLabelLength
        ? `${label.slice(0, maxLabelLength - 1)}…`
        : label;

export const D3BarChart = ({
    data,
    width = 760,
    height = 390,
}: D3BarChartProps): React.JSX.Element => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) {
            return;
        }

        const innerWidth = Math.max(width - margin.left - margin.right, 240);
        const innerHeight = Math.max(height - margin.top - margin.bottom, 180);
        const svg = select(svgRef.current);
        svg.selectAll("*").remove();
        svg.attr("width", width).attr("height", height);

        const chart = svg
            .append("g")
            .attr("transform", `translate(${margin.left},${margin.top})`);
        const labels = data.map((item) => item.label);
        const x = scaleBand<string>()
            .domain(labels)
            .range([0, innerWidth])
            .padding(0.28);
        const y = scaleLinear()
            .domain([0, max(data, (item) => item.value) ?? 0])
            .nice()
            .range([innerHeight, 0]);
        const grid = axisLeft(y)
            .tickSize(-innerWidth)
            .tickFormat(() => "");

        chart
            .append("g")
            .attr("class", "chart-grid")
            .style("stroke", "#e3e7f0")
            .style("stroke-dasharray", "3 4")
            .call(grid);
        chart
            .append("g")
            .attr("class", "chart-axis chart-axis-y")
            .style("color", "#68738a")
            .style("font-size", "11px")
            .call(axisLeft(y).ticks(6));
        chart
            .append("g")
            .attr("class", "chart-axis chart-axis-x")
            .style("color", "#68738a")
            .style("font-size", "11px")
            .attr("transform", `translate(0,${innerHeight})`)
            .call(
                axisBottom(x).tickFormat((label) =>
                    shortenLabel(String(label)),
                ),
            )
            .selectAll("text")
            .attr("text-anchor", "end")
            .attr("transform", "rotate(-28)")
            .attr("dx", "-0.6em")
            .attr("dy", "0.35em");

        chart
            .selectAll("rect")
            .data(data)
            .join("rect")
            .attr("class", "chart-bar")
            .style("fill", "#315efb")
            .style("rx", "4px")
            .attr("x", (item) => x(item.label) ?? 0)
            .attr("y", innerHeight)
            .attr("width", x.bandwidth())
            .attr("height", 0)
            .append("title")
            .text((item) => `${item.label}: ${item.value.toLocaleString()}`);

        chart
            .selectAll<SVGRectElement, BarDatum>("rect")
            .transition()
            .duration(550)
            .ease((progress) => progress)
            .attr("y", (item) => y(item.value))
            .attr("height", (item) => innerHeight - y(item.value));
    }, [data, height, width]);

    return (
        <svg
            style={STYLES.svg}
            ref={svgRef}
            role="img"
            aria-label="Bar chart"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
        />
    );
};
