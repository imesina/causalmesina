const exposureInput = document.getElementById("exposure");
const outcomeInput = document.getElementById("outcome");
const variableInput = document.getElementById("variableName");

const lockContextBtn = document.getElementById("lockContextBtn");
const beginVariableBtn = document.getElementById("beginVariableBtn");
const showSummaryBtn = document.getElementById("showSummaryBtn");
const resetSessionBtn = document.getElementById("resetSessionBtn");

const liveExposure = document.getElementById("liveExposure");
const liveOutcome = document.getElementById("liveOutcome");
const liveVariable = document.getElementById("liveVariable");
const liveCount = document.getElementById("liveCount");

const variableEntry = document.getElementById("variableEntry");
const questionCard = document.getElementById("questionCard");
const resultCard = document.getElementById("resultCard");
const summaryCard = document.getElementById("summaryCard");

const stepMeta = document.getElementById("stepMeta");
const stepTitle = document.getElementById("stepTitle");
const stepQuestion = document.getElementById("stepQuestion");
const stepHelp = document.getElementById("stepHelp");

const yesBtn = document.getElementById("yesBtn");
const noBtn = document.getElementById("noBtn");

let studyContextLocked = false;
let decisionPath = [];
let variableResults = [];
let currentVariable = "";
let currentStepIndex = 0;

const steps = [
  {
    id: "baseline",
    meta: "Step 1 of 6",
    title: "Baseline check",
    question:
      "Does the variable reflect baseline status or a clinical feature already established when treatment selection occurred?",
    help:
      "If the variable arose only after treatment initiation or was defined using post-treatment information, do not include it in the propensity score model.",
    onYes: () => {
      decisionPath.push(
        `${currentVariable} passed the baseline eligibility check and appears to reflect status established when treatment selection occurred.`
      );
      goToStep(1);
    },
    onNo: () => {
      decisionPath.push(
        `${currentVariable} failed the baseline eligibility check because it does not clearly reflect status established when treatment selection occurred.`
      );
      finalizeVariable({
        classification: "Do not include in PS model",
        badge: "exclude",
        kicker: "Recommendation",
        title: `Do not include ${currentVariable} in the propensity score model`,
        body:
          "This variable failed the baseline check. Variables arising only after treatment initiation or defined using post-treatment information should not be included in the propensity score model."
      });
    }
  },
  {
    id: "mediator",
    meta: "Step 2 of 6",
    title: "Mediator check",
    question:
      "Is the variable part of the mechanism through which treatment may affect the outcome?",
    help:
      "If yes, the variable may function as a mediator and should not be included in the propensity score model.",
    onYes: () => {
      decisionPath.push(
        `${currentVariable} was classified as part of the mechanism through which treatment may affect the outcome.`
      );
      finalizeVariable({
        classification: "Do not include in PS model",
        badge: "exclude",
        kicker: "Recommendation",
        title: `Do not include ${currentVariable} in the propensity score model`,
        body:
          "This variable appears consistent with mediation. A variable that lies on the pathway by which treatment may affect the outcome should not be included in the propensity score model."
      });
    },
    onNo: () => {
      decisionPath.push(
        `${currentVariable} was not classified as a mediator in relation to the specified exposure and outcome.`
      );
      goToStep(2);
    }
  },
  {
    id: "collider",
    meta: "Step 3 of 6",
    title: "Collider-type check",
    question:
      "Is the variable shaped by both treatment selection and downstream clinical events such that adjustment could distort the treatment-outcome relationship?",
    help:
      "If yes, do not include it in the propensity score model.",
    onYes: () => {
      decisionPath.push(
        `${currentVariable} was considered vulnerable to collider-type bias because it may be shaped by both treatment selection and downstream clinical events.`
      );
      finalizeVariable({
        classification: "Do not include in PS model",
        badge: "exclude",
        kicker: "Recommendation",
        title: `Do not include ${currentVariable} in the propensity score model`,
        body:
          "Adjusting for this variable could distort the treatment-outcome relationship."
      });
    },
    onNo: () => {
      decisionPath.push(
        `${currentVariable} was not classified as a collider-type variable at this stage.`
      );
      goToStep(3);
    }
  },
  {
    id: "exposureOnly",
    meta: "Step 4 of 6",
    title: "Exposure-only check",
    question:
      "Does the variable influence treatment selection without a plausible independent relationship to outcome?",
    help:
      "If yes, do not include it in the propensity score model.",
    onYes: () => {
      decisionPath.push(
        `${currentVariable} appears to influence treatment selection without a plausible independent relationship to outcome.`
      );
      finalizeVariable({
        classification: "Do not include in PS model",
        badge: "exclude",
        kicker: "Recommendation",
        title: `Do not include ${currentVariable} in the propensity score model`,
        body:
          "This variable appears related to treatment choice only, without a plausible independent relationship to outcome."
      });
    },
    onNo: () => {
      decisionPath.push(
        `${currentVariable} was not classified as an exposure-only predictor.`
      );
      goToStep(4);
    }
  },
  {
    id: "severity",
    meta: "Step 5 of 6",
    title: "Severity / indication check",
    question:
      "Is the variable a proxy for baseline disease severity or anatomical complexity?",
    help:
      "If yes, strong consideration should be given to inclusion, particularly if outcome relevance is also plausible.",
    onYes: () => {
      decisionPath.push(
        `${currentVariable} appears to function as a proxy for baseline disease severity or anatomical complexity.`
      );
      goToStep(5, { severityYes: true });
    },
    onNo: () => {
      decisionPath.push(
        `${currentVariable} was not identified as a proxy for baseline disease severity or anatomical complexity.`
      );
      goToStep(5, { severityYes: false });
    }
  },
  {
    id: "structural",
    meta: "Step 6 of 6",
    title: "Structural confounding check",
    question:
      "Does the variable plausibly influence both treatment selection and outcome?",
    help:
      "If yes, it should generally be included or strongly considered for inclusion.",
    onYes: () => {
      decisionPath.push(
        `${currentVariable} plausibly influences both treatment selection and outcome.`
      );
      finalizeVariable({
        classification: "Include or strongly consider including in PS model",
        badge: "include",
        kicker: "Recommendation",
        title: `Include or strongly consider including ${currentVariable} in the propensity score model`,
        body:
          "This variable is consistent with a confounder candidate under the current exposure-outcome framework."
      });
    },
    onNo: () => {
      decisionPath.push(
        `${currentVariable} was not judged to plausibly influence both treatment selection and outcome.`
      );

      const severityTriggered = decisionPath.some(item =>
        item.includes("proxy for baseline disease severity or anatomical complexity")
      );

      if (severityTriggered) {
        finalizeVariable({
          classification: "Use caution / consider inclusion with strong justification",
          badge: "caution",
          kicker: "Recommendation",
          title: `Use caution with ${currentVariable}`,
          body:
            "This variable was flagged as a possible proxy for severity or anatomical complexity, but it was not clearly judged to influence both treatment selection and outcome. Clinical justification is needed."
        });
      } else {
        finalizeVariable({
          classification: "Use clinical judgment / not clearly prioritized for PS model",
          badge: "caution",
          kicker: "Recommendation",
          title: `${currentVariable} is not clearly prioritized for the propensity score model`,
          body:
            "This variable did not meet the major exclusion criteria, but it also was not clearly identified as a structural confounder candidate. Use clinical judgment."
        });
      }
    }
  }
];

function updateLiveSummary() {
  liveExposure.textContent = exposureInput.value.trim() || "Not entered";
  liveOutcome.textContent = outcomeInput.value.trim() || "Not entered";
  liveVariable.textContent = variableInput.value.trim() || "Not entered";
  liveCount.textContent = variableResults.length.toString();

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

function hideAllMainCards() {
  variableEntry.classList.add("hidden");
  questionCard.classList.add("hidden");
  resultCard.classList.add("hidden");
  summaryCard.classList.add("hidden");
}

function showVariableEntry() {
  hideAllMainCards();
  variableEntry.classList.remove("hidden");
  updateLiveSummary();
}

function lockStudyContext() {
  const exposure = exposureInput.value.trim();
  const outcome = outcomeInput.value.trim();

  if (!exposure || !outcome) {
    alert("Please enter both the exposure and the outcome before locking the study context.");
    return;
  }

  studyContextLocked = true;
  exposureInput.disabled = true;
  outcomeInput.disabled = true;
  lockContextBtn.textContent = "Study context locked";
  lockContextBtn.disabled = true;
  updateLiveSummary();
}

function beginVariableScreening() {
  if (!studyContextLocked) {
    alert("Please lock the study context first.");
    return;
  }

  const variable = variableInput.value.trim();
  if (!variable) {
    alert("Please enter a variable name.");
    return;
  }

  currentVariable = variable;
  decisionPath = [];
  goToStep(0);
}

function goToStep(index) {
  currentStepIndex = index;
  hideAllMainCards();
  questionCard.classList.remove("hidden");

  const step = steps[index];
  stepMeta.textContent = step.meta;
  stepTitle.textContent = step.title;
  stepQuestion.textContent = step.question;
  stepHelp.textContent = step.help;

  yesBtn.onclick = step.onYes;
  noBtn.onclick = step.onNo;

  updateLiveSummary();
}

function finalizeVariable({ classification, badge, kicker, title, body }) {
  const { exposure, outcome } = getContextValues();

  variableResults.push({
    variable: currentVariable,
    classification,
    badge,
    exposure,
    outcome,
    path: [...decisionPath]
  });

  hideAllMainCards();
  resultCard.className = `result-card ${badge}`;
  resultCard.classList.remove("hidden");

  resultCard.innerHTML = `
    <div class="result-kicker">${kicker}</div>
    <h3>${title}</h3>
    <p>${body}</p>

    <div class="result-path">
      <strong>Reasoning path</strong>
      <ul>
        ${decisionPath.map(item => `<li>${item}</li>`).join("")}
      </ul>
    </div>

    <div class="action-row">
      <button class="primary-btn" id="screenAnotherBtn">Screen another variable</button>
      <button class="secondary-btn" id="viewSummaryBtn">View session summary</button>
    </div>
  `;

  document.getElementById("screenAnotherBtn").onclick = () => {
    currentVariable = "";
    variableInput.value = "";
    updateLiveSummary();
    showVariableEntry();
  };

  document.getElementById("viewSummaryBtn").onclick = renderSummary;

  updateLiveSummary();
}

function badgeHtml(type, label) {
  const map = {
    include: "badge badge-include",
    exclude: "badge badge-exclude",
    caution: "badge badge-caution"
  };

  return `<span class="${map[type] || "badge"}">${label}</span>`;
}

function renderSummary() {
  hideAllMainCards();
  summaryCard.classList.remove("hidden");

  if (variableResults.length === 0) {
    summaryCard.innerHTML = `
      <h3>Session summary</h3>
      <p>No variables have been screened yet.</p>
      <button class="restart-btn" onclick="showVariableEntry()">Back</button>
    `;
    return;
  }

  const rows = variableResults
    .map(
      item => `
        <tr>
          <td><strong>${item.variable}</strong></td>
          <td>${badgeHtml(item.badge, item.classification)}</td>
          <td>${item.path[0] || "—"}</td>
        </tr>
      `
    )
    .join("");

  summaryCard.innerHTML = `
    <h3>Session summary</h3>
    <p>
      Exposure: <strong>${exposureInput.value.trim()}</strong><br>
      Outcome: <strong>${outcomeInput.value.trim()}</strong>
    </p>

    <div class="summary-table-wrap">
      <table class="summary-table">
        <thead>
          <tr>
            <th>Variable</th>
            <th>Classification</th>
            <th>Initial rationale snapshot</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>

    <div class="action-row">
      <button class="primary-btn" id="addMoreVariablesBtn">Screen another variable</button>
      <button class="danger-btn" id="clearSessionBtn">Reset session</button>
    </div>
  `;

  document.getElementById("addMoreVariablesBtn").onclick = () => {
    variableInput.value = "";
    currentVariable = "";
    updateLiveSummary();
    showVariableEntry();
  };

  document.getElementById("clearSessionBtn").onclick = resetSession;
}

function resetSession() {
  if (!confirm("Reset the full session and erase all screened variables?")) return;

  studyContextLocked = false;
  decisionPath = [];
  variableResults = [];
  currentVariable = "";
  currentStepIndex = 0;

  exposureInput.disabled = false;
  outcomeInput.disabled = false;
  exposureInput.value = "";
  outcomeInput.value = "";
  variableInput.value = "";

  lockContextBtn.textContent = "Lock study context";
  lockContextBtn.disabled = false;

  updateLiveSummary();
  showVariableEntry();
}

lockContextBtn.addEventListener("click", lockStudyContext);
beginVariableBtn.addEventListener("click", beginVariableScreening);
showSummaryBtn.addEventListener("click", renderSummary);
resetSessionBtn.addEventListener("click", resetSession);

exposureInput.addEventListener("input", updateLiveSummary);
outcomeInput.addEventListener("input", updateLiveSummary);
variableInput.addEventListener("input", updateLiveSummary);

updateLiveSummary();
showVariableEntry();
