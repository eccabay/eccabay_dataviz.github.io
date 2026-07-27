import * as d3 from "d3";
import { addAnnotationLines, addAxes, countryColor, createSvg, formatCount, formatPercent } from "./helpers.js";

const width = 840;
const height = 470;
const margin = { top: 72, right: 30, bottom: 58, left: 72 };
const annotations = [
  { date: new Date("2016-11-08T00:00:00"), label: "Donald Trump elected" },
  { date: new Date("2017-01-20T00:00:00"), label: "Donald Trump takes office" },
  { date: new Date("2020-11-03T00:00:00"), label: "Joe Biden elected" },
  { date: new Date("2021-01-20T00:00:00"), label: "Joe Biden takes office" }
];
const sponsorLabels = new Map([["1", "Parent"], ["2", "Sibling"], ["3", "Distant Relative or Unrelated"], ["4", "Family Friend"]]);

function countrySeries(months, countries) {
  return countries.map((country) => ({
    country,
    values: months.map((month) => ({ month: month.month, value: month.countries[country] ?? 0 }))
  }));
}

export function renderCountryDetails(container, country, data) {
  const panel = d3.select(container);
  panel.selectAll("*").remove();

  if (!country) {
    panel.append("p").attr("class", "details-prompt")
      .text("Select a country to see its total, gender breakdown, and sponsor categories.");
    return;
  }

  const detail = data.countryDetails[country];
  const genderTotal = d3.sum(Object.values(detail.gender));
  const sponsorTotal = d3.sum(Object.values(detail.sponsors));

  panel.append("h4").text(`${country} details`);
  panel.append("p").attr("class", "details-total")
    .text(`${formatCount(detail.total)} unaccompanied children entered the United States`);

  const groups = panel.append("div").attr("class", "details-groups");
  const gender = groups.append("section").attr("class", "details-group");
  gender.append("h5").text("Reported gender");
  gender.selectAll("p").data(["M", "F"]).join("p")
    .text((key) => `${key === "M" ? "Male" : "Female"}: ${formatPercent(detail.gender[key] / genderTotal)}`);

  const sponsors = groups.append("section").attr("class", "details-group");
  sponsors.append("h5").text("Sponsor category");
  sponsors.selectAll("p").data(["1", "2", "3", "4"]).join("p")
    .text((key) => `${sponsorLabels.get(key)}: ${formatPercent(detail.sponsors[key] / sponsorTotal)}`);
}

export function renderSceneThree(root, data, state) {
  const scene = d3.select(root);
  const countries = data.featuredCountries;
  const series = countrySeries(data.months, countries);
  const { svg, plot, width: innerWidth, height: innerHeight } = createSvg(
    scene.select(".country-monthly-chart").node(), width, height, margin
  );

  const x = d3.scaleTime().domain(d3.extent(data.months, (d) => d.month)).range([0, innerWidth]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(series, (country) => d3.max(country.values, (d) => d.value))])
    .nice()
    .range([innerHeight, 0]);
  const line = d3.line().x((d) => x(d.month)).y((d) => y(d.value));

  plot.append("g").attr("class", "grid")
    .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
  addAxes(plot, x, y, innerWidth, innerHeight, { xLabel: "Month", yLabel: "Children entering the United States" });
  addAnnotationLines(plot, x, innerHeight, annotations);

  const lines = plot.append("g").attr("class", "country-lines")
    .selectAll("path").data(series, (d) => d.country).join("path")
    .attr("class", "country-line")
    .attr("data-country", (d) => d.country)
    .attr("stroke", (d) => countryColor(d.country))
    .attr("d", (d) => line(d.values));

  const legend = scene.select(".country-legend");
  legend.selectAll("*").remove();
  legend.append("h4").attr("id", "country-legend-title").text("Select a country");
  const controls = legend.append("div").attr("class", "legend-controls");
  const buttons = controls.selectAll("button").data(countries).join("button")
    .attr("type", "button")
    .attr("class", "country-button")
    .on("click", (_, country) => selectCountry(country));
  buttons.append("span").attr("class", "legend-swatch")
    .style("background-color", (country) => countryColor(country));
  buttons.append("span").text((country) => country);

  const reset = legend.append("button").attr("type", "button")
    .attr("class", "show-all-button")
    .text("Show all countries")
    .on("click", () => selectCountry(null));

  const selectedLabel = scene.select(".selected-country-label");
  const details = scene.select(".country-details");

  function selectCountry(country) {
    state.selectedCountry = country;
    const selected = country ? lines.filter((d) => d.country === country) : null;
    lines.classed("is-selected", (d) => d.country === country)
      .classed("is-muted", (d) => Boolean(country) && d.country !== country)
      .raise();
    buttons.classed("is-selected", (d) => d === country);
    reset.classed("is-selected", !country)
    selectedLabel.text(country ? `${country} selected` : "All countries shown");
    renderCountryDetails(details.node(), country, data);
    if (selected) selected.raise();
  }

  selectCountry(state.selectedCountry ?? null);
}
