import { useEffect, useRef } from "react";
import { axisBottom, axisLeft, max, scaleBand, scaleLinear, select } from "d3";
import type { BarDatum } from "./D3BarChart";

export interface D3LineChartProps {
    data: readonly BarDatum[];
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

export const D3LineChart = ({
    data,
    width = 760,
    height = 390,
}: D3LineChartProps): React.JSX.Element => {
    const svgRef = useRef<SVGSVGElement>(null);

    useEffect(() => {
        if (!svgRef.current || data.length === 0) return;
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
            .padding(0.5);
        const y = scaleLinear()
            .domain([0, max(data, (item) => item.value) ?? 0])
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
        const points = data.map((item) => [
            (x(item.label) ?? 0) + x.bandwidth() / 2,
            y(item.value),
        ]);
        const line = points
            .map(
                ([pointX, pointY], index) =>
                    `${index === 0 ? "M" : "L"}${pointX},${pointY}`,
            )
            .join(" ");
        chart
            .append("path")
            .attr("class", "chart-line")
            .style("stroke", "#315efb")
            .style("stroke-width", "3")
            .style("stroke-linecap", "round")
            .style("stroke-linejoin", "round")
            .attr("d", line)
            .attr("fill", "none");
        chart
            .selectAll("circle")
            .data(data)
            .join("circle")
            .attr("class", "chart-point")
            .style("fill", "#315efb")
            .style("stroke", "#fff")
            .style("stroke-width", "2")
            .attr("cx", (item) => (x(item.label) ?? 0) + x.bandwidth() / 2)
            .attr("cy", (item) => y(item.value))
            .attr("r", 4)
            .append("title")
            .text((item) => `${item.label}: ${item.value.toLocaleString()}`);
    }, [data, height, width]);

    return (
        <svg
            style={STYLES.svg}
            ref={svgRef}
            role="img"
            aria-label="Line chart"
            viewBox={`0 0 ${width} ${height}`}
            preserveAspectRatio="xMidYMid meet"
        />
    );
};
