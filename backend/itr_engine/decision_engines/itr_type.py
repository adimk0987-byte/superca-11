"""
ITR Type Decision Engine

Decides which ITR form is applicable based on income sources.

Rules:
- ITR-1: Salary + One house property + Other sources (interest, dividends)
- ITR-2: Capital gains, multiple properties, no business
- ITR-3: Business/profession income
- ITR-4: Presumptive taxation (44AD, 44ADA)
"""

from typing import Dict, Any, Tuple


class ITRTypeDecisionEngine:
    """Decides which ITR form user should file"""
    
    @staticmethod
    def decide_itr_type(standard_data: Dict[str, Any]) -> Tuple[str, list]:
        """
        Decide ITR type
        
        Returns:
            (itr_type, reasons)
        """
        income = standard_data.get('income', {})
        reasons = []
        
        # Check for business income
        if income.get('business', {}).get('turnover', 0) > 0:
            # Check for presumptive
            if income['business'].get('presumptive', False):
                return ('ITR-4', ['Presumptive business income under 44AD/44ADA'])
            return ('ITR-3', ['Business/Professional income'])
        
        # Check for capital gains
        capital_gains = income.get('capital_gains', {})
        if capital_gains.get('short_term', 0) > 0 or capital_gains.get('long_term', 0) > 0:
            reasons.append('Capital gains income')
            return ('ITR-2', reasons)
        
        # Check house property
        hp = income.get('house_property', {})
        hp_count = hp.get('property_count', 0 if hp.get('rental_income', 0) == 0 else 1)
        
        if hp_count > 1:
            reasons.append('Multiple house properties')
            return ('ITR-2', reasons)
        
        # Check other sources
        other = income.get('other_sources', {})
        if other.get('interest', 0) > 0 or other.get('dividends', 0) > 0:
            reasons.append('Interest/dividend income')
        
        # Check total income limit for ITR-1
        gross_total_income = (
            income.get('salary', {}).get('gross_salary', 0) +
            hp.get('rental_income', 0) +
            other.get('interest', 0) +
            other.get('dividends', 0)
        )
        
        if gross_total_income > 5000000:  # ₹50 lakh limit
            reasons.append('Total income exceeds ₹50 lakh')
            return ('ITR-2', reasons)
        
        # Default to ITR-1 (Sahaj)
        return ('ITR-1', ['Salary income with basic deductions'])
    
    @staticmethod
    def validate_itr_type_eligibility(standard_data: Dict[str, Any], chosen_itr: str) -> list:
        """
        Validate if user can file chosen ITR type
        
        Returns:
            List of errors if not eligible, empty list if eligible
        """
        actual_itr, reasons = ITRTypeDecisionEngine.decide_itr_type(standard_data)
        
        errors = []
        
        if chosen_itr != actual_itr:
            errors.append({
                "code": "ITR_TYPE_MISMATCH",
                "severity": "BLOCKER",
                "message": f"You selected {chosen_itr} but based on your income, you must file {actual_itr}",
                "fix_hint": f"Reason: {', '.join(reasons)}",
                "field": "itr_type"
            })
        
        return errors
