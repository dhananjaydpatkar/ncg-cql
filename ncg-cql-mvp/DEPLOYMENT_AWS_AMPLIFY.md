# AWS Amplify Deployment Guide
## Point-of-Care Clinical Decision Support (CDS) Workstation

- **Live Point-of-Care CDSS URL**: `https://production.d363iqgbc372rx.amplifyapp.com/` (App ID: `d363iqgbc372rx`)
- **Live Authoring Studio URL**: `https://production.d240wmli0egez.amplifyapp.com/` (App ID: `d240wmli0egez`)

This document provides step-by-step instructions to deploy and update the **Point-of-Care Clinical Decision Support Workstation** (`ncg-cql-mvp`) on **AWS Amplify Hosting**.

---

## 1. Architecture on AWS Amplify

The Point-of-Care CDS Workstation supports **dual deployment modes**:
1. **Static Serverless AWS Amplify Hosting (`dist/` & `point-of-care-cds.zip`)**:
   - Bundles the official HL7 `cql-execution` and `cql-exec-fhir` engines, all 6 compiled ELM JSON libraries (`FHIRHelpers`, `NCGCommon`, and the 4 Lymphoma guideline libraries), the schema catalog (`guideline_schemas.json`), the Mock Hospital EHR FHIR R4 service (`PAT-1001` through `PAT-1006`), pure-JS PDF stream & synoptic report extraction, and all 47 synthetic FHIR R4 regression bundles into `dist/standalone-engine.js`.
   - Requires **zero backend servers or containers** — runs 100% on AWS Amplify's global CloudFront CDN (`point-of-care-cds.zip` is ~543 KB).
2. **Node.js Server Mode (`node server.js`)**:
   - Runs the HTTP API server on port `3000` for local development or container-based hosting (AWS App Runner / ECS).

---

## 2. Method 1: Drag-and-Drop Zip Deployment via AWS Console (Recommended)

This method requires **no AWS CLI credentials** and deploys in under 60 seconds.

### Step 1: Build the Production Zip Archive

```bash
cd /Users/dhananjaypatkar/work/code/ncg-cql/ncg-cql/ncg-cql-mvp
npm run build:zip
```

This generates:
- `dist/` (the complete static bundle with `index.html`, `standalone-engine.js`, `app.js`, `style.css`, `api/sample-pdf/*.pdf`, and `sample_data/fhir_bundles/**`)
- `point-of-care-cds.zip` (~543 KB, with the contents of `dist/` at the archive root)

### Step 2: Deploy in AWS Amplify Console

1. Log in to the [AWS Management Console](https://console.aws.amazon.com/) and open **AWS Amplify**.
2. Click **Create new app** → **Deploy without Git provider** → **Next**.
3. Enter:
   - **App name**: `point-of-care-cds`
   - **Environment name**: `production`
   - **Method**: **Drag and drop**
4. Drag and drop [`point-of-care-cds.zip`](file:///Users/dhananjaypatkar/work/code/ncg-cql/ncg-cql/ncg-cql-mvp/point-of-care-cds.zip) into the upload box and click **Save and deploy**.

### Step 3: Configure SPA Rewrites & Redirects (Optional)

In the Amplify Console left navigation:
1. Open **App settings** → **Rewrites and redirects** → **Edit**.
2. Add the rewrite rule:
   - **Source address**: `</^[^.]+$|\.(?!(css|gif|ico|jpg|js|png|txt|svg|woff|woff2|ttf|map|json|pdf)$)([^.]+$)/>`
   - **Target address**: `/index.html`
   - **Type**: `200 (Rewrite)`
3. Click **Save**.

---

## 3. Method 2: Deploy / Refresh via AWS CLI

If your AWS CLI session has expired, first authenticate:
```bash
aws login
```

### Create & Deploy New App via CLI
```bash
cd /Users/dhananjaypatkar/work/code/ncg-cql/ncg-cql/ncg-cql-mvp
npm run build:zip

APP_ID=$(aws amplify create-app \
  --name "point-of-care-cds" \
  --region ap-south-1 \
  --query "app.appId" \
  --output text)

aws amplify create-branch \
  --app-id "$APP_ID" \
  --branch-name "production" \
  --region ap-south-1

DEPLOYMENT_JOB=$(aws amplify create-deployment \
  --app-id "$APP_ID" \
  --branch-name "production" \
  --region ap-south-1)

JOB_ID=$(echo "$DEPLOYMENT_JOB" | jq -r .jobId)
ZIP_UPLOAD_URL=$(echo "$DEPLOYMENT_JOB" | jq -r .zipUploadUrl)

curl -X PUT -T point-of-care-cds.zip "$ZIP_UPLOAD_URL"

aws amplify start-deployment \
  --app-id "$APP_ID" \
  --branch-name "production" \
  --job-id "$JOB_ID" \
  --region ap-south-1
```

---

## 4. Post-Deployment Verification Checklist

| Feature | How to Verify on Live Amplify URL |
| :--- | :--- |
| **4 Clinical Guidelines** | Switch between **Suspected Lymphoma Workup**, **Follicular Lymphoma (1L)**, **DLBCL & PMBCL (1L)**, and **Relapsed / Refractory DLBCL** in the top bar. |
| **EHR FHIR R4 Patient Pull** | Click `PAT-1001 · Rameshwar Deshmukh` (or `PAT-1004 · Ananya Chatterjee`) to pull demographics, LOINC lab observations, and coded EHR findings. |
| **Report & PDF Extraction** | Select a sample report or upload any `.pdf` from `sample_data/` to extract findings with source snippets, then click **Apply Verified to Worksheet**. |
| **Live HL7 CQL 1.5 Evaluation** | Verify the right-hand recommendation card updates in real time with the matched rule trace, prognostic scores (`IPI`, `aaIPI`, `FLIPI`, `CLL-IPI`), CDS Hooks JSON, and FHIR R4 Bundle. |

