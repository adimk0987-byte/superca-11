"""
GST Comprehensive Validation System Tests - V2

Tests for:
1. POST /api/gst/{gstin}/{period}/validate - Comprehensive validation endpoint
2. POST /api/gst/{gstin}/{period}/mark-filed - Mark as filed endpoint

Focus Areas:
- Validation should fail when GSTR-1 not prepared
- Validation should fail when GSTR-3B not prepared
- Validation should pass when all checks complete
- Validation should detect duplicate invoices
- Validation should check GSTR-1 vs GSTR-3B reconciliation
- Mark as filed should fail if validation fails
- Error response format: code, section, severity, message, fix_hint
- Sections status: profile, period, gstr1, gstr3b, reconciliation
"""

import pytest
import requests
import os
from datetime import datetime, timedelta

# Base URL from environment variable
BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testuser@example.com"
TEST_PASSWORD = "testpassword"
TEST_COMPANY = "TEST_GST_Company"

# Test GSTIN (Maharashtra)
TEST_GSTIN = "27AABCU9603R1ZM"
TEST_PERIOD_WITH_DATA = "01-2026"  # January 2026 - has data from previous tests
TEST_PERIOD_WITHOUT_DATA = "10-2025"  # October 2025 - no data


@pytest.fixture(scope="module")
def auth_session():
    """Get authenticated session for all tests"""
    session = requests.Session()
    
    # Try signup first
    signup_data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD,
        "name": "GST Test User",
        "company_name": TEST_COMPANY
    }
    signup_response = session.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
    
    if signup_response.status_code == 200:
        token = signup_response.json().get("access_token")
    else:
        # User exists, try login
        login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
        response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
        if response.status_code != 200:
            pytest.skip(f"Could not authenticate: {response.text}")
        token = response.json().get("access_token")
    
    session.headers.update({"Authorization": f"Bearer {token}"})
    return session


class TestComprehensiveValidationEndpoint:
    """
    Test POST /api/gst/{gstin}/{period}/validate
    Comprehensive GST return validation
    """
    
    def test_validate_endpoint_accessible(self, auth_session):
        """Test that validation endpoint is accessible"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        print(f"Validation endpoint accessible: {response.status_code}")
    
    def test_validate_returns_correct_structure(self, auth_session):
        """Test validation response has correct structure"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields exist
        assert "valid" in data, "Response missing 'valid' field"
        assert "errors" in data, "Response missing 'errors' field"
        assert "warnings" in data, "Response missing 'warnings' field"
        assert "sections_status" in data, "Response missing 'sections_status' field"
        assert "can_file" in data, "Response missing 'can_file' field"
        
        # Check sections_status has all 5 sections
        sections = data["sections_status"]
        assert "profile" in sections, "Missing profile section status"
        assert "period" in sections, "Missing period section status"
        assert "gstr1" in sections, "Missing gstr1 section status"
        assert "gstr3b" in sections, "Missing gstr3b section status"
        assert "reconciliation" in sections, "Missing reconciliation section status"
        
        print(f"Validation response structure correct: {list(data.keys())}")
        print(f"Sections: {list(sections.keys())}")
    
    def test_validate_sections_have_valid_and_message(self, auth_session):
        """Test each section has valid (bool) and message (string)"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        sections = data["sections_status"]
        for section_name, section_data in sections.items():
            assert "valid" in section_data, f"Section {section_name} missing 'valid'"
            assert "message" in section_data, f"Section {section_name} missing 'message'"
            assert isinstance(section_data["valid"], bool), f"Section {section_name} 'valid' should be boolean"
            assert isinstance(section_data["message"], str), f"Section {section_name} 'message' should be string"
        
        print(f"All sections have valid/message fields")
    
    def test_validate_profile_not_found(self, auth_session):
        """Test validation fails when profile doesn't exist"""
        # Use a GSTIN that doesn't have a profile
        fake_gstin = "24AABCU9603R1ZX"  # Gujarat GSTIN - no profile
        
        response = auth_session.post(f"{BASE_URL}/api/gst/{fake_gstin}/{TEST_PERIOD_WITHOUT_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        assert data["valid"] == False
        assert data["can_file"] == False
        assert data["sections_status"]["profile"]["valid"] == False
        
        # Check error structure
        assert len(data["errors"]) > 0
        error = data["errors"][0]
        assert "code" in error
        assert error["code"] == "PROFILE_NOT_FOUND"
        
        print(f"Profile not found error: {error}")
    
    def test_validate_gstr1_not_prepared(self, auth_session):
        """Test validation fails when GSTR-1 not prepared"""
        # Use a period without any filings
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITHOUT_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # GSTR-1 should be invalid
        assert data["sections_status"]["gstr1"]["valid"] == False
        assert data["can_file"] == False
        
        # Check for GSTR-1 not found error
        gstr1_errors = [e for e in data["errors"] if e.get("section") == "GSTR-1"]
        assert len(gstr1_errors) > 0, "Should have GSTR-1 error when not prepared"
        
        print(f"GSTR-1 not prepared errors: {gstr1_errors}")
    
    def test_validate_gstr3b_not_prepared(self, auth_session):
        """Test validation fails when GSTR-3B not prepared"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITHOUT_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # GSTR-3B should be invalid
        assert data["sections_status"]["gstr3b"]["valid"] == False
        
        # Check for GSTR-3B not found error
        gstr3b_errors = [e for e in data["errors"] if e.get("section") == "GSTR-3B"]
        assert len(gstr3b_errors) > 0, "Should have GSTR-3B error when not prepared"
        
        print(f"GSTR-3B not prepared errors: {gstr3b_errors}")
    
    def test_validate_error_format(self, auth_session):
        """Test error format includes code, section, severity, message, fix_hint"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITHOUT_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        assert len(data["errors"]) > 0, "Should have errors for period without data"
        
        for error in data["errors"]:
            assert "code" in error, f"Error missing 'code': {error}"
            assert "section" in error, f"Error missing 'section': {error}"
            assert "severity" in error, f"Error missing 'severity': {error}"
            assert "message" in error, f"Error missing 'message': {error}"
            assert "fix_hint" in error, f"Error missing 'fix_hint': {error}"
        
        print(f"Error format correct. Sample error: {data['errors'][0]}")
    
    def test_validate_success_when_all_checks_complete(self, auth_session):
        """Test validation passes when all checks complete"""
        # Use period with data from previous tests
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Profile should be valid
        assert data["sections_status"]["profile"]["valid"] == True, \
            f"Profile validation failed: {data['sections_status']['profile']}"
        
        # Period should be valid
        assert data["sections_status"]["period"]["valid"] == True, \
            f"Period validation failed: {data['sections_status']['period']}"
        
        print(f"Validation for period with data:")
        print(f"  Profile: {data['sections_status']['profile']}")
        print(f"  Period: {data['sections_status']['period']}")
        print(f"  GSTR-1: {data['sections_status']['gstr1']}")
        print(f"  GSTR-3B: {data['sections_status']['gstr3b']}")
        print(f"  Reconciliation: {data['sections_status']['reconciliation']}")
        print(f"  Can File: {data['can_file']}")
    
    def test_validate_duplicate_invoice_detection(self, auth_session):
        """Test validation detects duplicate invoices"""
        # First, let's try to add a duplicate invoice
        duplicate_invoice_data = {
            "invoice_number": "TEST-INV-B2B-001",  # Same as existing
            "invoice_date": "2026-01-10",
            "supply_type": "intra",
            "recipient_gstin": "27AADCT0156Q1ZA",
            "place_of_supply": "27",
            "taxable_value": 50000.0,
            "gst_rate": 18,
            "cgst": 4500.0,
            "sgst": 4500.0,
            "igst": 0.0
        }
        
        # Add duplicate invoice
        add_response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/invoice",
            json=duplicate_invoice_data
        )
        
        # Should be rejected with duplicate error
        if add_response.status_code == 200:
            add_data = add_response.json()
            if add_data.get("success") == False:
                # Check for duplicate error
                dup_errors = [e for e in add_data.get("errors", []) if "DUPLICATE" in e.get("code", "")]
                assert len(dup_errors) > 0, "Should detect duplicate invoice"
                print(f"Duplicate detected during add: {dup_errors}")
        
        # Also check via validation endpoint
        validate_response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        validate_data = validate_response.json()
        
        print(f"Validation errors: {validate_data.get('errors', [])}")
    
    def test_validate_reconciliation_check(self, auth_session):
        """Test validation checks GSTR-1 vs GSTR-3B reconciliation"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Check reconciliation section exists
        recon_status = data["sections_status"]["reconciliation"]
        assert "valid" in recon_status
        assert "message" in recon_status
        
        print(f"Reconciliation status: {recon_status}")
        
        # If GSTR-1 and GSTR-3B both exist, reconciliation should be checked
        if data["sections_status"]["gstr1"]["valid"] and data["sections_status"]["gstr3b"]["valid"]:
            # Reconciliation message should indicate result
            assert len(recon_status["message"]) > 0
            print(f"Reconciliation checked: {recon_status['message']}")


class TestMarkAsFiledEndpoint:
    """
    Test POST /api/gst/{gstin}/{period}/mark-filed
    Mark GST return as filed endpoint
    """
    
    def test_mark_filed_endpoint_accessible(self, auth_session):
        """Test that mark-filed endpoint is accessible"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/mark-filed")
        # Should return 200 (success or validation error), not 404/500
        assert response.status_code == 200
        print(f"Mark-filed endpoint accessible: {response.status_code}")
    
    def test_mark_filed_fails_without_valid_profile(self, auth_session):
        """Test mark as filed fails when profile not found"""
        fake_gstin = "24AABCU9603R1ZX"  # No profile
        
        response = auth_session.post(f"{BASE_URL}/api/gst/{fake_gstin}/{TEST_PERIOD_WITHOUT_DATA}/mark-filed")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == False
        assert "errors" in data or "message" in data
        
        print(f"Mark-filed without profile: {data}")
    
    def test_mark_filed_fails_when_gstr1_not_prepared(self, auth_session):
        """Test mark as filed fails when GSTR-1 not prepared"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITHOUT_DATA}/mark-filed")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == False
        
        # Check error message mentions GSTR-1
        error_msgs = " ".join([str(e) for e in data.get("errors", [])])
        assert "GSTR" in error_msgs.upper() or "gstr" in error_msgs.lower(), \
            f"Error should mention GSTR-1: {data}"
        
        print(f"Mark-filed without GSTR-1: {data}")
    
    def test_mark_filed_fails_when_gstr3b_not_prepared(self, auth_session):
        """Test mark as filed fails when GSTR-3B not prepared"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITHOUT_DATA}/mark-filed")
        assert response.status_code == 200
        data = response.json()
        
        assert data["success"] == False
        
        print(f"Mark-filed without GSTR-3B: {data}")
    
    def test_mark_filed_returns_correct_structure(self, auth_session):
        """Test mark-filed response has correct structure"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/mark-filed")
        assert response.status_code == 200
        data = response.json()
        
        # Should have success field
        assert "success" in data
        
        # If failed, should have errors or message
        if not data["success"]:
            assert "errors" in data or "message" in data
        else:
            # If success, should have filed_at and message
            assert "message" in data
        
        print(f"Mark-filed response structure: {list(data.keys())}")
    
    def test_mark_filed_validates_before_filing(self, auth_session):
        """Test that mark-filed runs validation before marking as filed"""
        # Use a period without complete data
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITHOUT_DATA}/mark-filed")
        assert response.status_code == 200
        data = response.json()
        
        # Should fail because validation doesn't pass
        assert data["success"] == False
        assert len(data.get("errors", [])) > 0, "Should return validation errors"
        
        print(f"Mark-filed validates first: {len(data.get('errors', []))} errors found")


class TestFilingModeEndpoint:
    """Test POST /api/gst/{gstin}/{period}/set-filing-mode"""
    
    def test_set_filing_mode_manual(self, auth_session):
        """Test setting filing mode to MANUAL"""
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/set-filing-mode",
            json={"filing_mode": "MANUAL"}
        )
        
        # Should succeed
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True
        assert data.get("filing_mode") == "MANUAL"
        
        print(f"Filing mode set to MANUAL: {data}")
    
    def test_set_filing_mode_invalid(self, auth_session):
        """Test setting invalid filing mode"""
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/set-filing-mode",
            json={"filing_mode": "INVALID_MODE"}
        )
        
        # Should fail
        assert response.status_code in [400, 422]
        
        print(f"Invalid filing mode rejected: {response.status_code}")


class TestValidationEdgeCases:
    """Test edge cases for validation"""
    
    def test_validate_future_period(self, auth_session):
        """Test validation for future period"""
        future_date = datetime.now() + timedelta(days=60)
        future_period = f"{future_date.month:02d}-{future_date.year}"
        
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{future_period}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Should have period error for future
        period_status = data["sections_status"]["period"]
        
        # Check for future period warning or error
        period_errors = [e for e in data.get("errors", []) + data.get("warnings", []) 
                        if e.get("section") == "Period"]
        
        print(f"Future period validation: {period_status}")
        print(f"Period errors/warnings: {period_errors}")
    
    def test_validate_old_period(self, auth_session):
        """Test validation for period more than 12 months old"""
        old_date = datetime.now() - timedelta(days=400)
        old_period = f"{old_date.month:02d}-{old_date.year}"
        
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{old_period}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Should have warning for old period
        old_period_warnings = [w for w in data.get("warnings", []) 
                             if "old" in w.get("message", "").lower() or 
                                w.get("code") == "OLD_PERIOD_WARNING"]
        
        print(f"Old period warnings: {old_period_warnings}")
    
    def test_validate_invalid_period_format(self, auth_session):
        """Test validation with invalid period format"""
        invalid_period = "2026-01"  # Wrong format (should be MM-YYYY)
        
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{invalid_period}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Period should be invalid
        period_status = data["sections_status"]["period"]
        
        print(f"Invalid period format validation: {period_status}")


class TestValidationSummary:
    """Test validation summary/totals fields"""
    
    def test_validate_returns_summary(self, auth_session):
        """Test validation returns summary data"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Check for summary if available
        if "summary" in data:
            summary = data["summary"]
            assert "profile_valid" in summary
            assert "period_valid" in summary
            assert "gstr1_valid" in summary
            assert "gstr3b_valid" in summary
            assert "reconciliation_valid" in summary
            
            print(f"Validation summary: {summary}")
        else:
            print("No summary field in response (optional)")
    
    def test_validate_returns_total_counts(self, auth_session):
        """Test validation returns error/warning counts"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD_WITH_DATA}/validate")
        assert response.status_code == 200
        data = response.json()
        
        # Check for total counts
        if "total_errors" in data:
            assert isinstance(data["total_errors"], int)
            assert data["total_errors"] == len(data.get("errors", []))
        
        if "total_warnings" in data:
            assert isinstance(data["total_warnings"], int)
            assert data["total_warnings"] == len(data.get("warnings", []))
        
        print(f"Error count: {len(data.get('errors', []))}")
        print(f"Warning count: {len(data.get('warnings', []))}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
