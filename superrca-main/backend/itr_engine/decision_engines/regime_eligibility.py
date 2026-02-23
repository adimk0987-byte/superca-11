"""
Regime Eligibility Engine

Determines if taxpayer can choose new regime or must use old regime.

Forced Old Regime Cases:
- Business income (except presumptive)
- Non-resident
- Not ordinarily resident
"""

from typing import Dict, Any, Tuple


class RegimeEligibilityEngine:
    """Determines tax regime eligibility"""
    
    @staticmethod
    def check_regime_eligibility(standard_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Check which regimes are available
        
        Returns:
            {
                "can_choose_new": bool,
                "can_choose_old": bool,
                "forced_regime": str or None,
                "reasons": list
            }
        """
        income = standard_data.get('income', {})
        personal = standard_data.get('personal', {})
        
        reasons = []
        forced_regime = None
        can_choose_new = True
        can_choose_old = True
        
        # Check for business income (non-presumptive)
        business = income.get('business', {})
        if business.get('turnover', 0) > 0 and not business.get('presumptive', False):
            can_choose_new = False
            forced_regime = 'old'
            reasons.append('Business income (non-presumptive) - must use old regime')
        
        # Check residential status
        res_status = personal.get('residential_status', 'resident')
        if res_status in ['non_resident', 'not_ordinarily_resident']:
            can_choose_new = False
            forced_regime = 'old'
            reasons.append(f'Residential status: {res_status} - must use old regime')
        
        return {
            "can_choose_new": can_choose_new,
            "can_choose_old": can_choose_old,
            "forced_regime": forced_regime,
            "reasons": reasons,
            "recommendation": None  # Will be set after tax calculation
        }
    
    @staticmethod
    def validate_regime_choice(standard_data: Dict[str, Any], chosen_regime: str) -> list:
        """
        Validate if chosen regime is allowed
        
        Returns:
            List of errors
        """
        eligibility = RegimeEligibilityEngine.check_regime_eligibility(standard_data)
        errors = []
        
        if eligibility['forced_regime'] and chosen_regime != eligibility['forced_regime']:
            errors.append({
                "code": "REGIME_NOT_ELIGIBLE",
                "severity": "BLOCKER",
                "message": f"You cannot choose {chosen_regime} regime",
                "fix_hint": f"Reason: {', '.join(eligibility['reasons'])}",
                "field": "regime"
            })
        
        return errors
