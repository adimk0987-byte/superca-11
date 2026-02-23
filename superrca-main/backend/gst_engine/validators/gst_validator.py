"""
GST Validation Engine

Centralized validator for all GST operations.

Validations:
1. Profile completeness
2. Period status (open/filed/time-barred)
3. Invoice validations (format, tax, duplicates)
4. GSTR-1 vs GSTR-3B reconciliation
5. Tax calculations
6. Late fee calculations
"""

from typing import Dict, Any, List
from datetime import datetime, timedelta
import re


class GSTValidator:
    """Comprehensive GST validation"""
    
    @staticmethod
    def validate_invoice(invoice: Dict[str, Any], supply_type: str = 'B2B') -> List[Dict[str, Any]]:
        """
        Validate single invoice
        
        Args:
            invoice: Invoice data
            supply_type: B2B, B2C_LARGE, B2C_SMALL
        
        Returns:
            List of errors
        """
        errors = []
        
        # Invoice number
        if not invoice.get('invoice_number'):
            errors.append({
                "code": "MISSING_INVOICE_NUMBER",
                "severity": "BLOCKER",
                "message": "Invoice number is mandatory"
            })
        
        # Invoice date
        invoice_date = invoice.get('invoice_date')
        if not invoice_date:
            errors.append({
                "code": "MISSING_INVOICE_DATE",
                "severity": "BLOCKER",
                "message": "Invoice date is mandatory"
            })
        else:
            # Check if future date
            try:
                inv_date = datetime.fromisoformat(invoice_date) if isinstance(invoice_date, str) else invoice_date
                if inv_date > datetime.now():
                    errors.append({
                        "code": "FUTURE_INVOICE_DATE",
                        "severity": "BLOCKER",
                        "message": "Invoice date cannot be in the future"
                    })
            except:
                errors.append({
                    "code": "INVALID_DATE_FORMAT",
                    "severity": "BLOCKER",
                    "message": "Invalid invoice date format"
                })
        
        # Recipient GSTIN (for B2B)
        if supply_type == 'B2B':
            recipient_gstin = invoice.get('recipient_gstin')
            if not recipient_gstin:
                errors.append({
                    "code": "MISSING_RECIPIENT_GSTIN",
                    "severity": "BLOCKER",
                    "message": "Recipient GSTIN is mandatory for B2B"
                })
            elif len(recipient_gstin) != 15:
                errors.append({
                    "code": "INVALID_RECIPIENT_GSTIN",
                    "severity": "BLOCKER",
                    "message": "Invalid recipient GSTIN format"
                })
        
        # Taxable value
        taxable_value = invoice.get('taxable_value', 0)
        if taxable_value <= 0:
            errors.append({
                "code": "INVALID_TAXABLE_VALUE",
                "severity": "BLOCKER",
                "message": "Taxable value must be greater than 0"
            })
        
        # GST Rate
        gst_rate = invoice.get('gst_rate', 0)
        valid_rates = [0, 0.25, 3, 5, 12, 18, 28]
        if gst_rate not in valid_rates:
            errors.append({
                "code": "INVALID_GST_RATE",
                "severity": "BLOCKER",
                "message": f"GST rate must be one of: {valid_rates}"
            })
        
        # Tax calculation validation
        supply_type_field = invoice.get('supply_type', 'intra')
        cgst = invoice.get('cgst', 0)
        sgst = invoice.get('sgst', 0)
        igst = invoice.get('igst', 0)
        
        expected_tax = taxable_value * (gst_rate / 100)
        
        if supply_type_field == 'intra':
            # Intra-state: CGST + SGST
            actual_tax = cgst + sgst
            
            if igst > 0:
                errors.append({
                    "code": "IGST_IN_INTRA_STATE",
                    "severity": "BLOCKER",
                    "message": "IGST cannot be used for intra-state supply"
                })
            
            if abs(actual_tax - expected_tax) > 0.01:  # Allow 1 paisa rounding
                errors.append({
                    "code": "TAX_MISMATCH",
                    "severity": "BLOCKER",
                    "message": f"Tax mismatch: Expected ₹{expected_tax:.2f}, got ₹{actual_tax:.2f}"
                })
        
        else:
            # Inter-state: IGST only
            if cgst > 0 or sgst > 0:
                errors.append({
                    "code": "CGST_SGST_IN_INTER_STATE",
                    "severity": "BLOCKER",
                    "message": "CGST/SGST cannot be used for inter-state supply"
                })
            
            if abs(igst - expected_tax) > 0.01:
                errors.append({
                    "code": "TAX_MISMATCH",
                    "severity": "BLOCKER",
                    "message": f"IGST mismatch: Expected ₹{expected_tax:.2f}, got ₹{igst:.2f}"
                })
        
        # Negative values check
        if any(v < 0 for v in [taxable_value, cgst, sgst, igst]):
            errors.append({
                "code": "NEGATIVE_VALUES",
                "severity": "BLOCKER",
                "message": "Negative values not allowed in invoice"
            })
        
        return errors
    
    @staticmethod
    def check_duplicate_invoice(invoice_number: str, gstin: str, period: str, existing_invoices: List[Dict]) -> bool:
        """
        Check for duplicate invoice number
        
        Returns:
            True if duplicate found
        """
        for inv in existing_invoices:
            if (inv.get('invoice_number') == invoice_number and 
                inv.get('period') == period):
                return True
        return False
    
    @staticmethod
    def reconcile_gstr1_gstr3b(gstr1_totals: Dict[str, float], gstr3b_data: Dict[str, float]) -> List[Dict[str, Any]]:
        """
        Reconcile GSTR-1 outward supplies with GSTR-3B
        
        GOLDEN RULE: GSTR-3B outward supply MUST match GSTR-1
        
        Returns:
            List of reconciliation errors
        """
        errors = []
        
        gstr1_taxable = gstr1_totals.get('total_taxable_value', 0)
        gstr3b_taxable = gstr3b_data.get('outward_taxable_supplies', 0)
        
        # Allow 1 rupee difference for rounding
        if abs(gstr1_taxable - gstr3b_taxable) > 1:
            errors.append({
                "code": "GSTR1_GSTR3B_MISMATCH",
                "severity": "BLOCKER",
                "message": f"GSTR-1 taxable value (₹{gstr1_taxable:,.2f}) does not match GSTR-3B (₹{gstr3b_taxable:,.2f})",
                "fix_hint": "GSTR-3B outward supplies must equal GSTR-1 totals. Review your invoices."
            })
        
        return errors
    
    @staticmethod
    def calculate_late_fee(due_date: datetime, filing_date: datetime, return_type: str, is_nil: bool = False) -> float:
        """
        Calculate GST late fee
        
        Rules:
        - GSTR-1: ₹20/day (Nil: ₹10/day)
        - GSTR-3B: ₹50/day per act (Nil: ₹20/day per act)
        
        Returns:
            Late fee amount
        """
        if filing_date <= due_date:
            return 0
        
        days_late = (filing_date - due_date).days
        
        if return_type == 'GSTR-1':
            daily_fee = 10 if is_nil else 20
            return days_late * daily_fee
        
        elif return_type == 'GSTR-3B':
            daily_fee = 20 if is_nil else 50
            # GSTR-3B has CGST + SGST, so fee is per act
            return days_late * daily_fee * 2  # CGST + SGST
        
        return 0
    
    @staticmethod
    def validate_period_status(period: str, filed_periods: List[str], current_period: str) -> Dict[str, Any]:
        """
        Check if period is open, filed, or time-barred
        
        Returns:
            {
                "is_open": bool,
                "is_filed": bool,
                "is_time_barred": bool,
                "can_edit": bool
            }
        """
        is_filed = period in filed_periods
        
        # Simple time-bar check (periods older than 3 months from current)
        try:
            period_date = datetime.strptime(period, '%m-%Y')
            current_date = datetime.strptime(current_period, '%m-%Y')
            months_diff = (current_date.year - period_date.year) * 12 + current_date.month - period_date.month
            is_time_barred = months_diff > 3
        except:
            is_time_barred = False
        
        return {
            "is_open": not is_filed and not is_time_barred,
            "is_filed": is_filed,
            "is_time_barred": is_time_barred,
            "can_edit": not is_filed
        }
