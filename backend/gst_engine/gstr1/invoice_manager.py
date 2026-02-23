"""
GSTR-1 Invoice Manager

Manages outward supply invoices for GSTR-1.

Supported tables:
- B2B (Business to Business)
- B2C Large (> ₹2.5L per invoice)
- B2C Small (aggregated)
- Credit/Debit Notes
- Nil/Zero rated
"""

from typing import Dict, Any, List


class InvoiceManager:
    """Manage GSTR-1 invoices"""
    
    @staticmethod
    def calculate_gstr1_totals(invoices: List[Dict[str, Any]]) -> Dict[str, float]:
        """
        Calculate GSTR-1 summary totals
        
        Returns:
            {
                "total_taxable_value": float,
                "total_cgst": float,
                "total_sgst": float,
                "total_igst": float,
                "total_invoice_value": float
            }
        """
        totals = {
            "total_taxable_value": 0.0,
            "total_cgst": 0.0,
            "total_sgst": 0.0,
            "total_igst": 0.0,
            "total_invoice_value": 0.0
        }
        
        for invoice in invoices:
            totals["total_taxable_value"] += invoice.get('taxable_value', 0)
            totals["total_cgst"] += invoice.get('cgst', 0)
            totals["total_sgst"] += invoice.get('sgst', 0)
            totals["total_igst"] += invoice.get('igst', 0)
            totals["total_invoice_value"] += invoice.get('total_value', 0)
        
        return totals
    
    @staticmethod
    def categorize_invoice(invoice: Dict[str, Any]) -> str:
        """
        Categorize invoice into B2B, B2C_LARGE, or B2C_SMALL
        
        Rules:
        - B2B: Has recipient GSTIN
        - B2C Large: No GSTIN, value > ₹2.5L
        - B2C Small: No GSTIN, value ≤ ₹2.5L
        """
        if invoice.get('recipient_gstin'):
            return 'B2B'
        
        total_value = invoice.get('total_value', 0)
        if total_value > 250000:
            return 'B2C_LARGE'
        
        return 'B2C_SMALL'
