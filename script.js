function evaluateVariable() {
  const variableName = document.getElementById("variableName").value || "This variable";
  const baseline = document.getElementById("baseline").value;
  const mediator = document.getElementById("mediator").value;
  const collider = document.getElementById("collider").value;
  const exposureOnly = document.getElementById("exposureOnly").value;
  const severity = document.getElementById("severity").value;
  const confounder = document.getElementById("confounder").value;
  const result = document.getElementById("result");

  if (!baseline || !mediator || !collider || !exposureOnly || !severity || !confounder) {
    result.innerHTML = "<p>Please answer all questions.</p>";
    return;
  }

  if (baseline === "no") {
    result.innerHTML = `<h3>${variableName}</h3><p><strong>Recommendation:</strong> Do not include in the propensity score model.</p><p><strong>Reason:</strong> The variable does not reflect baseline status at treatment selection.</p>`;
    return;
  }

  if (mediator === "yes") {
    result.innerHTML = `<h3>${variableName}</h3><p><strong>Recommendation:</strong> Do not include in the propensity score model.</p><p><strong>Reason:</strong> The variable may be a mediator.</p>`;
    return;
  }

  if (collider === "yes") {
    result.innerHTML = `<h3>${variableName}</h3><p><strong>Recommendation:</strong> Do not include in the propensity score model.</p><p><strong>Reason:</strong> Adjusting for it may distort the treatment-outcome relationship.</p>`;
    return;
  }

  if (exposureOnly === "yes") {
    result.innerHTML = `<h3>${variableName}</h3><p><strong>Recommendation:</strong> Do not include in the propensity score model.</p><p><strong>Reason:</strong> The variable appears related to treatment choice only, without an independent relationship to outcome.</p>`;
    return;
  }

  if (confounder === "yes" || severity === "yes") {
    result.innerHTML = `<h3>${variableName}</h3><p><strong>Recommendation:</strong> Include or strongly consider including in the propensity score model.</p><p><strong>Reason:</strong> The variable is consistent with a confounder candidate and/or a proxy for baseline severity or anatomical complexity.</p>`;
    return;
  }

  result.innerHTML = `<h3>${variableName}</h3><p><strong>Recommendation:</strong> Use clinical judgment.</p><p><strong>Reason:</strong> The variable does not clearly fit a major inclusion or exclusion category.</p>`;
}
