import * as d3 from "d3";

export const COLORS = {
    countries:["#245b73","#3f7f8f","#6a9e9a","#d4875d","#c36a4c","#9a6a8f","#6f789b","#9aa3a8"],
    gender:["#245b73","#d45d9e"],
    sponsors:["#6a9e9a","#d4875d","#9a6a8f","#6f789b"]
};
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

export function addAxes(plot,x,y,width,height,{xLabel,yLabel}={}) { 
    const xAxis=plot.append("g").attr("class","x-axis").attr("transform",`translate(0,${height})`).call(d3.axisBottom(x));
    const yAxis=plot.append("g").attr("class","y-axis").call(d3.axisLeft(y).ticks(5));
    if(xLabel)xAxis.append("text").attr("x",width).attr("y",42).attr("text-anchor","end").text(xLabel);
    if(yLabel)yAxis.append("text").attr("transform","rotate(-90)").attr("x",-8).attr("y",-42).attr("text-anchor","end").text(yLabel);
    return {xAxis,yAxis}; 
}

export function addAnnotationLines(plot,x,height,annotations) {
    const group = plot.append("g").attr("class","annotations");
    group.selectAll(".annotation").data(annotations).join("g")
        .attr("class","annotation")
        .attr("transform",(d)=>`translate(${x(d.date)},0)`)
        .each(function(d,i) { const annotation=d3.select(this),labelY=-(i%2)*18-10; annotation.append("line").attr("class","annotation-line").attr("y2",height); annotation.append("text").attr("class","annotation-label").attr("x",4).attr("y",labelY).text(d.label); }
    );
        return group;
}

export function renderNextButton(container,label,onClick) { 
    return d3.select(container).append("button").attr("class","next-button").text(label).on("click",onClick); 
}
