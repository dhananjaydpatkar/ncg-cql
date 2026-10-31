import {
  Compass,
  Sparkles,
  Layers,
  BookOpen,
  ShieldCheck,
  Stethoscope,
  Activity,
  FlaskConical,
  ListFilter,
  TestTube,
  FileCode,
} from 'lucide-react';

export const TOUR_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome to Clinical Guideline Studio',
    category: 'Overview',
    icon: Sparkles,
    target: '[data-tour="brand"]',
    tab: 'setup',
    description:
      'Digitize and maintain evidence-based oncology clinical guidelines. Author decision logic visually — executable HL7 CQL 1.4 rules and FHIR R4 resources are generated automatically without manual coding.',
    tip: 'Everything authored here is fully transparent, verifiable against test patients, and ready for EHR and ABDM integration.',
  },
  {
    id: 'guidelines',
    title: 'Switch & Manage Guidelines',
    category: 'Guideline Library',
    icon: Layers,
    target: '[data-tour="guideline-select"]',
    tab: 'setup',
    description:
      'Switch between pre-loaded oncology guidelines including Follicular Lymphoma, DLBCL First-Line Treatment, DLBCL Relapsed/Refractory, and Lymphoma Diagnostic Workup. You can also create new guidelines, duplicate existing workflows, or import JSON models.',
    tip: 'Click "↺ Reset to Seed" anytime if you want to restore official reference guidelines.',
  },
  {
    id: 'catalog',
    title: 'Reusable Clinical Library',
    category: 'Terminology & Catalog',
    icon: BookOpen,
    target: '[data-tour="reusable-library"]',
    tab: 'setup',
    description:
      'Access a shared cross-guideline repository of 55+ standard clinical findings (pre-bound to ICD-O-3, SNOMED CT, LOINC, and ABDM), 13 prognostic score functions (IPI, aaIPI, FLIPI, MIPI), and 54 chemotherapy regimens. Import existing definitions into your guideline with one click.',
    tip: 'Reusing standard catalog findings eliminates duplicate terminology work and ensures consistent CQL evaluation.',
  },
  {
    id: 'setup',
    title: '1 · Details & Safety Gate',
    category: 'Setup & Provenance',
    icon: ShieldCheck,
    target: '[data-tour="tab-setup"]',
    tab: 'setup',
    description:
      'Define guideline metadata, versioning, authoring panel, and source citations. Crucially, manage the Provenance Safety Gate: when active, unverified or free-text referral data will never trigger automated chemotherapy — patients are safely routed to clinical review.',
    tip: 'The live Checks card at the bottom validates your guideline against clinical integrity constraints.',
  },
  {
    id: 'findings',
    title: '2 · Clinical Findings',
    category: 'Clinical Inputs',
    icon: Stethoscope,
    target: '[data-tour="tab-findings"]',
    tab: 'findings',
    description:
      'Configure the patient clinical observations, staging parameters, and lab results required to evaluate this guideline (e.g. Ann Arbor Stage, LDH Ratio, ECOG Performance Status, Bulky Disease, CD20 Expression). Specify allowed values and bind them to standard terminology.',
    tip: 'You can publish any finding you create into the Reusable Library to share it across guidelines.',
  },
  {
    id: 'functions',
    title: '3 · Prognostic Score Functions',
    category: 'Score Calculators',
    icon: Activity,
    target: '[data-tour="tab-functions"]',
    tab: 'functions',
    description:
      'Build multi-variable prognostic scoring systems (e.g. Age-adjusted IPI, FLIPI, MIPI). Assign point weights to finding values and define risk bands (Low, Low-Intermediate, High-Intermediate, High). In the Rules tab, you can branch directly on these risk bands or raw score points.',
    tip: 'Calculated score functions compile into reusable CQL function definitions evaluated dynamically at runtime.',
  },
  {
    id: 'outcomes',
    title: '4 · Outcomes & Regimens',
    category: 'Clinical Endpoints',
    icon: FlaskConical,
    target: '[data-tour="tab-outcomes"]',
    tab: 'outcomes',
    description:
      'Define the therapeutic decisions and regimens recommended by the guideline: Curative Chemoimmunotherapy (R-CHOP, Pola-R-CHP), Salvage Regimens (R-ICE, R-DHAP), Autologous Stem Cell Transplant, CAR-T referral, Watch & Wait Observation, or Multidisciplinary Review.',
    tip: 'Specify drug components, cycle numbers, radiotherapy intent, and evidence citations for clinician transparency.',
  },
  {
    id: 'rules',
    title: '5 · Decision Rules',
    category: 'Logic Engine',
    icon: ListFilter,
    target: '[data-tour="tab-rules"]',
    tab: 'rules',
    description:
      'Construct IF ... THEN clinical decision logic. Rules are evaluated top-to-bottom (first match wins). Combine finding conditions and score thresholds using intuitive operators. If no rule matches, the guideline safely falls back to the default review outcome.',
    tip: 'Use the ↑ and ↓ buttons to reorder rule priority. The plain-language sentence updates in real time as you edit.',
  },
  {
    id: 'tests',
    title: '6 · Patient Test Cases',
    category: 'In-Browser Verification',
    icon: TestTube,
    target: '[data-tour="tab-tests"]',
    tab: 'tests',
    description:
      'Validate your guideline logic against real-world patient scenarios directly in the browser. See live pass/fail status and inspect the full execution trace — verify which rule matched, which were skipped, and how the provenance safety gate responded.',
    tip: 'Any edit you make in previous tabs immediately re-evaluates all test cases, giving instant clinical feedback.',
  },
  {
    id: 'publish',
    title: '7 · Review & Export CQL/FHIR',
    category: 'Interoperability & Export',
    icon: FileCode,
    target: '[data-tour="tab-publish"]',
    tab: 'publish',
    description:
      'Inspect the complete decision pathway flowchart and download production-ready clinical artifacts: HL7 CQL 1.4 library files, FHIR R4 PlanDefinitions, FHIR Libraries, CodeSystems, ValueSets, and Mermaid diagrams.',
    tip: 'Generated CQL files can be executed directly by HL7 CQL engines against ABDM FHIR patient bundles.',
  },
  {
    id: 'replay',
    title: 'Tour Complete! Replay Anytime',
    category: 'Ready to Author',
    icon: Compass,
    target: '[data-tour="tour-btn"]',
    tab: 'setup',
    description:
      'You are all set to author, test, and export clinical oncology guidelines! Whenever you or a colleague need a walkthrough, click the "Guided Tour" button in the top navigation bar to replay this tour at any time.',
    tip: 'Keyboard shortcuts: Press Right Arrow for next, Left Arrow for back, or Escape to exit anytime.',
  },
];
