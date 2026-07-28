import * as d3 from "d3";
import { countryColor, renderBars, renderGender, sponsorColor } from "./helpers.js";

export function renderSceneOne(root, data) {
  const scene = d3.select(root);

  renderBars(scene.select(".country-chart").node(), [...data.countryTotals]
    .sort((a, b) => {
      if (a.country === "Other") return 1;
      if (b.country === "Other") return -1;
      return d3.descending(a.count, b.count);
    })
    .map((d) => ({ label: d.country, value: d.count, color: countryColor(d.country) })), "#2f4f9f", "Country of origin totals");

  renderGender(scene.select(".gender-chart").node(), data.genderTotals);
  
  renderBars(scene.select(".sponsor-chart").node(), [...data.sponsorTotals]
    .sort((a, b) => d3.descending(a.count, b.count))
    .map((d) => ({ label: d.label, value: d.count, color: sponsorColor(d.label) })), sponsorColor("Parent"), "Sponsor category totals");
}
