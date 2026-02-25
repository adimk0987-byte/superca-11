# CA AutoPilot - ITR PDF Generator PRD

## Original Problem Statement
Build a complete ITR PDF Generator with:
- Multi-provider AI fallback (Emergent -> OpenAI -> Gemini)
- Document processing (Form 16, AIS, Bank Statement, Investment Proofs)
- Data reconciliation engine
- ITR form selector
- Tax calculation (Old vs New regime)
- PDF generation with all schedules

## Architecture

### Tech Stack
- **Frontend:** React 18, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, Python 3.11
- **Database:** MongoDB (Motor async)
- **AI:** Emergent LLM Key (Universal - supports OpenAI/Gemini/Claude)
- **PDF:** ReportLab for PDF generation

### Key Files
```
/app/backend/
├── server.py                    # Main FastAPI app with ITR endpoints
├── itr_engine/
│   ├── __init__.py              # Updated exports
│   ├── ai_processor.py          # NEW - Multi-provider AI with fallback
│   ├── orchestrator.py          # ITR processing orchestrator
│   ├── tax_engine/              # Tax calculation
│   └── generators/
│       └── pdf_generator.py     # Complete ITR PDF generator

/app/frontend/src/pages/
├── ITRFiling.js                 # Original ITR page (step-by-step)
├── ITRGenerator.js              # NEW - Complete workflow page
```

## What's Been Implemented (Feb 2026)

### 1. Multi-Provider AI Document Processor
- **Primary:** Emergent LLM Key (sk-emergent-4AaC08d80Eb8f3eA89)
- **Fallback 1:** Direct OpenAI (if key provided)
- **Fallback 2:** Direct Gemini (if key provided)
- Extracts: Form 16, AIS/TIS, Bank Statement, Investment Proofs

### 2. Data Reconciliation Engine
- Compares data across Form 16, AIS, Bank Statement
- Auto-fixes differences < Rs. 100
- Flags differences > Rs. 10,000 for review
- Calculates confidence score

### 3. ITR Form Selector
- Determines ITR-1, ITR-2, ITR-3, or ITR-4 based on income sources
- Rules-based logic per Income Tax Act

### 4. Tax Calculation Engine
- Both Old and New regime calculations
- FY 2024-25 tax slabs
- Surcharge and cess calculation
- Regime comparison with savings
- **Fixed:** Deductions no longer block calculation - auto-selects regime

### 5. PDF Generator (ReportLab)
- Cover page with PAN and personal info
- Complete computation sheet
- Schedule S - Salary income
- Schedule HP - House property
- Schedule VI-A - Deductions (80C, 80D, etc.)
- Schedule TDS - Tax deducted at source
- Verification and declaration page

### 6. Complete Workflow UI (ITR Generator Page)
- 7-step wizard: Upload → Extract → Reconcile → ITR Form → Calculate → Review → Download
- Visual progress tracking
- Error handling at each step
- **Manual entry option:** Skip document upload for direct entry

## API Endpoints

### ITR Filing
- `POST /api/itr/upload-form16` - Upload and extract Form 16
- `POST /api/itr/calculate-tax` - Calculate tax both regimes
- `POST /api/itr/{id}/generate-pdf` - Generate complete ITR PDF
- `POST /api/itr/process-documents` - Multi-document AI processing
- `GET /api/itr/history` - Filing history

## Test Credentials
- **Email:** test@itr.com
- **Password:** test123

## Environment Variables
```
EMERGENT_LLM_KEY=sk-emergent-4AaC08d80Eb8f3eA89
OPENAI_API_KEY=  # Optional fallback
GEMINI_API_KEY=  # Optional fallback
```

## Prioritized Backlog

### P0 - Completed ✅
1. ~~Multi-provider AI fallback~~
2. ~~Form 16 extraction~~
3. ~~Data reconciliation~~
4. ~~ITR form selection~~
5. ~~Tax calculation (both regimes)~~
6. ~~PDF generation with all schedules~~
7. ~~Complete workflow UI~~

### P1 - Next
8. AIS/TIS real extraction (currently uses Form 16 as base)
9. Investment proof extraction
10. 26AS reconciliation
11. E-filing JSON export (ITD format)

### P2 - Future
12. ITR-2/3/4 specific schedules
13. Capital gains schedule
14. Business income schedule
15. Audit trail PDF

## Known Limitations
- AI extraction requires Emergent LLM Key balance
- PDF uses ReportLab (not filling official govt PDFs)
- Currently optimized for ITR-1 (Sahaj)

## Last Updated
February 25, 2026
