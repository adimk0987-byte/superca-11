"""
Error Detection Engine - THE MOST CRITICAL LAYER

Detects ALL issues BEFORE tax calculation.

Error Severity Levels:
- BLOCKER: Stops everything, must be fixed
- WARNING: Allows filing but highlights issue
- INFO: Informational, no action needed

Error Categories:
1. Personal Info Errors
2. Income Errors
3. Deduction Errors  
4. Tax Paid Errors
5. Cross-Document Errors
"""

from typing import Dict, Any, List
import re
from datetime import datetime


class ErrorDetector:
    """Comprehensive error detection for ITR filing"""
    
    def __init__(self, financial_year: str = "2024-25"):
        self.financial_year = financial_year
        self.errors = []
    
    def detect_all_errors(self, standard_data: Dict[str, Any], chosen_regime: str = 'new') -> List[Dict[str, Any]]:
        """
        Run ALL error checks
        
        Returns:
            List of error objects
        """
        self.errors = []
        
        # 1. Personal Info Errors
        self._check_personal_info(standard_data)
        
        # 2. Income Errors
        self._check_income_errors(standard_data)
        
        # 3. Deduction Errors
        self._check_deduction_errors(standard_data, chosen_regime)
        
        # 4. Tax Paid Errors
        self._check_tax_paid_errors(standard_data)
        
        # 5. Cross-Document Errors
        self._check_cross_document_errors(standard_data)
        
        return self.errors
    
    def has_blockers(self) -> bool:
        """Check if any blocker errors exist"""
        return any(e['severity'] == 'BLOCKER' for e in self.errors)
    
    def _add_error(self, code: str, severity: str, message: str, fix_hint: str, field: str = None):
        """Add error to list"""
        self.errors.append({
            "code": code,
            "severity": severity,
            "message": message,
            "fix_hint": fix_hint,
            "field": field,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    # ==================== PERSONAL INFO ERRORS ====================
    
    def _check_personal_info(self, data: Dict[str, Any]):
        """Check personal information errors"""
        personal = data.get('personal', {})
        
        # PAN validation - WARNING only (allow calculation to proceed)
        pan = personal.get('pan', '')
        if not self._is_valid_pan(pan):
            self._add_error(
                "INVALID_PAN",
                "WARNING",  # Changed from BLOCKER - allow calculation
                f"Invalid PAN format: {pan or 'Not provided'}",
                "PAN must be in format: AAAAA9999A (5 letters, 4 digits, 1 letter). Please update before filing.",
                "pan"
            )
        
        # Name validation - WARNING only
        name = personal.get('name', '').strip() if personal.get('name') else ''
        if not name or len(name) < 3:
            self._add_error(
                "INVALID_NAME",
                "WARNING",  # Changed from BLOCKER - allow calculation
                "Name is missing or too short",
                "Please provide full name as per PAN card before filing.",
                "name"
            )
        
        # DOB validation
        dob = personal.get('date_of_birth')
        if dob:
            age = self._calculate_age(dob)
            if age < 18:
                self._add_error(
                    "MINOR_TAXPAYER",
                    "BLOCKER",
                    "Taxpayer is a minor (under 18 years)",
                    "Minors cannot file ITR independently. Parent/Guardian must file",
                    "date_of_birth"
                )
            elif age > 120:
                self._add_error(
                    "INVALID_DOB",
                    "WARNING",  # Changed from BLOCKER
                    "Date of birth seems incorrect (age > 120 years)",
                    "Please verify date of birth",
                    "date_of_birth"
                )
    
    # ==================== INCOME ERRORS ====================
    
    def _check_income_errors(self, data: Dict[str, Any]):
        """Check income-related errors"""
        income = data.get('income', {})
        
        # Salary checks
        salary = income.get('salary', {})
        gross_salary = salary.get('gross_salary', 0)
        
        if gross_salary < 0:
            self._add_error(
                "NEGATIVE_SALARY",
                "BLOCKER",
                "Gross salary cannot be negative",
                "Please verify salary amount from Form-16",
                "income.salary.gross_salary"
            )
        
        # House Property checks
        hp = income.get('house_property', {})
        hp_loss = hp.get('loss', 0)
        
        if hp_loss > 200000:
            self._add_error(
                "HP_LOSS_LIMIT_EXCEEDED",
                "BLOCKER",
                f"House property loss of ₹{hp_loss:,.0f} exceeds limit of ₹2,00,000",
                "Maximum house property loss that can be set off is ₹2,00,000",
                "income.house_property.loss"
            )
        
        # Capital Gains checks
        cg = income.get('capital_gains', {})
        if cg.get('short_term', 0) < 0 or cg.get('long_term', 0) < 0:
            self._add_error(
                "NEGATIVE_CAPITAL_GAINS",
                "WARNING",
                "Capital loss detected",
                "Capital losses need special reporting. Please verify",
                "income.capital_gains"
            )
    
    # ==================== DEDUCTION ERRORS ====================
    
    def _check_deduction_errors(self, data: Dict[str, Any], regime: str):
        """Check deduction-related errors"""
        deductions = data.get('deductions', {})
        personal = data.get('personal', {})
        
        # New regime: Deductions claimed are just ignored (not a blocker)
        if regime == 'new':
            total_deductions = sum([
                deductions.get('section_80c', {}).get('amount', 0),
                deductions.get('section_80d', {}).get('amount', 0),
                deductions.get('section_80g', {}).get('amount', 0),
                deductions.get('hra', {}).get('amount', 0)
            ])
            
            if total_deductions > 0:
                self._add_error(
                    "DEDUCTIONS_IGNORED_NEW_REGIME",
                    "INFO",  # Changed from BLOCKER to INFO
                    f"Deductions of ₹{total_deductions:,.0f} will be ignored in new regime",
                    "New regime doesn't allow deductions. Consider old regime if deductions are significant.",
                    "deductions"
                )
        
        # Old regime: Check section limits
        else:
            # Section 80C limit
            sec_80c = deductions.get('section_80c', {}).get('amount', 0)
            if sec_80c > 150000:
                self._add_error(
                    "SEC_80C_LIMIT_EXCEEDED",
                    "BLOCKER",
                    f"Section 80C deduction of ₹{sec_80c:,.0f} exceeds maximum limit of ₹1,50,000",
                    "Reduce Section 80C claim to ₹1,50,000",
                    "deductions.section_80c"
                )
            
            # Section 80D limit (age-dependent)
            sec_80d = deductions.get('section_80d', {}).get('amount', 0)
            age = self._calculate_age(personal.get('date_of_birth'))
            
            max_80d = 50000 if age >= 60 else 25000
            
            if sec_80d > max_80d:
                self._add_error(
                    "SEC_80D_LIMIT_EXCEEDED",
                    "BLOCKER",
                    f"Section 80D deduction of ₹{sec_80d:,.0f} exceeds limit of ₹{max_80d:,.0f} for your age",
                    f"Maximum 80D for {'senior citizens' if age >= 60 else 'below 60 years'}: ₹{max_80d:,.0f}",
                    "deductions.section_80d"
                )
    
    # ==================== TAX PAID ERRORS ====================
    
    def _check_tax_paid_errors(self, data: Dict[str, Any]):
        """Check tax payment errors"""
        tax_paid = data.get('tax_paid', {})
        
        tds = tax_paid.get('tds', {}).get('amount', 0)
        if tds < 0:
            self._add_error(
                "NEGATIVE_TDS",
                "BLOCKER",
                "TDS amount cannot be negative",
                "Please verify TDS from Form-16/26AS",
                "tax_paid.tds"
            )
    
    # ==================== CROSS-DOCUMENT ERRORS ====================
    
    def _check_cross_document_errors(self, data: Dict[str, Any]):
        """Check cross-document inconsistencies"""
        # TODO: Implement when we have AIS and 26AS data
        pass
    
    # ==================== HELPER METHODS ====================
    
    @staticmethod
    def _is_valid_pan(pan: str) -> bool:
        """Validate PAN format"""
        if not pan or len(pan) != 10:
            return False
        
        pattern = r'^[A-Z]{5}[0-9]{4}[A-Z]$'
        return bool(re.match(pattern, pan))
    
    @staticmethod
    def _calculate_age(dob) -> int:
        """Calculate age from date of birth"""
        if not dob:
            return 0
        
        if isinstance(dob, str):
            try:
                dob = datetime.strptime(dob, '%Y-%m-%d')
            except:
                return 0
        
        today = datetime.now()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))
        return age
