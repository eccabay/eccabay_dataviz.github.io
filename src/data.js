import * as d3 from "d3";

const countries = ["Guatemala","Honduras","El Salvador","Mexico","Ecuador","Nicaragua","India","Other"];

export async function loadData() {
  const files = ["manifest.json","monthly_summary.json","country_totals.json","sponsor_category_totals.json","derived_summary.json"];
  const [manifest, monthly, countryTotals, sponsorTotals, derived] = await Promise.all(files.map((file) => d3.json("/data/" + file)));
  const months = monthly.map((row) => ({ month:d3.timeParse("%Y-%m")(row.month), entries:+row.entries, countries:Object.fromEntries(countries.map((country) => [country, +(row.countryCounts[country] ?? 0)])) }));
  const featuredCountries = countries.slice(0, -1);
  const normalizedCountries = [...featuredCountries.map((country) => ({ country, count:+(countryTotals.find((row) => row.country === country)?.count ?? 0) })), { country:"Other", count:d3.sum(countryTotals.filter((row) => !featuredCountries.includes(row.country)), (row) => +row.count) }];
  const labels = new Map(manifest.sponsorCategories.map((row) => [row.id,row.label]));
  const normalizedSponsors = sponsorTotals.map((row) => ({ sponsorCategory:row.sponsorCategory, label:labels.get(row.sponsorCategory) ?? row.label, count:+row.count }));
  const countryDetails = Object.fromEntries(countries.map((country) => { const gender=derived.countryByGender[country], sponsors=derived.countryBySponsor[country]; return [country,{ country,total:d3.sum(Object.values(gender)),gender,sponsors }]; }));
  const otherCountryTotals = countryTotals
    .filter((row) => !featuredCountries.includes(row.country))
    .map((row) => ({ country: row.country, count: +row.count }))
    .sort((a, b) => d3.descending(a.count, b.count));
  return { manifest, months, countryTotals:normalizedCountries, countryTotalsRaw:countryTotals.map((row) => ({ country: row.country, count: +row.count })), otherCountryTotals, sponsorTotals:normalizedSponsors, genderTotals:derived.genders, countryDetails, featuredCountries:countries };
}
