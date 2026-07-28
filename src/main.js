import * as d3 from "d3";
import { loadData } from "./data.js";
import { renderNextButton } from "./helpers.js";
import { renderSceneOne } from "./scene-one.js";
import { renderSceneTwo } from "./scene-two.js";
import { renderSceneThree } from "./scene-three.js";

const state = { currentScene: 0, selectedCountry: null };
const app = d3.select(".page-shell");
const progress = d3.select("#progress");
const errorMessage = d3.select("#app-error");
const scenes = d3.selectAll(".scene");

function showScene(index, { focus = true } = {}) {
  state.currentScene = index;
  scenes
    .classed("is-active", (_, i) => i === index)
    .attr("inert", (_, i) => i === index ? null : "");
  if (focus) {
    d3.select(scenes.nodes()[index]).select("h2").node()?.focus();
  }
}

const data = await loadData();
const sceneOne = d3.select("#scene-one");
const sceneTwo = d3.select("#scene-two");
const sceneThree = d3.select("#scene-three");

renderSceneOne(sceneOne.node(), data);
renderNextButton(sceneOne.select(".scene-actions").node(), "When did they come?", () => showScene(1));
renderSceneTwo(sceneTwo.node(), data);
renderNextButton(sceneTwo.select(".scene-actions").node(), "How did this change over time?", () => showScene(2));
renderSceneThree(sceneThree.node(), data, state);
showScene(0, { focus: false });
