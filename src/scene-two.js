import * as d3 from "d3";
import { addAnnotationLines, addAxes, createSvg, formatCount } from "./helpers.js";

const width=840;
const height=470;
const margin={top:72,right:30,bottom:58,left:72};
const annotations=[
  { date:new Date("2016-11-08T00:00:00"), label:"Donald Trump elected" },
  { date:new Date("2017-01-20T00:00:00"), label:"Donald Trump takes office" },
  { date:new Date("2020-11-03T00:00:00"), label:"Joe Biden elected" },
  { date:new Date("2021-01-20T00:00:00"), label:"Joe Biden takes office" }
];

export function renderSceneTwo(root,data) {
  const scene = d3.select(root);
  const {svg, plot, width:innerWidth, height:innerHeight} = createSvg(scene.select(".monthly-chart").node(), width, height, margin);

  const x = d3.scaleTime().domain(d3.extent(data.months, d => d.month)).range([0, innerWidth]);
  const y = d3.scaleLinear().domain([0, d3.max(data.months, d => d.entries)]).nice().range([innerHeight, 0]);
  const line = d3.line().x(d => x(d.month)).y(d => y(d.entries));

  plot.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));

  addAxes(plot, x, y, innerWidth, innerHeight, {xLabel: "Month", yLabel: "Children entering care"});
  addAnnotationLines(plot, x, innerHeight, annotations);

  plot.append("path").datum(data.months).attr("class", "time-line").attr("d", line);
  plot.selectAll(".time-point")
    .data(data.months).join("circle")
    .attr("class","time-point").attr("cx",d=>x(d.month)).attr("cy",d=>y(d.entries)).attr("r",2.5)
    .append("title").text(d=>`${d3.timeFormat("%B %Y")(d.month)}: ${formatCount(d.entries)} entries`);
}
