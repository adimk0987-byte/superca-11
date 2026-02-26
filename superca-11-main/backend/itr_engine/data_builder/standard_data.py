"""
Standard Data Builder

Converts ALL inputs (Form-16, AIS, 26AS, Manual) into ONE unified JSON structure.

Rules:
- Numbers only (no commas, ₹ symbols)
- Missing fields = 0 (never null)
- Everything tagged with source
- NO calculations here, ONLY cleaning + structuring
"""

from typing import Dict, Any, Optional
from decimal import Decimal
import re


class StandardDataBuilder:
    """Builds standard ITR data structure from multiple sources"""
    
    @staticmethod
    def clean_amount(value: Any) -> Decimal:
        """Clean amount: remove ₹, commas, convert to Decimal"""
        if value is None:
            return Decimal('0')
        
        if isinstance(value, (int, float)):
            return Decimal(str(value))
        
        # Remove currency symbols and commas
        cleaned = re.sub(r'[₹,\s]', '', str(value))
        
        try:
            return Decimal(cleaned)
        except:
            return Decimal('0')
    
    @staticmethod
    def build_from_form16(form16_data: Dict[str, Any]) -> Dict[str, Any]:
        """Build standard structure from Form-16 data"""
        
        # Safe getter for strings that might be None
        def safe_upper(val):
            return str(val).upper() if val else ''
        
        return {
            "personal": {
                "pan": safe_upper(form16_data.get('employee_pan')),
                "name": form16_data.get('employee_name') or '',
                "financial_year": form16_data.get('financial_year') or '2024-25',
                "source": "form16"
            },
            "income": {
                "salary": {
                    "gross_salary": float(StandardDataBuilder.clean_amount(form16_data.get('gross_salary'))),
                    "standard_deduction": 50000.0,  # FY 2024-25
                    "employer_tan": form16_data.get('employer_tan') or '',
                    "employer_name": form16_data.get('employer_name') or '',
                    "source": "form16"
                },
                "house_property": {
                    "rental_income": 0.0,
                    "interest_on_loan": 0.0,
                    "source": "manual"
                },
                "capital_gains": {
                    "short_term": 0.0,
                    "long_term": 0.0,
                    "source": "manual"
                },
                "other_sources": {
                    "interest": 0.0,
                    "dividends": 0.0,
                    "source": "manual"
                }
            },
            "deductions": {
                "section_80c": {
                    "amount": float(StandardDataBuilder.clean_amount(form16_data.get('section_80c'))),
                    "source": "form16"
                },
                "section_80d": {
                    "amount": float(StandardDataBuilder.clean_amount(form16_data.get('section_80d'))),
                    "source": "form16"
                },
                "section_80g": {
                    "amount": float(StandardDataBuilder.clean_amount(form16_data.get('other_deductions'))),
                    "source": "form16"
                },
                "hra": {
                    "amount": float(StandardDataBuilder.clean_amount(form16_data.get('hra_claimed'))),
                    "source": "form16"
                }
            },
            "tax_paid": {
                "tds": {
                    "amount": float(StandardDataBuilder.clean_amount(form16_data.get('tds_deducted'))),
                    "source": "form16"
                },
                "advance_tax": 0.0,
                "self_assessment": 0.0
            },
            "documents": {
                "form16_uploaded": True,
                "ais_uploaded": False,
                "26as_uploaded": False
            },
            "metadata": {
                "created_at": None,
                "data_completeness": "form16_only",
                "validation_status": "pending"
            }
        }
    
    @staticmethod
    def merge_ais_data(standard_data: Dict[str, Any], ais_data: Dict[str, Any]) -> Dict[str, Any]:
        """Merge AIS data into standard structure"""
        # TODO: Implement AIS merger
        # Mark conflicts for error detection
        return standard_data
    
    @staticmethod
    def merge_26as_data(standard_data: Dict[str, Any], tds_data: Dict[str, Any]) -> Dict[str, Any]:
        """Merge 26AS data into standard structure"""
        # TODO: Implement 26AS merger
        # Check TDS mismatches
        return standard_data
