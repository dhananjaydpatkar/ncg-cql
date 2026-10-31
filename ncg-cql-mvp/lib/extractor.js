/**
 * extractor.js - Schema-driven Clinical Document & PDF Extractor for Point-of-Care CDS
 *
 * Extracts structured patient demographics and guideline-specific clinical findings from:
 *   1. Uploaded PDF files (.pdf) via Python pypdf / pdfplumber
 *   2. Uploaded or pasted plain-text synoptic pathology, PET-CT, and referral reports
 *
 * Every extracted finding includes:
 *   - findingId, findingLabel, category
 *   - value (matched allowed code, or null if ambiguous / unparsed)
 *   - valueLabel
 *   - provenance ('structured-capture' when cleanly matched, 'unparsed' when ambiguous/pending)
 *   - snippet (exact line from the source document for clinician verification)
 */
const { getGuideline, valueLabel } = require('./schemas');
const nodeRequire = typeof process !== 'undefined' && typeof process.getBuiltinModule === 'function' ? (id) => process.getBuiltinModule(id) : null;

function decodeAscii85(str) {
  const s = str.replace(/\s+/g, '').replace(/^<~/, '').replace(/~>$/, '');
  const out = [];
  for (let i = 0; i < s.length; ) {
    if (s[i] === 'z') {
      out.push(0, 0, 0, 0);
      i += 1;
      continue;
    }
    const chunk = s.slice(i, i + 5);
    i += chunk.length;
    let val = 0;
    for (let j = 0; j < 5; j += 1) {
      val = val * 85 + (j < chunk.length ? chunk.charCodeAt(j) - 33 : 84);
    }
    const bytes = [(val >>> 24) & 255, (val >>> 16) & 255, (val >>> 8) & 255, val & 255];
    for (let j = 0; j < chunk.length - 1; j += 1) out.push(bytes[j]);
  }
  return new Uint8Array(out);
}

function parsePdfContentStreamTokens(contentStr) {
  const tokens = [];
  const tjRx = /\(((?:\\.|[^\\()])*)\)\s*Tj|\[((?:\\.|[^\]])*)\]\s*TJ/g;
  let tm;
  while ((tm = tjRx.exec(contentStr)) !== null) {
    if (tm[1] !== undefined) {
      const t = tm[1].replace(/\\([()\\])/g, '$1').trim();
      if (t) tokens.push(t);
    } else if (tm[2] !== undefined) {
      const strRx = /\(((?:\\.|[^\\()])*)\)/g;
      let sm;
      let piece = '';
      while ((sm = strRx.exec(tm[2])) !== null) {
        piece += sm[1].replace(/\\([()\\])/g, '$1');
      }
      if (piece.trim()) tokens.push(piece.trim());
    }
  }
  const lines = [];
  for (let i = 0; i < tokens.length; i += 1) {
    if (tokens[i].endsWith(':') && i + 1 < tokens.length && !tokens[i].startsWith('CLINICAL')) {
      lines.push(`${tokens[i]} ${tokens[i + 1]}`);
      i += 1;
    } else {
      lines.push(tokens[i]);
    }
  }
  return lines.join('\n').trim();
}

function extractTextFromPdfBufferPureJs(pdfBuffer) {
  if (!nodeRequire) return '';
  const zlib = nodeRequire('zlib');
  try {
    const raw = Buffer.from(pdfBuffer).toString('latin1');
    const streamRx = /stream\r?\n([\s\S]*?)endstream/g;
    const pages = [];
    let m;
    while ((m = streamRx.exec(raw)) !== null) {
      const streamBody = m[1].trim();
      let content = '';
      try {
        const a85 = Buffer.from(decodeAscii85(streamBody));
        content = zlib.inflateSync(a85).toString('latin1');
      } catch (_) {
        try {
          content = zlib.inflateSync(Buffer.from(m[1].replace(/^\r?\n|\r?\n$/g, ''), 'latin1')).toString('latin1');
        } catch (_2) {
          content = streamBody;
        }
      }
      const pageText = parsePdfContentStreamTokens(content);
      if (pageText) pages.push(pageText);
    }
    return pages.join('\n').trim();
  } catch (_) {
    return '';
  }
}

async function inflateBytesBrowser(bytes) {
  if (typeof DecompressionStream === 'undefined') return '';
  for (const format of ['deflate', 'deflate-raw']) {
    try {
      const ds = new DecompressionStream(format);
      const writer = ds.writable.getWriter();
      writer.write(bytes);
      writer.close();
      const resp = new Response(ds.readable);
      const ab = await resp.arrayBuffer();
      const u8 = new Uint8Array(ab);
      let str = '';
      for (let i = 0; i < u8.length; i += 1) str += String.fromCharCode(u8[i]);
      if (str) return str;
    } catch (_) {}
  }
  return '';
}

async function extractTextFromPdfBytesBrowser(uint8Array) {
  try {
    let raw = '';
    for (let i = 0; i < uint8Array.length; i += 1) raw += String.fromCharCode(uint8Array[i]);
    const streamRx = /stream\r?\n([\s\S]*?)endstream/g;
    const pages = [];
    let m;
    while ((m = streamRx.exec(raw)) !== null) {
      const streamBody = m[1].trim();
      let content = await inflateBytesBrowser(decodeAscii85(streamBody));
      if (!content) {
        const rawBytes = new Uint8Array(streamBody.length);
        for (let i = 0; i < streamBody.length; i += 1) rawBytes[i] = streamBody.charCodeAt(i) & 0xff;
        content = (await inflateBytesBrowser(rawBytes)) || streamBody;
      }
      const pageText = parsePdfContentStreamTokens(content);
      if (pageText) pages.push(pageText);
    }
    return pages.join('\n').trim();
  } catch (_) {
    return '';
  }
}

/**
 * Extracts plain text from a PDF buffer using pure JS stream decoding first,
 * falling back to python3 (pypdf or .venv pdfplumber).
 */
function extractTextFromPdfBuffer(pdfBuffer) {
  const pureJsText = extractTextFromPdfBufferPureJs(pdfBuffer);
  if (pureJsText) return pureJsText;
  if (!nodeRequire) return '';

  const fs = nodeRequire('fs');
  const os = nodeRequire('os');
  const path = nodeRequire('path');
  const { execFileSync } = nodeRequire('child_process');
  const tmpFile = path.join(os.tmpdir(), `clinical-upload-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`);
  fs.writeFileSync(tmpFile, pdfBuffer);
  try {
    const pyScript = [
      'import sys',
      'try:',
      '    from pypdf import PdfReader',
      '    r = PdfReader(sys.argv[1])',
      '    print("\\n".join((p.extract_text() or "") for p in r.pages))',
      'except Exception:',
      '    import pdfplumber',
      '    with pdfplumber.open(sys.argv[1]) as pdf:',
      '        print("\\n".join((p.extract_text() or "") for p in pdf.pages))',
    ].join('\n');

    const venvPython = path.resolve(__dirname, '../.venv/bin/python');
    const pythonBin = fs.existsSync(venvPython) ? venvPython : 'python3';
    try {
      const out = execFileSync(pythonBin, ['-c', pyScript, tmpFile], { encoding: 'utf8', timeout: 10000 });
      if (out && out.trim()) return out.trim();
    } catch (_) {
      const out2 = execFileSync('python3', ['-c', pyScript, tmpFile], { encoding: 'utf8', timeout: 10000 });
      if (out2 && out2.trim()) return out2.trim();
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch (_) {}
  }
  return '';
}

function parsePatientHeader(text) {
  const info = {};
  const lines = String(text || '').split(/\r?\n/);
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    const nameMatch = line.match(/^Patient\s*Name\s*:\s*(.+)$/i);
    if (nameMatch) info.name = nameMatch[1].trim();

    const ageSexMatch = line.match(/^Age\s*\/?\s*(?:Sex|Gender)\s*:\s*(\d+)\s*(?:years|yrs|y)?\s*\/?\s*(Male|Female|M|F|Other)/i);
    if (ageSexMatch) {
      info.age = Number.parseInt(ageSexMatch[1], 10);
      const g = ageSexMatch[2].toLowerCase();
      info.gender = g.startsWith('m') ? 'male' : g.startsWith('f') ? 'female' : 'other';
    } else {
      const ageOnly = line.match(/^Age\s*:\s*(\d+)/i);
      if (ageOnly) info.age = Number.parseInt(ageOnly[1], 10);
      const sexOnly = line.match(/^(?:Sex|Gender)\s*:\s*(Male|Female|Other)/i);
      if (sexOnly) info.gender = sexOnly[1].toLowerCase();
    }

    const abhaMatch = line.match(/^(?:ABHA\s*ID|Health\s*ID)\s*:\s*([0-9-]+)/i);
    if (abhaMatch) info.abhaId = abhaMatch[1].trim();

    const mrnMatch = line.match(/^(?:MRN|Hospital\s*ID|UHID)\s*:\s*([A-Za-z0-9-]+)/i);
    if (mrnMatch) info.mrn = mrnMatch[1].trim();
  }
  return info;
}

/**
 * Schema-aware extraction rules per finding ID.
 * Each rule specifies:
 *   - lineMatcher: regex identifying a line in the report that discusses this clinical finding
 *   - valueMatchers: ordered array of [regex, code] to map clean synoptic text to an allowed code
 *   - ambiguousMatcher: optional regex that explicitly flags borderline/pending/ambiguous text as 'unparsed'
 */
const EXTRACTION_RULES = {
  // ---- NCG_FL_2020 ----
  'histology': {
    lineMatcher: /\b(WHO\s*Classification|Histolog(?:y|ical)|Pathology\s*Grade)[^:]*:/i,
    ambiguousMatcher: /\b(vs\.?|versus|borderline|cannot\s*exclude|inconclusive|pending|uncertain)\b/i,
    valueMatchers: [
      [/\b(Grade\s*3b|3b)\b/i, 'fl-grade-3b'],
      [/\b(Transformed\s*(?:to)?\s*DLBCL|transformation\s*to\s*diffuse\s*large)\b/i, 'transformed-dlbcl'],
      [/\b(Duodenal(?:\s*type)?|Primary\s*duodenal)\b/i, 'fl-duodenal'],
      [/\b(Grade\s*3a|3a)\b/i, 'fl-grade-3a'],
      [/\b(Grade\s*1\s*-?\s*2|Grade\s*1|Grade\s*2)\b/i, 'fl-grade-1-2'],
    ],
  },
  'stage': {
    lineMatcher: /\b(Ann\s*Arbor\s*Stage|Clinical\s*Stage|PET-?CT\s*Stage|Stage)[^:]*:/i,
    ambiguousMatcher: /\b(pending|suspected|staging\s*incomplete|versus|vs\.?|deferred|multiple\s*bilateral\s*lymph\s*nodes|possibly)\b/i,
    valueMatchers: [
      [/\bStage\s*(?:IV|4)\b/i, 'stage-4'],
      [/\bStage\s*(?:III|3)\b/i, 'stage-3'],
      [/\bStage\s*(?:II|2)\b/i, 'stage-2'],
      [/\bStage\s*(?:I|1)\b(?!\s*[I234V])/i, 'stage-1'],
    ],
  },
  'stage2-contiguity': {
    lineMatcher: /\b(Stage\s*(?:II|2)\s*Contiguity|Nodal\s*Contiguity|Contiguity)[^:]*:/i,
    ambiguousMatcher: /\b(unclear|pending|indeterminate)\b/i,
    valueMatchers: [
      [/\b(non-contiguous|non\s*contiguous|discontinuous)\b/i, 'non-contiguous'],
      [/\b(contiguous|single\s*radiation\s*field)\b/i, 'contiguous'],
    ],
  },
  'bone-marrow': {
    lineMatcher: /\b(Bone\s*Marrow(?:\s*Biopsy|\s*Trephine)?)[^:]*:/i,
    ambiguousMatcher: /\b(deferred|pending|not\s*done|inadequate|awaited|declined|suspicious|inconclusive)\b/i,
    valueMatchers: [
      [/\b(positive|involved|infiltrat(?:ed|ion)|paratrabecular\s*lymphoid)\b/i, 'involved'],
      [/\b(negative|cleared|uninvolved|no\s*lymphoma|normocellular)\b/i, 'cleared'],
    ],
  },
  'gelf': {
    lineMatcher: /\b(GELF(?:\s*Criteria|\s*Tumou?r\s*Burden)?|Tumou?r\s*Burden)[^:]*:/i,
    ambiguousMatcher: /\b(pending|not\s*assessed|equivocal|borderline|questionable)\b/i,
    valueMatchers: [
      [/\b(high(?:\s*tumou?r)?\s*burden|high-burden|criteria\s*met|bulky\s*mass)\b/i, 'high-burden'],
      [/\b(low(?:\s*tumou?r)?\s*burden|low-burden|no\s*gelf|0\s*criteria)\b/i, 'low-burden'],
    ],
  },
  'fitness': {
    lineMatcher: /\b(Patient\s*Fitness|Fitness\s*for\s*Systemic|Chemo(?:immunotherapy)?\s*Fitness|Fit\s*for\s*Bendamustine|ECOG\s*Performance\s*Status)[^:]*:/i,
    ambiguousMatcher: /\b(pending|borderline|under\s*evaluation)\b/i,
    valueMatchers: [
      [/\b(frail|unfit|comorbid|ineligible|:\s*No\b|ECOG\s*(?:Performance\s*Status\s*:\s*)?[34])\b/i, 'frail'],
      [/\b(fit|eligible|:\s*Yes\b|ECOG\s*(?:Performance\s*Status\s*:\s*)?[01])\b/i, 'fit'],
    ],
  },

  // ---- NCG_DLBCL_TREATMENT_2020 ----
  'lymphoma-subtype': {
    lineMatcher: /\b(Histological\s*(?:Lymphoma\s*)?Diagnosis|WHO\s*Classification|Lymphoma\s*Subtype|Primary\s*Diagnosis)\b/i,
    ambiguousMatcher: /\b(vs\.?|versus|suspicious\s*for|cannot\s*exclude|pending\s*ihc)\b/i,
    valueMatchers: [
      [/\b(Primary\s*Mediastinal|PMBCL)\b/i, 'pmbcl'],
      [/\b(Diffuse\s*Large\s*B-?Cell\s*Lymphoma|DLBCL)\b/i, 'dlbcl'],
    ],
  },
  'anthracycline-fitness': {
    lineMatcher: /\b(Anthracycline\s*(?:\(R-CHOP\)\s*)?Fitness|Cardiac\s*Fitness|2D-?ECHO\s*Fitness|R-?CHOP\s*Eligibility)\b/i,
    ambiguousMatcher: /\b(pending\s*echo|borderline\s*lvef|awaiting\s*cardiology)\b/i,
    valueMatchers: [
      [/\b(unfit-cardiac|LVEF\s*<\s*50|cardiac\s*dysfunction|prior\s*MI|cardiomyopathy)\b/i, 'unfit-cardiac'],
      [/\b(unfit-elderly-frail|elderly.*frail|candidate\s*for\s*R-?miniCHOP)\b/i, 'unfit-elderly-frail'],
      [/\b(unfit-anthra-ineligible|anthracycline\s*ineligible|contraindication\s*to\s*anthracycline)\b/i, 'unfit-anthra-ineligible'],
      [/\b(frail-palliative|palliative\s*intent\s*only)\b/i, 'frail-palliative'],
      [/\b(fit-r-chop|fit\s*for\s*(?:standard\s*)?R-?CHOP|LVEF\s*(?:>=?\s*50|[56]\d\s*%))\b/i, 'fit-r-chop'],
    ],
  },
  'dlbcl-stage': {
    lineMatcher: /\b(Ann\s*Arbor\s*(?:Anatomical\s*)?(?:Disease\s*)?Stage|PET-?CT\s*Stage|Clinical\s*Stage)\b/i,
    ambiguousMatcher: /\b(pending|incomplete|indeterminate|suspected)\b/i,
    valueMatchers: [
      [/\b(Stage\s*(?:III|IV|3|4)|Advanced\s*Stage)\b/i, 'stage-3-4-advanced'],
      [/\b(Stage\s*(?:I|II|1|2)|Limited\s*Stage)\b/i, 'stage-1-2-limited'],
    ],
  },
  'bulky-status': {
    lineMatcher: /\b(Bulky\s*(?:Disease\s*)?Status|Largest\s*(?:Nodal\s*|Tumou?r\s*)?(?:Mass|Lesion)|Bulk\s*:)\b/i,
    ambiguousMatcher: /\b(pending|unmeasured|unclear)\b/i,
    valueMatchers: [
      [/\b(non-bulky|Non-bulky|<\s*7\.5\s*cm|No\s*bulky\s*disease)\b/i, 'non-bulky'],
      [/\b(bulky-gte-7-5cm|>=?\s*7\.5\s*cm|(?:7\.[5-9]|[89]\.\d|1\d\.\d)\s*cm|\bBulky\s*disease\b)\b/i, 'bulky-gte-7-5cm'],
    ],
  },
  'cell-of-origin': {
    lineMatcher: /\b(Cell-?of-?Origin|Hans\s*Algorithm|IHC\s*Subtype)\b/i,
    ambiguousMatcher: /\b(pending|equivocal|awaiting\s*MUM1|inconclusive|unclassified)\b/i,
    valueMatchers: [
      [/\b(Non-?GCB|Activated\s*B-?cell|\bABC\b)\b/i, 'non-gcb'],
      [/\b(\bGCB\b|Germinal\s*Center\s*B-?cell)\b/i, 'gcb'],
    ],
  },
  'cns-risk-sites': {
    lineMatcher: /\b(CNS\s*(?:High-?Risk\s*)?(?:Anatomical\s*)?(?:Involvement|Sites|Risk))\b/i,
    ambiguousMatcher: /\b(pending|under\s*evaluation)\b/i,
    valueMatchers: [
      [/\b(cns-standard-risk|Standard\s*CNS\s*risk|No\s*high-?risk\s*(?:CNS|anatomical)|no\s*testicular)\b/i, 'cns-standard-risk'],
      [/\b(cns-high-risk|High\s*CNS\s*risk|testicular|adrenal|renal|breast\s*involvement|double-?hit)\b/i, 'cns-high-risk'],
    ],
  },
  'central-venous-access': {
    lineMatcher: /\b(Central\s*Venous\s*Access|PICC\s*Line|Chemo\s*Port)\b/i,
    valueMatchers: [
      [/\b(no-central-access|No\s*central\s*(?:venous\s*)?access|peripheral\s*IV\s*only)\b/i, 'no-central-access'],
      [/\b(central-access-available|Central\s*(?:venous\s*)?access\s*available|PICC\s*in\s*situ|port\s*in\s*place)\b/i, 'central-access-available'],
    ],
  },
  'cardiac-echo-status': {
    lineMatcher: /\b(2D-?ECHO\s*(?:LVEF\s*)?(?:Monitoring|Status)|LVEF\s*Monitoring)\b/i,
    ambiguousMatcher: /\b(borderline|repeat\s*echo\s*advised|pending)\b/i,
    valueMatchers: [
      [/\b(echo-lvef-declined|decline\s*>\s*10%|cardiotoxicity)\b/i, 'echo-lvef-declined'],
      [/\b(echo-normal-stable|LVEF\s*(?:>=?\s*50|[56]\d\s*%)\s*(?:and\s*stable|\(stable\))|stable)\b/i, 'echo-normal-stable'],
    ],
  },
  'prephase-indication': {
    lineMatcher: /\b(Pre-?phase\s*(?:Therapy\s*)?Indication)\b/i,
    valueMatchers: [
      [/\b(prephase-not-indicated|No\s*pre-?phase\s*indicated|Not\s*indicated)\b/i, 'prephase-not-indicated'],
      [/\b(prephase-indicated|Pre-?phase\s*indicated|Indicated)\b/i, 'prephase-indicated'],
    ],
  },

  // ---- NCG_DLBCL_RR_2020 ----
  'relapse-biopsy-status': {
    lineMatcher: /\b(Relapse\s*(?:Tissue\s*)?Biopsy|Biopsy\s*Confirmation|Repeat\s*Biopsy)\b/i,
    ambiguousMatcher: /\b(scanty|inadequate|crush\s*artifact|suspicious\s*only)\b/i,
    valueMatchers: [
      [/\b(biopsy-pending|FNAC\s*only|Biopsy\s*pending|repeat\s*core\/excisional\s*biopsy\s*mandatory|awaited)\b/i, 'biopsy-pending'],
      [/\b(transformation-indolent|Transformed\s*from\s*(?:prior\s*)?indolent|transformed\s*FL)\b/i, 'transformation-indolent'],
      [/\b(biopsy-confirmed-dlbcl|Biopsy\s*confirmed\s*DLBCL|Confirmed\s*relapsed\s*DLBCL)\b/i, 'biopsy-confirmed-dlbcl'],
    ],
  },
  'relapse-timing': {
    lineMatcher: /\b(Timing\s*of\s*Relapse|Relapse\s*(?:Timing|Chronology)|Time\s*from\s*R-?CHOP)\b/i,
    ambiguousMatcher: /\b(unclear\s*completion\s*date|records\s*unavailable)\b/i,
    valueMatchers: [
      [/\b(primary-refractory|Primary\s*refractory|progression\s*on\s*first-?line)\b/i, 'primary-refractory'],
      [/\b(relapse-le-12m|Early\s*relapse|<=\s*12\s*months|[1-9]\s*months\s*post)\b/i, 'relapse-le-12m'],
      [/\b(relapse-gt-12m|Late\s*relapse|>\s*12\s*months|1[3-9]\s*months|[2-9]\d\s*months)\b/i, 'relapse-gt-12m'],
    ],
  },
  'chemo-fitness-overall': {
    lineMatcher: /\b(Fitness\s*for\s*(?:Combination\s*)?(?:Systemic\s*)?Chemotherapy|Overall\s*Chemo\s*Fitness)\b/i,
    valueMatchers: [
      [/\b(unfit-all-chemo|Unfit\s*for\s*combination\s*chemotherapy|palliative\s*only)\b/i, 'unfit-all-chemo'],
      [/\b(chemo-eligible|Chemotherapy\s*eligible|fit\s*for\s*salvage)\b/i, 'chemo-eligible'],
    ],
  },
  'asct-fitness': {
    lineMatcher: /\b(Fitness\s*for\s*(?:Salvage.*)?ASCT|ASCT\s*Eligibility|Transplant\s*Fitness)\b/i,
    valueMatchers: [
      [/\b(asct-unfit|Not\s*fit\s*for\s*ASCT|transplant\s*ineligible)\b/i, 'asct-unfit'],
      [/\b(asct-fit|Fit\s*for\s*(?:intensive\s*salvage.*)?ASCT|transplant\s*eligible)\b/i, 'asct-fit'],
    ],
  },
  'car-t-fitness': {
    lineMatcher: /\b(Fitness\s*for\s*(?:anti-?CD19\s*)?CAR-?T|CAR-?T\s*Fitness)\b/i,
    valueMatchers: [
      [/\b(car-t-unfit|Not\s*fit\s*for\s*CAR-?T)\b/i, 'car-t-unfit'],
      [/\b(car-t-fit|Fit\s*for\s*CAR-?T)\b/i, 'car-t-fit'],
    ],
  },
  'pet-response-salvage': {
    lineMatcher: /\b(PET-?CT\s*Response\s*After\s*Salvage|Post-?Salvage\s*PET|Deauville\s*Score)\b/i,
    valueMatchers: [
      [/\b(not-assessed|Not\s*yet\s*assessed|salvage\s*not\s*started)\b/i, 'not-assessed'],
      [/\b(salvage-ds5-refractory|Deauville\s*(?:Score\s*)?5|DS\s*5|progressive\s*disease)\b/i, 'salvage-ds5-refractory'],
      [/\b(salvage-ds4-partial|Deauville\s*(?:Score\s*)?4|DS\s*4)\b/i, 'salvage-ds4-partial'],
      [/\b(salvage-cr-pr|Deauville\s*(?:Score\s*)?[123]|DS\s*[123]|Complete\s*Metabolic\s*Response|Chemosensitive)\b/i, 'salvage-cr-pr'],
    ],
  },
  'car-t-future-plan': {
    lineMatcher: /\b(CAR-?T\s*(?:Cell\s*Therapy\s*)?Future\s*(?:Intention|Plan|Possibility))\b/i,
    valueMatchers: [
      [/\b(cart-definitively-excluded|definitively\s*NOT\s*planned|excluded)\b/i, 'cart-definitively-excluded'],
      [/\b(cart-possible|CAR-?T\s*is\s*planned|future\s*possibility|AVOID\s*BENDA)\b/i, 'cart-possible'],
    ],
  },
  'cell-of-origin-rr': {
    lineMatcher: /\b(Repeat\s*IHC\s*Cell-?of-?Origin|Relapse\s*Cell-?of-?Origin|Cell-?of-?Origin|Hans\s*Algorithm)\b/i,
    ambiguousMatcher: /\b(pending|equivocal|insufficient\s*tissue)\b/i,
    valueMatchers: [
      [/\b(Non-?GCB|Activated\s*B-?cell|\bABC\b)\b/i, 'non-gcb'],
      [/\b(\bGCB\b|Germinal\s*Center\s*B-?cell)\b/i, 'gcb'],
    ],
  },
  'dominant-residual-site': {
    lineMatcher: /\b(Residual\s*or\s*Bulky\s*Disease\s*Site|Dominant\s*(?:Residual\s*)?Site|Radiation\s*Target\s*Site)\b/i,
    valueMatchers: [
      [/\b(no-residual-cmr|Complete\s*metabolic\s*response|no\s*residual\s*uptake)\b/i, 'no-residual-cmr'],
      [/\b(single-site-residual|Single\s*residual\s*PET\+|initial\s*bulky\s*site)\b/i, 'single-site-residual'],
      [/\b(diffuse-multisite|Diffuse\s*widespread\s*multi-?site)\b/i, 'diffuse-multisite'],
    ],
  },

  // ---- Shared & NCG_LYMPHOMA_WORKUP_2020 ----
  'presentation-smear': {
    lineMatcher: /\b(Peripheral\s*Smear|Lymphocytosis|Circulating\s*Lymphoid\s*Cells)\b/i,
    valueMatchers: [
      [/\b(no-lymphocytosis|No\s*lymphocytosis|no\s*abnormal\s*circulating)\b/i, 'no-lymphocytosis'],
      [/\b(lymphocytosis-present|Lymphocytosis\s*present|abnormal\s*circulating\s*lymphocytes)\b/i, 'lymphocytosis-present'],
    ],
  },
  'lymphoma-category': {
    lineMatcher: /\b(Suspected\s*\/?\s*Confirmed\s*Subtype|Lymphoma\s*Category|WHO\s*Classification|Flow\s*Cytometry\s*Diagnosis)\b/i,
    ambiguousMatcher: /\b(atypical\s*lymphoid\s*proliferat|inconclusive|pending\s*ihc)\b/i,
    valueMatchers: [
      [/\b(cll-sll|Chronic\s*lymphocytic\s*leukemia|\bCLL\b|\bSLL\b)\b/i, 'cll-sll'],
      [/\b(mcl|Mantle\s*cell\s*lymphoma|\bMCL\b)\b/i, 'mcl'],
      [/\b(fl|Follicular\s*lymphoma|\bFL\b)\b/i, 'fl'],
      [/\b(mzl|Marginal\s*zone\s*lymphoma|\bMZL\b|\bMALT\b)\b/i, 'mzl'],
      [/\b(burkitt-hbl|Burkitt|High-?grade\s*B-?cell)\b/i, 'burkitt-hbl'],
      [/\b(dlbcl|Diffuse\s*large\s*B-?cell|\bDLBCL\b)\b/i, 'dlbcl'],
      [/\b(hl|Classical\s*Hodgkin|\bcHL\b|Hodgkin\s*lymphoma)\b/i, 'hl'],
      [/\b(ptcl|Peripheral\s*T-?cell|\bPTCL\b)\b/i, 'ptcl'],
      [/\b(ctcl-mf|Cutaneous\s*T-?cell|Mycosis\s*Fungoides)\b/i, 'ctcl-mf'],
      [/\b(hcl-lpl|Hairy\s*cell|Waldenstr[oö]m)\b/i, 'hcl-lpl'],
    ],
  },
  'cll-therapy-indication': {
    lineMatcher: /\b(CLL\s*Therapy\s*Indication|iwCLL\s*Indication)\b/i,
    valueMatchers: [
      [/\b(not-applicable|Not\s*applicable)\b/i, 'not-applicable'],
      [/\b(therapy-indicated|Symptomatic|cytopenias|treatment\s*indicated)\b/i, 'therapy-indicated'],
      [/\b(asymptomatic-no-therapy|Asymptomatic|no\s*indication\s*for\s*therapy)\b/i, 'asymptomatic-no-therapy'],
    ],
  },
  'staging-extent': {
    lineMatcher: /\b(Anatomical\s*Stage|Clinical\s*Extent|Ann\s*Arbor\s*Stage|Binet\s*\/?\s*Rai\s*Stage)\b/i,
    ambiguousMatcher: /\b(pending|staging\s*awaited)\b/i,
    valueMatchers: [
      [/\b(Stage\s*(?:III|IV|3|4)|Advanced\s*stage|Rai\s*(?:III|IV)|Binet\s*C)\b/i, 'stage-3-4-advanced'],
      [/\b(Stage\s*(?:I|II|1|2)|Limited\s*stage|Rai\s*(?:0|I|II)|Binet\s*[AB])\b/i, 'stage-1-2-limited'],
      [/\b(mf-early-plaques|thin\s*plaques\s*only)\b/i, 'mf-early-plaques'],
      [/\b(mf-extensive-tumour|extensive.*plaques|S[eé]zary)\b/i, 'mf-extensive-tumour'],
    ],
  },
  'double-hit-fish': {
    lineMatcher: /\b(Double-?Hit\s*(?:\(DHL\)\s*)?FISH|MYC\s*\/?\s*BCL2\s*FISH|Cytogenetics\s*FISH)\b/i,
    ambiguousMatcher: /\b(pending|hybridization\s*failure|awaited)\b/i,
    valueMatchers: [
      [/\b(dhl-detected|Double-?hit\s*confirmed|MYC\s*and\s*BCL2\s*rearranged|concurrent\s*MYC)\b/i, 'dhl-detected'],
      [/\b(dhl-negative|MYC\s*rearrangement\s*negative|No\s*double-?hit)\b/i, 'dhl-negative'],
      [/\b(not-applicable|Not\s*applicable)\b/i, 'not-applicable'],
    ],
  },
  'tp53-status': {
    lineMatcher: /\b(TP53\s*Mutation|17p\s*Deletion|del\(17p\))\b/i,
    valueMatchers: [
      [/\b(tp53-aberrant|17p\s*deletion\s*(?:present|detected|positive)|TP53\s*mutated)\b/i, 'tp53-aberrant'],
      [/\b(tp53-wild-type|wild-?type|negative|no\s*17p\s*deletion)\b/i, 'tp53-wild-type'],
    ],
  },
  'igvh-status': {
    lineMatcher: /\b(IGHV\s*(?:Somatic\s*)?Mutation\s*Status|IGHV)\b/i,
    valueMatchers: [
      [/\b(igvh-unmutated|unmutated)\b/i, 'igvh-unmutated'],
      [/\b(igvh-mutated|mutated)\b/i, 'igvh-mutated'],
    ],
  },
  'serum-ldh': {
    lineMatcher: /\b(Serum\s*LDH|Lactate\s*Dehydrogenase|\bLDH\s*:)\b/i,
    ambiguousMatcher: /\b(hemolyzed|pending|repeat\s*sample)\b/i,
    valueMatchers: [
      [/\b(ldh-elevated|Elevated|>\s*ULN|[3-9]\d\d\s*U\/L)\b/i, 'ldh-elevated'],
      [/\b(ldh-normal|Normal|<=\s*ULN|[12]\d\d\s*U\/L)\b/i, 'ldh-normal'],
    ],
  },
  'ecog-ps': {
    lineMatcher: /\b(ECOG\s*(?:Performance\s*Status|PS))\b/i,
    valueMatchers: [
      [/\b(ecog-ge-2|ecog-2-4|ECOG\s*(?:>=?\s*2|[234]))\b/i, 'ecog-ge-2'],
      [/\b(ecog-0-1|ECOG\s*(?:0\s*-\s*1|[01]))\b/i, 'ecog-0-1'],
    ],
  },
  'extranodal-sites': {
    lineMatcher: /\b(Extranodal\s*(?:Involvement\s*)?Sites)\b/i,
    valueMatchers: [
      [/\b(extranodal-gt-1|>\s*1\s*extranodal|[2-9]\s*extranodal\s*sites)\b/i, 'extranodal-gt-1'],
      [/\b(extranodal-0-1|(?:0|1|0\s*or\s*1|No)\s*extranodal)\b/i, 'extranodal-0-1'],
    ],
  },
  'b2m-level': {
    lineMatcher: /\b(Beta-?2\s*Microglobulin|B2M)\b/i,
    valueMatchers: [
      [/\b(b2m-elevated|Elevated|>\s*3\.5\s*mg\/L|[4-9]\.\d\s*mg\/L)\b/i, 'b2m-elevated'],
      [/\b(b2m-normal|Normal|<=\s*3\.5\s*mg\/L|[1-3]\.[0-4]\s*mg\/L)\b/i, 'b2m-normal'],
    ],
  },
};

/**
 * Extracts clinical findings for a given `guidelineId` from free text / synoptic report text.
 */
function extractFromText(guidelineId, rawText) {
  const schema = getGuideline(guidelineId);
  if (!schema) throw new Error(`Unknown guideline '${guidelineId}'`);

  const text = String(rawText || '');
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const patientInfo = parsePatientHeader(text);

  // Also derive age-group if patientInfo.age is present and the guideline has age-group
  const extracted = [];
  const seenFindings = new Set();

  for (const f of schema.findings) {
    const rule = EXTRACTION_RULES[f.id];
    if (!rule) continue;

    // Only consider key-value lines (containing "Key: Value") that match rule.lineMatcher
    const candidateLines = lines.filter((l) => /^[^:]+:\s*\S+/.test(l) && rule.lineMatcher.test(l));
    if (!candidateLines.length) continue;

    // Prefer a line that matches a valueMatcher or ambiguousMatcher over a generic header
    const matchingLine = candidateLines.find((l) =>
      (rule.ambiguousMatcher && rule.ambiguousMatcher.test(l)) ||
      rule.valueMatchers.some(([rx]) => rx.test(l))
    ) || candidateLines[0];

    // Check if the line is explicitly ambiguous/pending/borderline
    const isAmbiguous = rule.ambiguousMatcher && rule.ambiguousMatcher.test(matchingLine);

    let matchedCode = null;
    if (!isAmbiguous) {
      for (const [rx, candidateCode] of rule.valueMatchers) {
        if (rx.test(matchingLine)) {
          // Handle ecog-ge-2 vs ecog-2-4 across guidelines
          if (f.id === 'ecog-ps' && candidateCode === 'ecog-ge-2' && !f.values.some((v) => v.code === 'ecog-ge-2')) {
            matchedCode = f.values.some((v) => v.code === 'ecog-2-4') ? 'ecog-2-4' : null;
          } else if (f.values.some((v) => v.code === candidateCode)) {
            matchedCode = candidateCode;
          }
          if (matchedCode) break;
        }
      }
    }

    if (matchedCode) {
      seenFindings.add(f.id);
      extracted.push({
        findingId: f.id,
        findingLabel: f.label,
        category: f.category,
        value: matchedCode,
        valueLabel: valueLabel(f, matchedCode),
        provenance: 'structured-capture',
        usable: true,
        status: 'verified',
        snippet: matchingLine,
        allowedValues: f.values,
      });
    } else {
      // Line matched the finding topic, but value was ambiguous, pending, or unparseable -> safety gate!
      seenFindings.add(f.id);
      extracted.push({
        findingId: f.id,
        findingLabel: f.label,
        category: f.category,
        value: f.values[0]?.code || null, // suggested placeholder only; marked unparsed until confirmed!
        valueLabel: 'Ambiguous / Pending — Clinician Confirmation Required',
        provenance: 'unparsed',
        usable: false,
        status: 'needs-review',
        snippet: matchingLine,
        allowedValues: f.values,
      });
    }
  }

  // If age was parsed from header and guideline has age-group, include it if not already extracted
  const ageF = schema.findings.find((f) => f.id === 'age-group');
  if (ageF && !seenFindings.has('age-group') && typeof patientInfo.age === 'number') {
    const age = patientInfo.age;
    let code = null;
    if (age <= 60) code = 'age-le-60';
    else if (age >= 70 && ageF.values.some((v) => v.code === 'age-ge-70')) code = 'age-ge-70';
    else code = 'age-gt-60';
    const ageLine = lines.find((l) => /^Age/i.test(l)) || `Patient Age: ${age} years`;
    extracted.push({
      findingId: 'age-group',
      findingLabel: ageF.label,
      category: ageF.category,
      value: code,
      valueLabel: valueLabel(ageF, code),
      provenance: 'structured-capture',
      usable: true,
      status: 'verified',
      snippet: ageLine,
      allowedValues: ageF.values,
    });
  }

  const unparsedCount = extracted.filter((x) => !x.usable).length;
  return {
    guidelineId: schema.id,
    patientInfo,
    extracted,
    unparsedCount,
    verifiedCount: extracted.length - unparsedCount,
  };
}

/**
 * Curated Sample Clinical Documents across all 4 guidelines for 1-click Point-of-Care testing.
 */
const SAMPLE_REPORTS = {
  // ---- NCG_DLBCL_TREATMENT_2020 ----
  dlbcl_1l_nongcb_stage4: {
    id: 'dlbcl_1l_nongcb_stage4',
    guidelineId: 'NCG_DLBCL_TREATMENT_2020',
    title: 'Pathology & PET-CT Report — Non-GCB DLBCL, Stage IV (Pairs with PAT-1001)',
    documentType: 'Synoptic IHC & Whole-Body PET-CT Report',
    text: [
      'TATA MEMORIAL CENTRE — SYNOPTIC PATHOLOGY & PET-CT STAGING REPORT',
      'Patient Name: Rameshwar Deshmukh',
      'Age / Sex: 65 years / Male',
      'MRN: TMC-2026-1001',
      'ABHA ID: 91-4421-8801-1204',
      '',
      'HISTOPATHOLOGY & IMMUNOHISTOCHEMISTRY (EXCISION BIOPSY - CERVICAL NODE):',
      'Histological Lymphoma Diagnosis: Diffuse Large B-Cell Lymphoma (DLBCL), NOS',
      'Cell-of-Origin (Hans Algorithm): Non-GCB / Activated B-cell (CD10-, BCL6+, MUM1+, Ki-67 85%)',
      '',
      'BASELINE 18F-FDG PET-CT STAGING SUMMARY:',
      'Ann Arbor Anatomical Disease Stage: Advanced Stage (Stage IV) with gastric and hepatic lesions',
      'Bulky Disease Status: Non-bulky disease (largest retroperitoneal mass 5.2 cm, < 7.5 cm)',
      'Extranodal Involvement Sites: > 1 extranodal site (2 extranodal sites: stomach and liver)',
      'CNS High-Risk Anatomical Involvement: Standard CNS risk (no testicular, renal, or adrenal involvement)',
    ].join('\n'),
  },
  dlbcl_1l_limited_bulky: {
    id: 'dlbcl_1l_limited_bulky',
    guidelineId: 'NCG_DLBCL_TREATMENT_2020',
    title: 'Synoptic Report — Limited Stage II GCB-DLBCL with Bulky Mass (8.4 cm)',
    documentType: 'Synoptic Staging & Cardiology Report',
    text: [
      'TATA MEMORIAL CENTRE — LYMPHOMA MULTIDISCIPLINARY STAGING REPORT',
      'Patient Name: Arvind Swaminathan',
      'Age / Sex: 48 years / Male',
      'ABHA ID: 91-2204-8190-6532',
      '',
      'Histological Lymphoma Diagnosis: Diffuse Large B-Cell Lymphoma (DLBCL)',
      'Cell-of-Origin (Hans Algorithm): GCB (Germinal Center B-cell phenotype, CD10+, BCL6+)',
      'Ann Arbor Anatomical Disease Stage: Limited Stage (Stage II) cervical and Waldeyer ring',
      'Bulky Disease Status: Bulky disease (largest lesion 8.4 cm >= 7.5 cm in right neck)',
      'Anthracycline (R-CHOP) Fitness: Fit for standard R-CHOP (LVEF 62%)',
      '2D-ECHO LVEF Monitoring: LVEF 62% and stable',
      'CNS High-Risk Anatomical Involvement: Standard CNS risk',
      'Serum LDH: Normal (195 U/L <= ULN)',
      'ECOG Performance Status: ECOG 0-1',
      'Extranodal Involvement Sites: 0 or 1 extranodal site',
    ].join('\n'),
  },
  dlbcl_1l_ambiguous_ihc: {
    id: 'dlbcl_1l_ambiguous_ihc',
    guidelineId: 'NCG_DLBCL_TREATMENT_2020',
    title: 'Outside Referral Note — DLBCL with Pending IHC & Borderline Echo (Safety Gate Demo)',
    documentType: 'External Referral Summary (Unstructured / Ambiguous)',
    text: [
      'EXTERNAL REFERRAL SUMMARY — HEMATOLOGY CLINIC',
      'Patient Name: Prakash Joshi',
      'Age / Sex: 67 years / Male',
      'ABHA ID: 91-6012-4491-8823',
      '',
      'Histological Lymphoma Diagnosis: Diffuse Large B-Cell Lymphoma (DLBCL)',
      'Cell-of-Origin (Hans Algorithm): Pending MUM1 immunostain — unclassified at referral',
      'Ann Arbor Anatomical Disease Stage: Advanced Stage (Stage III)',
      'Bulky Disease Status: Non-bulky disease (largest node 4.1 cm)',
      'Anthracycline (R-CHOP) Fitness: Borderline LVEF — awaiting cardiology clearance',
      'Serum LDH: Elevated (540 U/L > ULN)',
      'ECOG Performance Status: ECOG 0-1',
    ].join('\n'),
  },

  // ---- NCG_DLBCL_RR_2020 ----
  dlbcl_rr_early_relapse_biopsy: {
    id: 'dlbcl_rr_early_relapse_biopsy',
    guidelineId: 'NCG_DLBCL_RR_2020',
    title: 'Relapse Core Biopsy & PET-CT Report — Confirmed DLBCL, Early Relapse (Pairs with PAT-1003)',
    documentType: 'Relapse Histopathology & PET-CT Report',
    text: [
      'TATA MEMORIAL CENTRE — RELAPSE BIOPSY & RESTAGING REPORT',
      'Patient Name: Vikramaditya Kulkarni',
      'Age / Sex: 58 years / Male',
      'MRN: TMC-2026-1003',
      'ABHA ID: 91-6305-1198-7721',
      '',
      'RELAPSE TISSUE BIOPSY (CT-GUIDED CORE BIOPSY OF SUVmax 22.4 ILIAC MASS):',
      'Relapse Tissue Biopsy: Biopsy confirmed DLBCL (sheets of CD20+ large B-cells, Ki-67 90%)',
      'Repeat IHC Cell-of-Origin: Non-GCB phenotype (CD10-, BCL6+, MUM1+)',
      '',
      'RELAPSE CHRONOLOGY & FITNESS SUMMARY:',
      'Timing of Relapse: Early relapse (<= 12 months; progressed 7 months post 6x R-CHOP)',
      'Fitness for Combination Systemic Chemotherapy: Chemotherapy eligible',
      'Fitness for anti-CD19 CAR-T: Fit for CAR-T cell therapy',
      'CAR-T Cell Therapy Future Intention: CAR-T is planned (AVOID BENDAMUSTINE / POLA-BR)',
      'Residual or Bulky Disease Site: Diffuse widespread multi-site disease',
    ].join('\n'),
  },
  dlbcl_rr_fnac_only_gate: {
    id: 'dlbcl_rr_fnac_only_gate',
    guidelineId: 'NCG_DLBCL_RR_2020',
    title: 'Outside Cytology Report — Suspected Relapse on FNAC Only (Mandatory Biopsy Gate)',
    documentType: 'FNAC Cytology Note',
    text: [
      'OUTSIDE CYTOLOGY NOTE — SUSPECTED LYMPHOMA RELAPSE',
      'Patient Name: Harishchandra Patil',
      'Age / Sex: 61 years / Male',
      'ABHA ID: 91-9045-2211-3409',
      '',
      'Relapse Tissue Biopsy: FNAC only — Biopsy pending (repeat core/excisional biopsy mandatory)',
      'Timing of Relapse: Late relapse (16 months post R-CHOP)',
      'Fitness for Combination Systemic Chemotherapy: Chemotherapy eligible',
      'Fitness for Salvage ASCT: Fit for ASCT',
    ].join('\n'),
  },

  // ---- NCG_LYMPHOMA_WORKUP_2020 ----
  workup_cll_flow_panel: {
    id: 'workup_cll_flow_panel',
    guidelineId: 'NCG_LYMPHOMA_WORKUP_2020',
    title: 'Flow Cytometry & Molecular Report — CLL with 17p Deletion (CLL-IPI Very High Risk)',
    documentType: 'Immunophenotyping & Cytogenetics Report',
    text: [
      'TATA MEMORIAL CENTRE — HEMATOPATHOLOGY & FLOW CYTOMETRY REPORT',
      'Patient Name: Balakrishnan Menon',
      'Age / Sex: 68 years / Male',
      'ABHA ID: 91-3318-9902-4150',
      '',
      'Peripheral Smear: Lymphocytosis present (ALC 42 x 10^9/L with smudge cells)',
      'Suspected / Confirmed Subtype: Chronic lymphocytic leukemia (CLL / SLL, CD5+, CD19+, CD23+, CD200+)',
      'CLL Therapy Indication: Symptomatic / cytopenias / treatment indicated (progressive anemia & splenomegaly)',
      'Anatomical Stage: Advanced stage (Stage III-IV / Rai Stage III)',
      'TP53 Mutation / 17p Deletion: 17p deletion present (TP53 mutated, high risk)',
      'IGHV Somatic Mutation Status: IGHV unmutated (99.4% germline homology)',
      'Beta-2 Microglobulin: Elevated (4.8 mg/L > 3.5 mg/L)',
      'Serum LDH: Normal (210 U/L <= ULN)',
      'ECOG Performance Status: ECOG 0-1',
    ].join('\n'),
  },
  workup_dhl_fish_positive: {
    id: 'workup_dhl_fish_positive',
    guidelineId: 'NCG_LYMPHOMA_WORKUP_2020',
    title: 'FISH Cytogenetics Report — High-Grade Double-Hit Lymphoma (MYC + BCL2 Rearranged)',
    documentType: 'Molecular Cytogenetics Report',
    text: [
      'TATA MEMORIAL CENTRE — MOLECULAR CYTOGENETICS & WORKUP REPORT',
      'Patient Name: Farida Begum',
      'Age / Sex: 52 years / Female',
      'ABHA ID: 91-7120-5543-8910',
      '',
      'Peripheral Smear: No lymphocytosis',
      'Suspected / Confirmed Subtype: Diffuse large B-cell lymphoma (DLBCL)',
      'Double-Hit (DHL) FISH: Double-hit confirmed (concurrent MYC 8q24 and BCL2 18q21 rearrangements)',
      'Anatomical Stage: Advanced stage (Stage IV)',
      'Serum LDH: Elevated (740 U/L > ULN)',
      'ECOG Performance Status: ECOG 0-1',
      'Extranodal Involvement Sites: > 1 extranodal site',
    ].join('\n'),
  },

  // ---- NCG_FL_2020 (including existing 4 cases + PDF links) ----
  sample_fl_case_advanced_high_burden: {
    id: 'sample_fl_case_advanced_high_burden',
    guidelineId: 'NCG_FL_2020',
    pdfFile: 'sample_fl_case_advanced_high_burden.pdf',
    title: 'Synoptic Pathology & PET-CT — FL Grade 1-2, Stage IV, High GELF Burden (Pairs with PAT-1002)',
    documentType: 'Synoptic Pathology & Staging PDF Report',
    text: [
      'TATA MEMORIAL CENTRE — SYNOPTIC LYMPHOMA STAGING & PATHOLOGY REPORT',
      'Patient Name: Meenakshi Iyer',
      'Age / Sex: 54 years / Female',
      'MRN: TMC-2026-1002',
      'ABHA ID: 91-7812-3390-4510',
      '',
      'WHO Classification: Follicular Lymphoma, Grade 1-2 (10 centroblasts/HPF)',
      'Ann Arbor Stage: Stage IV',
      'Bone Marrow Biopsy: Positive — paratrabecular lymphoid aggregates (~25% involvement)',
      'GELF Criteria: High Tumor Burden — 8.2 cm mesenteric bulky mass + B symptoms',
      'ECOG Performance Status: Fit (ECOG 1, LVEF 62%)',
      'Serum LDH: Elevated (390 U/L > ULN)',
    ].join('\n'),
  },
  sample_fl_case_early_stage1: {
    id: 'sample_fl_case_early_stage1',
    guidelineId: 'NCG_FL_2020',
    pdfFile: 'sample_fl_case_stage1_limited.pdf',
    title: 'Synoptic Pathology & PET-CT — FL Grade 1-2, Stage I Limited (Curative ISRT)',
    documentType: 'Synoptic Pathology & Staging PDF Report',
    text: [
      'TATA MEMORIAL CENTRE — SYNOPTIC LYMPHOMA STAGING & PATHOLOGY REPORT',
      'Patient Name: Rajesh Sharma',
      'Age / Sex: 48 years / Male',
      'ABHA ID: 91-2345-6789-0123',
      '',
      'WHO Classification: Follicular Lymphoma, Grade 1-2 (8 centroblasts/HPF)',
      'Ann Arbor Stage: Stage I (single left cervical nodal group, 2.8 cm)',
      'Bone Marrow Biopsy: Negative — normocellular marrow, cleared for lymphoma',
      'GELF Criteria: Low Tumor Burden (0 criteria met)',
      'ECOG Performance Status: Fit (ECOG 0)',
    ].join('\n'),
  },
  sample_fl_case_grade3b_aggressive: {
    id: 'sample_fl_case_grade3b_aggressive',
    guidelineId: 'NCG_FL_2020',
    pdfFile: 'sample_fl_case_advanced_low_burden.pdf',
    title: 'Synoptic Pathology — FL Grade 3b Aggressive (Treat as DLBCL Pathway)',
    documentType: 'Synoptic Pathology PDF Report',
    text: [
      'TATA MEMORIAL CENTRE — SYNOPTIC LYMPHOMA STAGING & PATHOLOGY REPORT',
      'Patient Name: Sunita Verma',
      'Age / Sex: 59 years / Female',
      'ABHA ID: 91-8765-4321-0987',
      '',
      'WHO Classification: Follicular Lymphoma, Grade 3b (solid sheets of centroblasts >15/HPF)',
      'Ann Arbor Stage: Stage III',
      'Bone Marrow Biopsy: Negative — uninvolved',
      'GELF Criteria: High Tumor Burden (bulky 7.6 cm retroperitoneal mass)',
      'ECOG Performance Status: Fit (ECOG 1)',
    ].join('\n'),
  },
  sample_fl_case_ambiguous_referral: {
    id: 'sample_fl_case_ambiguous_referral',
    guidelineId: 'NCG_FL_2020',
    pdfFile: 'sample_fl_case_ambiguous_referral.pdf',
    title: 'Ambiguous Referral Note — FL Grade 2 vs 3a Borderline & Deferred Marrow (Safety Gate Demo)',
    documentType: 'Unstructured Referral PDF Note',
    text: [
      'EXTERNAL REFERRAL NOTE — HEMATOLOGY OPD',
      'Patient Name: Mohan Das',
      'Age / Sex: 63 years / Male',
      'ABHA ID: 91-1122-3344-5566',
      '',
      'WHO Classification: Follicular Lymphoma, Grade 2 vs 3a — borderline centroblast count, review advised',
      'Ann Arbor Stage: Multiple bilateral lymph nodes (PET-CT staging pending)',
      'Bone Marrow Biopsy: Deferred by patient at outside hospital',
      'GELF Criteria: Borderline nodal size (~6.5 cm), B symptoms unclear',
      'ECOG Performance Status: Fit (ECOG 1)',
    ].join('\n'),
  },
};

module.exports = {
  decodeAscii85,
  parsePdfContentStreamTokens,
  extractTextFromPdfBufferPureJs,
  extractTextFromPdfBytesBrowser,
  extractTextFromPdfBuffer,
  extractFromText,
  SAMPLE_REPORTS,
};
