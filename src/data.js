import * as d3 from "d3";
import rawCountryTotals from "../data/country_totals_raw.json";

const countries = ["Guatemala", "Honduras", "El Salvador", "Mexico", "Ecuador", "Nicaragua", "India", "Other"];
const featuredCountries = countries.slice(0, -1);

function aggregateOtherCountries(rawTotals) {
  const individualCountries = rawTotals
    .filter((row) => !featuredCountries.includes(row.country) && row.count > 100)
    .sort((a, b) => d3.descending(a.count, b.count));
  const lowCountTotal = d3.sum(
    rawTotals.filter((row) => !featuredCountries.includes(row.country) && row.count < 100),
    (row) => row.count
  );

  return [
    ...individualCountries,
    { country: "Other", count: lowCountTotal }
  ];
}

export async function loadData() {
  const files = [
    "manifest.json",
    "monthly_summary.json",
    "country_totals.json",
    "sponsor_category_totals.json",
    "derived_summary.json"
  ];
  const [manifest, monthly, countryTotals, sponsorTotals, derived] = await Promise.all(files.map((file) => d3.json("./data/" + file)));

  const months = monthly.map((row) => ({
    month: d3.timeParse("%Y-%m")(row.month), entries: +row.entries, countries: Object.fromEntries(countries.map((country) => [country, +(row.countryCounts[country] ?? 0)]))
  }));

  const normalizedCountries = [...featuredCountries.map((country) => ({ country, count: +(countryTotals.find((row) => row.country === country)?.count ?? 0) })), { country: "Other", count: d3.sum(countryTotals.filter((row) => !featuredCountries.includes(row.country)), (row) => +row.count) }];

  const labels = new Map(manifest.sponsorCategories.map((row) => [row.id, row.label]));
  const normalizedSponsors = sponsorTotals.map((row) => ({ sponsorCategory: row.sponsorCategory, label: labels.get(row.sponsorCategory) ?? row.label, count: +row.count }));
  const sponsorTotalsByCategory = Object.fromEntries(normalizedSponsors.map((row) => [row.sponsorCategory, row.count]));

  const countryDetails = Object.fromEntries(countries.map((country) => { const gender = derived.countryByGender[country], sponsors = derived.countryBySponsor[country]; return [country, { country, total: d3.sum(Object.values(gender)), gender, sponsors }]; }));
  const otherCountryTotals = aggregateOtherCountries(rawCountryTotals.map((row) => ({ country: row.country, count: +row.count })));

  return {
    manifest,
    months,
    countryTotals: normalizedCountries,
    countryTotalsRaw: rawCountryTotals.map((row) => ({ country: row.country, count: +row.count })),
    otherCountryTotals,
    sponsorTotals: normalizedSponsors,
    sponsorTotalsByCategory,
    genderTotals: derived.genders,
    countryDetails,
    featuredCountries: countries
  };
}
