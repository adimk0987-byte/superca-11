"""
Final Validation Engine

Performs final checks before generating output.

Validates:
- No negative tax
- No logical conflicts
- All mandatory fields present
- Calculation consistency
"""

from typing import Dict, Any, List


class FinalValidator:
    """Final validation before ITR generation"""
    
    @staticmethod
    def validate(standard_data: Dict[str, Any], tax_calculation: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Perform final validation
        
        Returns:
            List of validation errors (empty if all good)
        """
        errors = []
        
        # Check 1: Tax cannot be negative
        if tax_calculation.get('total_tax_liability', 0) < 0:
            errors.append({
                "code": "NEGATIVE_TAX",
                "severity": "BLOCKER",
                "message": "Calculated tax is negative, which is impossible",
                "fix_hint": "There's an error in calculation. Please review all income and deductions."
            })
        
        # Check 2: Refund validation
        if tax_calculation.get('is_refund'):
            refund = tax_calculation.get('refund_due', 0)
            tax_paid = tax_calculation.get('tax_already_paid', 0)
            
            if refund > tax_paid:
                errors.append({
                    "code": "REFUND_EXCEEDS_PAID",
                    "severity": "BLOCKER",
                    "message": f"Refund amount (₹{refund:,.0f}) exceeds tax paid (₹{tax_paid:,.0f})",
                    "fix_hint": "This indicates a calculation error. Please review."
                })
        
        # Check 3: Taxable income cannot be negative
        if tax_calculation.get('taxable_income', 0) < 0:
            errors.append({
                "code": "NEGATIVE_TAXABLE_INCOME",
                "severity": "WARNING",
                "message": "Taxable income is negative",
                "fix_hint": "Losses will be carried forward. Ensure this is correct."
            })
        
        # Check 4: Mandatory fields present
        personal = standard_data.get('personal', {})
        if not personal.get('pan'):
            errors.append({
                "code": "MISSING_PAN",
                "severity": "BLOCKER",
                "message": "PAN is mandatory",
                "fix_hint": "Please provide PAN"
            })
        
        # Check 5: Income sources validation
        income = standard_data.get('income', {})
        total_income = (
            income.get('salary', {}).get('gross_salary', 0) +
            income.get('house_property', {}).get('rental_income', 0) +
            income.get('capital_gains', {}).get('short_term', 0) +
            income.get('capital_gains', {}).get('long_term', 0) +
            income.get('other_sources', {}).get('interest', 0)
        )
        
        if total_income == 0:
            errors.append({
                "code": "NO_INCOME",
                "severity": "BLOCKER",
                "message": "No income reported",
                "fix_hint": "At least one income source is required to file ITR"
            })
        
        return errors
