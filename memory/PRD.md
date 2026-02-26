# SuperCA - CA Automation Platform PRD

## Original Problem Statement
Run and enhance the existing GST/Tax automation app with CA-level detailed reports and Tally XML export functionality.

## Core Features Implemented

### 1. GST Return Filing (CA-Level)
- **Manual Entry Mode**: Enter sales, purchase, ITC data directly
- **AI Mode (Automatic)**: Upload documents for AI extraction
- **Detailed GSTR-3B Computation**:
  - Section A: Outward Supplies - Rate-wise Breakdown (5%, 12%, 18%, 28%)
  - Section B: ITC Calculation with Reversals (Rule 42, Rule 43, Section 17(5))
  - Net Tax Payable (CGST, SGST, IGST)
  - HSN Summary

### 2. GSTR-2A Reconciliation (Invoice-Level)
- Invoice-by-invoice matching with GSTR-2A
- Vendor-wise ITC at risk analysis
- Status tracking: Matched, Missing in 2A, Rate mismatch, Wrong HSN, Duplicate, Filed next month
- Actionable recommendations per vendor

### 3. ITC Statement
- Total ITC from books
- Blocked ITC under Section 17(5) with breakdown
- Reversal calculations (Rule 42, Rule 43)
- Net eligible ITC computation

### 4. Tally XML Export
- **New Endpoints**:
  - POST `/api/tally/generate-xml` - Generate XML from manual vouchers
  - POST `/api/tally/generate-gst-xml?filing_id=XXX` - Generate XML from GST filing
- **Complete XML Structure**: Ready for Tally Prime/ERP 9 import
- **Includes**: Vouchers, Ledger Masters, Party Masters with GSTIN
- **Summary Report**: Voucher counts, GST ledger summary, net payable

### 5. Additional Features
- Tally Data Entry & Accounting (Manual/AI OCR modes)
- ITR Filing
- TDS Filing
- Financial Statements
- Reconciliation Hub
- Customer Management
- Smart Alerts

## Tech Stack
- **Backend**: FastAPI (Python 3.11)
- **Frontend**: React with Tailwind CSS
- **Database**: MongoDB (gst_filings_v2 collection)
- **Auth**: JWT-based authentication

## API Endpoints (Key GST/Tally)
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/gst/calculate` | POST | Calculate GST with detailed reports |
| `/api/gst/filings` | GET | List all GST filings |
| `/api/gst/{filing_id}/generate-pdf` | POST | Generate PDF report |
| `/api/tally/generate-xml` | POST | Generate Tally XML from vouchers |
| `/api/tally/generate-gst-xml` | POST | Generate Tally XML from GST filing |

## Test Results
- Backend: 100% passing (9/9 API tests)
- PDF Generation: Working (GSTR-3B, Reconciliation, ITC)
- Tally XML Generation: Working with summary report

## What's Been Implemented (Feb 26, 2026)
1. ✅ Full app deployment from uploaded codebase
2. ✅ Backend GST calculation with detailed reports
3. ✅ GSTR-2A reconciliation with invoice-level data
4. ✅ ITC statement with Rule 42/43 and Section 17(5)
5. ✅ Tally XML generation endpoint with GST entries
6. ✅ Summary report for CA verification

## Backlog / Future Enhancements
- P0: Add data-testid to form inputs for better automation
- P1: Real GSTN API integration
- P2: Bulk invoice upload for reconciliation
- P3: WhatsApp vendor reminder integration
