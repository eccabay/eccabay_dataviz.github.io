import { csvParse } from "d3-dsv";
import { readFile, writeFile } from "node:fs/promises";

const featured = ["Guatemala", "Honduras", "El Salvador", "Mexico", "Ecuador", "Nicaragua", "India"];
const countries = [...featured, "Other"];
const genders = ["M", "F"];
const sponsors = ["1", "2", "3", "4"];

const rows = csvParse(await readFile("data/raw_data.csv", "utf8"));
const rawCountryTotalsMap = new Map();
const seen = new Set();
const genderTotals = Object.fromEntries(genders.map((key) => [key, 0]));
const countryByGender = Object.fromEntries(countries.map((country) => [country, Object.fromEntries(genders.map((key) => [key, 0]))]));
const countryBySponsor = Object.fromEntries(countries.map((country) => [country, Object.fromEntries(sponsors.map((key) => [key, 0]))]));

const countryOf = (value) => featured.find((name) => name.toLowerCase() === value.trim().replace(/\s+/g, " ").toLowerCase()) ?? "Other";
const parseDate = (value) => { const [month, day, year] = value.split("/").map(Number); return month && day && year ? new Date(Date.UTC(year < 100 ? year + 2000 : year, month - 1, day)) : null; };

for (const row of rows) {
  const country = row["Child's Country of Origin"]?.trim();
  if (country) {
    rawCountryTotalsMap.set(country, (rawCountryTotalsMap.get(country) ?? 0) + 1);
  }

  const id = row.ID.trim(), zip = row["Sponsor Zipcode"].trim(), entry = parseDate(row["Child's Date of Entry"]), release = parseDate(row["Child's Date of Release"]), gender = row["Child's Gender"].trim().toUpperCase(), sponsor = row["Sponsor Category"].trim() || "4";
  if (!id || !zip || zip.toLowerCase() === "nan" || seen.has(id) || !entry || !release || release < entry || !genders.includes(gender) || !sponsors.includes(sponsor)) continue;
  seen.add(id);
  const normalizedCountry = countryOf(row["Child's Country of Origin"]);
  genderTotals[gender]++;
  countryByGender[normalizedCountry][gender]++;
  countryBySponsor[normalizedCountry][sponsor]++;
}

const rawCountryTotals = [...rawCountryTotalsMap.entries()]
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([country, count]) => ({ country, count }));

await writeFile("data/country_totals_raw.json", `${JSON.stringify(rawCountryTotals)}\n`);
await writeFile("data/derived_summary.json", `${JSON.stringify({ schemaVersion: 1, window: { start: "2015-01-01", end: "2023-05-31" }, genders: genderTotals, countryByGender, countryBySponsor })}\n`);
console.log(`Wrote data/country_totals_raw.json and data/derived_summary.json from ${seen.size} valid unique rows.`);
