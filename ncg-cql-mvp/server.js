/**
 * server.js - NCG CQL Clinical Decision Support Engine Web Server
 * 
 * Production-ready HTTP application & API server providing:
 * 1. Web dashboard for HL7 CQL execution against NCG hematology guidelines
 * 2. Tri-modal intake: FHIR R4 Bundle, Manual Clinical Form, Synoptic OCR/Text
 * 3. REST API for external EHR CDS Hooks & pipeline integration
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { evaluateBundle, getRepository } = require('./engine/js/evaluate_via_cql_execution');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const ELM_DIR = path.resolve(__dirname, 'elm');
const BUNDLES_DIR = path.resolve(__dirname, 'sample_data/fhir_bundles');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

// Ensure public directory exists
if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Guideline catalog metadata
const GUIDELINES_METADATA = [
  {
    id: 'NCG_LYMPHOMA_WORKUP_2020',
    title: 'NCG Lymphoma Workup & Diagnostics Flowchart',
    version: '1.2.0',
    category: 'Diagnostic & Staging',
    disease: 'Non-Hodgkin & Hodgkin Lymphoma',
    description: 'Initial presentation triage, PET-CT vs bone marrow biopsy pathways, organ-specific staging, viral prophylaxis (HBV/HCV/HIV), high-dose MTX clearance, and prognostic scoring (aaIPI, IPI, FLIPI, MIPI).',
    scores: ['aaIPI', 'IPI', 'FLIPI', 'MIPI'],
    defaultBundleFolder: 'lymphoma_workup',
  },
  {
    id: 'NCG_FL_2020',
    title: 'NCG Follicular Lymphoma First-Line Treatment',
    version: '0.2.0',
    category: 'First-Line Systemic Therapy',
    disease: 'Follicular Lymphoma (FL)',
    description: 'Stage I-IV stratification, GELF tumor burden assessment, BR vs R-CHOP vs ISRT radiotherapy, watch-and-wait surveillance, and transformed DLBCL routing.',
    scores: ['FLIPI'],
    defaultBundleFolder: 'follicular',
  },
  {
    id: 'NCG_DLBCL_TREATMENT_2020',
    title: 'NCG DLBCL First-Line Treatment Pathway',
    version: '1.0.0',
    category: 'First-Line Systemic Therapy',
    disease: 'Diffuse Large B-Cell Lymphoma (DLBCL) & PMBCL',
    description: 'Limited vs Advanced stage, aaIPI/IPI risk, Cell of Origin (GCB vs Non-GCB Pola-R-CHP), PMBCL central access, HIV DLBCL, and cardiac/elderly-frail dose-attenuated regimens.',
    scores: ['aaIPI', 'IPI'],
    defaultBundleFolder: 'dlbcl_treatment',
  },
  {
    id: 'NCG_DLBCL_RR_2020',
    title: 'NCG Relapsed/Refractory DLBCL Pathways',
    version: '1.0.0',
    category: 'Relapsed / Refractory Therapy',
    disease: 'Relapsed/Refractory DLBCL',
    description: 'Mandatory repeat biopsy gate, early/refractory vs late relapse timing, second-line CAR T-cell therapy vs autologous stem cell transplant (ASCT) consolidation, Deauville response triage.',
    scores: [],
    defaultBundleFolder: 'dlbcl_rr',
  },
];

// Sample synoptic reports for Mode 3 text extraction
const SAMPLE_SYNOPTIC_REPORTS = [
  {
    id: 'fl-advanced-high-burden',
    title: 'Follicular Lymphoma - Advanced High Burden (Fit)',
    guidelineId: 'NCG_FL_2020',
    expectedOutcome: 'advanced-high-burden-systemic',
    text: `TATA MEMORIAL CENTRE / NCG-HEME
FOLLICULAR LYMPHOMA SYNOPTIC WORKUP REPORT
ABHA ID: 12-3456-7890-1234
Patient Name: Amit Sharma | Age: 56 | Gender: Male | Date: 2026-10-14

Histological Subtype & Grade: Follicular lymphoma, grade 1-2
Ann Arbor Stage: Stage III
Bone Marrow Biopsy: Involved
GELF Tumour Burden: High burden
Bulky Mass (> 7 cm): Yes
B Symptoms: No
Serum LDH Elevated (>ULN): No
Fit for Bendamustine (BR): Yes
Fit for Anthracycline / R-CHOP: Yes
Fit and Suitable for RT (ISRT/IFRT): No
ECOG Performance Status: 1

NOTES: Excisional biopsy confirmed Grade 1-2 FL. CECT shows retroperitoneal mass 8.2 cm. GELF high burden confirmed. Patient fit for BR chemoimmunotherapy.`,
  },
  {
    id: 'fl-stage-1-limited',
    title: 'Follicular Lymphoma - Stage I Limited (RT Fit)',
    guidelineId: 'NCG_FL_2020',
    expectedOutcome: 'stage-1-limited',
    text: `TATA MEMORIAL CENTRE / NCG-HEME
FOLLICULAR LYMPHOMA SYNOPTIC WORKUP REPORT
ABHA ID: 14-9876-5432-1098
Patient Name: Rajesh Patel | Age: 49 | Gender: Male | Date: 2026-10-14

Histological Subtype & Grade: Follicular lymphoma, grade 1-2
Ann Arbor Stage: Stage I
Contiguity: Contiguous
Bone Marrow Biopsy: Negative
GELF Tumour Burden: Low burden
Bulky Mass (> 7 cm): No
B Symptoms: No
Serum LDH Elevated (>ULN): No
Fit for Bendamustine (BR): Yes
Fit for Anthracycline / R-CHOP: Yes
Fit and Suitable for RT (ISRT/IFRT): Yes
ECOG Performance Status: 0

NOTES: Isolated left inguinal node 2.8 cm excised completely. Marrow clear. Fit for definitive involved-site radiation therapy (ISRT 24 Gy).`,
  },
  {
    id: 'fl-unparsed-referral',
    title: 'External Referral Note - Unparsed Ambiguous Text (Safety Gate Trigger)',
    guidelineId: 'NCG_FL_2020',
    expectedOutcome: 'needs-review',
    text: `CITY CANCER CLINIC - OUTSIDE REFERRAL NOTE
Patient: S. Mukherjee | Age: 61 | Date: 2026-10-12

Histological Subtype & Grade: FL versus marginal zone or composite low-grade lymphoma, consult pending review
Ann Arbor Stage: Stage III or possibly IV
Bone Marrow Biopsy: suspicious for focal aggregate, inconclusive
GELF Tumour Burden: borderline enlarged spleen with questionable retroperitoneal adenopathy
Fit for Bendamustine (BR): borderline renal reserve
ECOG Performance Status: 2

REFERRAL NOTE: Patient referred for second opinion. Biopsy slides requested from outside lab for re-review. Data unverified.`,
  },
  {
    id: 'dlbcl-advanced-aaipi2',
    title: 'DLBCL Advanced Stage IV - Elevated LDH (aaIPI Score 2)',
    guidelineId: 'NCG_LYMPHOMA_WORKUP_2020',
    expectedOutcome: 'pathway-staging-pet-ct-omit-bm',
    text: `DEPARTMENT OF MEDICAL ONCOLOGY
HEMATOLYMPHOID MALIGNANCIES STAGING WORKUP
ABHA ID: 91-0000-0017-0000
Patient Name: Vikram Desai | Age: 48 | Gender: Male

Initial Presentation: Isolated lymphadenopathy
Histology: Diffuse Large B-cell Lymphoma (DLBCL)
Ann Arbor Stage: Stage IV (Hepatic & Skeletal Involvement)
Serum LDH Level: Elevated (780 U/L, reference ULN 240)
ECOG Performance Status: 1
Organ Involvement: None of high-CNS risk sites
Viral Serology HBV: Negative
Viral Serology HCV: Negative
HIV Status: Negative

PROGNOSTIC ASSESSMENT: Age 48 (<60 yrs). aaIPI Risk Factors present: Stage IV (1 pt) + Elevated LDH (1 pt) = aaIPI Score 2 (High-Intermediate Risk). Baseline PET-CT required; marrow biopsy may be omitted if PET shows skeletal lesion.`,
  },
];

/**
 * Builds standard ABDM FHIR R4 Bundle from manual form key-values
 */
function buildFhirBundleFromManual(guidelineId, inputs, patientInfo = {}, provenance = 'source-coded') {
  const patientId = `patient-manual-${Date.now()}`;
  const patientName = patientInfo.name || 'Manual Entry Patient';
  const age = parseInt(patientInfo.age || '55', 10);
  const birthYear = new Date().getFullYear() - age;
  const gender = (patientInfo.gender || 'unknown').toLowerCase();

  const entries = [
    {
      fullUrl: `Patient/${patientId}`,
      resource: {
        resourceType: 'Patient',
        id: patientId,
        identifier: [
          {
            system: 'https://healthid.ndhm.gov.in',
            value: patientInfo.abhaId || `91-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`,
          },
        ],
        name: [{ text: patientName }],
        gender: gender === 'male' ? 'male' : gender === 'female' ? 'female' : 'other',
        birthDate: `${birthYear}-01-01`,
        text: {
          status: 'generated',
          div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><b>${patientName}</b> (Age: ${age}, Gender: ${gender})</p></div>`,
        },
      },
    },
  ];

  for (const [rawKey, findingVal] of Object.entries(inputs)) {
    if (!findingVal || findingVal === 'none' || findingVal === '') continue;

    // Normalizing finding key aliases across guidelines
    let findingKey = rawKey;
    if (rawKey === 'gelf-burden' && guidelineId === 'NCG_FL_2020') findingKey = 'gelf';
    if (rawKey === 'bm-biopsy' && guidelineId === 'NCG_FL_2020') findingKey = 'bone-marrow';
    if (rawKey === 'fit-for-bendamustine' && guidelineId === 'NCG_FL_2020') findingKey = 'fit-bendamustine';
    if (rawKey === 'fit-for-rt' && guidelineId === 'NCG_FL_2020') findingKey = 'fit-rt';

    const obsId = `obs-${findingKey}-${Date.now().toString().slice(-6)}`;
    const effectiveProvenance = inputs[`${rawKey}_provenance`] || inputs[`${findingKey}_provenance`] || provenance;

    entries.push({
      fullUrl: `Observation/${obsId}`,
      resource: {
        resourceType: 'Observation',
        id: obsId,
        meta: {
          profile: ['http://ncgindia.org/fhir/StructureDefinition/ncg-observation-heme'],
        },
        status: effectiveProvenance === 'missing' ? 'unknown' : 'final',
        subject: { reference: `Patient/${patientId}` },
        code: {
          coding: [
            {
              system: `http://ncgindia.org/fhir/CodeSystem/ncg-${findingKey}`,
              code: String(findingVal),
              display: String(findingVal).replace(/-/g, ' ').toUpperCase(),
            },
          ],
          text: `${findingKey}: ${findingVal}`,
        },
        extension: [
          {
            url: 'http://ncgindia.org/fhir/StructureDefinition/ncg-extension-data-provenance',
            valueCodeableConcept: {
              coding: [
                {
                  system: 'http://ncgindia.org/fhir/CodeSystem/ncg-data-provenance',
                  code: effectiveProvenance,
                  display: effectiveProvenance,
                },
              ],
            },
          },
        ],
      },
    });
  }

  return {
    resourceType: 'Bundle',
    id: `bundle-manual-${Date.now()}`,
    type: 'collection',
    timestamp: new Date().toISOString(),
    meta: {
      tag: [
        { system: 'http://ncgindia.org/guideline', code: guidelineId },
        { system: 'http://ncgindia.org/source-modality', code: 'manual-clinical-entry' },
      ],
    },
    entry: entries,
  };
}

/**
 * Normalizes synoptic text lines into structured fields
 */
function extractSynopticFieldsFromText(text, guidelineId = 'NCG_FL_2020') {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const fields = {};
  const unparsed = [];

  const getLineVal = (prefix) => {
    const line = lines.find((l) => l.toLowerCase().startsWith(prefix.toLowerCase()));
    if (!line) return null;
    const parts = line.split(':');
    return parts.slice(1).join(':').trim();
  };

  if (guidelineId === 'NCG_FL_2020') {
    // Histology
    const rawHist = getLineVal('Histological Subtype') || getLineVal('Histology');
    if (rawHist) {
      const lower = rawHist.toLowerCase();
      if (lower.includes('transformed') || lower.includes('dlbcl')) {
        fields['histology'] = 'transformed-dlbcl';
      } else if (lower.includes('grade 3b') || lower.includes('3b')) {
        fields['histology'] = 'fl-grade-3b';
      } else if (lower.includes('grade 3a') || lower.includes('3a')) {
        fields['histology'] = 'fl-grade-3a';
      } else if (lower.includes('grade 1-2') || lower.includes('grade 1') || lower.includes('grade 2') || lower.includes('low grade')) {
        fields['histology'] = 'fl-grade-1-2';
      } else {
        fields['histology'] = 'unparsed-histology';
        fields['histology_provenance'] = 'unparsed-text';
        unparsed.push({ field: 'histology', raw: rawHist });
      }
    }

    // Stage
    const rawStage = getLineVal('Ann Arbor Stage') || getLineVal('Stage');
    if (rawStage) {
      const lower = rawStage.toLowerCase();
      if (lower.includes('iv') || lower.includes('stage 4') || lower.includes('stage iv')) {
        fields['stage'] = 'stage-4';
      } else if (lower.includes('iii') || lower.includes('stage 3') || lower.includes('stage iii')) {
        fields['stage'] = 'stage-3';
      } else if (lower.includes('ii') || lower.includes('stage 2') || lower.includes('stage ii')) {
        fields['stage'] = 'stage-2';
      } else if (lower.includes('i') || lower.includes('stage 1') || lower.includes('stage i')) {
        fields['stage'] = 'stage-1';
      } else {
        fields['stage'] = 'unparsed-stage';
        fields['stage_provenance'] = 'unparsed-text';
        unparsed.push({ field: 'stage', raw: rawStage });
      }
    }

    // GELF
    const rawGelf = getLineVal('GELF Tumour Burden') || getLineVal('GELF');
    if (rawGelf) {
      const lower = rawGelf.toLowerCase();
      if (lower.includes('high') || lower.includes('yes')) fields['gelf-burden'] = 'high-burden';
      else if (lower.includes('low') || lower.includes('no')) fields['gelf-burden'] = 'low-burden';
      else {
        fields['gelf-burden'] = 'unparsed-gelf';
        fields['gelf-burden_provenance'] = 'unparsed-text';
        unparsed.push({ field: 'gelf-burden', raw: rawGelf });
      }
    }

    // Bone Marrow
    const rawBm = getLineVal('Bone Marrow Biopsy') || getLineVal('Bone Marrow');
    if (rawBm) {
      const lower = rawBm.toLowerCase();
      if (lower.includes('involved') || lower.includes('positive')) fields['bm-biopsy'] = 'involved';
      else if (lower.includes('negative') || lower.includes('clear')) fields['bm-biopsy'] = 'negative';
      else {
        fields['bm-biopsy'] = 'unparsed-bm';
        fields['bm-biopsy_provenance'] = 'unparsed-text';
        unparsed.push({ field: 'bm-biopsy', raw: rawBm });
      }
    }

    // Contiguity
    const rawContig = getLineVal('Contiguity');
    if (rawContig) {
      const lower = rawContig.toLowerCase();
      if (lower.includes('contiguous') && !lower.includes('non')) fields['contiguity'] = 'contiguous';
      else fields['contiguity'] = 'non-contiguous';
    }

    // Fitness
    const rawBR = getLineVal('Fit for Bendamustine (BR)');
    if (rawBR) fields['fit-for-bendamustine'] = rawBR.toLowerCase().includes('yes') ? 'yes' : 'no';

    const rawRT = getLineVal('Fit and Suitable for RT (ISRT/IFRT)');
    if (rawRT) fields['fit-for-rt'] = rawRT.toLowerCase().includes('yes') ? 'yes' : 'no';
  } else if (guidelineId === 'NCG_LYMPHOMA_WORKUP_2020') {
    // Lymphoma Workup mapping
    const rawPres = getLineVal('Initial Presentation');
    if (rawPres) {
      const l = rawPres.toLowerCase();
      if (l.includes('lymphocytosis')) fields['initial-presentation'] = 'circulating-lymphocytosis';
      else if (l.includes('lymphadenopathy')) fields['initial-presentation'] = 'isolated-lymphadenopathy';
    }

    const rawHist = getLineVal('Histology');
    if (rawHist) {
      const l = rawHist.toLowerCase();
      if (l.includes('dlbcl')) fields['histology'] = 'dlbcl';
      else if (l.includes('follicular')) fields['histology'] = 'follicular-lymphoma';
      else if (l.includes('marginal')) fields['histology'] = 'mzl';
    }

    const rawStage = getLineVal('Ann Arbor Stage') || getLineVal('Stage');
    if (rawStage) {
      const l = rawStage.toLowerCase();
      if (l.includes('iv') || l.includes('4')) fields['ann-arbor-stage'] = 'stage-4';
      else if (l.includes('iii') || l.includes('3')) fields['ann-arbor-stage'] = 'stage-3';
      else if (l.includes('ii') || l.includes('2')) fields['ann-arbor-stage'] = 'stage-2';
      else if (l.includes('i') || l.includes('1')) fields['ann-arbor-stage'] = 'stage-1';
    }

    const rawLdh = getLineVal('Serum LDH Level') || getLineVal('Serum LDH Elevated');
    if (rawLdh) {
      const l = rawLdh.toLowerCase();
      if (l.includes('elevated') || l.includes('yes') || l.includes('high')) fields['ldh-level'] = 'elevated';
      else fields['ldh-level'] = 'normal';
    }

    const rawEcog = getLineVal('ECOG Performance Status');
    if (rawEcog) {
      const l = rawEcog.toLowerCase();
      if (l.includes('0') || l.includes('1')) fields['ecog-ps'] = 'ecog-0-1';
      else fields['ecog-ps'] = 'ecog-2-4';
    }
  }

  // Patient info extraction
  const patientInfo = {
    name: getLineVal('Patient Name') || 'Synoptic Intake Patient',
    abhaId: getLineVal('ABHA ID') || '12-3456-7890-1234',
    age: getLineVal('Age') || '56',
    gender: getLineVal('Gender') || 'Male',
  };

  return { fields, unparsed, patientInfo };
}

/**
 * Builds standard CDS Hooks Card response
 */
function buildCdsHooksCard(report) {
  const isNeedsReview = report.requires_human_review || report.treatment_group === 'needs-review';
  const indicator = isNeedsReview ? 'warning' : 'info';

  const summary = isNeedsReview
    ? `NCG CDS Alert: Patient requires Multidisciplinary Team Review (${report.treatment_group})`
    : `NCG Guideline Recommendation: ${report.treatment_group.replace(/-/g, ' ').toUpperCase()}`;

  const detailLines = [];
  if (report.recommended_regimens && report.recommended_regimens.length > 0) {
    detailLines.push(`Recommended Regimens: ${report.recommended_regimens.join(', ')}`);
  }
  if (report.calculated_scores && Object.keys(report.calculated_scores).length > 0) {
    const scoresStr = Object.entries(report.calculated_scores)
      .map(([k, v]) => `${k}: ${v.score ?? 'null'} (${v.riskLabel || v.riskGroup || 'unclassified'})`)
      .join(' | ');
    detailLines.push(`Calculated Prognostic Indices: ${scoresStr}`);
  }
  if (report.data_quality_warnings && report.data_quality_warnings.length > 0) {
    detailLines.push(`Data Provenance Warnings: ${report.data_quality_warnings.join('; ')}`);
  }

  return {
    cards: [
      {
        uuid: `card-${Date.now()}`,
        summary,
        detail: detailLines.join('\n\n'),
        indicator,
        source: {
          label: `National Cancer Grid (India) - ${report.library.id} v${report.library.version}`,
          url: 'https://tmc.gov.in/ncg/',
        },
        suggestions: report.recommended_regimens.map((r, idx) => ({
          label: `Select Regimen: ${r}`,
          uuid: `sug-${idx}`,
        })),
        links: [
          {
            label: 'View NCG Clinical Guideline PDF',
            url: 'https://tmc.gov.in/ncg/',
            type: 'absolute',
          },
        ],
      },
    ],
  };
}

// Request dispatcher
const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method.toUpperCase();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // -------------------------------------------------------------
  // API ROUTES
  // -------------------------------------------------------------

  // 1. Health check
  if (pathname === '/api/health' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), time: new Date().toISOString() }));
    return;
  }

  // 2. Guidelines list
  if (pathname === '/api/guidelines' && method === 'GET') {
    try {
      const repo = getRepository(ELM_DIR);
      const guidelines = GUIDELINES_METADATA.map((g) => {
        const elmExists = Boolean(repo.resolve(g.id));
        return {
          ...g,
          elmAvailable: elmExists,
        };
      });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ guidelines }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 3. Test bundles catalog
  if (pathname === '/api/bundles' && method === 'GET') {
    try {
      const manifestPath = path.join(BUNDLES_DIR, 'manifest.json');
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ manifest }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 4. Load single bundle JSON
  if (pathname === '/api/bundle' && method === 'GET') {
    try {
      const folder = parsedUrl.query.folder;
      const filename = parsedUrl.query.filename;
      if (!folder || !filename) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Missing folder or filename query parameter' }));
        return;
      }
      const safePath = path.join(BUNDLES_DIR, folder, path.basename(filename));
      if (!fs.existsSync(safePath)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: `Bundle not found: ${filename}` }));
        return;
      }
      const bundleData = JSON.parse(fs.readFileSync(safePath, 'utf8'));
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ bundle: bundleData }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // 5. Sample synoptic reports list
  if (pathname === '/api/sample-reports' && method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reports: SAMPLE_SYNOPTIC_REPORTS }));
    return;
  }

  // 6. Evaluate CQL Endpoint
  if (pathname === '/api/evaluate' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        let bundle = payload.bundle;
        let guidelineId = payload.guidelineId;
        let version = payload.version;

        // Modality B: Manual Entry
        if (payload.manualInputs) {
          guidelineId = guidelineId || payload.manualInputs.guidelineId || 'NCG_LYMPHOMA_WORKUP_2020';
          bundle = buildFhirBundleFromManual(
            guidelineId,
            payload.manualInputs,
            payload.patientInfo || {},
            payload.provenance || 'source-coded'
          );
        }

        // Modality C: Synoptic Text
        if (payload.synopticText) {
          guidelineId = guidelineId || 'NCG_FL_2020';
          const { fields, patientInfo } = extractSynopticFieldsFromText(payload.synopticText, guidelineId);
          bundle = buildFhirBundleFromManual(guidelineId, fields, patientInfo, 'source-coded');
        }

        if (!bundle) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No FHIR bundle or inputs provided for evaluation' }));
          return;
        }

        const report = await evaluateBundle(bundle, guidelineId, version);
        const cdsHooksCard = buildCdsHooksCard(report);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          report,
          cdsHooksCard,
          bundle,
        }));
      } catch (err) {
        console.error('API /api/evaluate error:', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message, stack: err.stack }));
      }
    });
    return;
  }

  // 7. Parse synoptic text endpoint
  if (pathname === '/api/extract-text' && method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try {
        const { text, guidelineId } = JSON.parse(body || '{}');
        if (!text) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'No text provided' }));
          return;
        }
        const extracted = extractSynopticFieldsFromText(text, guidelineId || 'NCG_FL_2020');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(extracted));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
    });
    return;
  }

  // -------------------------------------------------------------
  // STATIC ASSETS SERVING
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  // Security: prevent directory traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const extname = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        // Fallback to index.html for SPA routes
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallbackContent) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallbackContent, 'utf-8');
          }
        });
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('='.repeat(78));
  console.log(`NCG CQL Clinical Decision Support Engine - Web Server Started`);
  console.log(`- Web Dashboard URL : http://localhost:${PORT}`);
  console.log(`- REST API Endpoint : http://localhost:${PORT}/api/evaluate`);
  console.log(`- HL7 CQL Libraries : NCG_LYMPHOMA_WORKUP_2020, NCG_FL_2020, DLBCL Treatment, DLBCL R/R`);
  console.log(`- Standards Support : HL7 CQL 1.4/1.5, FHIR R4, ABDM NDHM HealthID, CDS Hooks`);
  console.log('='.repeat(78));
});

module.exports = server;
