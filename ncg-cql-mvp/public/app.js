/**
 * app.js - Point-of-Care Clinical Decision Support Workstation Frontend
 *
 * Orchestrates:
 * 1. Dynamic Guideline Schema rendering across all 4 Lymphoma Pathways
 * 2. Mock Hospital EHR FHIR R4 Patient Lookup & LOINC Observation Derivation
 * 3. PDF & Clinical Report Upload, Snippet Extraction, and Clinician Confirmation Gate
 * 4. Point-of-Care Worksheet with Provenance Tracking & Live HL7 CQL Evaluation
 */

const state = {
  guidelines: [],
  activeGuidelineId: 'NCG_DLBCL_TREATMENT_2020',
  ehrPatients: [],
  sampleReports: [],
  syntheticManifest: [],
  activeFilter: 'all',

  // Active encounter state
  patient: {
    id: '',
    name: '',
    age: '',
    gender: 'male',
    mrn: '',
    abhaId: '',
    clinicalSummary: '',
    workflowHint: '',
  },
  ehrRawObservations: [],
  ehrRawBundle: null,

  // findings map: { [findingId]: { value, provenance, source, detail } }
  // source: 'ehr-derived' | 'ehr-coded' | 'report' | 'doctor' | 'bundle'
  findings: {},

  // Latest document extraction items
  extractedItems: [],
  extractionSourceTitle: '',

  // Latest CQL evaluation result
  lastEval: null,
};

// Recommended sample report pairing for hybrid EHR demo patients
const PATIENT_REPORT_PAIRING = {
  'PAT-1001': 'dlbcl_1l_nongcb_stage4',
  'PAT-1002': 'sample_fl_case_advanced_high_burden',
  'PAT-1003': 'dlbcl_rr_early_relapse_biopsy',
};

const STUDIO_URL = 'https://production.d240wmli0egez.amplifyapp.com/';

const GUIDELINE_DEFAULT_PATIENT = {
  NCG_DLBCL_TREATMENT_2020: 'PAT-1001',
  NCG_FL_2020: 'PAT-1002',
  NCG_DLBCL_RR_2020: 'PAT-1003',
  NCG_LYMPHOMA_WORKUP_2020: 'PAT-1004',
};

function syncGuidelineStudioLink() {
  const studioLink = document.getElementById('link-guideline-studio');
  if (studioLink && state.activeGuidelineId) {
    studioLink.href = `${STUDIO_URL}?guideline=${encodeURIComponent(state.activeGuidelineId)}`;
  }
}

function getActiveSchema() {
  const g = state.guidelines.find((x) => x.id === state.activeGuidelineId);
  return g?.schema || null;
}

function escapeHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================================
// INITIALIZATION
// ============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  setupDialogLightDismissFallback();
  bindStaticEvents();

  try {
    const [guidelinesRes, ehrRes, reportsRes, bundlesRes] = await Promise.all([
      fetch('/api/guidelines').then((r) => r.json()),
      fetch('/api/ehr/patients').then((r) => r.json()),
      fetch('/api/sample-reports').then((r) => r.json()),
      fetch('/api/bundles').then((r) => r.json()),
    ]);

    state.guidelines = guidelinesRes.guidelines || [];
    state.ehrPatients = ehrRes.patients || [];
    state.sampleReports = reportsRes.sampleReports || reportsRes.reports || [];
    state.syntheticManifest = bundlesRes.manifest || [];

    const casesBadge = document.getElementById('cases-count-badge');
    if (casesBadge && state.syntheticManifest.length) {
      casesBadge.textContent = String(state.syntheticManifest.length);
    }

    const urlGuideline = new URLSearchParams(window.location.search).get('guideline');
    if (urlGuideline && state.guidelines.some((g) => g.id === urlGuideline)) {
      state.activeGuidelineId = urlGuideline;
    }

    renderPathwayTabs();
    renderEhrQuickChips();
    populateSampleReportsDropdown();
    renderWorksheet();
    renderSyntheticCasesModal();
    syncGuidelineStudioLink();

    // Load default Point-of-Care EHR demo patient matching the active guideline on startup
    const initialPatientId = GUIDELINE_DEFAULT_PATIENT[state.activeGuidelineId] || 'PAT-1001';
    await pullPatientFromEhr(initialPatientId);
  } catch (err) {
    console.error('Initialization error:', err);
  }
});

// ============================================================================
// DIALOG LIGHT-DISMISS FALLBACK (per modern-web-guidance: light-dismiss-a-dialog)
// ============================================================================
function setupDialogLightDismissFallback() {
  if (!('closedBy' in HTMLDialogElement.prototype)) {
    document.querySelectorAll('dialog[closedby="any"]').forEach((dialog) => {
      let downOnBackdrop = false;
      dialog.addEventListener('pointerdown', (e) => {
        downOnBackdrop = e.target === dialog;
      });
      dialog.addEventListener('pointerup', (e) => {
        if (downOnBackdrop && e.target === dialog) dialog.close();
        downOnBackdrop = false;
      });
    });
  }
}

// ============================================================================
// PATHWAY / GUIDELINE TABS
// ============================================================================
function renderPathwayTabs() {
  const container = document.getElementById('pathway-tabs');
  if (!container) return;

  container.innerHTML = state.guidelines.map((g) => {
    const isActive = g.id === state.activeGuidelineId;
    const shortTitle = g.shortTitle || g.schema?.shortTitle || g.title;
    const fCount = g.findingsCount || g.schema?.findings?.length || 0;
    return `
      <button
        type="button"
        role="tab"
        aria-selected="${isActive ? 'true' : 'false'}"
        class="pathway-tab ${isActive ? 'active' : ''}"
        data-guideline-id="${escapeHtml(g.id)}"
      >
        <span>${escapeHtml(shortTitle)}</span>
        <span class="pathway-tab-badge">${fCount} findings</span>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.pathway-tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-guideline-id');
      if (targetId && targetId !== state.activeGuidelineId) {
        switchGuideline(targetId, { preservePatient: true });
      }
    });
  });
}

async function switchGuideline(guidelineId, { preservePatient = false } = {}) {
  state.activeGuidelineId = guidelineId;
  state.extractedItems = [];
  state.extractionSourceTitle = '';
  document.getElementById('extraction-review-box')?.classList.add('hidden');

  renderPathwayTabs();
  populateSampleReportsDropdown();
  syncGuidelineStudioLink();

  if (preservePatient && state.patient.id && state.ehrPatients.some((p) => p.id === state.patient.id)) {
    // Re-derive EHR findings for the newly selected guideline if an EHR patient is active
    await pullPatientFromEhr(state.patient.id, { forceGuidelineId: guidelineId });
    return;
  }

  if (!preservePatient) {
    state.findings = {};
  }
  renderWorksheet();
  await evaluateCurrentWorksheet();
}

// ============================================================================
// STEP 1: MOCK EHR (FHIR R4) PATIENT LOOKUP
// ============================================================================
function renderEhrQuickChips() {
  const container = document.getElementById('ehr-patient-chips');
  if (!container) return;

  const shortGuidelineTag = {
    NCG_DLBCL_TREATMENT_2020: 'DLBCL 1L',
    NCG_FL_2020: 'FL 1L',
    NCG_DLBCL_RR_2020: 'R/R DLBCL',
    NCG_LYMPHOMA_WORKUP_2020: 'Workup',
  };

  container.innerHTML = state.ehrPatients.map((p) => {
    const isActive = state.patient.id === p.id;
    const gTag = shortGuidelineTag[p.defaultGuidelineId] || p.defaultGuidelineId;
    return `
      <button
        type="button"
        class="patient-chip ${isActive ? 'active' : ''}"
        data-patient-id="${escapeHtml(p.id)}"
        title="${escapeHtml(p.clinicalSummary)}"
      >
        <div class="patient-chip-top">
          <span class="patient-chip-id">${escapeHtml(p.id)}</span>
          <span>${escapeHtml(p.name)} (${p.age}${p.gender === 'female' ? 'F' : 'M'})</span>
        </div>
        <div class="patient-chip-sub">${escapeHtml(gTag)} ·MRN ${escapeHtml(p.mrn)}</div>
      </button>
    `;
  }).join('');

  container.querySelectorAll('.patient-chip').forEach((chip) => {
    chip.addEventListener('click', () => {
      const pid = chip.getAttribute('data-patient-id');
      if (pid) {
        const input = document.getElementById('patient-id-input');
        if (input) input.value = pid;
        pullPatientFromEhr(pid);
      }
    });
  });
}

async function pullPatientFromEhr(patientIdQuery, { forceGuidelineId = null } = {}) {
  const cleanQuery = String(patientIdQuery || '').trim();
  if (!cleanQuery) return;

  const btn = document.getElementById('btn-pull-ehr');
  if (btn) btn.textContent = '⏳ Pulling FHIR...';

  try {
    const qs = new URLSearchParams({ patientId: cleanQuery });
    if (forceGuidelineId) qs.set('guidelineId', forceGuidelineId);

    const res = await fetch(`/api/ehr/patient?${qs.toString()}`);
    const data = await res.json();

    if (!res.ok || !data.found) {
      alert(data.error || `Patient '${cleanQuery}' not found in EHR.`);
      return;
    }

    // Switch pathway if EHR patient specifies a default guideline and we didn't force one
    if (data.guidelineId && data.guidelineId !== state.activeGuidelineId) {
      state.activeGuidelineId = data.guidelineId;
      renderPathwayTabs();
      populateSampleReportsDropdown();
      syncGuidelineStudioLink();
    }

    state.patient = {
      id: data.patient.id || cleanQuery,
      name: data.patient.name || '',
      age: data.patient.age ?? '',
      gender: data.patient.gender || 'unknown',
      mrn: data.patient.mrn || '',
      abhaId: data.patient.abhaId || '',
      clinicalSummary: data.patient.clinicalSummary || '',
      workflowHint: data.patient.workflowHint || '',
    };

    state.ehrRawObservations = data.rawObservations || [];
    state.ehrRawBundle = data.fhirBundle || null;

    // Reset report extraction box on new patient pull unless same patient
    state.extractedItems = [];
    document.getElementById('extraction-review-box')?.classList.add('hidden');

    // Populate findings from EHR
    state.findings = {};
    for (const [fid, fObj] of Object.entries(data.findings || {})) {
      state.findings[fid] = {
        value: fObj.value,
        provenance: fObj.provenance || 'source-coded',
        source: fObj.source || 'ehr-coded',
        detail: fObj.detail || 'Pulled from Hospital EHR FHIR R4',
      };
    }

    // Pre-select paired sample clinical report in Step 2 for seamless hybrid demo
    const pairedSampleId = PATIENT_REPORT_PAIRING[state.patient.id];
    const sampleSelect = document.getElementById('sample-report-select');
    if (sampleSelect && pairedSampleId) {
      sampleSelect.value = pairedSampleId;
      updateSamplePdfLink(pairedSampleId);
    }

    syncPatientBannerInputs();
    renderEhrQuickChips();
    renderWorksheet();
    await evaluateCurrentWorksheet();
  } catch (err) {
    console.error('EHR pull error:', err);
  } finally {
    if (btn) btn.textContent = '🏥 Pull from EHR (FHIR)';
  }
}

function syncPatientBannerInputs() {
  const p = state.patient;
  const setVal = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.value = val ?? '';
  };
  setVal('patient-id-input', p.id || p.mrn || '');
  setVal('pat-name-input', p.name);
  setVal('pat-age-input', p.age);
  setVal('pat-gender-select', p.gender || 'male');
  setVal('pat-mrn-input', p.mrn || p.id);
  setVal('pat-abha-input', p.abhaId);

  const summaryBox = document.getElementById('ehr-pulled-summary');
  const summaryText = document.getElementById('ehr-clinical-summary-text');
  const labsRow = document.getElementById('ehr-raw-labs-row');
  const rawPre = document.getElementById('ehr-raw-bundle-pre');

  if (rawPre && state.ehrRawBundle) {
    rawPre.textContent = JSON.stringify(state.ehrRawBundle, null, 2);
  }

  if (p.id && summaryBox) {
    summaryBox.classList.remove('hidden');
    if (summaryText) {
      summaryText.textContent = p.workflowHint || p.clinicalSummary || `Loaded FHIR R4 resources for ${p.name}`;
    }
    if (labsRow) {
      labsRow.innerHTML = state.ehrRawObservations.map((obs) => `
        <span class="lab-pill" title="LOINC ${escapeHtml(obs.loinc)}: ${escapeHtml(obs.display)}">
          <strong>${escapeHtml(obs.display.split('[')[0].trim())}:</strong> ${escapeHtml(obs.value)}
        </span>
      `).join('');
    }
  } else if (summaryBox) {
    summaryBox.classList.add('hidden');
  }
}

// ============================================================================
// STEP 2: CLINICAL DOCUMENT & PDF EXTRACTOR
// ============================================================================
function populateSampleReportsDropdown() {
  const select = document.getElementById('sample-report-select');
  if (!select) return;

  const forActive = state.sampleReports.filter((r) => r.guidelineId === state.activeGuidelineId);
  const others = state.sampleReports.filter((r) => r.guidelineId !== state.activeGuidelineId);

  let html = `<option value="">-- Select sample pathology / PET-CT / referral report --</option>`;
  if (forActive.length) {
    html += `<optgroup label="Recommended for Current Pathway (${state.activeGuidelineId})">`;
    for (const r of forActive) {
      html += `<option value="${escapeHtml(r.id)}">${escapeHtml(r.title)}</option>`;
    }
    html += `</optgroup>`;
  }
  if (others.length) {
    html += `<optgroup label="Other Clinical Pathway Reports">`;
    for (const r of others) {
      html += `<option value="${escapeHtml(r.id)}">[${escapeHtml(r.guidelineId)}] ${escapeHtml(r.title)}</option>`;
    }
    html += `</optgroup>`;
  }
  select.innerHTML = html;

  const pairedSampleId = PATIENT_REPORT_PAIRING[state.patient.id];
  if (pairedSampleId && forActive.some((r) => r.id === pairedSampleId)) {
    select.value = pairedSampleId;
    updateSamplePdfLink(pairedSampleId);
  } else {
    updateSamplePdfLink('');
  }
}

function updateSamplePdfLink(sampleId) {
  const link = document.getElementById('link-download-sample-pdf');
  if (!link) return;
  const sample = state.sampleReports.find((r) => r.id === sampleId);
  if (sample && sample.pdfFile) {
    link.href = `/api/sample-pdf/${encodeURIComponent(sample.pdfFile)}`;
    link.classList.remove('hidden');
  } else {
    link.classList.add('hidden');
  }
}

async function runDocumentExtraction(payload) {
  try {
    const res = await fetch('/api/extract-document', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guidelineId: state.activeGuidelineId,
        ...payload,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      alert(data.error || 'Could not extract findings from document.');
      return;
    }

    // If the sample report belongs to another guideline, switch to it
    if (data.guidelineId && data.guidelineId !== state.activeGuidelineId) {
      state.activeGuidelineId = data.guidelineId;
      renderPathwayTabs();
    }

    // Update raw textarea so the clinician can inspect the extracted text
    const rawTextarea = document.getElementById('raw-report-textarea');
    if (rawTextarea && data.text) {
      rawTextarea.value = data.text;
    }

    // Merge patient demographics if not already populated from EHR
    if (data.patientInfo) {
      if (!state.patient.name && data.patientInfo.name) state.patient.name = data.patientInfo.name;
      if (!state.patient.age && data.patientInfo.age) state.patient.age = data.patientInfo.age;
      if (data.patientInfo.gender) state.patient.gender = data.patientInfo.gender;
      if (!state.patient.abhaId && data.patientInfo.abhaId) state.patient.abhaId = data.patientInfo.abhaId;
      if (!state.patient.mrn && data.patientInfo.mrn) state.patient.mrn = data.patientInfo.mrn;
      syncPatientBannerInputs();
    }

    state.extractedItems = data.extracted || [];
    state.extractionSourceTitle = data.sourceTitle || 'Uploaded Document';

    // Apply extracted findings to worksheet state
    for (const item of state.extractedItems) {
      state.findings[item.findingId] = {
        value: item.value,
        provenance: item.provenance, // 'structured-capture' or 'unparsed'
        source: 'report',
        detail: `Report snippet: "${item.snippet}"`,
      };
    }

    renderExtractionReviewTable();
    renderWorksheet();
    await evaluateCurrentWorksheet();
  } catch (err) {
    console.error('Document extraction failed:', err);
  }
}

function renderExtractionReviewTable() {
  const box = document.getElementById('extraction-review-box');
  const tbody = document.getElementById('extraction-table-body');
  const titleTag = document.getElementById('extraction-source-title');
  const countsEl = document.getElementById('extraction-counts');
  if (!box || !tbody) return;

  if (!state.extractedItems.length) {
    box.classList.add('hidden');
    return;
  }

  box.classList.remove('hidden');
  if (titleTag) titleTag.textContent = `— ${state.extractionSourceTitle}`;

  const verifiedCount = state.extractedItems.filter((x) => x.usable).length;
  const unparsedCount = state.extractedItems.length - verifiedCount;
  if (countsEl) {
    countsEl.innerHTML = `
      <span class="source-pill source-report">✓ ${verifiedCount} Verified</span>
      ${unparsedCount > 0 ? `<span class="source-pill source-unparsed">⚠️ ${unparsedCount} Needs Doctor Confirmation</span>` : ''}
    `;
  }

  tbody.innerHTML = state.extractedItems.map((item) => {
    const currentInState = state.findings[item.findingId];
    const isVerified = currentInState
      ? currentInState.provenance !== 'unparsed' && currentInState.provenance !== 'missing'
      : item.usable;
    const selectedCode = currentInState?.value || item.value || '';

    const optionsHtml = (item.allowedValues || []).map((v) => `
      <option value="${escapeHtml(v.code)}" ${v.code === selectedCode ? 'selected' : ''}>
        ${escapeHtml(v.label)}
      </option>
    `).join('');

    return `
      <tr class="${isVerified ? '' : 'row-unparsed'}" data-extracted-finding="${escapeHtml(item.findingId)}">
        <td>
          <strong>${escapeHtml(item.findingLabel)}</strong>
          <div class="field-hint">${escapeHtml(item.category)}</div>
        </td>
        <td>
          <span class="snippet-quote">${escapeHtml(item.snippet)}</span>
        </td>
        <td>
          ${isVerified
            ? `<span class="source-pill source-doctor">✓ Confirmed (${escapeHtml(currentInState?.provenance || 'structured-capture')})</span>`
            : `<span class="source-pill source-unparsed">⚠️ Unparsed — Confirm Required</span>`
          }
        </td>
        <td>
          <div class="review-control-cell">
            <label for="review-select-${escapeHtml(item.findingId)}" class="visually-hidden">
              Select confirmed value for ${escapeHtml(item.findingLabel)}
            </label>
            <select
              id="review-select-${escapeHtml(item.findingId)}"
              class="form-select form-select-sm"
              data-review-select="${escapeHtml(item.findingId)}"
            >
              ${optionsHtml}
            </select>
            <button
              type="button"
              class="btn ${isVerified ? 'btn-outline' : 'btn-primary'} btn-xs"
              data-confirm-extracted="${escapeHtml(item.findingId)}"
            >
              ${isVerified ? 'Update' : '✓ Confirm'}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('[data-confirm-extracted]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fid = btn.getAttribute('data-confirm-extracted');
      const sel = tbody.querySelector(`[data-review-select="${fid}"]`);
      if (!fid || !sel) return;
      const chosenValue = sel.value;
      const extItem = state.extractedItems.find((x) => x.findingId === fid);
      state.findings[fid] = {
        value: chosenValue,
        provenance: 'structured-capture',
        source: 'doctor',
        detail: `Clinician confirmed from report ("${extItem?.snippet || ''}")`,
      };
      renderExtractionReviewTable();
      renderWorksheet();
      await evaluateCurrentWorksheet();
    });
  });
}

// ============================================================================
// STEP 3: DYNAMIC CLINICAL FINDINGS WORKSHEET
// ============================================================================
function renderWorksheet() {
  const schema = getActiveSchema();
  const container = document.getElementById('worksheet-categories-container');
  const subtitle = document.getElementById('worksheet-guideline-subtitle');
  if (!schema || !container) return;

  if (subtitle) {
    subtitle.textContent = `${schema.title} (v${schema.version}) — ${schema.findings.length} clinical findings`;
  }

  // Update filter counts
  let missingCount = 0;
  let ehrCount = 0;
  let reportCount = 0;
  let doctorCount = 0;

  for (const f of schema.findings) {
    const entry = state.findings[f.id];
    const isUsable = entry?.value && ['source-coded', 'structured-capture', 'nlp-extracted-high-confidence'].includes(entry.provenance);
    if (!isUsable) missingCount += 1;
    if (entry?.value) {
      if (entry.source?.startsWith('ehr')) ehrCount += 1;
      else if (entry.source === 'report') reportCount += 1;
      else doctorCount += 1;
    }
  }

  const setTxt = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = String(val);
  };
  setTxt('count-all', schema.findings.length);
  setTxt('count-missing', missingCount);
  setTxt('count-ehr', ehrCount);
  setTxt('count-report', reportCount);
  setTxt('count-doctor', doctorCount);

  // Filter findings according to active filter pill
  const matchesFilter = (f) => {
    const entry = state.findings[f.id];
    const isUsable = entry?.value && ['source-coded', 'structured-capture', 'nlp-extracted-high-confidence'].includes(entry.provenance);
    if (state.activeFilter === 'missing') return !isUsable;
    if (state.activeFilter === 'ehr') return !!entry?.value && entry.source?.startsWith('ehr');
    if (state.activeFilter === 'report') return !!entry?.value && entry.source === 'report';
    if (state.activeFilter === 'doctor') return !!entry?.value && (entry.source === 'doctor' || entry.source === 'bundle');
    return true;
  };

  // Group by category preserving schema order
  const categoriesMap = new Map();
  for (const f of schema.findings) {
    if (!matchesFilter(f)) continue;
    const cat = f.category || 'Clinical Assessment';
    if (!categoriesMap.has(cat)) categoriesMap.set(cat, []);
    categoriesMap.get(cat).push(f);
  }

  if (categoriesMap.size === 0) {
    container.innerHTML = `<div class="finding-row"><span class="finding-help">No clinical findings match the selected filter (${escapeHtml(state.activeFilter)}).</span></div>`;
    return;
  }

  let html = '';
  for (const [catName, findingsList] of categoriesMap.entries()) {
    html += `
      <div class="category-block">
        <div class="category-header">
          <h3 class="category-title">${escapeHtml(catName)}</h3>
          <span class="badge-pill badge-outline">${findingsList.length} ${findingsList.length === 1 ? 'item' : 'items'}</span>
        </div>
        <div class="category-findings-list">
          ${findingsList.map((f) => renderFindingRowHtml(f)).join('')}
        </div>
      </div>
    `;
  }

  container.innerHTML = html;
  bindWorksheetRowEvents(container);
}

function renderFindingRowHtml(f) {
  const entry = state.findings[f.id];
  const currentVal = entry?.value || '';
  const provenance = entry?.provenance || 'structured-capture';
  const isUnparsed = currentVal && (provenance === 'unparsed' || provenance === 'nlp-extracted-low-confidence' || provenance === 'missing');

  let rowStatusClass = '';
  let sourceBadgeHtml = `<span class="source-pill source-unrecorded">Unrecorded</span>`;

  if (currentVal) {
    if (isUnparsed) {
      rowStatusClass = 'finding-unverified';
      sourceBadgeHtml = `<span class="source-pill source-unparsed">⚠️ Unparsed — Confirm below</span>`;
    } else if (entry.source?.startsWith('ehr')) {
      rowStatusClass = 'finding-answered-ehr';
      sourceBadgeHtml = `<span class="source-pill source-ehr">🏥 ${entry.source === 'ehr-derived' ? 'EHR (LOINC Derived)' : 'EHR FHIR Coded'}</span>`;
    } else if (entry.source === 'report') {
      rowStatusClass = 'finding-answered-report';
      sourceBadgeHtml = `<span class="source-pill source-report">📄 Report Extracted</span>`;
    } else {
      rowStatusClass = 'finding-answered-doctor';
      sourceBadgeHtml = `<span class="source-pill source-doctor">✍️ Clinician Verified</span>`;
    }
  }

  const helpId = `help-${f.id}`;

  // Selection control decision matrix (modern-web-guidance: forms):
  // <= 5 options -> radio buttons inside <fieldset> + <legend>; >= 6 options -> <select>
  let controlHtml = '';
  if (f.values.length <= 5) {
    controlHtml = `
      <fieldset class="radio-fieldset" aria-describedby="${escapeHtml(helpId)}">
        <legend class="visually-hidden">${escapeHtml(f.label)}</legend>
        <div class="radio-pills-grid">
          ${f.values.map((v) => {
            const checked = currentVal === v.code && !isUnparsed;
            return `
              <label class="radio-pill-label">
                <input
                  type="radio"
                  name="finding-${escapeHtml(f.id)}"
                  value="${escapeHtml(v.code)}"
                  data-finding-radio="${escapeHtml(f.id)}"
                  ${checked ? 'checked' : ''}
                />
                <span>${escapeHtml(v.label)}</span>
              </label>
            `;
          }).join('')}
        </div>
      </fieldset>
    `;
  } else {
    controlHtml = `
      <div>
        <label for="select-${escapeHtml(f.id)}" class="visually-hidden">${escapeHtml(f.label)}</label>
        <select
          id="select-${escapeHtml(f.id)}"
          class="form-select"
          data-finding-select="${escapeHtml(f.id)}"
          aria-describedby="${escapeHtml(helpId)}"
        >
          <option value="">-- Select ${escapeHtml(f.label)} --</option>
          ${f.values.map((v) => `
            <option value="${escapeHtml(v.code)}" ${currentVal === v.code && !isUnparsed ? 'selected' : ''}>
              ${escapeHtml(v.label)}
            </option>
          `).join('')}
        </select>
      </div>
    `;
  }

  const evidenceHtml = entry?.detail
    ? `
      <div class="finding-evidence-line">
        <span>${escapeHtml(entry.detail)}</span>
        <div class="finding-meta-right">
          <label for="prov-${escapeHtml(f.id)}" class="visually-hidden">Data Provenance for ${escapeHtml(f.label)}</label>
          <select id="prov-${escapeHtml(f.id)}" class="form-select form-select-sm mono" data-finding-prov="${escapeHtml(f.id)}" title="ABDM Data Provenance Code">
            <option value="source-coded" ${provenance === 'source-coded' ? 'selected' : ''}>source-coded</option>
            <option value="structured-capture" ${provenance === 'structured-capture' ? 'selected' : ''}>structured-capture</option>
            <option value="unparsed" ${provenance === 'unparsed' ? 'selected' : ''}>unparsed (safety gate)</option>
          </select>
        </div>
      </div>
    `
    : '';

  return `
    <div class="finding-row ${rowStatusClass}" id="finding-row-${escapeHtml(f.id)}">
      <div class="finding-row-top">
        <div class="finding-label-wrap">
          <span class="finding-title">${escapeHtml(f.label)}</span>
          <span class="finding-help" id="${escapeHtml(helpId)}">${escapeHtml(f.help || '')}</span>
        </div>
        <div class="finding-meta-right">
          ${sourceBadgeHtml}
          ${currentVal ? `<button type="button" class="btn btn-ghost btn-xs" data-clear-finding="${escapeHtml(f.id)}" title="Clear finding">✕</button>` : ''}
        </div>
      </div>
      ${controlHtml}
      ${evidenceHtml}
    </div>
  `;
}

function bindWorksheetRowEvents(container) {
  // Radio pills
  container.querySelectorAll('[data-finding-radio]').forEach((radio) => {
    radio.addEventListener('change', async () => {
      const fid = radio.getAttribute('data-finding-radio');
      if (!fid) return;
      state.findings[fid] = {
        value: radio.value,
        provenance: 'structured-capture',
        source: 'doctor',
        detail: 'Entered / verified by clinician at Point of Care',
      };
      if (state.extractedItems.some((x) => x.findingId === fid)) {
        renderExtractionReviewTable();
      }
      renderWorksheet();
      await evaluateCurrentWorksheet();
    });
  });

  // Select dropdowns (6+ options)
  container.querySelectorAll('[data-finding-select]').forEach((sel) => {
    sel.addEventListener('change', async () => {
      const fid = sel.getAttribute('data-finding-select');
      if (!fid) return;
      if (!sel.value) {
        delete state.findings[fid];
      } else {
        state.findings[fid] = {
          value: sel.value,
          provenance: 'structured-capture',
          source: 'doctor',
          detail: 'Entered / verified by clinician at Point of Care',
        };
      }
      if (state.extractedItems.some((x) => x.findingId === fid)) {
        renderExtractionReviewTable();
      }
      renderWorksheet();
      await evaluateCurrentWorksheet();
    });
  });

  // Provenance selector override
  container.querySelectorAll('[data-finding-prov]').forEach((provSel) => {
    provSel.addEventListener('change', async () => {
      const fid = provSel.getAttribute('data-finding-prov');
      if (!fid || !state.findings[fid]) return;
      state.findings[fid].provenance = provSel.value;
      if (state.extractedItems.some((x) => x.findingId === fid)) {
        renderExtractionReviewTable();
      }
      renderWorksheet();
      await evaluateCurrentWorksheet();
    });
  });

  // Clear finding button
  container.querySelectorAll('[data-clear-finding]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const fid = btn.getAttribute('data-clear-finding');
      if (!fid) return;
      delete state.findings[fid];
      renderWorksheet();
      await evaluateCurrentWorksheet();
    });
  });
}

// ============================================================================
// LIVE HL7 CQL EVALUATION & RIGHT-HAND DECISION PANEL
// ============================================================================
async function evaluateCurrentWorksheet() {
  const schema = getActiveSchema();
  if (!schema) return;

  // Read latest patient inputs from banner
  state.patient.name = document.getElementById('pat-name-input')?.value || state.patient.name || 'Point-of-Care Patient';
  state.patient.age = document.getElementById('pat-age-input')?.value || state.patient.age || '';
  state.patient.gender = document.getElementById('pat-gender-select')?.value || state.patient.gender || 'male';
  state.patient.mrn = document.getElementById('pat-mrn-input')?.value || state.patient.mrn || '';
  state.patient.abhaId = document.getElementById('pat-abha-input')?.value || state.patient.abhaId || '';

  // If patient age was changed and guideline has 'age-group', auto-sync age-group if not manually overridden
  const ageNum = Number.parseInt(state.patient.age, 10);
  const ageFinding = schema.findings.find((f) => f.id === 'age-group');
  if (ageFinding && Number.isFinite(ageNum) && (!state.findings['age-group'] || state.findings['age-group'].source === 'ehr-derived')) {
    let ageCode = 'age-gt-60';
    if (ageNum <= 60) ageCode = 'age-le-60';
    else if (ageNum >= 70 && ageFinding.values.some((v) => v.code === 'age-ge-70')) ageCode = 'age-ge-70';
    state.findings['age-group'] = {
      value: ageCode,
      provenance: 'source-coded',
      source: 'ehr-derived',
      detail: `Derived from Patient Age (${ageNum} yrs)`,
    };
  }

  try {
    const res = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guidelineId: state.activeGuidelineId,
        patient: state.patient,
        findings: state.findings,
      }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error('Evaluation error:', data.error);
      return;
    }

    state.lastEval = data;
    renderDecisionSupportPanel(data);
    renderInteropModalData(data);
  } catch (err) {
    console.error('CQL evaluation request failed:', err);
  }
}

function renderDecisionSupportPanel(data) {
  const { report, decision } = data;
  if (!report || !decision) return;

  const banner = document.getElementById('decision-banner');
  const statusPill = document.getElementById('decision-status-pill');
  const progressPill = document.getElementById('decision-progress-pill');
  const outcomeTitle = document.getElementById('decision-outcome-title');
  const outcomeCode = document.getElementById('decision-outcome-code');
  const outcomeCat = document.getElementById('decision-outcome-category');
  const rationaleEl = document.getElementById('decision-rationale');

  if (banner) {
    banner.className = `decision-banner status-${decision.status}`;
  }
  if (statusPill) {
    if (decision.status === 'recommendation') {
      statusPill.textContent = '✓ Clinical Guideline Recommendation';
    } else if (decision.status === 'review') {
      statusPill.textContent = '⚠️ Clinical Safety / Review Gate';
    } else {
      statusPill.textContent = '⏳ Incomplete Workup — Data Needed';
    }
  }
  if (progressPill) {
    progressPill.textContent = `${decision.answered} / ${decision.total} findings verified`;
  }
  if (outcomeTitle) {
    outcomeTitle.textContent = decision.label || report.treatment_group;
  }
  if (outcomeCode) {
    outcomeCode.textContent = `Outcome ID: ${decision.outcomeId}`;
  }
  if (outcomeCat) {
    if (decision.category) {
      outcomeCat.textContent = decision.category;
      outcomeCat.classList.remove('hidden');
    } else {
      outcomeCat.classList.add('hidden');
    }
  }
  if (rationaleEl) {
    rationaleEl.textContent = decision.rationale || '';
  }

  // Provenance / Data Quality Warnings
  const warningsBox = document.getElementById('decision-warnings-box');
  const warningsList = document.getElementById('decision-warnings-list');
  const unverifiedFindings = (decision.missing || []).filter((m) => m.reason === 'unverified');
  const allWarnings = [
    ...(decision.warnings || []),
    ...unverifiedFindings.map((u) => `'${u.label}' has unverified/unparsed provenance — blocked by NCGCommon.IsUsable until confirmed by clinician.`),
  ];

  if (warningsBox && warningsList) {
    if (allWarnings.length > 0) {
      warningsBox.classList.remove('hidden');
      warningsList.innerHTML = allWarnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('');
    } else {
      warningsBox.classList.add('hidden');
    }
  }

  // Regimens
  const regimensCount = document.getElementById('regimens-count');
  const regimensList = document.getElementById('regimens-list');
  if (regimensCount) regimensCount.textContent = String((decision.regimens || []).length);
  if (regimensList) {
    if (!decision.regimens || decision.regimens.length === 0) {
      regimensList.innerHTML = `<div class="field-hint">No systemic regimen ordered while safety gate or workup is pending.</div>`;
    } else {
      regimensList.innerHTML = decision.regimens.map((r) => `
        <div class="regimen-item">
          <span class="regimen-name">${escapeHtml(r.name)}</span>
          ${r.category ? `<span class="regimen-cat">${escapeHtml(r.category)}</span>` : ''}
        </div>
      `).join('');
    }
  }

  // Calculated Prognostic Scores
  const scoresSection = document.getElementById('scores-section');
  const scoresGrid = document.getElementById('scores-grid');
  const activeScores = (decision.scores || []).filter((s) => s.score !== null && s.score !== undefined);
  if (scoresSection && scoresGrid) {
    if (activeScores.length > 0) {
      scoresSection.classList.remove('hidden');
      scoresGrid.innerHTML = activeScores.map((s) => `
        <div class="score-card">
          <div class="score-card-top">
            <span class="score-name">${escapeHtml(s.label || s.name)}</span>
            <span class="score-val">${escapeHtml(s.score)}</span>
          </div>
          <span class="score-band">${escapeHtml(s.riskLabel || s.riskGroup || '')}</span>
        </div>
      `).join('');
    } else {
      scoresSection.classList.add('hidden');
    }
  }

  // Rule Trace (Why This Recommendation Fired)
  const ruleTraceBox = document.getElementById('rule-trace-box');
  if (ruleTraceBox) {
    if (decision.why && decision.why.ruleId) {
      ruleTraceBox.innerHTML = `
        <div class="rule-trace-title">
          Matched ${escapeHtml(decision.why.ruleId.toUpperCase())}: ${escapeHtml(decision.why.ruleLabel || decision.outcomeId)}
        </div>
        <ul class="rule-cond-list">
          ${(decision.why.conditions || []).map((c) => `
            <li class="rule-cond-item">
              <span class="rule-cond-icon">✓</span>
              <span>${escapeHtml(c.text)}</span>
            </li>
          `).join('')}
        </ul>
      `;
    } else {
      ruleTraceBox.innerHTML = `<span class="field-hint">Default fallback safety rule active — complete the highlighted required clinical findings on the worksheet.</span>`;
    }
  }

  // Missing / Unverified Findings Chips (Click to jump to worksheet row)
  const missingCountEl = document.getElementById('missing-count');
  const missingChipsList = document.getElementById('missing-chips-list');
  const missingList = decision.missing || [];
  if (missingCountEl) missingCountEl.textContent = String(missingList.length);
  if (missingChipsList) {
    if (missingList.length === 0) {
      missingChipsList.innerHTML = `<span class="source-pill source-doctor">✓ All pathway findings verified</span>`;
    } else {
      missingChipsList.innerHTML = missingList.map((m) => `
        <button
          type="button"
          class="missing-chip ${m.reason === 'unverified' ? 'unverified' : ''}"
          data-jump-finding="${escapeHtml(m.id)}"
          title="Click to jump to ${escapeHtml(m.label)} on the worksheet"
        >
          ${m.reason === 'unverified' ? '⚠️ Confirm: ' : '+ '}${escapeHtml(m.label)}
        </button>
      `).join('');

      missingChipsList.querySelectorAll('[data-jump-finding]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const fid = btn.getAttribute('data-jump-finding');
          if (!fid) return;
          if (state.activeFilter !== 'all' && state.activeFilter !== 'missing') {
            state.activeFilter = 'all';
            document.querySelectorAll('.filter-pill').forEach((p) => p.classList.toggle('active', p.getAttribute('data-filter') === 'all'));
            renderWorksheet();
          }
          const row = document.getElementById(`finding-row-${fid}`);
          if (row) {
            row.scrollIntoView({ behavior: 'smooth', block: 'center' });
            const firstInput = row.querySelector('input, select');
            if (firstInput) firstInput.focus({ preventScroll: true });
          }
        });
      });
    }
  }
}

// ============================================================================
// INTEROPERABILITY & SYNTHETIC CASES MODALS
// ============================================================================
function renderInteropModalData(data) {
  const cqlTbody = document.getElementById('cql-expressions-tbody');
  const fhirPre = document.getElementById('fhir-bundle-pre');
  const cdsPre = document.getElementById('cdshooks-pre');

  if (cqlTbody && data.report?.all_expressions) {
    cqlTbody.innerHTML = Object.entries(data.report.all_expressions).map(([expr, val]) => `
      <tr>
        <td class="mono"><strong>${escapeHtml(expr)}</strong></td>
        <td class="mono">${escapeHtml(typeof val === 'object' ? JSON.stringify(val) : String(val))}</td>
      </tr>
    `).join('');
  }
  if (fhirPre && data.bundle) {
    fhirPre.textContent = JSON.stringify(data.bundle, null, 2);
  }
  if (cdsPre && data.cdsHooksCard) {
    cdsPre.textContent = JSON.stringify(data.cdsHooksCard, null, 2);
  }
}

function renderSyntheticCasesModal(filterQuery = '') {
  const grid = document.getElementById('cases-modal-grid');
  if (!grid) return;

  const q = filterQuery.trim().toLowerCase();
  const filtered = state.syntheticManifest.filter((item) => {
    if (!q) return true;
    return (
      (item.case_id && item.case_id.toLowerCase().includes(q)) ||
      (item.patient_name && item.patient_name.toLowerCase().includes(q)) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.expected_treatment_group && item.expected_treatment_group.toLowerCase().includes(q))
    );
  });

  grid.innerHTML = filtered.map((item) => {
    const parts = String(item.file || '').split('/');
    const folder = parts.length > 1 ? parts[0] : 'follicular';
    const filename = parts[parts.length - 1];
    return `
      <button
        type="button"
        class="case-card"
        data-load-folder="${escapeHtml(folder)}"
        data-load-filename="${escapeHtml(filename)}"
      >
        <div class="case-card-top">
          <span>${escapeHtml(item.case_id)}</span>
          <span>→ ${escapeHtml(item.expected_treatment_group)}</span>
        </div>
        <div class="case-card-title">${escapeHtml(item.patient_name || filename)}</div>
        <div class="case-card-desc">${escapeHtml(item.description || '')}</div>
      </button>
    `;
  }).join('');

  grid.querySelectorAll('.case-card').forEach((card) => {
    card.addEventListener('click', async () => {
      const folder = card.getAttribute('data-load-folder');
      const filename = card.getAttribute('data-load-filename');
      if (!folder || !filename) return;
      await loadSyntheticCaseBundle(folder, filename);
      document.getElementById('cases-dialog')?.close();
    });
  });
}

async function loadSyntheticCaseBundle(folder, filename) {
  try {
    const res = await fetch(`/api/bundle?folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}`);
    const data = await res.json();
    if (!res.ok || !data.bundle) return;

    if (data.guidelineId && data.guidelineId !== state.activeGuidelineId) {
      state.activeGuidelineId = data.guidelineId;
      renderPathwayTabs();
      populateSampleReportsDropdown();
      syncGuidelineStudioLink();
    }

    state.patient = {
      id: data.patient?.id || filename.replace('.json', ''),
      name: data.patient?.name || filename.replace('.json', ''),
      age: data.patient?.age ?? '',
      gender: data.patient?.gender || 'male',
      mrn: data.patient?.id || '',
      abhaId: data.patient?.abhaId || '',
      clinicalSummary: `Synthetic Test Case (${folder}/${filename})`,
      workflowHint: `Loaded from synthetic regression bundle ${filename}`,
    };
    state.ehrRawObservations = [];
    state.ehrRawBundle = data.bundle;
    state.findings = data.findings || {};

    syncPatientBannerInputs();
    renderEhrQuickChips();
    renderWorksheet();

    // Evaluate the exact bundle directly and update the decision panel
    const evalRes = await fetch('/api/evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        guidelineId: state.activeGuidelineId,
        bundle: data.bundle,
      }),
    }).then((r) => r.json());

    if (evalRes.success) {
      state.lastEval = evalRes;
      renderDecisionSupportPanel(evalRes);
      renderInteropModalData(evalRes);
    }
  } catch (err) {
    console.error('Error loading synthetic bundle:', err);
  }
}

// ============================================================================
// EVENT BINDINGS
// ============================================================================
function bindStaticEvents() {
  // Step 1: EHR Lookup Form
  const ehrForm = document.getElementById('ehr-lookup-form');
  ehrForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    const val = document.getElementById('patient-id-input')?.value;
    if (val) pullPatientFromEhr(val);
  });

  // Patient demographic manual edits trigger re-evaluation (for age-group & bundle header)
  ['pat-name-input', 'pat-age-input', 'pat-gender-select', 'pat-mrn-input', 'pat-abha-input'].forEach((id) => {
    document.getElementById(id)?.addEventListener('change', () => {
      evaluateCurrentWorksheet();
    });
  });

  // View Raw EHR FHIR Bundle button
  document.getElementById('btn-view-ehr-fhir')?.addEventListener('click', () => {
    const dialog = document.getElementById('interop-dialog');
    switchInteropTab('ehr-raw');
    dialog?.showModal();
  });

  // Step 2: Collapse / Expand Document Upload Panel
  const toggleDocBtn = document.getElementById('btn-toggle-doc-panel');
  const docBody = document.getElementById('doc-panel-body');
  toggleDocBtn?.addEventListener('click', () => {
    if (!docBody) return;
    const isHidden = docBody.classList.toggle('hidden');
    toggleDocBtn.setAttribute('aria-expanded', isHidden ? 'false' : 'true');
    toggleDocBtn.textContent = isHidden ? 'Expand ▼' : 'Collapse ▲';
  });

  // File input upload (.pdf or .txt)
  const fileInput = document.getElementById('report-file-input');
  fileInput?.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (file) handleUploadedReportFile(file);
  });

  // Drag & Drop upload
  const dropzone = document.getElementById('upload-dropzone');
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => {
      dropzone.classList.remove('dragover');
    });
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      const file = e.dataTransfer?.files?.[0];
      if (file) handleUploadedReportFile(file);
    });
  }

  // Sample Report Picker
  const sampleSelect = document.getElementById('sample-report-select');
  sampleSelect?.addEventListener('change', () => {
    updateSamplePdfLink(sampleSelect.value);
  });

  document.getElementById('btn-extract-sample')?.addEventListener('click', () => {
    const sampleId = sampleSelect?.value;
    if (!sampleId) {
      alert('Please select a sample clinical report first.');
      return;
    }
    runDocumentExtraction({ sampleId });
  });

  // Toggle Raw Report Text Drawer
  document.getElementById('btn-toggle-raw-text')?.addEventListener('click', () => {
    document.getElementById('raw-report-drawer')?.classList.toggle('hidden');
  });

  document.getElementById('btn-extract-raw-text')?.addEventListener('click', () => {
    const text = document.getElementById('raw-report-textarea')?.value;
    runDocumentExtraction({ text, filename: 'Pasted Clinical Note' });
  });

  // Step 3: Worksheet Filter Pills
  document.querySelectorAll('.filter-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      const f = pill.getAttribute('data-filter') || 'all';
      state.activeFilter = f;
      document.querySelectorAll('.filter-pill').forEach((p) => p.classList.toggle('active', p === pill));
      renderWorksheet();
    });
  });

  // Clear all worksheet answers
  document.getElementById('btn-clear-worksheet')?.addEventListener('click', async () => {
    state.findings = {};
    state.extractedItems = [];
    document.getElementById('extraction-review-box')?.classList.add('hidden');
    renderWorksheet();
    await evaluateCurrentWorksheet();
  });

  // Reset entire encounter
  document.getElementById('btn-reset-encounter')?.addEventListener('click', async () => {
    state.patient = { id: '', name: 'Walk-in Patient', age: 55, gender: 'male', mrn: '', abhaId: '', clinicalSummary: '', workflowHint: '' };
    state.ehrRawObservations = [];
    state.ehrRawBundle = null;
    state.findings = {};
    state.extractedItems = [];
    document.getElementById('extraction-review-box')?.classList.add('hidden');
    syncPatientBannerInputs();
    renderEhrQuickChips();
    renderWorksheet();
    await evaluateCurrentWorksheet();
  });

  // Manual Evaluate button
  document.getElementById('btn-evaluate-now')?.addEventListener('click', () => {
    evaluateCurrentWorksheet();
  });

  // Interop Modal
  const interopDialog = document.getElementById('interop-dialog');
  document.getElementById('btn-open-interop-modal')?.addEventListener('click', () => {
    switchInteropTab('cql');
    interopDialog?.showModal();
  });
  document.getElementById('btn-close-interop-modal')?.addEventListener('click', () => {
    interopDialog?.close();
  });
  document.querySelectorAll('[data-interop-tab]').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      switchInteropTab(tabBtn.getAttribute('data-interop-tab'));
    });
  });

  // Copy & Download JSON buttons
  document.getElementById('btn-copy-fhir')?.addEventListener('click', () => {
    if (state.lastEval?.bundle) {
      navigator.clipboard.writeText(JSON.stringify(state.lastEval.bundle, null, 2));
    }
  });
  document.getElementById('btn-download-fhir')?.addEventListener('click', () => {
    if (!state.lastEval?.bundle) return;
    const blob = new Blob([JSON.stringify(state.lastEval.bundle, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `clinical-fhir-bundle-${state.patient.id || Date.now()}.json`;
    a.click();
  });
  document.getElementById('btn-copy-cdshooks')?.addEventListener('click', () => {
    if (state.lastEval?.cdsHooksCard) {
      navigator.clipboard.writeText(JSON.stringify(state.lastEval.cdsHooksCard, null, 2));
    }
  });

  // Synthetic Cases Modal
  const casesDialog = document.getElementById('cases-dialog');
  document.getElementById('btn-open-cases-modal')?.addEventListener('click', () => {
    casesDialog?.showModal();
  });
  document.getElementById('btn-close-cases-modal')?.addEventListener('click', () => {
    casesDialog?.close();
  });
  document.getElementById('cases-search-input')?.addEventListener('input', (e) => {
    renderSyntheticCasesModal(e.target.value);
  });
}

function switchInteropTab(tabName) {
  document.querySelectorAll('[data-interop-tab]').forEach((btn) => {
    btn.classList.toggle('active', btn.getAttribute('data-interop-tab') === tabName);
  });
  ['cql', 'fhir', 'ehr-raw', 'cdshooks'].forEach((pane) => {
    const el = document.getElementById(`interop-pane-${pane}`);
    if (el) el.classList.toggle('hidden', pane !== tabName);
  });
}

function handleUploadedReportFile(file) {
  const reader = new FileReader();
  reader.onload = () => {
    const resultStr = String(reader.result || '');
    const base64 = resultStr.includes(',') ? resultStr.split(',')[1] : resultStr;
    runDocumentExtraction({
      filename: file.name,
      contentBase64: base64,
    });
  };
  reader.readAsDataURL(file);
}
