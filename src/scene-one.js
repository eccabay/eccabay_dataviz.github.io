import * as d3 from "d3";
import { COLORS, countryColor, createSvg, formatCount, formatPercent, sponsorColor } from "./helpers.js";

// Leave room for labels placed just beyond the end of each bar. Without this
// gutter, the label for the maximum value falls outside the SVG viewBox.
const margin = { top: 25, right: 100, bottom: 25, left: 75 };
function renderBars(container, values, color, label) {

  // Configure size
  const width = 720;
  const height = margin.top + margin.bottom + values.length * 34;
  const { svg, plot, width: innerWidth, height: innerHeight } = createSvg(container, width, height, margin);
  const y = d3.scaleBand().domain(values.map((d) => d.label)).range([0, innerHeight]).padding(0.25);
  const x = d3.scaleLinear().domain([0, d3.max(values, (d) => d.value)]).range([0, innerWidth]);

  // Draw bar lines
  plot.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));
  plot.selectAll(".bar").data(values).join("rect")
    .attr("class", "bar").attr("x", 0).attr("y", (d) => y(d.label))
    .attr("width", (d) => x(d.value)).attr("height", y.bandwidth())
    .attr("fill", (d) => d.color ?? color);

  // Add axes
  plot.append("g").attr("class", "y-axis").call(d3.axisLeft(y).tickSize(0));
  plot.append("g").attr("class", "x-axis").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(formatCount));
  plot.selectAll(".bar-label").data(values).join("text")
    .attr("class", "bar-label").attr("x", (d) => x(d.value) + 8)
    .attr("y", (d) => y(d.label) + y.bandwidth() / 2).attr("dy", ".35em")
    .text((d) => d.annotation ?? formatCount(d.value));
}

function renderGender(container, totals) {
  const values = ["M", "F"].map((key, i) => ({
    label: key === "M" ? "Male" : "Female", value: +totals[key], color: COLORS.gender[i]
  }));
  const total = d3.sum(values, (d) => d.value);

  renderBars(container, values.map((d) => ({
    ...d, annotation: `${formatPercent(d.value / total)} (${formatCount(d.value)})`
  })), COLORS.gender[0], "Reported gender percentages");
}

export function renderSceneOne(root, data) {
  const scene = d3.select(root);

  renderBars(scene.select(".country-chart").node(), [...data.countryTotals]
    .sort((a, b) => d3.descending(a.count, b.count))
    .map((d) => ({ label: d.country, value: d.count, color: countryColor(d.country) })), COLORS.countries[0], "Country of origin totals");

  renderGender(scene.select(".gender-chart").node(), data.genderTotals);
  
  renderBars(scene.select(".sponsor-chart").node(), [...data.sponsorTotals]
    .sort((a, b) => d3.descending(a.count, b.count))
    .map((d) => ({ label: d.label, value: d.count, color: sponsorColor(d.label) })), sponsorColor("Parent"), "Sponsor category totals");
}
