"""
TDS Calculator - Comprehensive TDS calculation for all sections
"""
from datetime import datetime, timezone
from typing import List, Dict, Optional
import random
import string
import uuid

# TDS Rates by Section
TDS_RATES = {
    "194C": {"individual": 1.0, "company": 2.0, "description": "Contractors"},
    "194J": {"rate": 10.0, "description": "Professional/Technical Services"},
    "194I": {"land_building": 10.0, "plant_machinery": 2.0, "description": "Rent"},
    "194A": {"rate": 10.0, "description": "Interest (other than securities)"},
    "194H": {"rate": 5.0, "description": "Commission/Brokerage"},
    "194D": {"rate": 5.0, "description": "Insurance Commission"},
    "194E": {"rate": 20.0, "description": "Payments to Non-Resident Sportsmen"},
    "192": {"description": "Salary - As per slab rates"},
}

# Tax Slabs for FY 2024-25 (New Regime)
TAX_SLABS_NEW = [
    (300000, 0),
    (700000, 5),
    (1000000, 10),
    (1200000, 15),
    (1500000, 20),
    (float('inf'), 30)
]


class TDSCalculator:
    """Calculate TDS for various sections"""
    
    @staticmethod
    def calculate_tds_194c(amount: float, is_company: bool = False, pan_available: bool = True) -> dict:
        """Calculate TDS under section 194C - Contractors"""
        if not pan_available:
            rate = 20.0
        elif is_company:
            rate = 2.0
        else:
            rate = 1.0
        
        tds_amount = amount * rate / 100
        return {
            "section": "194C",
            "description": "Payment to Contractors",
            "amount": amount,
            "rate": rate,
            "tds_amount": round(tds_amount, 2),
            "pan_available": pan_available
        }
    
    @staticmethod
    def calculate_tds_194j(amount: float, is_technical: bool = False, pan_available: bool = True) -> dict:
        """Calculate TDS under section 194J - Professional Services"""
        if not pan_available:
            rate = 20.0
        elif is_technical:
            rate = 2.0  # Technical services for certain categories
        else:
            rate = 10.0
        
        tds_amount = amount * rate / 100
        return {
            "section": "194J",
            "description": "Professional/Technical Services",
            "amount": amount,
            "rate": rate,
            "tds_amount": round(tds_amount, 2),
            "pan_available": pan_available
        }
    
    @staticmethod
    def calculate_tds_194i(amount: float, is_land_building: bool = True, pan_available: bool = True) -> dict:
        """Calculate TDS under section 194I - Rent"""
        if not pan_available:
            rate = 20.0
        elif is_land_building:
            rate = 10.0
        else:
            rate = 2.0  # Plant & Machinery
        
        tds_amount = amount * rate / 100
        return {
            "section": "194I",
            "description": "Rent - " + ("Land/Building" if is_land_building else "Plant/Machinery"),
            "amount": amount,
            "rate": rate,
            "tds_amount": round(tds_amount, 2),
            "pan_available": pan_available
        }
    
    @staticmethod
    def calculate_tds_194a(amount: float, pan_available: bool = True) -> dict:
        """Calculate TDS under section 194A - Interest"""
        if not pan_available:
            rate = 20.0
        else:
            rate = 10.0
        
        tds_amount = amount * rate / 100
        return {
            "section": "194A",
            "description": "Interest Payment",
            "amount": amount,
            "rate": rate,
            "tds_amount": round(tds_amount, 2),
            "pan_available": pan_available
        }
    
    @staticmethod
    def calculate_salary_tds(annual_salary: float, exemptions: dict) -> dict:
        """Calculate TDS on salary under section 192"""
        # Calculate taxable income
        total_exemptions = sum(exemptions.values())
        standard_deduction = 50000  # Standard deduction
        
        taxable_income = annual_salary - total_exemptions - standard_deduction
        taxable_income = max(0, taxable_income)
        
        # Calculate tax using slabs
        tax = 0
        prev_limit = 0
        for limit, rate in TAX_SLABS_NEW:
            if taxable_income <= limit:
                tax += (taxable_income - prev_limit) * rate / 100
                break
            else:
                tax += (limit - prev_limit) * rate / 100
                prev_limit = limit
        
        # Add cess
        cess = tax * 0.04
        total_tax = tax + cess
        monthly_tds = total_tax / 12
        
        return {
            "section": "192",
            "description": "Salary",
            "annual_salary": annual_salary,
            "exemptions": exemptions,
            "total_exemptions": total_exemptions,
            "standard_deduction": standard_deduction,
            "taxable_income": taxable_income,
            "tax_before_cess": round(tax, 2),
            "cess": round(cess, 2),
            "total_annual_tax": round(total_tax, 2),
            "monthly_tds": round(monthly_tds, 2)
        }


class TDSReturnGenerator:
    """Generate complete TDS returns for Form 24Q and 26Q"""
    
    def __init__(self, tan: str, pan: str, company_name: str, quarter: int, fy: str):
        self.tan = tan
        self.pan = pan
        self.company_name = company_name
        self.quarter = quarter
        self.fy = fy
        self.generated_at = datetime.now(timezone.utc)
    
    def generate_form_26q(self, deductees: List[dict]) -> dict:
        """Generate Form 26Q - TDS on Non-Salary Payments"""
        
        # Group by section
        section_wise = {}
        for d in deductees:
            section = d.get('section', '194C')
            if section not in section_wise:
                section_wise[section] = []
            section_wise[section].append(d)
        
        # Calculate totals
        total_amount = sum(d.get('amount', 0) for d in deductees)
        total_tds = sum(d.get('tds_amount', 0) for d in deductees)
        
        # Generate month-wise summary
        months = self._get_quarter_months()
        month_wise = []
        for month in months:
            month_deductees = [d for d in deductees if d.get('month') == month]
            month_wise.append({
                "month": month,
                "tds_deducted": sum(d.get('tds_amount', 0) for d in month_deductees),
                "tds_deposited": sum(d.get('tds_amount', 0) for d in month_deductees),
                "due_date": self._get_due_date(month),
                "status": "On Time"
            })
        
        # Section-wise summary
        section_summary = []
        for section, items in section_wise.items():
            section_summary.append({
                "section": section,
                "description": TDS_RATES.get(section, {}).get('description', section),
                "deductee_count": len(items),
                "total_payment": sum(d.get('amount', 0) for d in items),
                "total_tds": sum(d.get('tds_amount', 0) for d in items)
            })
        
        return {
            "form_type": "26Q",
            "header": {
                "tan": self.tan,
                "pan": self.pan,
                "company_name": self.company_name,
                "quarter": f"Q{self.quarter}",
                "financial_year": self.fy,
                "generated_at": self.generated_at.isoformat()
            },
            "summary": {
                "total_deductees": len(deductees),
                "total_amount_paid": total_amount,
                "total_tds_deducted": total_tds,
                "total_tds_deposited": total_tds,
                "tds_default": 0,
                "interest": 0
            },
            "deductees": deductees,
            "section_wise_summary": section_summary,
            "month_wise_summary": month_wise,
            "return_status": "Ready to File",
            "due_date": self._get_return_due_date()
        }
    
    def generate_form_24q(self, employees: List[dict]) -> dict:
        """Generate Form 24Q - TDS on Salary"""
        
        total_salary = sum(e.get('quarterly_salary', 0) for e in employees)
        total_tds = sum(e.get('tds_deducted', 0) for e in employees)
        
        # Month-wise breakdown
        months = self._get_quarter_months()
        month_wise = []
        for month in months:
            month_tds = total_tds / 3  # Simplified
            month_wise.append({
                "month": month,
                "tds_deducted": round(month_tds, 2),
                "tds_deposited": round(month_tds, 2),
                "due_date": self._get_due_date(month),
                "status": "On Time"
            })
        
        return {
            "form_type": "24Q",
            "header": {
                "tan": self.tan,
                "pan": self.pan,
                "company_name": self.company_name,
                "quarter": f"Q{self.quarter}",
                "financial_year": self.fy,
                "generated_at": self.generated_at.isoformat()
            },
            "summary": {
                "total_employees": len(employees),
                "total_salary_paid": total_salary,
                "total_tds_deducted": total_tds,
                "total_tds_deposited": total_tds
            },
            "employees": employees,
            "month_wise_summary": month_wise,
            "return_status": "Ready to File",
            "due_date": self._get_return_due_date()
        }
    
    def generate_pan_validation_report(self, deductees: List[dict]) -> List[dict]:
        """Validate PANs and generate report"""
        validation_results = []
        for d in deductees:
            pan = d.get('pan', '')
            name = d.get('name', '')
            
            # Simulate PAN validation
            status = "Valid"
            remarks = ""
            
            if not pan or len(pan) != 10:
                status = "Invalid"
                remarks = "Invalid PAN format"
            elif random.random() < 0.1:  # 10% chance of mismatch for demo
                status = "Mismatch"
                remarks = f"Name mismatch ({name.split()[0]} vs registered name)"
            elif random.random() < 0.05:  # 5% chance of inactive
                status = "Inactive"
                remarks = "PAN not active"
            
            validation_results.append({
                "pan": pan,
                "name": name,
                "status": status,
                "remarks": remarks
            })
        
        return validation_results
    
    def generate_26as_reconciliation(self, deductees: List[dict]) -> dict:
        """Reconcile TDS with 26AS"""
        books_total = sum(d.get('tds_amount', 0) for d in deductees)
        
        # Simulate 26AS data (slightly different for demo)
        diff_factor = random.uniform(0.97, 1.0)
        as_per_26as = round(books_total * diff_factor, 2)
        difference = round(books_total - as_per_26as, 2)
        
        mismatches = []
        if difference > 0:
            # Generate some sample mismatches
            sample_deductees = random.sample(deductees, min(3, len(deductees)))
            for d in sample_deductees:
                mismatch_amt = round(d.get('tds_amount', 0) * random.uniform(0.05, 0.15), 2)
                mismatches.append({
                    "deductee_name": d.get('name'),
                    "pan": d.get('pan'),
                    "as_per_books": d.get('tds_amount'),
                    "as_per_26as": round(d.get('tds_amount', 0) - mismatch_amt, 2),
                    "difference": mismatch_amt,
                    "reason": random.choice(["Not reflecting in 26AS", "Wrong PAN", "Amount mismatch"])
                })
        
        return {
            "as_per_books": books_total,
            "as_per_26as": as_per_26as,
            "difference": difference,
            "status": "Match" if difference == 0 else "Mismatch",
            "mismatches": mismatches
        }
    
    def _get_quarter_months(self) -> List[str]:
        """Get months in the quarter"""
        quarter_months = {
            1: ["April", "May", "June"],
            2: ["July", "August", "September"],
            3: ["October", "November", "December"],
            4: ["January", "February", "March"]
        }
        return quarter_months.get(self.quarter, [])
    
    def _get_due_date(self, month: str) -> str:
        """Get TDS deposit due date for a month"""
        month_map = {
            "April": "07-May", "May": "07-Jun", "June": "07-Jul",
            "July": "07-Aug", "August": "07-Sep", "September": "07-Oct",
            "October": "07-Nov", "November": "07-Dec", "December": "07-Jan",
            "January": "07-Feb", "February": "07-Mar", "March": "07-Apr"
        }
        return month_map.get(month, "07-Next")
    
    def _get_return_due_date(self) -> str:
        """Get return filing due date"""
        due_dates = {
            1: "31-Jul",
            2: "31-Oct",
            3: "31-Jan",
            4: "31-May"
        }
        return due_dates.get(self.quarter, "31-Next")


class TDSTallyExporter:
    """Export TDS entries for Tally"""
    
    @staticmethod
    def generate_tds_vouchers(deductees: List[dict], company_name: str) -> str:
        """Generate Tally XML for TDS entries"""
        xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
        xml += '<ENVELOPE>\n'
        xml += '  <HEADER>\n'
        xml += '    <TALLYREQUEST>Import Data</TALLYREQUEST>\n'
        xml += '  </HEADER>\n'
        xml += '  <BODY>\n'
        xml += '    <IMPORTDATA>\n'
        xml += '      <REQUESTDESC>\n'
        xml += '        <REPORTNAME>Vouchers</REPORTNAME>\n'
        xml += '      </REQUESTDESC>\n'
        xml += '      <REQUESTDATA>\n'
        
        for d in deductees:
            date_str = d.get('date', '').replace('-', '')
            section = d.get('section', '194C')
            amount = d.get('amount', 0)
            tds = d.get('tds_amount', 0)
            net_amount = amount - tds
            
            xml += '        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n'
            xml += f'          <VOUCHER VCHTYPE="Payment" ACTION="Create">\n'
            xml += f'            <DATE>{date_str}</DATE>\n'
            xml += f'            <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>\n'
            xml += f'            <VOUCHERNUMBER>TDS/{d.get("invoice_no", "")}</VOUCHERNUMBER>\n'
            xml += f'            <PARTYLEDGERNAME>{d.get("name", "")}</PARTYLEDGERNAME>\n'
            xml += f'            <NARRATION>Payment to {d.get("name")} - TDS u/s {section}</NARRATION>\n'
            
            # Deductee entry (net payment)
            xml += '            <ALLLEDGERENTRIES.LIST>\n'
            xml += f'              <LEDGERNAME>{d.get("name", "")}</LEDGERNAME>\n'
            xml += f'              <AMOUNT>-{net_amount:.2f}</AMOUNT>\n'
            xml += '            </ALLLEDGERENTRIES.LIST>\n'
            
            # Bank entry
            xml += '            <ALLLEDGERENTRIES.LIST>\n'
            xml += f'              <LEDGERNAME>Bank Account</LEDGERNAME>\n'
            xml += f'              <AMOUNT>{net_amount:.2f}</AMOUNT>\n'
            xml += '            </ALLLEDGERENTRIES.LIST>\n'
            
            # TDS Payable entry
            xml += '            <ALLLEDGERENTRIES.LIST>\n'
            xml += f'              <LEDGERNAME>TDS Payable - {section}</LEDGERNAME>\n'
            xml += f'              <AMOUNT>{tds:.2f}</AMOUNT>\n'
            xml += '            </ALLLEDGERENTRIES.LIST>\n'
            
            xml += '          </VOUCHER>\n'
            xml += '        </TALLYMESSAGE>\n'
        
        # Add TDS ledger masters
        xml += '\n        <!-- TDS LEDGER MASTERS -->\n'
        for section in ['194C', '194J', '194I', '194A', '192']:
            desc = TDS_RATES.get(section, {}).get('description', section)
            xml += '        <TALLYMESSAGE xmlns:UDF="TallyUDF">\n'
            xml += f'          <LEDGER NAME="TDS Payable - {section}" ACTION="Create">\n'
            xml += f'            <NAME>TDS Payable - {section} ({desc})</NAME>\n'
            xml += '            <PARENT>Duties &amp; Taxes</PARENT>\n'
            xml += '          </LEDGER>\n'
            xml += '        </TALLYMESSAGE>\n'
        
        xml += '      </REQUESTDATA>\n'
        xml += '    </IMPORTDATA>\n'
        xml += '  </BODY>\n'
        xml += '</ENVELOPE>'
        
        return xml
    
    @staticmethod
    def generate_tds_deposit_voucher(month: str, section_amounts: dict, challan_no: str) -> str:
        """Generate TDS deposit voucher for Tally"""
        total = sum(section_amounts.values())
        date_str = datetime.now().strftime('%Y%m%d')
        
        xml = f'''        <TALLYMESSAGE xmlns:UDF="TallyUDF">
          <VOUCHER VCHTYPE="Payment" ACTION="Create">
            <DATE>{date_str}</DATE>
            <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
            <VOUCHERNUMBER>TDS-DEP/{month}</VOUCHERNUMBER>
            <NARRATION>TDS deposit for {month} - Challan No: {challan_no}</NARRATION>
'''
        
        for section, amount in section_amounts.items():
            if amount > 0:
                xml += f'''            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>TDS Payable - {section}</LEDGERNAME>
              <AMOUNT>-{amount:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
'''
        
        xml += f'''            <ALLLEDGERENTRIES.LIST>
              <LEDGERNAME>Bank Account</LEDGERNAME>
              <AMOUNT>{total:.2f}</AMOUNT>
            </ALLLEDGERENTRIES.LIST>
          </VOUCHER>
        </TALLYMESSAGE>'''
        
        return xml
