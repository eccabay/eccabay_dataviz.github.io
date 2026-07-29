import * as d3 from "d3";
import { animateXReveal, formatCount, formatMonth, renderTimeline, createTooltip } from "./helpers.js";

export function renderSceneOne(root,data) {
  const scene = d3.select(root);
  const tooltip = createTooltip();

  renderTimeline(scene.select(".monthly-chart").node(), {
    xDomain: d3.extent(data.months, (d) => d.month),
    yDomain: [0, d3.max(data.months, (d) => d.entries)],
    xLabel: "Month",
    yLabel: "Children entering the United States"
  }, ({ plot, x, y, innerWidth, innerHeight }) => {
    const reveal = animateXReveal(plot, innerWidth, innerHeight, { delay: 1000 });
    const line = d3.line().x((d) => x(d.month)).y((d) => y(d.entries));

    reveal.append("path").datum(data.months).attr("class", "time-line").attr("d", line);
    reveal.selectAll(".time-point")
      .data(data.months).enter().append("circle")
      .attr("class", "time-point").attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.entries)).attr("r", 2.5);

    reveal.append("g")
      .selectAll("circle").data(data.months).enter().append("circle")
      .attr("cx", (d) => x(d.month))
      .attr("cy", (d) => y(d.entries))
      .attr("r", 7)
      .attr("fill", "transparent")
      .on("pointerenter", (event, d) => tooltip.show(event, `${formatMonth(d.month)}: ${formatCount(d.entries)} children entering the US`))
      .on("pointermove", (event) => tooltip.move(event))
      .on("pointerleave", () => tooltip.hide());
  });
}
