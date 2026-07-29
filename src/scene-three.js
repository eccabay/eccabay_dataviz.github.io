import * as d3 from "d3";
import { animateXReveal, countryColor, createTooltip, formatCount, renderGender, renderSponsorBreakdown, renderTimeline } from "./helpers.js";

function countrySeries(months, countries) {
  return countries.map((country) => ({
    country,
    values: months.map((month) => ({ month: month.month, value: month.countries[country] ?? 0 }))
  }));
}

function maxSeriesValue(series) {
  return d3.max(series, (country) => d3.max(country.values, (d) => d.value)) ?? 0;
}

const FEATURED_COUNTRY_TRENDS = {
  Guatemala: "Dominates the timeline, with a major surge after 2020 and the largest totals overall.",
  Honduras: "Follows the same broad shape as Guatemala, rising sharply after the 2021 inauguration before easing.",
  "El Salvador": "Starts high, drops during the Trump administration, then rebounds modestly later on.",
  Mexico: "Stays comparatively low and steady, with a late uptick during the Biden administration.",
  Ecuador: "Builds gradually, then increases more rapidly through the Biden administration.",
  Nicaragua: "Moves from small counts to a strong 2021-2022 peak before falling back.",
  India: "Remains a smaller but persistent line, with relatively more frequent spikes during the Trump administration."
};

function displayCountryLabel(country) {
  return country === "Other" ? "Grouped countries" : country;
}

function renderOtherBreakdown(panel, data) {
  const rows = data.otherCountryTotals ?? [];
  const total = d3.sum(rows, (row) => row.count);
  const section = panel.append("section").attr("class", "details-group other-details");
  section.append("p").attr("class", "other-note").text("Countries with more than 100 total children are listed individually. The others are grouped below.");
  section.append("p").attr("class", "other-total").text(`${formatCount(total)} total from grouped countries`);
  const list = section.append("div").attr("class", "other-country-list");
  list.selectAll("p").data(rows).enter().append("p")
    .attr("class", "other-country-row")
    .text((row) => `${row.country}: ${formatCount(row.count)}`);
}

// Countries with more than 100 total children are listed individually.
function renderCountryTrend(panel, country) {
  const trend = FEATURED_COUNTRY_TRENDS[country];
  if (!trend) return;

  const section = panel.append("section").attr("class", "details-group country-trend");
  section.append("h5").text("Trend");
  section.append("p").attr("class", "country-trend-text").text(trend);
}

export function renderCountryDetails(container, country, data) {
  const panel = d3.select(container);
  panel.selectAll("*").remove();

  if (!country) {
    panel.append("p").attr("class", "details-prompt")
      .text("Click a country to see its total, gender breakdown, sponsor categories, and trend summary.");
    return;
  }

  const detail = data.countryDetails[country];

  panel.append("h4").text(`${displayCountryLabel(country)} details`);
  panel.append("p").attr("class", "details-total")
    .text(`${formatCount(detail.total)} unaccompanied children entered the United States`);

  const groups = panel.append("div").attr("class", "details-groups");
  const gender = groups.append("section").attr("class", "details-group");
  gender.append("h5").text("Reported gender");
  gender.append("div").attr("class", "chart details-chart gender-chart");
  renderGender(gender.select(".gender-chart").node(), detail.gender);

  const sponsors = groups.append("section").attr("class", "details-group");
  sponsors.append("h5").text("Sponsor category");
  sponsors.append("div").attr("class", "chart details-chart sponsor-chart");
  renderSponsorBreakdown(sponsors.select(".sponsor-chart").node(), detail.sponsors);

  if (country === "Other") {
    renderOtherBreakdown(panel, data);
  } else {
    renderCountryTrend(panel, country);
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
    const visibleSeries = selectedCountry ? series.filter((item) => item.country === selectedCountry) : series;

    renderTimeline(chartHost.node(), {
      xDomain: d3.extent(data.months, (d) => d.month),
      yDomain: [0, maxSeriesValue(visibleSeries)],
      xLabel: "Month",
      yLabel: "Children entering the United States"
    }, ({ plot, x, y, innerWidth, innerHeight }) => {
      const line = d3.line().x((d) => x(d.month)).y((d) => y(d.value));
      const lineHost = selectedCountry
        ? animateXReveal(plot, innerWidth, innerHeight)
        : plot.append("g").attr("class", "country-lines");

      lineHost.attr("class", "country-lines");
      lineHost.selectAll("path").data(visibleSeries, (d) => d.country).enter().append("path")
        .attr("class", "country-line")
        .attr("data-country", (d) => d.country)
        .attr("stroke", (d) => countryColor(d.country))
        .attr("d", (d) => line(d.values));

      lineHost.append("g").attr("class", "country-line-hover")
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
    });
  }

  const legend = scene.select(".country-legend");
  legend.selectAll("*").remove();
  legend.append("h4").attr("id", "country-legend-title").text("Click a country to isolate it");
  legend.append("p").attr("class", "legend-help").text("Choose one line to focus the timeline, or show all countries to reset.");
  const controls = legend.append("div").attr("class", "legend-controls");
  const buttons = controls.selectAll("button").data(countries).enter().append("button")
    .attr("type", "button")
    .attr("class", "country-button")
    .on("click", (_, country) => selectCountry(country));
  buttons.append("span").attr("class", "legend-swatch")
    .style("background-color", (country) => countryColor(country));
  buttons.append("span").text((country) => displayCountryLabel(country));

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
    selectedLabel.text(country ? `${displayCountryLabel(country)} selected` : "All countries shown");
    drawChart(country);
    renderCountryDetails(details.node(), country, data);
  }

  selectCountry(state.selectedCountry ?? null);
}
