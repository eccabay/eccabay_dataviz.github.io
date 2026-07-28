import { readFile } from "node:fs/promises";

const expectedCountries = [
  "Guatemala", "Honduras", "El Salvador", "Mexico",
  "Ecuador", "Nicaragua", "India", "Other"
];
const featuredCountries = expectedCountries.slice(0, -1);
const expectedAnnotations = ["2016-11-08", "2017-01-20", "2020-11-03", "2021-01-20"];
const rawBreakdownLabel = "Countries with fewer than 100 total migrant children";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const check = (condition, message) => {
  if (!condition) throw new Error(message);
};

const [manifest, monthly, countryTotals, rawCountryTotals, derived, validation] = await Promise.all([
  readJson("data/manifest.json"), readJson("data/monthly_summary.json"),
  readJson("data/country_totals.json"), readJson("data/country_totals_raw.json"),
  readJson("data/derived_summary.json"), readJson("data/validation_report.json")
]);

check(validation.rows_kept === 553308, "Expected 553,308 valid records.");
check(validation.output_counts.monthly_records === 101, "Expected 101 monthly records.");
check(monthly.length === 101, "monthly_summary.json must contain 101 rows.");
check(monthly[0]?.month === "2015-01", "Monthly data must start at 2015-01.");
check(monthly.at(-1)?.month === "2023-05", "Monthly data must end at 2023-05.");
check(manifest.fullStoryWindow.start === "2015-01-01" && manifest.fullStoryWindow.end === "2023-05-31", "Manifest full-story window is incorrect.");

const countryCounts = new Map(countryTotals.map(({ country, count }) => [country, Number(count)]));
const otherTotal = countryTotals.filter(({ country }) => !featuredCountries.includes(country)).reduce((total, { count }) => total + Number(count), 0);
check(otherTotal === 15291, `Expected Other aggregate to total 15,291; received ${otherTotal}.`);
check(featuredCountries.every((country) => countryCounts.has(country)), "Country totals are missing a featured country.");

const rawCounts = rawCountryTotals.map(({ country, count }) => ({ country, count: Number(count) }));
const rawAbove = rawCounts.filter(({ count }) => count > 100);
const rawBelow = rawCounts.filter(({ count }) => count < 100);
const rawExact = rawCounts.filter(({ count }) => count === 100);
check(rawCounts.length === 112, `Expected 112 raw country totals; received ${rawCounts.length}.`);
check(rawAbove.length === 25, `Expected 25 raw countries above the cutoff; received ${rawAbove.length}.`);
check(rawBelow.length === 87, `Expected 87 raw countries below the cutoff; received ${rawBelow.length}.`);
check(rawExact.length === 0, "No raw country totals should land exactly on the cutoff.");
check(rawBelow.reduce((total, { count }) => total + count, 0) === 1168, "Expected the low-count bucket to total 1,168 children.");

const visibleOtherBreakdown = rawCounts.filter(({ country, count }) => !featuredCountries.includes(country) && count > 100);
const hiddenOtherBreakdown = rawCounts.filter(({ country, count }) => !featuredCountries.includes(country) && count < 100);
check(visibleOtherBreakdown.length === 18, `Expected 18 non-featured countries above the cutoff; received ${visibleOtherBreakdown.length}.`);
check(hiddenOtherBreakdown.reduce((total, { count }) => total + count, 0) === 1168, "Scene 3 low-count bucket should total 1,168 children.");
check(!visibleOtherBreakdown.some(({ country }) => country === "Other"), "Scene 3 breakdown must not contain a recursive Other row.");

const expectedKeys = expectedCountries.slice().sort().join("|");
check(Object.keys(derived.countryByGender).sort().join("|") === expectedKeys, "Derived gender summaries have incorrect country keys.");
check(Object.keys(derived.countryBySponsor).sort().join("|") === expectedKeys, "Derived sponsor summaries have incorrect country keys.");

const [indexHtml, helpers, sceneTwo, sceneThree, main] = await Promise.all([
  readFile("index.html", "utf8"), readFile("src/helpers.js", "utf8"),
  readFile("src/scene-two.js", "utf8"), readFile("src/scene-three.js", "utf8"),
  readFile("src/main.js", "utf8")
]);
check(indexHtml.includes('<script type="module" src="./src/main.js"></script>'), "index.html must load src/main.js.");
check(indexHtml.includes("Countries with more than 100 total children are listed individually"), "Scene 3 copy must explain the new threshold.");
check(main.includes('renderNextButton(sceneOne.select(".scene-actions")'), "Scene 1 Next button is not wired.");
check(main.includes('renderNextButton(sceneTwo.select(".scene-actions")'), "Scene 2 Next button is not wired.");
check(helpers.includes('export const TIMELINE_ANNOTATIONS'), "Shared timeline annotations must live in helpers.js.");
for (const date of expectedAnnotations) {
  check(helpers.includes(date), `helpers.js is missing annotation date ${date}.`);
}
check(sceneThree.includes('renderTimeline('), "Scene 3 must render the chart through renderTimeline.");
check(sceneThree.includes('on("click", (_, country) => selectCountry(country))'), "Country selection is not wired.");
check(sceneThree.includes('on("click", () => selectCountry(null))'), "Show-all reset is not wired.");
check(sceneThree.includes('Countries with more than 100 total children are listed individually'), "Scene 3 breakdown note is missing.");
check(indexHtml.includes(rawBreakdownLabel), "Scene 3 must include the low-count aggregate label.");

console.log("Integration validation passed:");
console.log("- 553,308 valid records and 101 monthly records confirmed.");
console.log("- Full story window, featured countries, raw-country cutoff split, and Other aggregation confirmed.");
console.log("- Shared timeline helper, navigation, annotations, country selection, reset wiring, and Scene 3 copy confirmed.");
