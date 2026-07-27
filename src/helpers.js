import * as d3 from "d3";

const COUNTRY_COLOR_VALUES = ["#2f4f9f", "#4b78a3", "#5594b5", "#639967", "#4e64a4", "#79aebf", "#a65f69", "#535c5f"];
const COUNTRY_NAMES = ["Guatemala", "Honduras", "El Salvador", "Mexico", "Ecuador", "Nicaragua", "India", "Other"];
export const COUNTRY_COLORS = Object.freeze(Object.fromEntries(
    COUNTRY_NAMES.map((country, index) => [country, COUNTRY_COLOR_VALUES[index]])
));
export const countryColor = (country) => COUNTRY_COLORS[country] ?? "#333333";

export const COLORS = {
    countries: COUNTRY_COLOR_VALUES,
    gender:["#2b7896","#c06f9f"],
    sponsors:["#9f4c48","#c2b64f","#4f6096","#5d9368"]
};
const SPONSOR_NAMES = ["Parent", "Sibling", "Distant Relative or Unrelated", "Family Friend"];
export const sponsorColor = (label) => COLORS.sponsors[SPONSOR_NAMES.indexOf(label)] ?? COLORS.sponsors[0];
export const formatCount = d3.format(",d");
export const formatPercent = (value)=>d3.format(".1%")(+value||0);
export const formatMonth=d3.timeFormat("%b %Y");

export function createSvg(container,width,height,margin) {
    const svg=d3.select(container).append("svg").attr("viewBox",`0 0 ${width} ${height}`).attr("role","img");
    return { 
        svg,
        plot:svg.append("g").attr("transform",`translate(${margin.left},${margin.top})`),
        width:width-margin.left-margin.right,
        height:height-margin.top-margin.bottom
    }; 
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

export function addAxes(plot,x,y,width,height,{xLabel,yLabel}={}) { 
    const xAxis=plot.append("g").attr("class","x-axis").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x));
    const yAxis=plot.append("g").attr("class","y-axis").call(d3.axisLeft(y).ticks(5));
    xAxis.append("text").attr("x",width).attr("y",42).text(xLabel);
    yAxis.append("text").attr("transform","rotate(-90)").attr("x",-8).attr("y",-42).text(yLabel);
    return {xAxis,yAxis}; 
}

export function addAnnotationLines(plot,x,height,annotations) {
    const group = plot.append("g").attr("class","annotations");
    group.selectAll(".annotation").data(annotations).join("g")
        .attr("class","annotation")
        .attr("transform",(d)=>`translate(${x(d.date)},0)`)
        .each(function(d) { const annotation=d3.select(this),labelY=d.label.includes("elected") ? -28 : -10; annotation.append("line").attr("class","annotation-line").attr("y2",height); annotation.append("text").attr("class","annotation-label").attr("x",4).attr("y",labelY).text(d.label); }
    );
        return group;
}

export function renderNextButton(container,label,onClick) { 
    return d3.select(container).append("button").attr("class","next-button").text(label).on("click",onClick); 
}
