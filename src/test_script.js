import * as d3 from "d3";

// SVG dimensions
const width = 700;
const height = 400;

// Sample data
const data = [12, 25, 8, 42, 17, 33, 21];

// Create SVG
const svg = d3
    .select("#chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

// Scale
const xScale = d3.scaleBand()
    .domain(data.map((d, i) => i))
    .range([50, width - 30])
    .padding(0.2);

const yScale = d3.scaleLinear()
    .domain([0, d3.max(data)])
    .range([height - 40, 30]);

// Bars
svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d, i) => xScale(i))
    .attr("y", d => yScale(d))
    .attr("width", xScale.bandwidth())
    .attr("height", d => height - 40 - yScale(d))
    .attr("fill", "steelblue");

// X Axis
svg.append("g")
    .attr("transform", `translate(0,${height - 40})`)
    .call(d3.axisBottom(xScale));

// Y Axis
svg.append("g")
    .attr("transform", "translate(50,0)")
    .call(d3.axisLeft(yScale));