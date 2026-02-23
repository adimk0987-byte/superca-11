"""
GST Engine - Production Grade System

Architecture:
1. Profile Management - GSTIN, business details (MANDATORY)
2. GSTR-1 Module - Outward supplies (sales)
3. GSTR-3B Module - Summary return
4. Validation Engine - Reconciliation & error detection
5. Tax Calculator - GST, late fee, interest
6. Generators - JSON/Excel for portal upload

Golden Rules:
- Reconciliation > Automation
- No silent success
- No auto-filing without consent
- Every number must trace to invoices
"""

from .profile.gst_profile import GSTProfile
from .validators.gst_validator import GSTValidator
from .gstr1.invoice_manager import InvoiceManager
from .gstr3b.return_generator import GSTR3BGenerator

__all__ = [
    'GSTProfile',
    'GSTValidator',
    'InvoiceManager',
    'GSTR3BGenerator'
]
