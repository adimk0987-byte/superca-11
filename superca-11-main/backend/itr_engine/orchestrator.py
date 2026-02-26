"""
ITR Filing Orchestrator

Orchestrates the entire ITR filing process through all layers.

Flow:
1. Build standard data
2. Decide ITR type
3. Check regime eligibility
4. Detect ALL errors
5. If no blockers → Calculate tax
6. Final validation
7. Generate outputs

This ensures ZERO shortcuts and PRODUCTION-GRADE quality.
"""

from typing import Dict, Any, Tuple
from .data_builder.standard_data import StandardDataBuilder
from .decision_engines.itr_type import ITRTypeDecisionEngine
from .decision_engines.regime_eligibility import RegimeEligibilityEngine
from .error_engine.error_detector import ErrorDetector
from .tax_engine.tax_calculator import TaxCalculator
from .tax_engine.regime_comparator import RegimeComparator
from .validators.final_validator import FinalValidator


class ITROrchestrator:
    """Orchestrates complete ITR filing process"""
    
    @staticmethod
    def process_itr_filing(form16_data: Dict[str, Any], user_preferences: Dict[str, Any] = None) -> Dict[str, Any]:
        """
        Complete ITR filing process
        
        Args:
            form16_data: Raw Form-16 data
            user_preferences: User choices like regime, ITR type
        
        Returns:
            Complete ITR result with errors, calculations, recommendations
        """
        if user_preferences is None:
            user_preferences = {}
        
        result = {
            "success": False,
            "stage": None,
            "errors": [],
            "warnings": [],
            "data": None,
            "calculations": None,
            "recommendations": []
        }
        
        try:
            # ============ LAYER 1: BUILD STANDARD DATA ============
            result["stage"] = "data_building"
            standard_data = StandardDataBuilder.build_from_form16(form16_data)
            result["data"] = standard_data
            
            # ============ LAYER 2: ITR TYPE DECISION ============
            result["stage"] = "itr_type_decision"
            itr_type, itr_reasons = ITRTypeDecisionEngine.decide_itr_type(standard_data)
            
            chosen_itr = user_preferences.get('itr_type', itr_type)
            
            # Validate ITR type
            itr_errors = ITRTypeDecisionEngine.validate_itr_type_eligibility(standard_data, chosen_itr)
            if itr_errors:
                result["errors"].extend(itr_errors)
                return result
            
            result["data"]["itr_type"] = chosen_itr
            result["data"]["itr_decision_reasons"] = itr_reasons
            
            # ============ LAYER 3: REGIME ELIGIBILITY ============
            result["stage"] = "regime_eligibility"
            regime_eligibility = RegimeEligibilityEngine.check_regime_eligibility(standard_data)
            
            # If forced regime, use it
            if regime_eligibility['forced_regime']:
                chosen_regime = regime_eligibility['forced_regime']
            else:
                chosen_regime = user_preferences.get('regime', 'new')
            
            # Validate regime choice
            regime_errors = RegimeEligibilityEngine.validate_regime_choice(standard_data, chosen_regime)
            if regime_errors:
                result["errors"].extend(regime_errors)
                return result
            
            result["data"]["regime"] = chosen_regime
            result["data"]["regime_eligibility"] = regime_eligibility
            
            # ============ LAYER 4: ERROR DETECTION (CRITICAL) ============
            result["stage"] = "error_detection"
            error_detector = ErrorDetector()
            all_errors = error_detector.detect_all_errors(standard_data, chosen_regime)
            
            # Separate blockers and warnings
            blockers = [e for e in all_errors if e['severity'] == 'BLOCKER']
            warnings = [e for e in all_errors if e['severity'] == 'WARNING']
            info = [e for e in all_errors if e['severity'] == 'INFO']
            
            result["errors"] = blockers
            result["warnings"] = warnings
            
            # If blockers exist, STOP here
            if blockers:
                result["stage"] = "blocked"
                result["message"] = f"Found {len(blockers)} blocking errors. Fix them before proceeding."
                return result
            
            # ============ LAYER 5: TAX CALCULATION ============
            result["stage"] = "tax_calculation"
            
            # If user wants comparison, calculate both regimes
            if user_preferences.get('compare_regimes', False) and not regime_eligibility['forced_regime']:
                comparator = RegimeComparator()
                comparison = comparator.compare_regimes(standard_data)
                
                result["calculations"] = {
                    "comparison": comparison,
                    "chosen_regime": chosen_regime,
                    "chosen_calculation": comparison[f"{chosen_regime}_regime"]
                }
                result["recommendations"] = comparison["recommendations"]
            else:
                # Calculate only for chosen regime
                calculator = TaxCalculator()
                tax_calc = calculator.calculate_tax(standard_data, chosen_regime)
                
                result["calculations"] = {
                    "chosen_regime": chosen_regime,
                    "chosen_calculation": tax_calc
                }
            
            # ============ LAYER 6: FINAL VALIDATION ============
            result["stage"] = "final_validation"
            tax_calc = result["calculations"]["chosen_calculation"]
            final_errors = FinalValidator.validate(standard_data, tax_calc)
            
            # Separate blockers from warnings
            blockers = [e for e in final_errors if e.get('severity') == 'BLOCKER']
            warnings = [e for e in final_errors if e.get('severity') != 'BLOCKER']
            
            result["warnings"].extend(warnings)
            
            if blockers:
                result["errors"].extend(blockers)
                result["stage"] = "validation_failed"
                return result
            
            # ============ SUCCESS ============
            result["stage"] = "completed"
            result["success"] = True
            result["message"] = "ITR calculation completed successfully"
            
            # Generate summary recommendations
            if not result["recommendations"]:
                result["recommendations"] = ITROrchestrator._generate_basic_recommendations(
                    standard_data, tax_calc
                )
            
            return result
            
        except Exception as e:
            result["stage"] = "error"
            result["errors"].append({
                "code": "SYSTEM_ERROR",
                "severity": "BLOCKER",
                "message": f"System error: {str(e)}",
                "fix_hint": "Please contact support"
            })
            return result
    
    @staticmethod
    def _generate_basic_recommendations(data: Dict[str, Any], tax_calc: Dict[str, Any]) -> list:
        """Generate basic tax-saving recommendations"""
        recommendations = []
        
        deductions = data.get('deductions', {})
        regime = tax_calc.get('regime', 'new')
        
        if regime == 'old':
            # Section 80C
            sec_80c = deductions.get('section_80c', {}).get('amount', 0)
            if sec_80c < 150000:
                gap = 150000 - sec_80c
                recommendations.append(
                    f"Maximize Section 80C: Invest \u20b9{gap:,.0f} more in PPF/ELSS/Tax-saving FD to save up to \u20b9{gap * 0.3:,.0f} in taxes"
                )
            
            # Section 80D
            sec_80d = deductions.get('section_80d', {}).get('amount', 0)
            if sec_80d == 0:
                recommendations.append(
                    "Get health insurance to claim Section 80D deduction and save up to \u20b97,500 in taxes"
                )
            
            # NPS
            recommendations.append(
                "Consider NPS for additional \u20b950,000 deduction under 80CCD(1B)"
            )
        
        # Home loan
        income = data.get('income', {})
        hp = income.get('house_property', {})
        if hp.get('interest_on_loan', 0) == 0:
            recommendations.append(
                "If you have a home loan, claim interest deduction (up to \u20b92 lakh for self-occupied)"
            )
        
        # Tax payment reminder
        if tax_calc.get('net_tax_payable', 0) > 10000:
            recommendations.append(
                "Pay advance tax quarterly to avoid interest under Section 234B and 234C"
            )
        
        return recommendations[:5]
