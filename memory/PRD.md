# SuperCA - CA Automation Platform PRD

## Original Problem Statement
Build a comprehensive GST/Tax automation app with:
1. CA-level detailed GST reports (not just summaries)
2. GSTR-2A reconciliation with invoice-level data
3. Ready-to-import Tally XML export
4. TDS Return Filing with Form 24Q & 26Q
5. Excel upload for bulk deductee/employee data

## What's Been Implemented (Dec 26, 2025)

### GST Return Filing (CA-Level)
- GSTR-3B detailed computation with rate-wise breakdown
- ITC calculation with Rule 42, Rule 43, Section 17(5) reversals
- GSTR-2A reconciliation with invoice-level detail
- Tally XML export from GST filing

### TDS Return Filing (Complete - Full Workflow)
**5-Step Workflow Implemented:**

1. **Step 1 - Mode Selection**
   - AI Mode (Upload Excel): Auto-extract & validate from Excel files
   - Manual Entry: Enter data directly or load sample data

2. **Step 2 - Setup**
   - Company details form (TAN, PAN, Company Name)
   - Quarter selector (Q1-Q4)
   - Financial Year input
   - Load Sample Data / Start Empty Entry options

3. **Step 3 - Extraction View**
   - Tabs: Form 26Q (Non-Salary) and Form 24Q (Salary)
   - Collapsible section tables (194C, 194J, 194I)
   - PAN Validation with color-coded badges:
     * Green: Valid PAN
     * Amber: Name mismatch
     * Red: Invalid/Inactive PAN
   - Fully editable inline tables
   - Add Row / Delete Row functionality
   - Section-wise and grand totals

4. **Step 4 - Summary View**
   - Summary cards (Deductees, Employees, Total TDS, Due Date)
   - Section-wise TDS summary table
   - Form 24Q employee summary
   - TDS Payment Schedule (month-wise with due dates)
   - PAN Validation Report with issue highlights

5. **Step 5 - Download Package**
   - Form 26Q TRACES JSON
   - Form 24Q TRACES JSON  
   - Tally XML (with ledger masters)
   - Download All button

### API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/tds/calculate` | POST | Calculate TDS with Form 24Q/26Q |
| `/api/tds/returns` | GET | List all TDS returns |
| `/api/tds/returns/{id}/tally-xml` | POST | Generate Tally XML |
| `/api/tds/returns/{id}/traces-json` | POST | Generate TRACES JSON |
| `/api/tds/generate-sample` | POST | Generate sample TDS data |
| `/api/tds/upload-excel` | POST | Upload deductees/employees from Excel |
| `/api/tds/download-template` | GET | Download Excel templates |
| `/api/gst/calculate` | POST | Calculate GST with detailed reports |
| `/api/tally/generate-gst-xml` | POST | Generate Tally XML from GST |

### Test Results (Latest: iteration_3.json)
- **Backend**: 100% (13/13 TDS API tests passed)
- **Frontend**: 100% (All 5 TDS workflow steps functional)
- All features tested: Mode Selection, Setup, Extraction View, Summary View, Download

## Access
- URL: https://sprint-track-3.preview.emergentagent.com
- Test User: testca9999@example.com / Test123456

## Mocked/Simulated Features
- **PAN Validation**: Uses frontend simulation for demo purposes (not connected to real NSDL API)

## Backlog / Future Enhancements
### P1 (High Priority)
- Form 16/16A PDF generation
- Real-time PAN validation via NSDL API integration

### P2 (Medium Priority)
- Real GSTN/TRACES API integration
- Auto-fetch 26AS data for reconciliation
- Automated vendor reminders for GST

### P3 (Low Priority)
- WhatsApp vendor reminder integration
- Multi-company support
- Bulk return filing
