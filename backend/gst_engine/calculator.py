"""
GST Return Filing Engine - Complete CA-Level Solution

Features:
1. Auto-extract from Sales/Purchase registers
2. GSTR-2A/2B reconciliation
3. ITC eligibility calculation
4. GSTR-3B & GSTR-1 generation
5. Payment challan generation
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
import json


class GSTCalculator:
    """GST Tax Calculation Engine"""
    
    GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 7.5, 12, 18, 28]
    
    @staticmethod
    def calculate_gst(
        sales_data: Dict[str, Any],
        purchase_data: Dict[str, Any],
        is_interstate: bool = False
    ) -> Dict[str, Any]:
        """
        Calculate GST liability
        
        Args:
            sales_data: Sales register data
            purchase_data: Purchase register data  
            is_interstate: If True, calculate IGST; else CGST+SGST
        """
        # Calculate Output Tax (from sales)
        output_tax = GSTCalculator._calculate_output_tax(sales_data, is_interstate)
        
        # Calculate Input Tax Credit (from purchases)
        itc = GSTCalculator._calculate_itc(purchase_data, is_interstate)
        
        # Net Tax Payable
        if is_interstate:
            net_igst = max(0, output_tax['igst'] - itc['igst'])
            net_payable = {
                'cgst': 0,
                'sgst': 0,
                'igst': net_igst,
                'cess': output_tax.get('cess', 0),
                'total': net_igst + output_tax.get('cess', 0)
            }
        else:
            net_cgst = max(0, output_tax['cgst'] - itc['cgst'])
            net_sgst = max(0, output_tax['sgst'] - itc['sgst'])
            net_payable = {
                'cgst': net_cgst,
                'sgst': net_sgst,
                'igst': 0,
                'cess': output_tax.get('cess', 0),
                'total': net_cgst + net_sgst + output_tax.get('cess', 0)
            }
        
        return {
            'output_tax': output_tax,
            'input_tax_credit': itc,
            'net_payable': net_payable,
            'is_interstate': is_interstate
        }
    
    @staticmethod
    def _calculate_output_tax(sales_data: Dict, is_interstate: bool) -> Dict:
        """Calculate output tax from sales"""
        total_taxable = float(sales_data.get('total_taxable_value', 0))
        
        # Rate-wise breakdown
        rate_5 = float(sales_data.get('taxable_5', 0))
        rate_12 = float(sales_data.get('taxable_12', 0))
        rate_18 = float(sales_data.get('taxable_18', 0))
        rate_28 = float(sales_data.get('taxable_28', 0))
        
        # If no rate breakdown provided, assume all is 18%
        if rate_5 == 0 and rate_12 == 0 and rate_18 == 0 and rate_28 == 0 and total_taxable > 0:
            rate_18 = total_taxable
        
        tax_5 = rate_5 * 0.05
        tax_12 = rate_12 * 0.12
        tax_18 = rate_18 * 0.18
        tax_28 = rate_28 * 0.28
        
        total_tax = tax_5 + tax_12 + tax_18 + tax_28
        
        if is_interstate:
            return {
                'taxable_value': total_taxable,
                'cgst': 0,
                'sgst': 0,
                'igst': total_tax,
                'cess': float(sales_data.get('cess', 0)),
                'total_tax': total_tax,
                'rate_breakdown': {
                    '5%': {'taxable': rate_5, 'tax': tax_5},
                    '12%': {'taxable': rate_12, 'tax': tax_12},
                    '18%': {'taxable': rate_18, 'tax': tax_18},
                    '28%': {'taxable': rate_28, 'tax': tax_28}
                }
            }
        else:
            return {
                'taxable_value': total_taxable,
                'cgst': total_tax / 2,
                'sgst': total_tax / 2,
                'igst': 0,
                'cess': float(sales_data.get('cess', 0)),
                'total_tax': total_tax,
                'rate_breakdown': {
                    '5%': {'taxable': rate_5, 'cgst': tax_5/2, 'sgst': tax_5/2},
                    '12%': {'taxable': rate_12, 'cgst': tax_12/2, 'sgst': tax_12/2},
                    '18%': {'taxable': rate_18, 'cgst': tax_18/2, 'sgst': tax_18/2},
                    '28%': {'taxable': rate_28, 'cgst': tax_28/2, 'sgst': tax_28/2}
                }
            }
    
    @staticmethod
    def _calculate_itc(purchase_data: Dict, is_interstate: bool) -> Dict:
        """Calculate eligible Input Tax Credit"""
        total_itc = float(purchase_data.get('total_itc', 0))
        
        # ITC eligibility rules
        blocked_itc = float(purchase_data.get('blocked_itc', 0))  # Section 17(5)
        reversed_itc = float(purchase_data.get('reversed_itc', 0))  # Rule 42/43
        
        eligible_itc = max(0, total_itc - blocked_itc - reversed_itc)
        
        if is_interstate:
            return {
                'total_itc': total_itc,
                'blocked_itc': blocked_itc,
                'reversed_itc': reversed_itc,
                'eligible_itc': eligible_itc,
                'cgst': 0,
                'sgst': 0,
                'igst': eligible_itc
            }
        else:
            return {
                'total_itc': total_itc,
                'blocked_itc': blocked_itc,
                'reversed_itc': reversed_itc,
                'eligible_itc': eligible_itc,
                'cgst': eligible_itc / 2,
                'sgst': eligible_itc / 2,
                'igst': 0
            }


class GSTR2AReconciler:
    """Reconcile purchases with GSTR-2A/2B"""
    
    @staticmethod
    def reconcile(
        purchase_register: List[Dict],
        gstr2a_data: List[Dict]
    ) -> Dict[str, Any]:
        """
        Reconcile purchase register with GSTR-2A
        
        Returns mismatches, matched invoices, and recommendations
        """
        matched = []
        missing_in_2a = []
        missing_in_books = []
        rate_mismatch = []
        amount_mismatch = []
        
        # Index GSTR-2A by invoice number
        gstr2a_index = {inv.get('invoice_no', ''): inv for inv in gstr2a_data}
        purchase_index = {inv.get('invoice_no', ''): inv for inv in purchase_register}
        
        # Check purchases against 2A
        for purchase in purchase_register:
            inv_no = purchase.get('invoice_no', '')
            if inv_no in gstr2a_index:
                gstr_inv = gstr2a_index[inv_no]
                
                # Check for mismatches
                book_value = float(purchase.get('taxable_value', 0))
                gstr_value = float(gstr_inv.get('taxable_value', 0))
                
                if abs(book_value - gstr_value) > 1:  # Allow ₹1 rounding
                    amount_mismatch.append({
                        'invoice_no': inv_no,
                        'vendor': purchase.get('vendor_name', ''),
                        'book_value': book_value,
                        'gstr_value': gstr_value,
                        'difference': book_value - gstr_value,
                        'action': 'Verify invoice and update records'
                    })
                else:
                    matched.append({
                        'invoice_no': inv_no,
                        'vendor': purchase.get('vendor_name', ''),
                        'value': book_value,
                        'tax': float(purchase.get('tax_amount', 0))
                    })
            else:
                missing_in_2a.append({
                    'invoice_no': inv_no,
                    'vendor': purchase.get('vendor_name', ''),
                    'vendor_gstin': purchase.get('vendor_gstin', ''),
                    'value': float(purchase.get('taxable_value', 0)),
                    'tax': float(purchase.get('tax_amount', 0)),
                    'action': 'Vendor has not filed. Follow up or claim provisional ITC (5%)'
                })
        
        # Check 2A invoices not in books
        for gstr_inv in gstr2a_data:
            inv_no = gstr_inv.get('invoice_no', '')
            if inv_no not in purchase_index:
                missing_in_books.append({
                    'invoice_no': inv_no,
                    'vendor': gstr_inv.get('vendor_name', ''),
                    'value': float(gstr_inv.get('taxable_value', 0)),
                    'action': 'Invoice in 2A but not in books. Verify if purchase was made'
                })
        
        # Calculate summary
        total_matched = sum(m['value'] for m in matched)
        total_missing_2a = sum(m['value'] for m in missing_in_2a)
        
        match_percentage = (total_matched / (total_matched + total_missing_2a) * 100) if (total_matched + total_missing_2a) > 0 else 100
        
        return {
            'summary': {
                'total_invoices_in_books': len(purchase_register),
                'total_invoices_in_2a': len(gstr2a_data),
                'matched_count': len(matched),
                'matched_value': total_matched,
                'missing_in_2a_count': len(missing_in_2a),
                'missing_in_2a_value': total_missing_2a,
                'missing_in_books_count': len(missing_in_books),
                'amount_mismatch_count': len(amount_mismatch),
                'match_percentage': round(match_percentage, 2)
            },
            'matched': matched,
            'missing_in_2a': missing_in_2a,
            'missing_in_books': missing_in_books,
            'amount_mismatch': amount_mismatch,
            'recommendations': GSTR2AReconciler._get_recommendations(missing_in_2a, amount_mismatch)
        }
    
    @staticmethod
    def _get_recommendations(missing: List, mismatches: List) -> List[str]:
        """Generate actionable recommendations"""
        recs = []
        
        if missing:
            total_missing = sum(m['value'] for m in missing)
            recs.append(f"₹{total_missing:,.0f} ITC at risk - {len(missing)} vendors haven't filed. Send reminders.")
            
            # Provisional ITC suggestion
            provisional = total_missing * 0.05
            recs.append(f"You can claim provisional ITC of ₹{provisional:,.0f} (5% of unmatched)")
        
        if mismatches:
            recs.append(f"{len(mismatches)} invoices have amount mismatches. Reconcile with vendors.")
        
        if not missing and not mismatches:
            recs.append("All purchases reconciled. Good compliance!")
        
        return recs


class GSTR3BGenerator:
    """Generate GSTR-3B return data"""
    
    @staticmethod
    def generate(
        gstin: str,
        period: str,  # MMYYYY
        sales_data: Dict,
        purchase_data: Dict,
        gst_calculation: Dict
    ) -> Dict[str, Any]:
        """Generate GSTR-3B format data"""
        
        output = gst_calculation['output_tax']
        itc = gst_calculation['input_tax_credit']
        net = gst_calculation['net_payable']
        
        return {
            'gstin': gstin,
            'ret_period': period,
            'sup_details': {
                # 3.1 - Outward Supplies
                'osup_det': {
                    'txval': output['taxable_value'],
                    'camt': output['cgst'],
                    'samt': output['sgst'],
                    'iamt': output['igst'],
                    'csamt': output.get('cess', 0)
                },
                # 3.1.1 - Supplies to UIN holders
                'osup_nongst': {
                    'txval': 0, 'camt': 0, 'samt': 0, 'iamt': 0
                }
            },
            'itc_elg': {
                # 4 - Input Tax Credit
                'itc_avl': [{
                    'ty': 'IMPG',  # Import of goods
                    'iamt': 0, 'camt': 0, 'samt': 0, 'csamt': 0
                }, {
                    'ty': 'ISRC',  # Inward supplies from registered
                    'iamt': itc['igst'],
                    'camt': itc['cgst'],
                    'samt': itc['sgst'],
                    'csamt': 0
                }],
                'itc_rev': [{
                    'ty': 'RUL',  # As per rules
                    'iamt': itc.get('reversed_itc', 0) / 2,
                    'camt': itc.get('reversed_itc', 0) / 4,
                    'samt': itc.get('reversed_itc', 0) / 4
                }],
                'itc_net': {
                    'iamt': itc['igst'],
                    'camt': itc['cgst'],
                    'samt': itc['sgst']
                },
                'itc_inelg': [{
                    'ty': 'RUL',
                    'iamt': itc.get('blocked_itc', 0)
                }]
            },
            'inward_sup': {
                # 3.2 - Inward supplies
                'isup_details': [{
                    'ty': 'GST',
                    'intra': float(purchase_data.get('intrastate_purchases', 0)),
                    'inter': float(purchase_data.get('interstate_purchases', 0))
                }]
            },
            'intr_ltfee': {
                # 5.1 - Interest and late fee
                'intr_details': {
                    'iamt': 0, 'camt': 0, 'samt': 0, 'csamt': 0
                }
            },
            'tax_pmt': {
                # 6 - Tax Payment
                'tx': [{
                    'tx_type': 'CGST',
                    'tx_amt': net['cgst']
                }, {
                    'tx_type': 'SGST',
                    'tx_amt': net['sgst']
                }, {
                    'tx_type': 'IGST',
                    'tx_amt': net['igst']
                }]
            }
        }


class GSTR1Generator:
    """Generate GSTR-1 return data"""
    
    @staticmethod
    def generate(
        gstin: str,
        period: str,
        sales_register: List[Dict]
    ) -> Dict[str, Any]:
        """Generate GSTR-1 JSON format"""
        
        b2b = []  # B2B invoices
        b2cl = []  # B2C Large (> ₹2.5L interstate)
        b2cs = []  # B2C Small
        hsn_summary = {}
        
        for invoice in sales_register:
            customer_gstin = invoice.get('customer_gstin', '')
            value = float(invoice.get('invoice_value', 0))
            taxable = float(invoice.get('taxable_value', 0))
            rate = float(invoice.get('gst_rate', 18))
            hsn = invoice.get('hsn_code', '9983')
            
            tax = taxable * rate / 100
            
            if customer_gstin:  # B2B
                b2b.append({
                    'ctin': customer_gstin,
                    'inv': [{
                        'inum': invoice.get('invoice_no', ''),
                        'idt': invoice.get('invoice_date', ''),
                        'val': value,
                        'pos': invoice.get('place_of_supply', ''),
                        'rchrg': 'N',
                        'itms': [{
                            'num': 1,
                            'itm_det': {
                                'rt': rate,
                                'txval': taxable,
                                'iamt': tax if invoice.get('is_interstate') else 0,
                                'camt': tax/2 if not invoice.get('is_interstate') else 0,
                                'samt': tax/2 if not invoice.get('is_interstate') else 0
                            }
                        }]
                    }]
                })
            elif value > 250000 and invoice.get('is_interstate'):  # B2C Large
                b2cl.append({
                    'pos': invoice.get('place_of_supply', ''),
                    'inv': [{
                        'inum': invoice.get('invoice_no', ''),
                        'idt': invoice.get('invoice_date', ''),
                        'val': value,
                        'itms': [{
                            'num': 1,
                            'itm_det': {
                                'rt': rate,
                                'txval': taxable,
                                'iamt': tax
                            }
                        }]
                    }]
                })
            else:  # B2C Small - aggregate
                key = f"{invoice.get('place_of_supply', '')}_{rate}"
                if key not in b2cs:
                    b2cs.append({
                        'pos': invoice.get('place_of_supply', ''),
                        'rt': rate,
                        'typ': 'OE',
                        'txval': 0,
                        'iamt': 0,
                        'camt': 0,
                        'samt': 0
                    })
                # Find and update
                for item in b2cs:
                    if item['pos'] == invoice.get('place_of_supply', '') and item['rt'] == rate:
                        item['txval'] += taxable
                        if invoice.get('is_interstate'):
                            item['iamt'] += tax
                        else:
                            item['camt'] += tax/2
                            item['samt'] += tax/2
            
            # HSN Summary
            if hsn not in hsn_summary:
                hsn_summary[hsn] = {
                    'hsn_sc': hsn,
                    'desc': invoice.get('description', 'Goods/Services'),
                    'uqc': 'NOS',
                    'qty': 0,
                    'val': 0,
                    'txval': 0,
                    'iamt': 0,
                    'camt': 0,
                    'samt': 0
                }
            hsn_summary[hsn]['qty'] += float(invoice.get('quantity', 1))
            hsn_summary[hsn]['val'] += value
            hsn_summary[hsn]['txval'] += taxable
            if invoice.get('is_interstate'):
                hsn_summary[hsn]['iamt'] += tax
            else:
                hsn_summary[hsn]['camt'] += tax/2
                hsn_summary[hsn]['samt'] += tax/2
        
        return {
            'gstin': gstin,
            'fp': period,
            'b2b': b2b,
            'b2cl': b2cl,
            'b2cs': b2cs,
            'hsn': {
                'data': list(hsn_summary.values())
            },
            'doc_issue': {
                'doc_det': [{
                    'doc_num': 1,
                    'docs': [{
                        'from': sales_register[0].get('invoice_no', '') if sales_register else '',
                        'to': sales_register[-1].get('invoice_no', '') if sales_register else '',
                        'totnum': len(sales_register),
                        'cancel': 0,
                        'net_issue': len(sales_register)
                    }]
                }]
            } if sales_register else {}
        }


class GSTReportGenerator:
    """Generate GST reports and PDFs"""
    
    @staticmethod
    def generate_summary(
        gstin: str,
        business_name: str,
        period: str,
        gst_calculation: Dict,
        reconciliation: Dict
    ) -> Dict[str, Any]:
        """Generate complete GST filing summary"""
        
        output = gst_calculation['output_tax']
        itc = gst_calculation['input_tax_credit']
        net = gst_calculation['net_payable']
        recon = reconciliation.get('summary', {})
        
        return {
            'header': {
                'gstin': gstin,
                'business_name': business_name,
                'return_period': period,
                'generated_at': datetime.now(timezone.utc).isoformat()
            },
            'sales_summary': {
                'total_taxable_value': output['taxable_value'],
                'cgst': output['cgst'],
                'sgst': output['sgst'],
                'igst': output['igst'],
                'cess': output.get('cess', 0),
                'total_tax': output['total_tax'],
                'rate_breakdown': output.get('rate_breakdown', {})
            },
            'itc_summary': {
                'total_itc_available': itc['total_itc'],
                'blocked_itc': itc['blocked_itc'],
                'reversed_itc': itc['reversed_itc'],
                'eligible_itc': itc['eligible_itc'],
                'cgst': itc['cgst'],
                'sgst': itc['sgst'],
                'igst': itc['igst']
            },
            'reconciliation_summary': {
                'match_percentage': recon.get('match_percentage', 100),
                'matched_invoices': recon.get('matched_count', 0),
                'missing_in_2a': recon.get('missing_in_2a_count', 0),
                'missing_value': recon.get('missing_in_2a_value', 0),
                'action_required': recon.get('missing_in_2a_count', 0) > 0
            },
            'payment_summary': {
                'cgst_payable': net['cgst'],
                'sgst_payable': net['sgst'],
                'igst_payable': net['igst'],
                'cess_payable': net.get('cess', 0),
                'total_payable': net['total'],
                'due_date': GSTReportGenerator._get_due_date(period)
            },
            'recommendations': reconciliation.get('recommendations', [])
        }
    
    @staticmethod
    def _get_due_date(period: str) -> str:
        """Get GST filing due date (20th of next month)"""
        try:
            month = int(period[:2])
            year = int(period[2:])
            if month == 12:
                return f"20-01-{year + 1}"
            else:
                return f"20-{month + 1:02d}-{year}"
        except:
            return "20th of next month"
