/**
 * Run with:
 *   node advanced_js_mapping/tests_js/loading.test.js
 */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const jsDir = path.join(__dirname, "..", "static", "advanced_js_mapping", "js");

function element(id) {
    return {
        id,
        hidden: true,
        textContent: "",
        className: "",
        innerHTML: "",
        scrollTop: 0,
    };
}

const elements = {};
["resultsPanel", "resultsCount", "statsPanel", "loadingStatus", "loadingMessage",
    "totalPopulation", "avgGDP", "countriesCount", "queryTime"].forEach((id) => {
    elements[id] = element(id);
});

const listeners = [];
const documentStub = {
    getElementById(id) {
        return elements[id] || null;
    },
    querySelectorAll() {
        return [];
    },
    addEventListener(type, handler) {
        listeners.push({ target: "document", type, handler });
    },
};

const windowStub = {
    addEventListener(type, handler) {
        listeners.push({ target: "window", type, handler });
    },
    document: documentStub,
};
windowStub.window = windowStub;

global.window = windowStub;
global.document = documentStub;

function loadScript(filename) {
    const source = fs.readFileSync(path.join(jsDir, filename), "utf8");
    vm.runInThisContext(source, { filename });
}

let passed = 0;
function test(name, fn) {
    fn();
    passed += 1;
    console.log("ok", name);
}

loadScript("ui-controls.js");
loadScript("spatial-analysis.js");
loadScript("map-interface.js");

const { UIControls, SpatialAnalysis, AdvancedMapping } = global.window;

test("mapping scripts expose their modules", () => {
    assert.equal(typeof UIControls.init, "function");
    assert.equal(typeof UIControls.showLoading, "function");
    assert.equal(typeof UIControls.hideLoading, "function");
    assert.equal(typeof SpatialAnalysis.validateCoordinates, "function");
    assert.equal(typeof AdvancedMapping.init, "function");
    assert.equal(typeof AdvancedMapping.exportResults, "function");
});

test("UI controls initialise and find the loading elements", () => {
    UIControls.init();
    assert.equal(UIControls.elements.loadingStatus, elements.loadingStatus);
    assert.equal(UIControls.elements.loadingMessage, elements.loadingMessage);
});

test("showLoading reveals the status and sets the message", () => {
    UIControls.showLoading("Searching for cities...");
    assert.equal(elements.loadingStatus.hidden, false);
    assert.equal(elements.loadingMessage.textContent, "Searching for cities...");
});

test("hideLoading hides the status again", () => {
    UIControls.hideLoading();
    assert.equal(elements.loadingStatus.hidden, true);
});

test("polygon coordinates must contain at least three numeric pairs", () => {
    assert.equal(SpatialAnalysis.validateCoordinates([[-6.3, 53.3], [-6.2, 53.4], [-6.1, 53.2]]), true);
    assert.equal(SpatialAnalysis.validateCoordinates([[-6.3, 53.3]]), false);
    assert.equal(SpatialAnalysis.validateCoordinates("not coordinates"), false);
    assert.equal(SpatialAnalysis.validateCoordinates([[200, 53.3], [0, 0], [1, 1]]), false);
});

console.log(`\n${passed} tests passed`);
