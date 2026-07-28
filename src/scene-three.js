import * as d3 from "d3";
import { addAnnotationLines, addAxes, countryColor, createSvg, createTooltip, formatCount, formatPercent } from "./helpers.js";

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

function maxSeriesValue(series) {
  return d3.max(series, (country) => d3.max(country.values, (d) => d.value)) ?? 0;
}

function renderOtherBreakdown(panel, data) {
  const rows = data.otherCountryTotals ?? [];
  const total = d3.sum(rows, (row) => row.count);
  const section = panel.append("section").attr("class", "details-group other-details");
  section.append("h5").text("Other breakdown");
  section.append("p").attr("class", "other-total").text(`${formatCount(total)} total from other countries`);
  section.append("div").attr("class", "other-country-list").selectAll("p").data(rows).enter().append("p").text((row) => `${row.country}: ${formatCount(row.count)}`);
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
  gender.selectAll("p").data(["M", "F"]).enter().append("p")
    .text((key) => `${key === "M" ? "Male" : "Female"}: ${formatPercent(detail.gender[key] / genderTotal)}`);

  const sponsors = groups.append("section").attr("class", "details-group");
  sponsors.append("h5").text("Sponsor category");
  sponsors.selectAll("p").data(["1", "2", "3", "4"]).enter().append("p")
    .text((key) => `${sponsorLabels.get(key)}: ${formatPercent(detail.sponsors[key] / sponsorTotal)}`);

  if (country === "Other") {
    renderOtherBreakdown(panel, data);
  }
}

export function renderSceneThree(root, data, state) {
  const scene = d3.select(root);
  const tooltip = createTooltip();
  const countries = data.featuredCountries;
  const series = countrySeries(data.months, countries);
  const chartHost = scene.select(".country-monthly-chart");

  function drawChart(selectedCountry) {
    chartHost.selectAll("*").remove();
    const { plot, width: innerWidth, height: innerHeight } = createSvg(chartHost.node());
    const visibleSeries = selectedCountry ? series.filter((item) => item.country === selectedCountry) : series;

    const x = d3.scaleTime().domain(d3.extent(data.months, (d) => d.month)).range([0, innerWidth]);
    const y = d3.scaleLinear().domain([0, maxSeriesValue(visibleSeries)]).nice().range([innerHeight, 0]);
    const line = d3.line().x((d) => x(d.month)).y((d) => y(d.value));

    plot.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).ticks(5).tickSize(-innerWidth).tickFormat(""));
    addAxes(plot, x, y, innerWidth, innerHeight, { xLabel: "Month", yLabel: "Children entering the United States" });
    addAnnotationLines(plot, x, innerHeight, annotations);

    const lineGroup = plot.append("g").attr("class", "country-lines");
    const lines = lineGroup.selectAll("path").data(visibleSeries, (d) => d.country).enter().append("path")
      .attr("class", "country-line")
      .attr("data-country", (d) => d.country)
      .attr("stroke", (d) => countryColor(d.country))
      .attr("d", (d) => line(d.values));

    plot.append("g").attr("class", "country-line-hover")
      .selectAll("path").data(visibleSeries, (d) => d.country).enter().append("path")
      .attr("class", "country-line-hit")
      .attr("data-country", (d) => d.country)
      .attr("d", (d) => line(d.values))
      .attr("fill", "none")
      .attr("stroke", "transparent")
      .attr("stroke-width", 18)
      .attr("stroke-linejoin", "round")
      .attr("stroke-linecap", "round")
      .on("pointerenter", (event, d) => tooltip.show(event, d.country))
      .on("pointermove", (event) => tooltip.move(event))
      .on("pointerleave", () => tooltip.hide());

    return lines;
  }

  const legend = scene.select(".country-legend");
  legend.selectAll("*").remove();
  legend.append("h4").attr("id", "country-legend-title").text("Select a country");
  const controls = legend.append("div").attr("class", "legend-controls");
  const buttons = controls.selectAll("button").data(countries).enter().append("button")
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
    buttons.classed("is-selected", (d) => d === country);
    reset.classed("is-selected", !country);
    selectedLabel.text(country ? `${country} selected` : "All countries shown");
    drawChart(country);
    renderCountryDetails(details.node(), country, data);
  }

  selectCountry(state.selectedCountry ?? null);
}
