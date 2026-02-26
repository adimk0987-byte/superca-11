"""ITR Filing Engine - Production Grade

Architecture:
1. Data Builder - Clean and structure raw data
2. Decision Engines - ITR type, regime eligibility
3. Error Engine - Detect all issues before calculation
4. Tax Engine - Calculate tax for both regimes
5. Validators - Final validation before output
6. Generators - ITR JSON + PDFs
7. Audit - Store everything for legal protection
"""

from .data_builder.standard_data import StandardDataBuilder
from .decision_engines.itr_type import ITRTypeDecisionEngine
from .decision_engines.regime_eligibility import RegimeEligibilityEngine
from .error_engine.error_detector import ErrorDetector
from .tax_engine.tax_calculator import TaxCalculator
from .tax_engine.regime_comparator import RegimeComparator
from .validators.final_validator import FinalValidator
from .generators.itr_json_generator import ITRJSONGenerator
from .generators.pdf_generator import ITRPDFGenerator
from .ai_processor import AIDocumentProcessor, DataReconciler, ITRFormSelector

__all__ = [
    'StandardDataBuilder',
    'ITRTypeDecisionEngine',
    'RegimeEligibilityEngine',
    'ErrorDetector',
    'TaxCalculator',
    'RegimeComparator',
    'FinalValidator',
    'ITRJSONGenerator',
    'ITRPDFGenerator',
    'AIDocumentProcessor',
    'DataReconciler',
    'ITRFormSelector'
]
