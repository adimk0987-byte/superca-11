"""
Tax Calculation Engine

Calculates tax using Indian Income Tax rules for FY 2024-25.

Process:
1. Calculate Gross Total Income
2. Apply Chapter VI-A deductions
3. Calculate tax on taxable income
4. Add surcharge
5. Add health & education cess (4%)
6. Calculate interest (234A/B/C)
7. Determine refund/payable

Rules are FY-specific and loaded from rule files.
"""

from typing import Dict, Any
from decimal import Decimal, ROUND_HALF_UP


class TaxCalculator:
    """Calculate income tax for both regimes"""
    
    # FY 2024-25 Tax Slabs
    OLD_REGIME_SLABS = [
        (250000, 0),      # 0-2.5L: 0%
        (500000, 0.05),   # 2.5-5L: 5%
        (1000000, 0.20),  # 5-10L: 20%
        (float('inf'), 0.30)  # >10L: 30%
    ]
    
    NEW_REGIME_SLABS = [
        (300000, 0),      # 0-3L: 0%
        (700000, 0.05),   # 3-7L: 5%
        (1000000, 0.10),  # 7-10L: 10%
        (1200000, 0.15),  # 10-12L: 15%
        (1500000, 0.20),  # 12-15L: 20%
        (float('inf'), 0.30)  # >15L: 30%
    ]
    
    STANDARD_DEDUCTION_OLD = 50000
    STANDARD_DEDUCTION_NEW = 75000
    CESS_RATE = 0.04  # 4%
    
    def __init__(self, financial_year: str = "2024-25"):
        self.financial_year = financial_year
    
    def calculate_tax(self, standard_data: Dict[str, Any], regime: str = 'new') -> Dict[str, Any]:
        """
        Calculate complete tax
        
        Args:
            standard_data: Standardized ITR data
            regime: 'old' or 'new'
        
        Returns:
            Complete tax calculation breakdown
        """
        income = standard_data.get('income', {})
        deductions = standard_data.get('deductions', {})
        tax_paid = standard_data.get('tax_paid', {})
        
        # Step 1: Calculate Gross Total Income
        gross_salary = income.get('salary', {}).get('gross_salary', 0)
        hp_income = income.get('house_property', {}).get('rental_income', 0) - income.get('house_property', {}).get('interest_on_loan', 0)
        cg_short = income.get('capital_gains', {}).get('short_term', 0)
        cg_long = income.get('capital_gains', {}).get('long_term', 0)
        other_income = income.get('other_sources', {}).get('interest', 0) + income.get('other_sources', {}).get('dividends', 0)
        
        gross_total_income = gross_salary + max(hp_income, -200000) + cg_short + cg_long + other_income
        
        # Step 2: Apply standard deduction
        standard_deduction = self.STANDARD_DEDUCTION_NEW if regime == 'new' else self.STANDARD_DEDUCTION_OLD
        
        # Step 3: Apply Chapter VI-A deductions (only for old regime)
        total_deductions = 0
        if regime == 'old':
            total_deductions = (
                deductions.get('section_80c', {}).get('amount', 0) +
                deductions.get('section_80d', {}).get('amount', 0) +
                deductions.get('section_80g', {}).get('amount', 0)
            )
        
        # Step 4: Calculate taxable income
        taxable_income = gross_total_income - standard_deduction - total_deductions
        taxable_income = max(0, taxable_income)  # Cannot be negative
        
        # Step 5: Calculate tax using slabs
        slabs = self.NEW_REGIME_SLABS if regime == 'new' else self.OLD_REGIME_SLABS
        tax_on_income = self._calculate_slab_tax(taxable_income, slabs)
        
        # Step 6: Calculate surcharge (if applicable)
        surcharge = self._calculate_surcharge(taxable_income, tax_on_income)
        
        # Step 7: Add health & education cess
        cess = (tax_on_income + surcharge) * self.CESS_RATE
        
        # Step 8: Total tax liability
        total_tax = tax_on_income + surcharge + cess
        
        # Step 9: Round to nearest ₹10
        total_tax = self._round_to_10(total_tax)
        
        # Step 10: Calculate interest (if applicable)
        interest_234b = 0  # TODO: Calculate if advance tax not paid
        interest_234c = 0  # TODO: Calculate if advance tax short paid
        
        # Step 11: Tax already paid
        tds_paid = tax_paid.get('tds', {}).get('amount', 0)
        advance_tax_paid = tax_paid.get('advance_tax', 0)
        self_assessment_paid = tax_paid.get('self_assessment', 0)
        
        total_tax_paid = tds_paid + advance_tax_paid + self_assessment_paid
        
        # Step 12: Net tax payable/refundable
        net_tax = total_tax - total_tax_paid + interest_234b + interest_234c
        
        is_refund = net_tax < 0
        
        return {
            "regime": regime,
            "gross_income": gross_total_income,
            "standard_deduction": standard_deduction,
            "total_deductions": total_deductions,
            "taxable_income": taxable_income,
            "tax_on_income": tax_on_income,
            "surcharge": surcharge,
            "cess": cess,
            "total_tax_liability": total_tax,
            "interest_234b": interest_234b,
            "interest_234c": interest_234c,
            "tax_already_paid": total_tax_paid,
            "tds_paid": tds_paid,
            "advance_tax_paid": advance_tax_paid,
            "net_tax_payable": max(0, net_tax),
            "refund_due": abs(min(0, net_tax)),
            "is_refund": is_refund,
            "calculation_date": None
        }
    
    @staticmethod
    def _calculate_slab_tax(taxable_income: float, slabs: list) -> float:
        """Calculate tax using slab rates"""
        tax = 0
        prev_limit = 0
        
        for limit, rate in slabs:
            if taxable_income > prev_limit:
                taxable_in_slab = min(taxable_income, limit) - prev_limit
                tax += taxable_in_slab * rate
                prev_limit = limit
            else:
                break
        
        return tax
    
    @staticmethod
    def _calculate_surcharge(taxable_income: float, tax: float) -> float:
        """Calculate surcharge based on income"""
        # Surcharge for FY 2024-25
        if taxable_income > 50000000:  # > ₹5 crore
            return tax * 0.37
        elif taxable_income > 20000000:  # > ₹2 crore
            return tax * 0.25
        elif taxable_income > 10000000:  # > ₹1 crore
            return tax * 0.15
        elif taxable_income > 5000000:   # > ₹50 lakh
            return tax * 0.10
        else:
            return 0
    
    @staticmethod
    def _round_to_10(amount: float) -> float:
        """Round to nearest ₹10"""
        return round(amount / 10) * 10
