"""
GST Profile Management

Mandatory before any GST operations.

Fields:
- GSTIN (15 chars, validated)
- Legal Name
- Trade Name
- State Code
- Registration Type (Regular/Composition/QRMP)
- Registration Date
- Filing Frequency (Monthly/Quarterly)
"""

import re
from typing import Dict, Any, Tuple


class GSTProfile:
    """GST Profile validator and manager"""
    
    STATE_CODES = {
        '01': 'Jammu and Kashmir', '02': 'Himachal Pradesh', '03': 'Punjab',
        '04': 'Chandigarh', '05': 'Uttarakhand', '06': 'Haryana',
        '07': 'Delhi', '08': 'Rajasthan', '09': 'Uttar Pradesh',
        '10': 'Bihar', '11': 'Sikkim', '12': 'Arunachal Pradesh',
        '13': 'Nagaland', '14': 'Manipur', '15': 'Mizoram',
        '16': 'Tripura', '17': 'Meghalaya', '18': 'Assam',
        '19': 'West Bengal', '20': 'Jharkhand', '21': 'Odisha',
        '22': 'Chhattisgarh', '23': 'Madhya Pradesh', '24': 'Gujarat',
        '25': 'Daman and Diu', '26': 'Dadra and Nagar Haveli',
        '27': 'Maharashtra', '28': 'Andhra Pradesh', '29': 'Karnataka',
        '30': 'Goa', '31': 'Lakshadweep', '32': 'Kerala',
        '33': 'Tamil Nadu', '34': 'Puducherry', '35': 'Andaman and Nicobar',
        '36': 'Telangana', '37': 'Andhra Pradesh', '38': 'Ladakh'
    }
    
    @staticmethod
    def validate_gstin(gstin: str) -> Tuple[bool, str]:
        """
        Validate GSTIN format and structure
        
        Returns:
            (is_valid, error_message)
        """
        if not gstin or len(gstin) != 15:
            return False, "GSTIN must be 15 characters"
        
        # Check format: 2 digits + 10 chars PAN + 1 entity + Z + 1 checksum
        pattern = r'^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$'
        if not re.match(pattern, gstin):
            return False, "Invalid GSTIN format"
        
        # Validate state code
        state_code = gstin[:2]
        if state_code not in GSTProfile.STATE_CODES:
            return False, f"Invalid state code: {state_code}"
        
        # Validate PAN checksum (basic)
        pan = gstin[2:12]
        if not re.match(r'^[A-Z]{5}[0-9]{4}[A-Z]$', pan):
            return False, "Invalid PAN in GSTIN"
        
        return True, ""
    
    @staticmethod
    def validate_profile(profile: Dict[str, Any]) -> list:
        """
        Validate complete GST profile
        
        Returns:
            List of errors
        """
        errors = []
        
        # GSTIN validation
        gstin = profile.get('gstin', '')
        is_valid, error_msg = GSTProfile.validate_gstin(gstin)
        if not is_valid:
            errors.append({
                "code": "INVALID_GSTIN",
                "severity": "BLOCKER",
                "field": "gstin",
                "message": error_msg
            })
        
        # Legal name
        if not profile.get('legal_name'):
            errors.append({
                "code": "MISSING_LEGAL_NAME",
                "severity": "BLOCKER",
                "field": "legal_name",
                "message": "Legal name is mandatory (as per GST registration)"
            })
        
        # Registration type
        reg_type = profile.get('registration_type')
        if reg_type not in ['regular', 'composition', 'qrmp']:
            errors.append({
                "code": "INVALID_REG_TYPE",
                "severity": "BLOCKER",
                "field": "registration_type",
                "message": "Registration type must be: regular, composition, or qrmp"
            })
        
        # Filing frequency
        freq = profile.get('filing_frequency')
        if freq not in ['monthly', 'quarterly']:
            errors.append({
                "code": "INVALID_FILING_FREQ",
                "severity": "BLOCKER",
                "field": "filing_frequency",
                "message": "Filing frequency must be: monthly or quarterly"
            })
        
        return errors
    
    @staticmethod
    def extract_state_code(gstin: str) -> str:
        """Extract state code from GSTIN"""
        if len(gstin) >= 2:
            return gstin[:2]
        return ""
    
    @staticmethod
    def get_state_name(gstin: str) -> str:
        """Get state name from GSTIN"""
        state_code = GSTProfile.extract_state_code(gstin)
        return GSTProfile.STATE_CODES.get(state_code, "Unknown")
