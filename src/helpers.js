import * as d3 from "d3";

const COUNTRY_COLOR_VALUES = ["#2f4f9f", "#4b78a3", "#5594b5", "#639967", "#4e64a4", "#79aebf", "#a65f69", "#535c5f"];
const COUNTRY_NAMES = ["Guatemala", "Honduras", "El Salvador", "Mexico", "Ecuador", "Nicaragua", "India", "Other"];
const COUNTRY_COLORS = Object.freeze(Object.fromEntries(
    COUNTRY_NAMES.map((country, index) => [country, COUNTRY_COLOR_VALUES[index]])
));
export const countryColor = (country) => COUNTRY_COLORS[country] ?? "#535c5f";

export const COLORS = {
    gender:["#2b7896", "#c06f9f"],
    sponsors:["#9f4c48", "#c2b64f", "#4f6096", "#5d9368"]
};
const SPONSOR_NAMES = ["Parent", "Sibling", "Distant Relative", "Family Friend"];
export const SPONSOR_LABELS = new Map([
  ["1", "Parent"],
  ["2", "Sibling"],
  ["3", "Distant Relative"],
  ["4", "Family Friend"]
]);
export const sponsorLabel = (key) => SPONSOR_LABELS.get(key) ?? key;
export const sponsorColor = (label) => COLORS.sponsors[SPONSOR_NAMES.indexOf(label)] ?? COLORS.sponsors[0];
export const formatCount = d3.format(",d");
export const formatPercent = (value) => d3.format(".1%")( +value || 0 );
export const formatMonth = d3.timeFormat("%b %Y");

export const TIMELINE_ANNOTATIONS = [
  { date: new Date("2016-11-08T00:00:00"), label: "Donald Trump elected" },
  { date: new Date("2017-01-20T00:00:00"), label: "Donald Trump takes office" },
  { date: new Date("2020-11-03T00:00:00"), label: "Joe Biden elected" },
  { date: new Date("2021-01-20T00:00:00"), label: "Joe Biden takes office" }
];

const width = 840;
const height = 470;
const margin = { top: 25, right: 75, bottom: 50, left: 100 };

export function createSvg(container, svgWidth = width, svgHeight = height, svgMargin = margin) {
    const svg = d3.select(container).append("svg").attr("viewBox", `0 0 ${svgWidth} ${svgHeight}`).attr("role", "img");
    return {
        svg,
        plot: svg.append("g").attr("transform", `translate(${svgMargin.left},${svgMargin.top})`),
        width: svgWidth - svgMargin.left - svgMargin.right,
        height: svgHeight - svgMargin.top - svgMargin.bottom
    };
}

export function renderBars(container, values, color, label) {
  const svgWidth = 720;
  const svgHeight = margin.top + margin.bottom + values.length * 34;
  const { plot, width: innerWidth, height: innerHeight } = createSvg(container, svgWidth, svgHeight, margin);
  const y = d3.scaleBand().domain(values.map((d) => d.label)).range([0, innerHeight]).padding(0.25);
  const x = d3.scaleLinear().domain([0, d3.max(values, (d) => d.value)]).range([0, innerWidth]);

  plot.append("g").attr("class", "grid").call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(""));
  plot.selectAll(".bar").data(values).enter().append("rect")
    .attr("class", "bar").attr("x", 0).attr("y", (d) => y(d.label))
    .attr("width", (d) => x(d.value)).attr("height", y.bandwidth())
    .attr("fill", (d) => d.color ?? color);

  plot.append("g").attr("class", "y-axis").call(d3.axisLeft(y).tickSize(0));
  plot.append("g").attr("class", "x-axis").attr("transform", `translate(0,${innerHeight})`)
    .call(d3.axisBottom(x).ticks(5).tickFormat(formatCount));
  plot.selectAll(".bar-label").data(values).enter().append("text")
    .attr("class", "bar-label").attr("x", (d) => x(d.value) + 8)
    .attr("y", (d) => y(d.label) + y.bandwidth() / 2).attr("dy", ".35em")
    .text((d) => d.annotation ?? formatCount(d.value));
}

function renderPercentageBars(container, values, title) {
  const total = d3.sum(values, (d) => d.value);
  renderBars(container, values.map((d) => ({
    ...d,
    annotation: `${formatCount(d.value)} (${formatPercent(d.value / total)})`
  })), values[0]?.color ?? COLORS.gender[0], title);
}

export function renderGender(container, totals) {
  const values = ["M", "F"].map((key, i) => ({
    label: key === "M" ? "Male" : "Female",
    value: +totals[key],
    color: COLORS.gender[i]
  }));

  renderPercentageBars(container, values, "Reported gender percentages");
}

export function renderSponsorBreakdown(container, totals) {
  const values = ["1", "2", "3", "4"].map((key, i) => ({
    label: sponsorLabel(key),
    value: +totals[key],
    color: COLORS.sponsors[i]
  }));

  renderPercentageBars(container, values, "Sponsor category percentages");
}

export function renderTimeline(container, { xDomain, yDomain, xLabel, yLabel, annotations = TIMELINE_ANNOTATIONS }, draw) {
  const { plot, width: innerWidth, height: innerHeight } = createSvg(container);
  const x = d3.scaleTime().domain(xDomain).range([0, innerWidth]);
  const y = d3.scaleLinear().domain(yDomain).nice().range([innerHeight, 0]);

  plot.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
  addAxes(plot, x, y, innerWidth, innerHeight, { xLabel, yLabel });
  addAnnotationLines(plot, x, innerHeight, annotations);

  if (draw) {
    draw({ plot, x, y, innerWidth, innerHeight });
  }

  return { plot, x, y, innerWidth, innerHeight };
}

let xRevealId = 0;

export function animateXReveal(plot, innerWidth, innerHeight, { delay = 0 } = {}) {
  const svg = d3.select(plot.node()?.ownerSVGElement);
  if (svg.empty()) {
    return plot.append("g");
  }

  const defs = svg.select("defs").empty() ? svg.append("defs") : svg.select("defs");
  const clipId = `x-reveal-${++xRevealId}`;
  const clipPath = defs.append("clipPath").attr("id", clipId);
  const reveal = clipPath.append("rect")
    .attr("x", 0)
    .attr("y", 0)
    .attr("width", 0)
    .attr("height", innerHeight);

  const group = plot.append("g").attr("clip-path", `url(#${clipId})`);
  reveal.transition()
    .delay(delay)
    .duration(5*innerWidth)
    .ease(d3.easeLinear)
    .attr("width", innerWidth);

  return group;
}

let tooltipSingleton = null;

export function createTooltip() {
    if (tooltipSingleton) {
        return tooltipSingleton;
    }

    const tooltip = d3.select("body").append("div")
        .attr("class", "chart-tooltip")
        .attr("role", "tooltip")
    const offset = { x: 14, y: 14 };

    function move(event) {
        const node = tooltip.node();
        if (!node) return;

        const bounds = node.getBoundingClientRect();
        const padding = 12;
        let left = event.clientX + offset.x;
        let top = event.clientY + offset.y;

        if (left + bounds.width + padding > window.innerWidth) {
            left = Math.max(padding, event.clientX - bounds.width - offset.x);
        }
        if (top + bounds.height + padding > window.innerHeight) {
            top = Math.max(padding, event.clientY - bounds.height - offset.y);
        }

        tooltip.style("left", `${left}px`).style("top", `${top}px`);
    }

    tooltipSingleton = {
        show(event, text) {
            tooltip.text(text).classed("is-visible", true);
            move(event);
        },
        move,
        hide() {
            tooltip.classed("is-visible", false).text("");
        }
    };

    return tooltipSingleton;
}

export function addAxes(plot, x, y, width, height, {xLabel, yLabel} = {}) {
    const xAxis = plot.append("g").attr("class", "x-axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
    const yAxis = plot.append("g").attr("class", "y-axis").call(d3.axisLeft(y).ticks(5));
    xAxis.append("text").attr("x", width).attr("y", 42).text(xLabel);
    yAxis.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -height / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .text(yLabel);
    return { xAxis, yAxis };
}

export function addAnnotationLines(plot, x, height, annotations) {
    const group = plot.append("g").attr("class", "annotations");
    group.selectAll(".annotation").data(annotations).enter().append("g")
        .attr("class", "annotation")
        .attr("transform", (d) => `translate(${x(d.date)},0)`)
        .each(function(d) {
            const annotation = d3.select(this), labelY = d.label.includes("elected") ? -28 : -10;
            annotation.append("line").attr("class", "annotation-line").attr("y2", height);
            annotation.append("text").attr("class", "annotation-label").attr("x", 4).attr("y", labelY).text(d.label);
        });
    return group;
}

function renderNavButton(container, label, onClick, className) {
    return d3.select(container)
        .append("button")
        .attr("type", "button")
        .attr("class", className)
        .text(label)
        .on("click", onClick);
}

export function renderNextButton(container, label, onClick) {
    return renderNavButton(container, label, onClick, "nav-button next-button");
}

export function renderBackButton(container, label, onClick) {
    return renderNavButton(container, label, onClick, "nav-button back-button");
}
