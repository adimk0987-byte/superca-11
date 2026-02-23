"""
GSTR-3B Return Generator

Generates GSTR-3B summary return from GSTR-1 data.

Golden Rule: GSTR-3B outward supplies MUST match GSTR-1 totals.
"""

from typing import Dict, Any


class GSTR3BGenerator:
    """Generate GSTR-3B from GSTR-1"""
    
    @staticmethod
    def generate_from_gstr1(gstr1_totals: Dict[str, float], itc_data: Dict[str, float] = None) -> Dict[str, Any]:
        """
        Auto-generate GSTR-3B from GSTR-1 totals
        
        Args:
            gstr1_totals: Totals from GSTR-1
            itc_data: Input Tax Credit data (optional)
        
        Returns:
            GSTR-3B data structure
        """
        if itc_data is None:
            itc_data = {
                "itc_available": 0,
                "itc_reversed": 0
            }
        
        # Section 3.1: Outward supplies
        outward_taxable = gstr1_totals.get('total_taxable_value', 0)
        
        # Tax liability
        total_cgst = gstr1_totals.get('total_cgst', 0)
        total_sgst = gstr1_totals.get('total_sgst', 0)
        total_igst = gstr1_totals.get('total_igst', 0)
        
        # Net ITC
        net_itc = itc_data.get('itc_available', 0) - itc_data.get('itc_reversed', 0)
        
        # Net tax payable
        net_cgst = max(0, total_cgst - (net_itc / 2))  # Simplified
        net_sgst = max(0, total_sgst - (net_itc / 2))
        net_igst = max(0, total_igst - net_itc)
        
        return {
            "section_3_1": {
                "outward_taxable_supplies": outward_taxable,
                "outward_tax_liability": total_cgst + total_sgst + total_igst
            },
            "section_4": {
                "itc_available": itc_data.get('itc_available', 0),
                "itc_reversed": itc_data.get('itc_reversed', 0),
                "net_itc": net_itc
            },
            "section_5": {
                "cgst_payable": net_cgst,
                "sgst_payable": net_sgst,
                "igst_payable": net_igst,
                "total_payable": net_cgst + net_sgst + net_igst
            },
            "metadata": {
                "auto_generated": True,
                "source": "gstr1"
            }
        }
