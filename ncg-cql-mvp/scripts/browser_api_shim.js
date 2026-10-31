/**
 * browser_api_shim.js - Client-side HL7 CQL 1.5 Engine & FHIR R4 API Runtime for AWS Amplify Hosting
 *
 * When bundled into dist/standalone-engine.js for static AWS Amplify Hosting, this module
 * intercepts window.fetch('/api/...') requests and executes the exact same CQL 1.5 engine,
 * Mock Hospital EHR FHIR R4 service, LOINC derivation, PDF/text clinical report extraction,
 * and CDS Hooks card builder directly in the browser.
 */

const { evaluateBundle, getRepository } = require('../engine/js/evaluate_via_cql_execution');
const { listGuidelines, getGuideline } = require('../lib/schemas');
const { validateFindings, buildCaseBundle, extractFindingsFromBundle, buildDecision } = require('../lib/case');
const { listEhrPatients, importFromEhr } = require('../lib/ehr');
const { extractTextFromPdfBytesBrowser, extractFromText, SAMPLE_REPORTS } = require('../lib/extractor');
const BUNDLES_MANIFEST = require('../sample_data/fhir_bundles/manifest.json');

const GUIDELINES_METADATA = [
  {
    id: 'NCG_LYMPHOMA_WORKUP_2020',
    title: 'Suspected Lymphoma — Diagnostic Workup & Staging Pathway',
    shortTitle: 'Diagnostic Workup & Staging',
    version: '1.2.0',
    category: 'Diagnostic & Staging',
    disease: 'Non-Hodgkin & Hodgkin Lymphoma',
    description: 'Initial presentation triage, peripheral blood flow cytometry vs excisional biopsy, PET-CT vs CECT staging, viral prophylaxis (HBV/HCV/HIV), TLS prophylaxis, and 8 prognostic indices (aaIPI, IPI, FLIPI, MIPI, CLL-IPI, IPS, MALT-IPI, PIT).',
    scores: ['aaIPI', 'IPI', 'FLIPI', 'MIPI', 'CLLIPI', 'IPS', 'MALT_IPI', 'PIT'],
    defaultBundleFolder: 'lymphoma_workup',
  },
  {
    id: 'NCG_FL_2020',
    title: 'Follicular Lymphoma — First-Line Treatment Pathway',
    shortTitle: 'Follicular Lymphoma (1L)',
    version: '0.2.0',
    category: 'First-Line Systemic Therapy',
    disease: 'Follicular Lymphoma (FL)',
    description: 'WHO Grade 1-2/3a vs 3b/transformed stratification, Ann Arbor Stage I-IV, GELF tumor burden, BR vs R-CHOP vs curative ISRT radiotherapy, and watchful waiting surveillance.',
    scores: [],
    defaultBundleFolder: 'follicular',
  },
  {
    id: 'NCG_DLBCL_TREATMENT_2020',
    title: 'DLBCL & PMBCL — First-Line Treatment Pathway',
    shortTitle: 'DLBCL & PMBCL (1L)',
    version: '1.0.0',
    category: 'First-Line Systemic Therapy',
    disease: 'Diffuse Large B-Cell Lymphoma (DLBCL) & PMBCL',
    description: 'Anthracycline/LVEF fitness, Limited vs Advanced stage, aaIPI/IPI stratification, Cell-of-Origin (Non-GCB Pola-R-CHP vs R-CHOP), CNS prophylaxis, HIV-DLBCL CD4-adapted EPOCH, and PMBCL DA-EPOCH-R.',
    scores: ['aaIPI', 'IPI'],
    defaultBundleFolder: 'dlbcl_treatment',
  },
  {
    id: 'NCG_DLBCL_RR_2020',
    title: 'Relapsed / Refractory DLBCL — Salvage, CAR-T & Palliative Pathways',
    shortTitle: 'Relapsed / Refractory DLBCL',
    version: '1.0.0',
    category: 'Relapsed / Refractory Therapy',
    disease: 'Relapsed / Refractory DLBCL',
    description: 'Mandatory repeat biopsy gate, relapse timing (>12m vs <=12m/refractory), Pathway A (R-GEMOX/R-GDP + ASCT consolidation), Pathway B (Primary CAR-T & non-bendamustine bridging vs Glofitamab-GEMOX), and Pathway C (palliative/targeted).',
    scores: [],
    defaultBundleFolder: 'dlbcl_rr',
  },
];

function buildFhirBundleFromManual(guidelineId, inputs, patientInfo = {}, provenance = 'source-coded') {
  const schema = getGuideline(guidelineId);
  if (schema) {
    const findings = {};
    for (const [rawKey, val] of Object.entries(inputs || {})) {
      if (!val || val === 'none' || val.endsWith('_provenance')) continue;
      let key = rawKey;
      if (rawKey === 'gelf-burden' && guidelineId === 'NCG_FL_2020') key = 'gelf';
      if (rawKey === 'bm-biopsy' && guidelineId === 'NCG_FL_2020') key = 'bone-marrow';
      if (rawKey === 'ann-arbor-stage' && guidelineId === 'NCG_FL_2020') key = 'stage';
      if (rawKey === 'ann-arbor-stage' && guidelineId === 'NCG_DLBCL_TREATMENT_2020') key = 'dlbcl-stage';
      if (rawKey === 'ann-arbor-stage' && guidelineId === 'NCG_LYMPHOMA_WORKUP_2020') key = 'staging-extent';
      if (rawKey === 'ldh-level') key = 'serum-ldh';
      const prov = inputs[`${rawKey}_provenance`] || inputs[`${key}_provenance`] || provenance;
      findings[key] = { value: String(val), provenance: prov };
    }
    return buildCaseBundle(schema, patientInfo, findings);
  }
  return null;
}

function buildCdsHooksCard(report, decision = null) {
  const isNeedsReview = report.requires_human_review || report.treatment_group === 'needs-review' || decision?.status !== 'recommendation';
  const indicator = isNeedsReview ? 'warning' : 'info';

  const outcomeTitle = decision?.label || report.treatment_group.replace(/-/g, ' ').toUpperCase();
  const summary = isNeedsReview
    ? `Clinical Safety Gate: ${outcomeTitle}`
    : `Clinical Guideline Recommendation: ${outcomeTitle}`;

  const detailLines = [];
  if (decision?.rationale) {
    detailLines.push(`Clinical Rationale: ${decision.rationale}`);
  }
  if (report.recommended_regimens && report.recommended_regimens.length > 0) {
    detailLines.push(`Recommended Regimens / Actions:\n• ${report.recommended_regimens.join('\n• ')}`);
  }
  if (report.calculated_scores && Object.keys(report.calculated_scores).length > 0) {
    const scoresStr = Object.entries(report.calculated_scores)
      .filter(([, v]) => v && v.score !== null && v.score !== undefined)
      .map(([k, v]) => `${k}: ${v.score} (${v.riskLabel || v.riskGroup || 'classified'})`)
      .join(' | ');
    if (scoresStr) detailLines.push(`Calculated Prognostic Indices: ${scoresStr}`);
  }
  if (decision?.why?.ruleLabel) {
    detailLines.push(`Matched Guideline Rule: ${decision.why.ruleLabel}`);
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
          label: `Hematology-Oncology Clinical Working Group — ${report.library.id} v${report.library.version}`,
          url: 'https://hl7.org/fhir/R4/clinicalreasoning-module.html',
        },
        suggestions: (report.recommended_regimens || []).map((r, idx) => ({
          label: `Order / Plan: ${r}`,
          uuid: `sug-${idx}`,
        })),
        links: [
          {
            label: 'Hematology-Oncology Clinical Practice Guidelines',
            url: 'https://hl7.org/fhir/R4/plandefinition.html',
            type: 'absolute',
          },
        ],
      },
    ],
  };
}

function base64ToUint8Array(b64) {
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) arr[i] = bin.charCodeAt(i) & 0xff;
  return arr;
}

function uint8ArrayToUtf8(arr) {
  return new TextDecoder('utf-8').decode(arr);
}

function jsonResponse(status, data) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}

if (typeof window !== 'undefined' && typeof window.fetch === 'function') {
  const originalFetch = window.fetch.bind(window);

  window.fetch = async function amplifyApiFetch(input, init = {}) {
    const reqUrl = typeof input === 'string' ? input : (input && input.url) || '';
    let parsed;
    try {
      parsed = new URL(reqUrl, window.location.origin);
    } catch (_) {
      return originalFetch(input, init);
    }

    if (parsed.origin !== window.location.origin || !parsed.pathname.startsWith('/api/')) {
      return originalFetch(input, init);
    }

    const pathname = parsed.pathname;
    const method = String(init.method || (typeof input === 'object' && input.method) || 'GET').toUpperCase();

    const getBodyJson = async () => {
      if (!init.body) return {};
      if (typeof init.body === 'string') return JSON.parse(init.body || '{}');
      return {};
    };

    try {
      // 1. Health check
      if (pathname === '/api/health' && method === 'GET') {
        return jsonResponse(200, { status: 'ok', mode: 'aws-amplify-browser-engine', time: new Date().toISOString() });
      }

      // 2. Full Guideline Schemas
      if (pathname === '/api/schemas' && method === 'GET') {
        return jsonResponse(200, { guidelines: listGuidelines() });
      }

      // 3. Guidelines catalog
      if (pathname === '/api/guidelines' && method === 'GET') {
        const repo = getRepository();
        const guidelines = GUIDELINES_METADATA.map((g) => {
          const schema = getGuideline(g.id);
          const elmExists = Boolean(repo.resolve(g.id));
          return {
            ...g,
            elmAvailable: elmExists,
            findingsCount: schema ? schema.findings.length : 0,
            outcomesCount: schema ? schema.outcomes.length : 0,
            rulesCount: schema ? schema.rules.length : 0,
            functionsCount: schema ? (schema.functions || []).length : 0,
            schema: schema || null,
          };
        });
        return jsonResponse(200, { guidelines });
      }

      // 4. Mock EHR FHIR R4 Service — List EHR Patients
      if (pathname === '/api/ehr/patients' && method === 'GET') {
        return jsonResponse(200, { patients: listEhrPatients() });
      }

      // 5. Mock EHR FHIR R4 Service — Pull Patient by ID
      if ((pathname === '/api/ehr/patient' || pathname.startsWith('/api/ehr/Patient/')) && method === 'GET') {
        const pathPatientId = pathname.startsWith('/api/ehr/Patient/')
          ? decodeURIComponent(pathname.slice('/api/ehr/Patient/'.length))
          : null;
        const patientId = pathPatientId || parsed.searchParams.get('patientId') || parsed.searchParams.get('id');
        const guidelineId = parsed.searchParams.get('guidelineId') || null;
        if (!patientId) {
          return jsonResponse(400, { error: 'Missing patientId parameter' });
        }
        const result = importFromEhr(guidelineId, patientId);
        if (!result.found) {
          return jsonResponse(404, result);
        }
        return jsonResponse(200, result);
      }

      // 6. Test bundles catalog
      if (pathname === '/api/bundles' && method === 'GET') {
        return jsonResponse(200, { manifest: BUNDLES_MANIFEST });
      }

      // 7. Load single synthetic bundle JSON
      if (pathname === '/api/bundle' && method === 'GET') {
        const folder = parsed.searchParams.get('folder');
        const filename = parsed.searchParams.get('filename');
        if (!folder || !filename) {
          return jsonResponse(400, { error: 'Missing folder or filename query parameter' });
        }
        const bundleRes = await originalFetch(`/sample_data/fhir_bundles/${encodeURIComponent(folder)}/${encodeURIComponent(filename)}`);
        if (!bundleRes.ok) {
          return jsonResponse(404, { error: `Bundle not found: ${filename}` });
        }
        const bundleData = await bundleRes.json();
        const tagGuideline = (bundleData.meta?.tag || []).find((t) => t.system === 'http://ncgindia.org/guideline')?.code;
        const schema = getGuideline(tagGuideline || parsed.searchParams.get('guidelineId') || 'NCG_FL_2020');
        const extracted = schema ? extractFindingsFromBundle(schema, bundleData) : { patient: {}, findings: {} };
        return jsonResponse(200, {
          bundle: bundleData,
          guidelineId: schema?.id || tagGuideline,
          patient: extracted.patient,
          findings: extracted.findings,
        });
      }

      // 8. Sample clinical & synoptic reports catalog
      if (pathname === '/api/sample-reports' && method === 'GET') {
        const reportsList = Object.values(SAMPLE_REPORTS);
        return jsonResponse(200, { reports: reportsList, sampleReports: reportsList });
      }

      // 9. Sample PDF files -> pass through to static /api/sample-pdf/<file>
      if (pathname.startsWith('/api/sample-pdf/') && method === 'GET') {
        return originalFetch(input, init);
      }

      // 10. Schema-driven Document & PDF Extraction Endpoint
      if ((pathname === '/api/extract-document' || pathname === '/api/extract-text') && method === 'POST') {
        const payload = await getBodyJson();
        let guidelineId = payload.guidelineId || 'NCG_FL_2020';
        let rawText = payload.text || '';
        let sourceTitle = payload.filename || 'Clinical Report';

        if (payload.sampleId && SAMPLE_REPORTS[payload.sampleId]) {
          const sample = SAMPLE_REPORTS[payload.sampleId];
          guidelineId = payload.guidelineId || sample.guidelineId;
          sourceTitle = sample.title;
          rawText = sample.text;
        }

        if (payload.contentBase64) {
          const bytes = base64ToUint8Array(payload.contentBase64);
          const header = String.fromCharCode(...bytes.slice(0, 5));
          const isPdf = (payload.filename && payload.filename.toLowerCase().endsWith('.pdf')) || header === '%PDF-';
          if (isPdf) {
            rawText = await extractTextFromPdfBytesBrowser(bytes);
            if (!rawText && payload.filename) {
              const matchingSample = Object.values(SAMPLE_REPORTS).find(
                (s) => s.pdfFile && s.pdfFile.toLowerCase() === payload.filename.toLowerCase()
              );
              if (matchingSample) rawText = matchingSample.text;
            }
            if (!rawText) {
              return jsonResponse(422, { error: 'Could not extract text from uploaded PDF file.' });
            }
          } else {
            rawText = uint8ArrayToUtf8(bytes);
          }
        }

        if (!rawText || !rawText.trim()) {
          return jsonResponse(400, { error: 'No clinical text or document content provided for extraction.' });
        }

        const extraction = extractFromText(guidelineId, rawText);
        const fields = {};
        const unparsed = [];
        for (const item of extraction.extracted) {
          if (item.usable && item.value) {
            fields[item.findingId] = item.value;
          } else {
            fields[item.findingId] = item.value || `unparsed-${item.findingId}`;
            fields[`${item.findingId}_provenance`] = 'unparsed';
            unparsed.push({ field: item.findingId, raw: item.snippet });
          }
        }

        return jsonResponse(200, {
          success: true,
          sourceTitle,
          text: rawText,
          ...extraction,
          fields,
          unparsed,
        });
      }

      // 11. Evaluate CQL Endpoint (/api/evaluate)
      if (pathname === '/api/evaluate' && method === 'POST') {
        const payload = await getBodyJson();
        let bundle = payload.bundle;
        let guidelineId = payload.guidelineId || 'NCG_DLBCL_TREATMENT_2020';
        const version = payload.version;
        let schema = getGuideline(guidelineId);
        let cleanFindings = null;
        let validationErrors = [];

        if (payload.findings && schema) {
          const validated = validateFindings(schema, payload.findings);
          cleanFindings = validated.clean;
          validationErrors = validated.errors;
          bundle = buildCaseBundle(schema, payload.patient || payload.patientInfo || {}, cleanFindings);
        }

        if (!bundle && payload.manualInputs) {
          guidelineId = guidelineId || payload.manualInputs.guidelineId || 'NCG_LYMPHOMA_WORKUP_2020';
          schema = getGuideline(guidelineId);
          bundle = buildFhirBundleFromManual(
            guidelineId,
            payload.manualInputs,
            payload.patientInfo || {},
            payload.provenance || 'source-coded'
          );
        }

        if (!bundle && payload.synopticText) {
          guidelineId = guidelineId || 'NCG_FL_2020';
          schema = getGuideline(guidelineId);
          const ext = extractFromText(guidelineId, payload.synopticText);
          const fMap = {};
          for (const item of ext.extracted) {
            fMap[item.findingId] = { value: item.value, provenance: item.provenance };
          }
          const validated = validateFindings(schema, fMap);
          cleanFindings = validated.clean;
          bundle = buildCaseBundle(schema, ext.patientInfo || {}, cleanFindings);
        }

        if (!bundle) {
          return jsonResponse(400, { error: 'No FHIR bundle or clinical findings provided for evaluation' });
        }

        const bundleGuideline = (bundle.meta?.tag || []).find((t) => t.system === 'http://ncgindia.org/guideline')?.code;
        if (bundleGuideline && getGuideline(bundleGuideline)) {
          guidelineId = bundleGuideline;
          schema = getGuideline(bundleGuideline);
        }

        if (!cleanFindings && schema) {
          cleanFindings = extractFindingsFromBundle(schema, bundle).findings;
        }

        const report = await evaluateBundle(bundle, guidelineId, version);
        const decision = schema ? buildDecision(schema, report, cleanFindings || {}) : null;
        const cdsHooksCard = buildCdsHooksCard(report, decision);

        return jsonResponse(200, {
          success: true,
          report,
          decision,
          validationErrors,
          cdsHooksCard,
          bundle,
        });
      }

      return jsonResponse(404, { error: `Unknown API route: ${pathname}` });
    } catch (err) {
      console.error('Client-side CQL API error:', err);
      return jsonResponse(500, { error: err.message, stack: err.stack });
    }
  };
}

