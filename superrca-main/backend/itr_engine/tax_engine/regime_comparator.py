"""
Regime Comparator

Compares tax liability under both regimes and recommends the better option.

NEVER auto-switches regime. Only recommends.
"""

from typing import Dict, Any
from .tax_calculator import TaxCalculator


class RegimeComparator:
    """Compare old vs new regime"""
    
    @staticmethod
    def compare_regimes(standard_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Calculate tax for both regimes and compare
        
        Returns:
            {
                "old_regime": calculation,
                "new_regime": calculation,
                "recommended_regime": "old" or "new",
                "savings": amount,
                "explanation": str,
                "recommendations": list
            }
        """
        calculator = TaxCalculator()
        
        # Calculate for both regimes
        old_regime_calc = calculator.calculate_tax(standard_data, 'old')
        new_regime_calc = calculator.calculate_tax(standard_data, 'new')
        
        # Compare tax liability
        old_tax = old_regime_calc['total_tax_liability']
        new_tax = new_regime_calc['total_tax_liability']
        
        # Determine recommendation
        if new_tax < old_tax:
            recommended = 'new'
            savings = old_tax - new_tax
            explanation = f"New regime saves you ₹{savings:,.0f} in taxes"
        elif old_tax < new_tax:
            recommended = 'old'
            savings = new_tax - old_tax
            explanation = f"Old regime saves you ₹{savings:,.0f} in taxes due to deductions"
        else:
            recommended = 'new'  # Default to new if equal
            savings = 0
            explanation = "Both regimes have same tax liability. New regime recommended for simplicity."
        
        # Generate recommendations
        recommendations = RegimeComparator._generate_recommendations(
            standard_data, old_regime_calc, new_regime_calc, recommended
        )
        
        return {
            "old_regime": old_regime_calc,
            "new_regime": new_regime_calc,
            "recommended_regime": recommended,
            "savings": savings,
            "explanation": explanation,
            "recommendations": recommendations
        }
    
    @staticmethod
    def _generate_recommendations(data: Dict[str, Any], old_calc: Dict, new_calc: Dict, recommended: str) -> list:
        """
        Generate tax-saving recommendations
        """
        recommendations = []
        deductions = data.get('deductions', {})
        
        # Check if user is maximizing deductions in old regime
        if recommended == 'old':
            sec_80c = deductions.get('section_80c', {}).get('amount', 0)
            if sec_80c < 150000:
                recommendations.append(
                    f"Consider maximizing Section 80C to save more. You can claim up to ₹{150000 - sec_80c:,.0f} more."
                )
            
            sec_80d = deductions.get('section_80d', {}).get('amount', 0)
            if sec_80d == 0:
                recommendations.append(
                    "Consider health insurance to claim Section 80D deduction (up to ₹25,000 or ₹50,000 for senior citizens)."
                )
        
        # Tax-saving instruments
        if recommended == 'new':
            recommendations.append(
                "New regime is simpler with no deduction tracking. Good if you don't have many investments."
            )
        
        # HRA optimization
        income = data.get('income', {})
        salary = income.get('salary', {})
        if salary.get('gross_salary', 0) > 500000:
            recommendations.append(
                "If you're paying rent, ensure HRA exemption is properly claimed in Form-16."
            )
        
        # NPS recommendation
        recommendations.append(
            "Consider NPS for additional ₹50,000 deduction under Section 80CCD(1B) in old regime."
        )
        
        return recommendations[:5]  # Return top 5
