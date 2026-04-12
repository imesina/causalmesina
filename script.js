const exposureInput = document.getElementById("exposure");
const outcomeInput = document.getElementById("outcome");
const variableInput = document.getElementById("variableName");

const liveExposure = document.getElementById("liveExposure");
const liveOutcome = document.getElementById("liveOutcome");
const liveVariable = document.getElementById("liveVariable");

const startBtn = document.getElementById("startBtn");

const introStep = document.getElementById("introStep");
const step1 = document.getElementById("step1");
const step2 = document.getElementById("step2");
const resultCard = document.getElementById("resultCard");

let decisionPath = [];

function updateLiveSummary() {
  liveExposure.textContent = exposureInput.value.trim() || "Not entered";
  liveOutcome.textContent = outcomeInput.value.trim() || "Not entered";
  liveVariable.textContent = variableInput.value.trim() || "Not entered";

  liveExposure.classList.toggle("muted", !exposureInput.value.trim());
  liveOutcome.classList.toggle("muted", !outcomeInput.value.trim());
  liveVariable.classList.toggle("muted", !variableInput.value.trim());
}

function getContextValues() {
  return {
    exposure: exposureInput.value.trim(),
    outcome: outcomeInput.value.trim(),
    variable: variableInput.value.trim()
  };
}

function validateStart() {
  const { exposure, outcome, variable } = getContextValues();

  if (!exposure || !outcome || !variable) {
    showInlineResult({
      type: "exclude",
      kicker: "Missing context",
      title: "Complete the study context first",
      body: "Please enter the exposure, outcome, and variable under review before starting the screening flow.",
      path: []
    });
    return false;
  }

  resultCard.className = "result-card hidden";
  resultCard.innerHTML = "";
  return true;
}

function showStep(stepToShow) {
  introStep.classList.add("hidden");
  step1.classList.add("hidden");
  step2.classList.add("hidden");
  resultCard.classList.add("hidden");

  stepToShow.classList.remove("hidden");
}

function showInlineResult({ type, kicker, title, body, path }) {
  introStep.classList.add("hidden");
  step1.classList.add("hidden");
  step2.classList.add("hidden");

  resultCard.className = `result-card ${type}`;
  resultCard.classList.remove("hidden");

  const pathHtml = path.length
    ? `
      <div class="result-path">
        <strong>Reasoning path</strong>
        <ul>
          ${path.map(item => `<li>${item}</li>`).join("")}
        </ul>
      </div>
    `
    : "";

  resultCard.innerHTML = `
    <div class="result-kicker">${kicker}</div>
    <h3>${title}</h3>
    <p>${body}</p>
    ${pathHtml}
    <button class="restart-btn" onclick="restartFlow()">Start over</button>
  `;
}

function handleStep1(answer) {
  const { variable } = getContextValues();

  if (answer === "no") {
    decisionPath.push(
      `${variable} did not satisfy baseline eligibility because it does not clearly reflect status established when treatment selection occurred.`
    );

    showInlineResult({
      type: "exclude",
      kicker: "Recommendation",
      title: `Do not include ${variable} in the propensity score model`,
      body: "This variable failed the baseline check. Variables arising only after treatment initiation or defined using post-treatment information should not be included in the propensity score model.",
      path: decisionPath
    });
    return;
  }

  decisionPath.push(
    `${variable} passed the baseline eligibility check and appears to reflect status established when treatment selection occurred.`
  );

  showStep(step2);
}

function handleStep2(answer) {
  const { variable } = getContextValues();

  if (answer === "yes") {
    decisionPath.push(
      `${variable} was classified as part of the mechanism through which treatment may affect the outcome.`
    );

    showInlineResult({
      type: "exclude",
      kicker: "Recommendation",
      title: `Do not include ${variable} in the propensity score model`,
      body: "This variable appears consistent with mediation. A variable that lies on the pathway by which treatment may affect the outcome should not be included in the propensity score model.",
      path: decisionPath
    });
    return;
  }

  decisionPath.push(
    `${variable} was not classified as a mediator in relation to the specified exposure and outcome.`
  );

  showInlineResult({
    type: "continue",
    kicker: "Progress update",
    title: `${variable} passed the first two screening steps`,
    body: "This variable has passed the baseline and mediation checks. The next version can continue with collider-type assessment, exposure-only exclusion, severity/anatomical complexity, and structural confounding evaluation.",
    path: decisionPath
  });
}

function restartFlow() {
  decisionPath = [];
  resultCard.className = "result-card hidden";
  resultCard.innerHTML = "";
  step1.classList.add("hidden");
  step2.classList.add("hidden");
  introStep.classList.remove("hidden");
}

startBtn.addEventListener("click", () => {
  updateLiveSummary();

  if (!validateStart()) return;

  decisionPath = [];
  showStep(step1);
});

exposureInput.addEventListener("input", updateLiveSummary);
outcomeInput.addEventListener("input", updateLiveSummary);
variableInput.addEventListener("input", updateLiveSummary);

updateLiveSummary();
