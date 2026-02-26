# SuperCA - CA Automation Platform PRD

## Original Problem Statement
Run and enhance the existing GST/Tax automation app with:
1. CA-level detailed GST reports (not just summaries)
2. GSTR-2A reconciliation with invoice-level data
3. Ready-to-import Tally XML export
4. TDS Return Filing with Form 24Q & 26Q

## What's Been Implemented (Feb 26, 2026)

### GST Return Filing (CA-Level)
- ✅ GSTR-3B detailed computation with rate-wise breakdown (5%, 12%, 18%, 28%)
- ✅ ITC calculation with Rule 42, Rule 43, Section 17(5) reversals
- ✅ GSTR-2A reconciliation with invoice-level detail
- ✅ Tally XML export from GST filing

### TDS Return Filing (NEW)
- ✅ Form 26Q (Non-Salary) - Contractors, Professionals, Rent, Interest
- ✅ Form 24Q (Salary) - Employee-wise TDS with exemptions
- ✅ Section-wise summary (194C, 194J, 194I, 194A)
- ✅ Month-wise TDS deposit tracking
- ✅ PAN Validation Report (Valid/Invalid/Inactive/Mismatch)
- ✅ 26AS Reconciliation
- ✅ TRACES JSON export (ready to upload)
- ✅ Tally XML export with TDS ledger masters

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tds/calculate` | POST | Calculate TDS with Form 24Q/26Q |
| `/api/tds/returns` | GET | List all TDS returns |
| `/api/tds/returns/{id}/tally-xml` | POST | Generate Tally XML |
| `/api/tds/returns/{id}/traces-json` | POST | Generate TRACES JSON |
| `/api/tds/generate-sample` | POST | Generate sample TDS data |
| `/api/gst/calculate` | POST | Calculate GST with detailed reports |
| `/api/tally/generate-gst-xml` | POST | Generate Tally XML from GST filing |

### Backend Files Added
- `/app/backend/tds_engine/__init__.py`
- `/app/backend/tds_engine/calculator.py` - TDS calculation, Form generation, Tally export

### Frontend Pages
- `/app/frontend/src/pages/TDSFiling.js` - Complete TDS filing UI
- `/app/frontend/src/pages/GSTFiling.js` - Enhanced with Tally export

## Test Results
- Backend APIs: 100% working
- TDS calculation: Working with sample data
- Form 26Q/24Q generation: Working
- Tally XML export: Working
- TRACES JSON export: Working

## Access
- URL: https://sprint-track-3.preview.emergentagent.com
- Test User: testca9999@example.com / Test123456

## Backlog / Future Enhancements
- P1: Bulk deductee upload via Excel
- P1: Form 16/16A PDF generation
- P2: Real GSTN/TRACES API integration
- P2: Auto-fetch 26AS data
- P3: WhatsApp vendor reminder integration
