/**
 * server.js - Point-of-Care Clinical Decision Support (CDS) Workstation & CQL Engine Server
 *
 * Provides:
 * 1. Point-of-Care Clinical Workstation UI for Hematology-Oncology Guidelines
 * 2. Mock Hospital EHR FHIR R4 Service (/api/ehr/patients, /api/ehr/patient, /api/ehr/Patient/:id)
 * 3. Schema-driven PDF & Clinical Document Extractor (/api/extract-document, /api/sample-reports)
 * 4. Dynamic Guideline Schema Catalog synced with Clinical Guideline Studio (/api/schemas, /api/guidelines)
 * 5. HL7 CQL 1.4/1.5 Evaluation Engine + Clinician Decision Explainer + CDS Hooks + ABDM FHIR R4 Bundle
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const { evaluateBundle, getRepository } = require('./engine/js/evaluate_via_cql_execution');
const { listGuidelines, getGuideline } = require('./lib/schemas');
const { validateFindings, buildCaseBundle, extractFindingsFromBundle, buildDecision } = require('./lib/case');
const { listEhrPatients, importFromEhr } = require('./lib/ehr');
const { extractTextFromPdfBuffer, extractFromText, SAMPLE_REPORTS } = require('./lib/extractor');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';

const ELM_DIR = path.resolve(__dirname, 'elm');
const BUNDLES_DIR = path.resolve(__dirname, 'sample_data/fhir_bundles');
const SAMPLE_DATA_DIR = path.resolve(__dirname, 'sample_data');
const PUBLIC_DIR = path.resolve(__dirname, 'public');

if (!fs.existsSync(PUBLIC_DIR)) {
  fs.mkdirSync(PUBLIC_DIR, { recursive: true });
}

// Guideline catalog metadata (enriched with schemas at runtime)
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

/**
 * Legacy helper preserved for backward-compatible /api/evaluate calls using manualInputs
 */
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

/**
 * Builds standard HL7 CDS Hooks Card response enriched with human-readable decision details
 */
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

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Request payload too large (>25MB)'));
      }
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(new Error(`Invalid JSON body: ${err.message}`));
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, statusCode, data) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
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
    sendJson(res, 200, { status: 'ok', uptime: process.uptime(), time: new Date().toISOString() });
    return;
  }

  // 2. Full Guideline Schemas (synced from Clinical Guideline Studio)
  if (pathname === '/api/schemas' && method === 'GET') {
    try {
      sendJson(res, 200, { guidelines: listGuidelines() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 3. Guidelines list (enriched with schema counts & ELM availability)
  if (pathname === '/api/guidelines' && method === 'GET') {
    try {
      const repo = getRepository(ELM_DIR);
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
      sendJson(res, 200, { guidelines });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 4. Mock EHR FHIR R4 Service — List EHR Patients
  if (pathname === '/api/ehr/patients' && method === 'GET') {
    try {
      sendJson(res, 200, { patients: listEhrPatients() });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 5. Mock EHR FHIR R4 Service — Pull Patient by ID (?patientId=...&guidelineId=... or /api/ehr/Patient/:id)
  if ((pathname === '/api/ehr/patient' || pathname.startsWith('/api/ehr/Patient/')) && method === 'GET') {
    try {
      const pathPatientId = pathname.startsWith('/api/ehr/Patient/')
        ? decodeURIComponent(pathname.slice('/api/ehr/Patient/'.length))
        : null;
      const patientId = pathPatientId || parsedUrl.query.patientId || parsedUrl.query.id;
      const guidelineId = parsedUrl.query.guidelineId || null;

      if (!patientId) {
        sendJson(res, 400, { error: 'Missing patientId parameter' });
        return;
      }

      const result = importFromEhr(guidelineId, patientId);
      if (!result.found) {
        sendJson(res, 404, result);
        return;
      }
      sendJson(res, 200, result);
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 6. Test bundles catalog (synthetic regression bundles)
  if (pathname === '/api/bundles' && method === 'GET') {
    try {
      const manifestPath = path.join(BUNDLES_DIR, 'manifest.json');
      let manifest = null;
      if (fs.existsSync(manifestPath)) {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      }
      sendJson(res, 200, { manifest });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 7. Load single synthetic bundle JSON + extract its worksheet findings
  if (pathname === '/api/bundle' && method === 'GET') {
    try {
      const folder = parsedUrl.query.folder;
      const filename = parsedUrl.query.filename;
      if (!folder || !filename) {
        sendJson(res, 400, { error: 'Missing folder or filename query parameter' });
        return;
      }
      const safePath = path.join(BUNDLES_DIR, folder, path.basename(filename));
      if (!fs.existsSync(safePath)) {
        sendJson(res, 404, { error: `Bundle not found: ${filename}` });
        return;
      }
      const bundleData = JSON.parse(fs.readFileSync(safePath, 'utf8'));
      const tagGuideline = (bundleData.meta?.tag || []).find((t) => t.system === 'http://ncgindia.org/guideline')?.code;
      const schema = getGuideline(tagGuideline || parsedUrl.query.guidelineId || 'NCG_FL_2020');
      const extracted = schema ? extractFindingsFromBundle(schema, bundleData) : { patient: {}, findings: {} };
      sendJson(res, 200, {
        bundle: bundleData,
        guidelineId: schema?.id || tagGuideline,
        patient: extracted.patient,
        findings: extracted.findings,
      });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 8. Sample clinical & synoptic reports catalog
  if (pathname === '/api/sample-reports' && method === 'GET') {
    const reportsList = Object.values(SAMPLE_REPORTS);
    sendJson(res, 200, { reports: reportsList, sampleReports: reportsList });
    return;
  }

  // 9. Serve sample PDF files from sample_data/
  if (pathname.startsWith('/api/sample-pdf/') && method === 'GET') {
    const filename = path.basename(decodeURIComponent(pathname.slice('/api/sample-pdf/'.length)));
    const pdfPath = path.join(SAMPLE_DATA_DIR, filename);
    if (!pdfPath.startsWith(SAMPLE_DATA_DIR) || !fs.existsSync(pdfPath)) {
      sendJson(res, 404, { error: `Sample PDF not found: ${filename}` });
      return;
    }
    res.writeHead(200, {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${filename}"`,
    });
    res.end(fs.readFileSync(pdfPath));
    return;
  }

  // 10. Schema-driven Document & PDF Extraction Endpoint (/api/extract-document and /api/extract-text)
  if ((pathname === '/api/extract-document' || pathname === '/api/extract-text') && method === 'POST') {
    try {
      const payload = await readJsonBody(req);
      let guidelineId = payload.guidelineId || 'NCG_FL_2020';
      let rawText = payload.text || '';
      let sourceTitle = payload.filename || 'Clinical Report';

      // Option A: Load a built-in sample report by ID
      if (payload.sampleId && SAMPLE_REPORTS[payload.sampleId]) {
        const sample = SAMPLE_REPORTS[payload.sampleId];
        guidelineId = payload.guidelineId || sample.guidelineId;
        sourceTitle = sample.title;
        rawText = sample.text;
      }

      // Option B: Uploaded binary file (PDF or TXT in base64)
      if (payload.contentBase64) {
        const buf = Buffer.from(payload.contentBase64, 'base64');
        const isPdf = (payload.filename && payload.filename.toLowerCase().endsWith('.pdf')) ||
          buf.slice(0, 5).toString('ascii') === '%PDF-';
        if (isPdf) {
          rawText = extractTextFromPdfBuffer(buf);
          if (!rawText) {
            sendJson(res, 422, { error: 'Could not extract text from uploaded PDF file.' });
            return;
          }
        } else {
          rawText = buf.toString('utf8');
        }
      }

      if (!rawText || !rawText.trim()) {
        sendJson(res, 400, { error: 'No clinical text or document content provided for extraction.' });
        return;
      }

      const extraction = extractFromText(guidelineId, rawText);

      // Legacy fields map for backward compatibility with /api/extract-text callers
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

      sendJson(res, 200, {
        success: true,
        sourceTitle,
        text: rawText,
        ...extraction,
        fields,
        unparsed,
      });
    } catch (err) {
      console.error('Document extraction error:', err);
      sendJson(res, 500, { error: err.message });
    }
    return;
  }

  // 11. Evaluate CQL Endpoint (/api/evaluate)
  if (pathname === '/api/evaluate' && method === 'POST') {
    try {
      const payload = await readJsonBody(req);
      let bundle = payload.bundle;
      let guidelineId = payload.guidelineId || 'NCG_DLBCL_TREATMENT_2020';
      let version = payload.version;
      let schema = getGuideline(guidelineId);
      let cleanFindings = null;
      let validationErrors = [];

      // Mode 1 (New Point-of-Care Worksheet): { guidelineId, patient, findings }
      if (payload.findings && schema) {
        const validated = validateFindings(schema, payload.findings);
        cleanFindings = validated.clean;
        validationErrors = validated.errors;
        bundle = buildCaseBundle(schema, payload.patient || payload.patientInfo || {}, cleanFindings);
      }

      // Mode 2 (Legacy manualInputs): { guidelineId, manualInputs, patientInfo, provenance }
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

      // Mode 3 (Legacy synopticText): { guidelineId, synopticText }
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
        sendJson(res, 400, { error: 'No FHIR bundle or clinical findings provided for evaluation' });
        return;
      }

      // Determine schema from bundle tag if not already set
      const bundleGuideline = (bundle.meta?.tag || []).find((t) => t.system === 'http://ncgindia.org/guideline')?.code;
      if (bundleGuideline && getGuideline(bundleGuideline)) {
        guidelineId = bundleGuideline;
        schema = getGuideline(bundleGuideline);
      }

      // If raw bundle was submitted without payload.findings, extract findings from bundle for decision explanation
      if (!cleanFindings && schema) {
        cleanFindings = extractFindingsFromBundle(schema, bundle).findings;
      }

      const report = await evaluateBundle(bundle, guidelineId, version);
      const decision = schema ? buildDecision(schema, report, cleanFindings || {}) : null;
      const cdsHooksCard = buildCdsHooksCard(report, decision);

      sendJson(res, 200, {
        success: true,
        report,
        decision,
        validationErrors,
        cdsHooksCard,
        bundle,
      });
    } catch (err) {
      console.error('API /api/evaluate error:', err);
      sendJson(res, 500, { error: err.message, stack: err.stack });
    }
    return;
  }

  // -------------------------------------------------------------
  // STATIC ASSETS SERVING
  // -------------------------------------------------------------
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

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
    '.pdf': 'application/pdf',
  };

  const contentType = mimeTypes[extname] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        fs.readFile(path.join(PUBLIC_DIR, 'index.html'), (err2, fallbackContent) => {
          if (err2) {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          } else {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(fallbackContent);
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
      res.end(content);
    }
  });
});

server.listen(PORT, HOST, () => {
  console.log('='.repeat(78));
  console.log(`Point-of-Care Clinical Decision Support Workstation Started`);
  console.log(`- Point-of-Care URL : http://localhost:${PORT}`);
  console.log(`- Mock EHR FHIR API : http://localhost:${PORT}/api/ehr/patients`);
  console.log(`- Document Extract  : http://localhost:${PORT}/api/extract-document`);
  console.log(`- CQL Evaluate API  : http://localhost:${PORT}/api/evaluate`);
  console.log('='.repeat(78));
});

module.exports = server;
