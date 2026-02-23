"""
GST Orchestrator - CA-Level GST Filing System

Handles the complete GST flow:
1. Profile validation (GSTIN, registration)
2. GSTR-1 entry + validation
3. GSTR-3B auto-summary
4. Reconciliation
5. Preview + Export

GOLDEN RULES:
- Never let users file a return unless numbers reconcile
- Never auto-submit to GSTN
- GSTR-3B outward value MUST match GSTR-1 total
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
from .profile.gst_profile import GSTProfile
from .validators.gst_validator import GSTValidator
from .gstr1.invoice_manager import InvoiceManager
from .gstr3b.return_generator import GSTR3BGenerator


class GSTOrchestrator:
    """Main orchestrator for GST filing operations"""
    
    # GST State Machine States
    STATES = {
        'PROFILE_INCOMPLETE': 'profile_incomplete',
        'PROFILE_COMPLETE': 'profile_complete',
        'GSTR1_EDITING': 'gstr1_editing',
        'GSTR1_VALIDATED': 'gstr1_validated',
        'GSTR3B_DRAFT': 'gstr3b_draft',
        'GSTR3B_VALIDATED': 'gstr3b_validated',
        'READY_TO_EXPORT': 'ready_to_export',
        'EXPORTED': 'exported'
    }
    
    # Error codes
    ERROR_CODES = {
        'INVALID_GSTIN': 'GSTIN format is invalid',
        'PERIOD_CLOSED': 'Filing period is closed',
        'INVOICE_DUPLICATE': 'Duplicate invoice found',
        'VALUE_MISMATCH': 'Tax values do not match',
        'TAX_NEGATIVE': 'Tax cannot be negative',
        'GSTR1_NOT_VALIDATED': 'GSTR-1 must be validated first',
        'GSTR3B_MISMATCH': 'GSTR-3B totals do not match GSTR-1'
    }
    
    @staticmethod
    def validate_profile(profile_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate GST profile completeness
        
        Returns:
            {
                "valid": bool,
                "errors": list,
                "profile_complete": bool
            }
        """
        errors = GSTProfile.validate_profile(profile_data)
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "profile_complete": len(errors) == 0,
            "state": GSTOrchestrator.STATES['PROFILE_COMPLETE'] if len(errors) == 0 else GSTOrchestrator.STATES['PROFILE_INCOMPLETE']
        }
    
    @staticmethod
    def add_invoice(invoice_data: Dict[str, Any], existing_invoices: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Add and validate a new invoice for GSTR-1
        
        Returns:
            {
                "valid": bool,
                "errors": list,
                "invoice": dict (if valid),
                "category": str (B2B/B2C_LARGE/B2C_SMALL)
            }
        """
        # Determine supply type for validation
        supply_type = InvoiceManager.categorize_invoice(invoice_data)
        
        # Validate invoice
        errors = GSTValidator.validate_invoice(invoice_data, supply_type)
        
        # Check for duplicates
        if GSTValidator.check_duplicate_invoice(
            invoice_data.get('invoice_number', ''),
            invoice_data.get('gstin', ''),
            invoice_data.get('period', ''),
            existing_invoices
        ):
            errors.append({
                "code": "INVOICE_DUPLICATE",
                "severity": "BLOCKER",
                "message": f"Invoice {invoice_data.get('invoice_number')} already exists for this period"
            })
        
        if errors:
            return {
                "valid": False,
                "errors": errors,
                "invoice": None,
                "category": supply_type
            }
        
        # Calculate total value if not provided
        taxable = invoice_data.get('taxable_value', 0)
        cgst = invoice_data.get('cgst', 0)
        sgst = invoice_data.get('sgst', 0)
        igst = invoice_data.get('igst', 0)
        cess = invoice_data.get('cess', 0)
        
        if not invoice_data.get('total_value'):
            invoice_data['total_value'] = taxable + cgst + sgst + igst + cess
        
        invoice_data['invoice_type'] = supply_type
        
        return {
            "valid": True,
            "errors": [],
            "invoice": invoice_data,
            "category": supply_type
        }
    
    @staticmethod
    def validate_gstr1(invoices: List[Dict[str, Any]], gstin: str, period: str, is_nil: bool = False) -> Dict[str, Any]:
        """
        Validate complete GSTR-1
        
        Rules:
        - At least one sale OR explicit nil return
        - All invoices valid
        - Totals computed correctly
        
        Returns:
            {
                "valid": bool,
                "errors": list,
                "warnings": list,
                "totals": dict,
                "summary": dict
            }
        """
        errors = []
        warnings = []
        
        # Check if nil return is explicitly declared
        if not invoices and not is_nil:
            errors.append({
                "code": "NO_SALES_NO_NIL",
                "severity": "BLOCKER",
                "message": "No invoices entered. Declare as NIL return if no sales."
            })
        
        # Validate each invoice
        all_invoice_errors = []
        for idx, invoice in enumerate(invoices):
            inv_errors = GSTValidator.validate_invoice(invoice, invoice.get('invoice_type', 'B2B'))
            if inv_errors:
                for err in inv_errors:
                    err['invoice_number'] = invoice.get('invoice_number', f'Invoice #{idx+1}')
                    all_invoice_errors.append(err)
        
        if all_invoice_errors:
            errors.extend(all_invoice_errors)
        
        # Calculate totals
        totals = InvoiceManager.calculate_gstr1_totals(invoices)
        
        # Categorize invoices
        b2b_count = sum(1 for inv in invoices if inv.get('invoice_type') == 'B2B')
        b2c_large_count = sum(1 for inv in invoices if inv.get('invoice_type') == 'B2C_LARGE')
        b2c_small_count = sum(1 for inv in invoices if inv.get('invoice_type') == 'B2C_SMALL')
        
        summary = {
            "total_invoices": len(invoices),
            "b2b_invoices": b2b_count,
            "b2c_large_invoices": b2c_large_count,
            "b2c_small_invoices": b2c_small_count,
            "is_nil": is_nil and len(invoices) == 0,
            "totals": totals
        }
        
        # Warnings for common issues
        if totals['total_taxable_value'] > 10000000:  # 1 crore
            warnings.append({
                "code": "HIGH_VALUE_RETURN",
                "message": "High value return detected. Please double-check all entries."
            })
        
        return {
            "valid": len([e for e in errors if e.get('severity') == 'BLOCKER']) == 0,
            "errors": errors,
            "warnings": warnings,
            "totals": totals,
            "summary": summary,
            "state": GSTOrchestrator.STATES['GSTR1_VALIDATED'] if len(errors) == 0 else GSTOrchestrator.STATES['GSTR1_EDITING']
        }
    
    @staticmethod
    def generate_gstr3b(gstr1_totals: Dict[str, float], itc_data: Optional[Dict[str, float]] = None, gstr1_validated: bool = False) -> Dict[str, Any]:
        """
        Generate GSTR-3B from validated GSTR-1
        
        CRITICAL: GSTR-1 MUST be validated first
        
        Returns:
            {
                "valid": bool,
                "errors": list,
                "gstr3b": dict,
                "tax_payable": dict
            }
        """
        errors = []
        
        # CRITICAL CHECK: GSTR-1 must be validated
        if not gstr1_validated:
            errors.append({
                "code": "GSTR1_NOT_VALIDATED",
                "severity": "BLOCKER",
                "message": "GSTR-1 must be validated before preparing GSTR-3B"
            })
            return {
                "valid": False,
                "errors": errors,
                "gstr3b": None,
                "tax_payable": None
            }
        
        # Generate GSTR-3B
        gstr3b = GSTR3BGenerator.generate_from_gstr1(gstr1_totals, itc_data)
        
        return {
            "valid": True,
            "errors": [],
            "gstr3b": gstr3b,
            "tax_payable": {
                "cgst": gstr3b['section_5']['cgst_payable'],
                "sgst": gstr3b['section_5']['sgst_payable'],
                "igst": gstr3b['section_5']['igst_payable'],
                "total": gstr3b['section_5']['total_payable']
            },
            "state": GSTOrchestrator.STATES['GSTR3B_DRAFT']
        }
    
    @staticmethod
    def validate_gstr3b(gstr3b_data: Dict[str, Any], gstr1_totals: Dict[str, float]) -> Dict[str, Any]:
        """
        Validate GSTR-3B against GSTR-1
        
        GOLDEN RULE: GSTR-3B outward taxable supplies MUST match GSTR-1 total
        
        Returns:
            {
                "valid": bool,
                "errors": list,
                "reconciled": bool
            }
        """
        errors = []
        
        # Get outward taxable from GSTR-3B
        gstr3b_outward = gstr3b_data.get('outward_taxable_supplies', 0)
        if isinstance(gstr3b_data.get('section_3_1'), dict):
            gstr3b_outward = gstr3b_data['section_3_1'].get('outward_taxable_supplies', 0)
        
        # Get total from GSTR-1
        gstr1_taxable = gstr1_totals.get('total_taxable_value', 0)
        
        # Reconciliation check
        reconciliation_errors = GSTValidator.reconcile_gstr1_gstr3b(gstr1_totals, {'outward_taxable_supplies': gstr3b_outward})
        
        if reconciliation_errors:
            errors.extend(reconciliation_errors)
        
        # Tax payable validation
        tax_payable = (
            gstr3b_data.get('cgst_payable', 0) +
            gstr3b_data.get('sgst_payable', 0) +
            gstr3b_data.get('igst_payable', 0)
        )
        
        if tax_payable < 0:
            errors.append({
                "code": "TAX_NEGATIVE",
                "severity": "BLOCKER",
                "message": "Net tax payable cannot be negative"
            })
        
        return {
            "valid": len(errors) == 0,
            "errors": errors,
            "reconciled": len(errors) == 0,
            "state": GSTOrchestrator.STATES['GSTR3B_VALIDATED'] if len(errors) == 0 else GSTOrchestrator.STATES['GSTR3B_DRAFT']
        }
    
    @staticmethod
    def prepare_preview(gstr1_summary: Dict[str, Any], gstr3b_data: Dict[str, Any], late_fee: float = 0, interest: float = 0) -> Dict[str, Any]:
        """
        Prepare preview for user confirmation
        
        Returns complete summary before export
        """
        return {
            "gstr1_summary": gstr1_summary,
            "gstr3b_summary": {
                "outward_taxable_supplies": gstr3b_data.get('section_3_1', {}).get('outward_taxable_supplies', 0),
                "outward_tax_liability": gstr3b_data.get('section_3_1', {}).get('outward_tax_liability', 0),
                "itc_available": gstr3b_data.get('section_4', {}).get('itc_available', 0),
                "itc_reversed": gstr3b_data.get('section_4', {}).get('itc_reversed', 0),
                "net_itc": gstr3b_data.get('section_4', {}).get('net_itc', 0),
                "cgst_payable": gstr3b_data.get('section_5', {}).get('cgst_payable', 0),
                "sgst_payable": gstr3b_data.get('section_5', {}).get('sgst_payable', 0),
                "igst_payable": gstr3b_data.get('section_5', {}).get('igst_payable', 0),
                "total_payable": gstr3b_data.get('section_5', {}).get('total_payable', 0)
            },
            "late_fee": late_fee,
            "interest": interest,
            "total_amount_due": gstr3b_data.get('section_5', {}).get('total_payable', 0) + late_fee + interest,
            "state": GSTOrchestrator.STATES['READY_TO_EXPORT']
        }
    
    @staticmethod
    def export_json(gstr1_invoices: List[Dict[str, Any]], gstr3b_data: Dict[str, Any], gstin: str, period: str) -> Dict[str, Any]:
        """
        Generate JSON/Excel for manual upload to GST portal
        
        Returns:
            {
                "gstr1_json": dict,
                "gstr3b_json": dict
            }
        """
        # GSTR-1 JSON structure
        gstr1_json = {
            "gstin": gstin,
            "fp": period.replace('-', ''),  # Format: MMYYYY
            "b2b": [],
            "b2cl": [],
            "b2cs": []
        }
        
        for invoice in gstr1_invoices:
            inv_type = invoice.get('invoice_type', 'B2B')
            
            inv_entry = {
                "inum": invoice.get('invoice_number'),
                "idt": invoice.get('invoice_date'),
                "val": invoice.get('total_value', 0),
                "pos": invoice.get('place_of_supply', gstin[:2]),
                "txval": invoice.get('taxable_value', 0),
                "rt": invoice.get('gst_rate', 18),
                "camt": invoice.get('cgst', 0),
                "samt": invoice.get('sgst', 0),
                "iamt": invoice.get('igst', 0)
            }
            
            if inv_type == 'B2B':
                inv_entry['ctin'] = invoice.get('recipient_gstin')
                gstr1_json['b2b'].append(inv_entry)
            elif inv_type == 'B2C_LARGE':
                gstr1_json['b2cl'].append(inv_entry)
            else:
                gstr1_json['b2cs'].append(inv_entry)
        
        # GSTR-3B JSON structure
        gstr3b_json = {
            "gstin": gstin,
            "ret_period": period.replace('-', ''),
            "sup_details": {
                "osup_det": {
                    "txval": gstr3b_data.get('section_3_1', {}).get('outward_taxable_supplies', 0),
                    "camt": gstr3b_data.get('section_5', {}).get('cgst_payable', 0),
                    "samt": gstr3b_data.get('section_5', {}).get('sgst_payable', 0),
                    "iamt": gstr3b_data.get('section_5', {}).get('igst_payable', 0)
                }
            },
            "itc_elg": {
                "itc_avl": gstr3b_data.get('section_4', {}).get('itc_available', 0),
                "itc_rev": gstr3b_data.get('section_4', {}).get('itc_reversed', 0),
                "itc_net": gstr3b_data.get('section_4', {}).get('net_itc', 0)
            }
        }
        
        return {
            "gstr1_json": gstr1_json,
            "gstr3b_json": gstr3b_json,
            "state": GSTOrchestrator.STATES['EXPORTED']
        }
    
    @staticmethod
    def validate_complete_return(
        profile_data: Dict[str, Any],
        period: str,
        gstr1_filing: Optional[Dict[str, Any]],
        gstr3b_filing: Optional[Dict[str, Any]],
        invoices: List[Dict[str, Any]],
        filed_periods: List[str] = None
    ) -> Dict[str, Any]:
        """
        COMPREHENSIVE GST RETURN VALIDATION
        
        This is the SINGLE function that checks EVERYTHING before filing:
        - Profile checks (GSTIN, registration, filing frequency)
        - Period checks (not filed, within timeline)
        - GSTR-1 checks (validated, invoices valid, no duplicates)
        - GSTR-3B checks (generated, tax >= 0)
        - Cross-return reconciliation (GSTR-1 totals = GSTR-3B outward)
        
        Returns:
            {
                "valid": bool,
                "errors": list,
                "warnings": list,
                "sections_status": dict,
                "can_file": bool
            }
        """
        errors = []
        warnings = []
        sections_status = {
            "profile": {"valid": False, "message": ""},
            "period": {"valid": False, "message": ""},
            "gstr1": {"valid": False, "message": ""},
            "gstr3b": {"valid": False, "message": ""},
            "reconciliation": {"valid": False, "message": ""}
        }
        
        # ========== A. PROFILE CHECKS ==========
        profile_errors = []
        
        # A1. GSTIN present & valid
        gstin = profile_data.get('gstin', '')
        if not gstin:
            profile_errors.append({
                "code": "PROFILE_NO_GSTIN",
                "section": "Profile",
                "severity": "BLOCKER",
                "message": "GSTIN is required",
                "fix_hint": "Add GSTIN in GST Profile"
            })
        elif len(gstin) != 15:
            profile_errors.append({
                "code": "INVALID_GSTIN_FORMAT",
                "section": "Profile",
                "severity": "BLOCKER",
                "message": "GSTIN must be exactly 15 characters",
                "fix_hint": "Check GSTIN format"
            })
        
        # A2. Registration type selected
        if not profile_data.get('registration_type'):
            profile_errors.append({
                "code": "PROFILE_NO_REG_TYPE",
                "section": "Profile",
                "severity": "BLOCKER",
                "message": "Registration type is required",
                "fix_hint": "Select Regular, Composition, or QRMP"
            })
        
        # A3. Filing frequency correct
        if not profile_data.get('filing_frequency'):
            profile_errors.append({
                "code": "PROFILE_NO_FREQUENCY",
                "section": "Profile",
                "severity": "BLOCKER",
                "message": "Filing frequency is required",
                "fix_hint": "Select Monthly or Quarterly"
            })
        
        # A4. State code present
        if not profile_data.get('state_code'):
            profile_errors.append({
                "code": "PROFILE_NO_STATE",
                "section": "Profile",
                "severity": "BLOCKER",
                "message": "State code is required",
                "fix_hint": "State is auto-filled from GSTIN"
            })
        
        # A5. Legal name present
        if not profile_data.get('legal_name'):
            profile_errors.append({
                "code": "PROFILE_NO_LEGAL_NAME",
                "section": "Profile",
                "severity": "BLOCKER",
                "message": "Legal name is required",
                "fix_hint": "Enter legal name as per GST registration"
            })
        
        if profile_errors:
            errors.extend(profile_errors)
            sections_status["profile"] = {"valid": False, "message": f"{len(profile_errors)} profile errors"}
        else:
            sections_status["profile"] = {"valid": True, "message": "Profile complete"}
        
        # ========== B. PERIOD CHECKS ==========
        period_errors = []
        
        # B1. Period selected
        if not period:
            period_errors.append({
                "code": "NO_PERIOD_SELECTED",
                "section": "Period",
                "severity": "BLOCKER",
                "message": "Filing period must be selected",
                "fix_hint": "Select a period (MM-YYYY)"
            })
        else:
            # B2. Period not already filed
            if filed_periods and period in filed_periods:
                period_errors.append({
                    "code": "PERIOD_ALREADY_FILED",
                    "section": "Period",
                    "severity": "BLOCKER",
                    "message": f"Period {period} has already been filed",
                    "fix_hint": "Select a different period or file amendment"
                })
            
            # B3. Period within allowed timeline (not too old, not future)
            try:
                period_parts = period.split('-')
                if len(period_parts) == 2:
                    month, year = int(period_parts[0]), int(period_parts[1])
                    period_date = datetime(year, month, 1)
                    now = datetime.now()
                    
                    # Cannot file for future periods
                    if period_date > now:
                        period_errors.append({
                            "code": "FUTURE_PERIOD",
                            "section": "Period",
                            "severity": "BLOCKER",
                            "message": "Cannot file return for future period",
                            "fix_hint": "Select current or past period"
                        })
                    
                    # Warning for very old periods (more than 12 months)
                    months_diff = (now.year - year) * 12 + (now.month - month)
                    if months_diff > 12:
                        warnings.append({
                            "code": "OLD_PERIOD_WARNING",
                            "section": "Period",
                            "message": "Filing for period more than 12 months old. Late fees may apply."
                        })
            except Exception:
                period_errors.append({
                    "code": "INVALID_PERIOD_FORMAT",
                    "section": "Period",
                    "severity": "BLOCKER",
                    "message": "Invalid period format",
                    "fix_hint": "Use format MM-YYYY"
                })
        
        if period_errors:
            errors.extend(period_errors)
            sections_status["period"] = {"valid": False, "message": f"{len(period_errors)} period errors"}
        else:
            sections_status["period"] = {"valid": True, "message": f"Period {period} valid"}
        
        # ========== C. GSTR-1 CHECKS ==========
        gstr1_errors = []
        
        # C1. GSTR-1 exists and is validated
        if not gstr1_filing:
            gstr1_errors.append({
                "code": "GSTR1_NOT_FOUND",
                "section": "GSTR-1",
                "severity": "BLOCKER",
                "message": "GSTR-1 has not been prepared for this period",
                "fix_hint": "Add invoices and validate GSTR-1"
            })
        else:
            gstr1_status = gstr1_filing.get('status', 'draft')
            
            if gstr1_status != 'validated' and gstr1_status != 'exported':
                gstr1_errors.append({
                    "code": "GSTR1_NOT_VALIDATED",
                    "section": "GSTR-1",
                    "severity": "BLOCKER",
                    "message": "GSTR-1 must be validated before filing",
                    "fix_hint": "Click 'Validate GSTR-1' button"
                })
            
            # C2. Either at least one valid invoice OR explicit Nil declaration
            is_nil = gstr1_filing.get('is_nil', False)
            invoice_count = gstr1_filing.get('invoice_count', len(invoices))
            
            if invoice_count == 0 and not is_nil:
                gstr1_errors.append({
                    "code": "GSTR1_NO_INVOICES_NO_NIL",
                    "section": "GSTR-1",
                    "severity": "BLOCKER",
                    "message": "No invoices found. Declare as NIL return if no sales.",
                    "fix_hint": "Add invoices or check 'NIL Return' checkbox"
                })
            
            # C3. Verify tax calculations are correct
            total_taxable = gstr1_filing.get('total_taxable_value', 0)
            total_cgst = gstr1_filing.get('total_cgst', 0)
            total_sgst = gstr1_filing.get('total_sgst', 0)
            total_igst = gstr1_filing.get('total_igst', 0)
            
            # Check for negative values
            if total_taxable < 0 or total_cgst < 0 or total_sgst < 0 or total_igst < 0:
                gstr1_errors.append({
                    "code": "GSTR1_NEGATIVE_VALUES",
                    "section": "GSTR-1",
                    "severity": "BLOCKER",
                    "message": "GSTR-1 contains negative tax values",
                    "fix_hint": "Review invoices and credit notes"
                })
        
        # C4. Check for duplicate invoices in the list
        if invoices:
            seen_invoices = set()
            for inv in invoices:
                inv_key = f"{inv.get('invoice_number', '')}_{inv.get('recipient_gstin', '')}"
                if inv_key in seen_invoices:
                    gstr1_errors.append({
                        "code": "INVOICE_DUPLICATE",
                        "section": "GSTR-1",
                        "severity": "BLOCKER",
                        "message": f"Duplicate invoice: {inv.get('invoice_number')}",
                        "fix_hint": "Remove duplicate invoice"
                    })
                seen_invoices.add(inv_key)
        
        if gstr1_errors:
            errors.extend(gstr1_errors)
            sections_status["gstr1"] = {"valid": False, "message": f"{len(gstr1_errors)} GSTR-1 errors"}
        else:
            sections_status["gstr1"] = {"valid": True, "message": "GSTR-1 validated"}
        
        # ========== D. GSTR-3B CHECKS ==========
        gstr3b_errors = []
        
        # D1. GSTR-3B generated
        if not gstr3b_filing:
            gstr3b_errors.append({
                "code": "GSTR3B_NOT_FOUND",
                "section": "GSTR-3B",
                "severity": "BLOCKER",
                "message": "GSTR-3B has not been prepared for this period",
                "fix_hint": "Generate GSTR-3B from GSTR-1"
            })
        else:
            gstr3b_status = gstr3b_filing.get('status', 'draft')
            
            if gstr3b_status != 'validated' and gstr3b_status != 'exported':
                gstr3b_errors.append({
                    "code": "GSTR3B_NOT_VALIDATED",
                    "section": "GSTR-3B",
                    "severity": "BLOCKER",
                    "message": "GSTR-3B must be validated before filing",
                    "fix_hint": "Click 'Validate GSTR-3B' button"
                })
            
            # D2. Tax payable >= 0
            total_payable = gstr3b_filing.get('total_tax_payable', 0)
            if total_payable < 0:
                gstr3b_errors.append({
                    "code": "GSTR3B_NEGATIVE_TAX",
                    "section": "GSTR-3B",
                    "severity": "BLOCKER",
                    "message": "Net tax payable cannot be negative",
                    "fix_hint": "Review ITC claims"
                })
            
            # D3. ITC not exceeding reasonable limits (warning)
            itc_available = gstr3b_filing.get('itc_available', 0)
            outward_tax = gstr3b_filing.get('outward_tax_liability', 0)
            if itc_available > outward_tax * 2 and outward_tax > 0:
                warnings.append({
                    "code": "HIGH_ITC_WARNING",
                    "section": "GSTR-3B",
                    "message": "ITC claimed is significantly higher than output tax. Please verify."
                })
        
        if gstr3b_errors:
            errors.extend(gstr3b_errors)
            sections_status["gstr3b"] = {"valid": False, "message": f"{len(gstr3b_errors)} GSTR-3B errors"}
        else:
            sections_status["gstr3b"] = {"valid": True, "message": "GSTR-3B validated"}
        
        # ========== E. CROSS-RETURN RECONCILIATION ==========
        recon_errors = []
        
        if gstr1_filing and gstr3b_filing:
            # E1. GSTR-1 totals = GSTR-3B outward supplies (THE GOLDEN RULE)
            gstr1_taxable = gstr1_filing.get('total_taxable_value', 0)
            gstr3b_outward = gstr3b_filing.get('outward_taxable_supplies', 0)
            
            # Allow small tolerance for rounding (0.01%)
            tolerance = max(gstr1_taxable, gstr3b_outward) * 0.0001
            
            if abs(gstr1_taxable - gstr3b_outward) > tolerance:
                recon_errors.append({
                    "code": "GSTR1_GSTR3B_MISMATCH",
                    "section": "Reconciliation",
                    "severity": "BLOCKER",
                    "message": f"GSTR-1 taxable (₹{gstr1_taxable:,.2f}) does not match GSTR-3B outward (₹{gstr3b_outward:,.2f})",
                    "fix_hint": "Re-generate GSTR-3B from GSTR-1"
                })
            
            # E2. CGST/SGST/IGST consistency
            gstr1_cgst = gstr1_filing.get('total_cgst', 0)
            gstr1_sgst = gstr1_filing.get('total_sgst', 0)
            gstr1_igst = gstr1_filing.get('total_igst', 0)
            
            gstr3b_cgst = gstr3b_filing.get('cgst_payable', 0)
            gstr3b_sgst = gstr3b_filing.get('sgst_payable', 0)
            gstr3b_igst = gstr3b_filing.get('igst_payable', 0)
            
            # Note: GSTR-3B tax payable = Output tax - ITC, so direct comparison may not match
            # But output tax should match GSTR-1 tax before ITC
            gstr3b_output_tax = gstr3b_filing.get('outward_tax_liability', 0)
            gstr1_total_tax = gstr1_cgst + gstr1_sgst + gstr1_igst
            
            if abs(gstr1_total_tax - gstr3b_output_tax) > tolerance:
                recon_errors.append({
                    "code": "TAX_LIABILITY_MISMATCH",
                    "section": "Reconciliation",
                    "severity": "BLOCKER",
                    "message": f"GSTR-1 total tax (₹{gstr1_total_tax:,.2f}) does not match GSTR-3B output liability (₹{gstr3b_output_tax:,.2f})",
                    "fix_hint": "Re-generate GSTR-3B from GSTR-1"
                })
        
        if recon_errors:
            errors.extend(recon_errors)
            sections_status["reconciliation"] = {"valid": False, "message": f"{len(recon_errors)} reconciliation errors"}
        elif gstr1_filing and gstr3b_filing:
            sections_status["reconciliation"] = {"valid": True, "message": "GSTR-1 & GSTR-3B reconciled"}
        else:
            sections_status["reconciliation"] = {"valid": False, "message": "Cannot reconcile - missing returns"}
        
        # ========== FINAL RESULT ==========
        blocker_errors = [e for e in errors if e.get('severity') == 'BLOCKER']
        can_file = len(blocker_errors) == 0
        
        return {
            "valid": can_file,
            "errors": errors,
            "warnings": warnings,
            "sections_status": sections_status,
            "can_file": can_file,
            "total_errors": len(errors),
            "total_warnings": len(warnings),
            "summary": {
                "profile_valid": sections_status["profile"]["valid"],
                "period_valid": sections_status["period"]["valid"],
                "gstr1_valid": sections_status["gstr1"]["valid"],
                "gstr3b_valid": sections_status["gstr3b"]["valid"],
                "reconciliation_valid": sections_status["reconciliation"]["valid"]
            }
        }
