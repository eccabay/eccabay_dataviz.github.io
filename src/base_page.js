import * as d3 from "d3";

const data = await d3.csv("data.csv");

const width = 1700;
const height = 400;
const margin = 50;

const svg = d3.select("#chart").append("svg").attr("width", width+2*margin).attr("height", height+2*margin)
    .append("g").attr("transform", "translate(50, 50)");


// Aggregation
const sponsorTypes = ["1", "2", "3", "4"];
const grouped = d3.rollup(
    data,
    v => {
        const counts = { "1": 0, "2": 0, "3": 0, "4": 0 };

        v.forEach(d => {
            const type = d["Sponsor Category"] === "" ? "4": String(d["Sponsor Category"]);
            counts[type]++;
        });
        return counts;
    },
    d => d["Child's Country of Origin"]
);

// Organize stacked data
const stackedData = Array.from(grouped, ([country, counts]) => {
    const total = d3.sum(Object.values(counts));
    return {
        country,
        "1": counts["1"] / total,
        "2": counts["2"] / total,
        "3": counts["3"] / total,
        "4": counts["4"] / total
    };
});
const stack = d3.stack().keys(sponsorTypes);
const series = stack(stackedData);

// Scales
const x = d3.scaleBand()
    .domain(stackedData.map(d => d.country))
    .range([0, width])

const y = d3.scaleLinear()
    .domain([0, 1])
    .range([height, 0]);

const color = d3.scaleOrdinal()
    .domain(sponsorTypes)
    .range([
        "blue",
        "purple",
        "black",
        "red"
    ]);

// Draw bars
svg.selectAll(".layer")
    .data(series)
    .join("g")
    .attr("fill", d => color(d.key))
    .selectAll("rect")
    .data(d => d)
    .join("rect")
    .attr("x", d => x(d.data.country))
    .attr("y", d => y(d[1]))
    .attr("height", d => y(d[0]) - y(d[1]))
    .attr("width", x.bandwidth());

// Axes
svg.append("g")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end");

svg.append("g")
    .call(d3.axisLeft(y).tickFormat(d3.format(".0%")));

// Legend
const legend = svg.append("g")
    .attr("transform", `translate(${width - 120},0)`);

sponsorTypes.forEach((type, i) => {
    const g = legend.append("g").attr("transform", `translate(0,${i * 22})`);
    g.append("rect")
        .attr("width", 15)
        .attr("height", 15)
        .attr("fill", color(type));
    g.append("text")
        .attr("x", 22)
        .attr("y", 12)
        .text(`Sponsor Type ${type}`);
});