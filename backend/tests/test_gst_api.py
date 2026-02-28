"""
GST Filing System Backend API Tests

Tests for:
1. GST Profile creation with GSTIN validation
2. Invoice entry with validation (B2B, B2C_LARGE, B2C_SMALL)
3. GSTR-1 validation
4. GSTR-3B generation and validation
5. Preview and Export APIs
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
TEST_PERIOD = "01-2026"  # January 2026


class TestGSTSystemSetup:
    """Setup tests - Create test user and verify API access"""
    
    @pytest.fixture(scope="class")
    def session(self):
        """Create requests session"""
        return requests.Session()
    
    def test_api_health(self, session):
        """Test API is accessible"""
        response = session.get(f"{BASE_URL}/api/")
        assert response.status_code == 200, f"API not accessible: {response.text}"
        data = response.json()
        assert "message" in data
        print(f"API Health: {data}")
    
    def test_signup_or_login(self, session):
        """Signup new user or login if exists"""
        # Try signup first
        signup_data = {
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "GST Test User",
            "company_name": TEST_COMPANY
        }
        
        signup_response = session.post(f"{BASE_URL}/api/auth/signup", json=signup_data)
        
        if signup_response.status_code == 200:
            data = signup_response.json()
            token = data.get("access_token")
            assert token, "No access token in signup response"
            session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"Signup successful: {data.get('user', {}).get('email')}")
        else:
            # User exists, try login
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            login_response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            assert login_response.status_code == 200, f"Login failed: {login_response.text}"
            data = login_response.json()
            token = data.get("access_token")
            assert token, "No access token in login response"
            session.headers.update({"Authorization": f"Bearer {token}"})
            print(f"Login successful: {data.get('user', {}).get('email')}")


class TestGSTProfileAPI:
    """GST Profile API Tests - POST /api/gst/profile"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
        
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
            response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code != 200:
                pytest.skip(f"Could not authenticate: {response.text}")
            token = response.json().get("access_token")
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_profile_invalid_gstin_length(self, auth_session):
        """Test profile creation with invalid GSTIN length"""
        profile_data = {
            "gstin": "27AABCU",  # Too short
            "legal_name": "Test Company",
            "state_code": "27",
            "registration_type": "regular",
            "filing_frequency": "monthly"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/gst/profile", json=profile_data)
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation
        assert data.get("success") == False, "Should reject invalid GSTIN length"
        assert "errors" in data
        print(f"Expected validation error for short GSTIN: {data.get('errors')}")
    
    def test_profile_invalid_state_code(self, auth_session):
        """Test profile creation with invalid state code in GSTIN"""
        profile_data = {
            "gstin": "99AABCU9603R1ZM",  # Invalid state code 99
            "legal_name": "Test Company",
            "state_code": "99",
            "registration_type": "regular",
            "filing_frequency": "monthly"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/gst/profile", json=profile_data)
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation
        assert data.get("success") == False, "Should reject invalid state code"
        print(f"Expected validation error for invalid state code: {data.get('errors')}")
    
    def test_profile_missing_legal_name(self, auth_session):
        """Test profile creation without legal name"""
        profile_data = {
            "gstin": TEST_GSTIN,
            "legal_name": "",  # Empty
            "state_code": "27",
            "registration_type": "regular",
            "filing_frequency": "monthly"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/gst/profile", json=profile_data)
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation
        assert data.get("success") == False, "Should reject missing legal name"
        print(f"Expected validation error for missing legal name: {data.get('errors')}")
    
    def test_profile_create_valid(self, auth_session):
        """Test valid GST profile creation"""
        profile_data = {
            "gstin": TEST_GSTIN,
            "legal_name": "TEST GST Company Pvt Ltd",
            "trade_name": "GST Test Trade",
            "state_code": "27",
            "registration_type": "regular",
            "registration_date": "2020-01-01",
            "filing_frequency": "monthly",
            "nature_of_business": "Software Services",
            "authorized_signatory": "Test User"
        }
        
        response = auth_session.post(f"{BASE_URL}/api/gst/profile", json=profile_data)
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Profile creation failed: {data.get('errors')}"
        assert data.get("profile_complete") == True
        assert "profile" in data
        
        profile = data.get("profile")
        assert profile.get("gstin") == TEST_GSTIN
        assert profile.get("legal_name") == "TEST GST Company Pvt Ltd"
        assert profile.get("state_code") == "27"
        print(f"Profile created: {profile.get('gstin')}")
    
    def test_get_profiles(self, auth_session):
        """Test getting all GST profiles"""
        response = auth_session.get(f"{BASE_URL}/api/gst/profile")
        assert response.status_code == 200
        
        profiles = response.json()
        assert isinstance(profiles, list)
        print(f"Retrieved {len(profiles)} profiles")
    
    def test_get_profile_by_gstin(self, auth_session):
        """Test getting specific profile by GSTIN"""
        response = auth_session.get(f"{BASE_URL}/api/gst/profile/{TEST_GSTIN}")
        assert response.status_code == 200
        
        profile = response.json()
        assert profile.get("gstin") == TEST_GSTIN
        print(f"Retrieved profile for GSTIN: {profile.get('gstin')}")


class TestGSTInvoiceAPI:
    """GST Invoice API Tests - POST /api/gst/{gstin}/{period}/invoice"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
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
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code != 200:
                pytest.skip(f"Could not authenticate: {response.text}")
            token = response.json().get("access_token")
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_invoice_without_profile(self, auth_session):
        """Test adding invoice to non-existent GSTIN"""
        invoice_data = {
            "invoice_number": "TEST-INV-001",
            "invoice_date": "2026-01-15",
            "supply_type": "intra",
            "place_of_supply": "27",
            "taxable_value": 10000.0,
            "gst_rate": 18,
            "cgst": 900.0,
            "sgst": 900.0,
            "igst": 0.0
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/99INVALID0000001/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        # Should fail because profile doesn't exist
        assert response.status_code in [400, 404], f"Should reject invoice for invalid GSTIN"
        print(f"Expected rejection: {response.status_code}")
    
    def test_invoice_future_date(self, auth_session):
        """Test invoice with future date - should be rejected"""
        future_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")
        
        invoice_data = {
            "invoice_number": "TEST-INV-FUTURE",
            "invoice_date": future_date,
            "supply_type": "intra",
            "place_of_supply": "27",
            "taxable_value": 10000.0,
            "gst_rate": 18,
            "cgst": 900.0,
            "sgst": 900.0,
            "igst": 0.0
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation for future date
        assert data.get("success") == False, "Should reject future dated invoice"
        print(f"Expected validation error: {data.get('errors')}")
    
    def test_invoice_invalid_gst_rate(self, auth_session):
        """Test invoice with invalid GST rate"""
        invoice_data = {
            "invoice_number": "TEST-INV-RATE",
            "invoice_date": "2026-01-10",
            "supply_type": "intra",
            "place_of_supply": "27",
            "taxable_value": 10000.0,
            "gst_rate": 15,  # Invalid rate
            "cgst": 750.0,
            "sgst": 750.0,
            "igst": 0.0
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation for invalid rate
        assert data.get("success") == False, "Should reject invalid GST rate"
        print(f"Expected validation error for rate: {data.get('errors')}")
    
    def test_invoice_tax_calculation_mismatch(self, auth_session):
        """Test invoice with incorrect tax calculation"""
        invoice_data = {
            "invoice_number": "TEST-INV-CALC",
            "invoice_date": "2026-01-10",
            "supply_type": "intra",
            "place_of_supply": "27",
            "taxable_value": 10000.0,
            "gst_rate": 18,
            "cgst": 500.0,  # Wrong - should be 900
            "sgst": 500.0,  # Wrong - should be 900
            "igst": 0.0
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation for tax mismatch
        assert data.get("success") == False, "Should reject incorrect tax calculation"
        print(f"Expected tax mismatch error: {data.get('errors')}")
    
    def test_invoice_igst_for_intra_state(self, auth_session):
        """Test invoice with IGST for intra-state supply (should fail)"""
        invoice_data = {
            "invoice_number": "TEST-INV-IGST",
            "invoice_date": "2026-01-10",
            "supply_type": "intra",
            "place_of_supply": "27",
            "taxable_value": 10000.0,
            "gst_rate": 18,
            "cgst": 0.0,
            "sgst": 0.0,
            "igst": 1800.0  # Should not use IGST for intra-state
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation
        assert data.get("success") == False, "Should reject IGST for intra-state supply"
        print(f"Expected error for IGST in intra-state: {data.get('errors')}")
    
    def test_invoice_b2b_valid_intra_state(self, auth_session):
        """Test valid B2B intra-state invoice"""
        invoice_data = {
            "invoice_number": "TEST-INV-B2B-001",
            "invoice_date": "2026-01-10",
            "supply_type": "intra",
            "recipient_gstin": "27AADCT0156Q1ZA",  # Valid MH GSTIN
            "recipient_name": "ABC Traders Pvt Ltd",
            "place_of_supply": "27",
            "taxable_value": 50000.0,
            "gst_rate": 18,
            "cgst": 4500.0,
            "sgst": 4500.0,
            "igst": 0.0,
            "hsn_sac": "9983"
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"B2B Invoice creation failed: {data.get('errors')}"
        assert data.get("category") == "B2B"
        assert "invoice" in data
        print(f"B2B Invoice created: {data.get('invoice', {}).get('invoice_number')}")
    
    def test_invoice_b2c_small(self, auth_session):
        """Test valid B2C Small invoice (no GSTIN, < 2.5L)"""
        invoice_data = {
            "invoice_number": "TEST-INV-B2C-001",
            "invoice_date": "2026-01-12",
            "supply_type": "intra",
            "recipient_name": "Cash Customer",
            "place_of_supply": "27",
            "taxable_value": 10000.0,
            "gst_rate": 18,
            "cgst": 900.0,
            "sgst": 900.0,
            "igst": 0.0
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"B2C Small Invoice creation failed: {data.get('errors')}"
        assert data.get("category") == "B2C_SMALL"
        print(f"B2C Small Invoice created: {data.get('invoice', {}).get('invoice_number')}")
    
    def test_invoice_inter_state(self, auth_session):
        """Test valid inter-state invoice with IGST"""
        invoice_data = {
            "invoice_number": "TEST-INV-INTER-001",
            "invoice_date": "2026-01-15",
            "supply_type": "inter",
            "recipient_gstin": "29AADCT0156Q1ZV",  # Karnataka GSTIN
            "recipient_name": "XYZ Solutions Karnataka",
            "place_of_supply": "29",  # Karnataka
            "taxable_value": 75000.0,
            "gst_rate": 18,
            "cgst": 0.0,
            "sgst": 0.0,
            "igst": 13500.0
        }
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"Inter-state Invoice creation failed: {data.get('errors')}"
        assert data.get("category") == "B2B"
        print(f"Inter-state Invoice created: {data.get('invoice', {}).get('invoice_number')}")
    
    def test_invoice_duplicate_check(self, auth_session):
        """Test duplicate invoice rejection"""
        invoice_data = {
            "invoice_number": "TEST-INV-B2B-001",  # Already exists
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
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoice",
            json=invoice_data
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail validation for duplicate
        assert data.get("success") == False, "Should reject duplicate invoice"
        print(f"Expected duplicate error: {data.get('errors')}")
    
    def test_get_period_invoices(self, auth_session):
        """Test getting all invoices for a period"""
        response = auth_session.get(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/invoices")
        assert response.status_code == 200
        
        invoices = response.json()
        assert isinstance(invoices, list)
        assert len(invoices) >= 2, "Should have at least 2 test invoices"
        print(f"Retrieved {len(invoices)} invoices for period {TEST_PERIOD}")


class TestGSTR1ValidationAPI:
    """GSTR-1 Validation API Tests - POST /api/gst/{gstin}/{period}/gstr1/validate"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        
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
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code != 200:
                pytest.skip(f"Could not authenticate: {response.text}")
            token = response.json().get("access_token")
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_gstr1_validate_no_invoices_no_nil(self, auth_session):
        """Test GSTR-1 validation with no invoices and not declared as NIL"""
        # Use a different period with no invoices
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/12-2025/gstr1/validate",
            json={"is_nil": False}
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail because no invoices and not NIL
        assert data.get("success") == False, "Should fail without invoices or NIL declaration"
        print(f"Expected error for no invoices: {data.get('errors')}")
    
    def test_gstr1_validate_nil_return(self, auth_session):
        """Test GSTR-1 NIL return validation"""
        # Use a different period with no invoices
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/11-2025/gstr1/validate",
            json={"is_nil": True}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"NIL return validation failed: {data.get('errors')}"
        assert data.get("summary", {}).get("is_nil") == True
        print(f"NIL return validated: {data.get('summary')}")
    
    def test_gstr1_validate_with_invoices(self, auth_session):
        """Test GSTR-1 validation with valid invoices"""
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr1/validate",
            json={"is_nil": False}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"GSTR-1 validation failed: {data.get('errors')}"
        assert "totals" in data
        assert "summary" in data
        
        totals = data.get("totals", {})
        assert totals.get("total_taxable_value", 0) > 0
        print(f"GSTR-1 validated. Totals: {totals}")
    
    def test_gstr1_status(self, auth_session):
        """Test GSTR-1 status after validation"""
        response = auth_session.get(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr1/status")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("status") == "validated"
        print(f"GSTR-1 status: {data.get('status')}")


class TestGSTR3BGenerationAPI:
    """GSTR-3B Generation API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        
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
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code != 200:
                pytest.skip(f"Could not authenticate: {response.text}")
            token = response.json().get("access_token")
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_gstr3b_generate_without_gstr1_validation(self, auth_session):
        """Test GSTR-3B generation without GSTR-1 validation - should fail"""
        # Use a period with no validated GSTR-1
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/10-2025/gstr3b/generate",
            json={"itc_available": 0, "itc_reversed": 0}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == False, "Should fail without validated GSTR-1"
        print(f"Expected GSTR-1 not validated error: {data.get('errors')}")
    
    def test_gstr3b_generate_success(self, auth_session):
        """Test GSTR-3B generation from validated GSTR-1"""
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr3b/generate",
            json={"itc_available": 5000, "itc_reversed": 500}
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"GSTR-3B generation failed: {data.get('errors')}"
        assert "gstr3b" in data
        assert "tax_payable" in data
        
        gstr3b = data.get("gstr3b", {})
        assert "section_3_1" in gstr3b
        assert "section_4" in gstr3b
        assert "section_5" in gstr3b
        
        print(f"GSTR-3B generated. Tax payable: {data.get('tax_payable')}")


class TestGSTR3BValidationAPI:
    """GSTR-3B Validation (Reconciliation) API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        
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
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code != 200:
                pytest.skip(f"Could not authenticate: {response.text}")
            token = response.json().get("access_token")
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_gstr3b_validate_mismatch(self, auth_session):
        """Test GSTR-3B validation with mismatched totals - GOLDEN RULE test"""
        # First get GSTR-1 totals
        gstr1_response = auth_session.get(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr1/status")
        gstr1_data = gstr1_response.json()
        actual_taxable = gstr1_data.get("total_taxable_value", 0)
        
        # Send mismatched value
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr3b/validate",
            json={
                "outward_taxable_supplies": actual_taxable + 10000,  # Mismatch!
                "cgst_payable": 1000,
                "sgst_payable": 1000,
                "igst_payable": 0
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        # Should fail reconciliation
        assert data.get("success") == False, "Should block on mismatch - GOLDEN RULE"
        assert data.get("reconciled") == False
        print(f"Expected reconciliation error: {data.get('errors')}")
    
    def test_gstr3b_validate_success(self, auth_session):
        """Test GSTR-3B validation with matching totals"""
        # First get GSTR-1 totals
        gstr1_response = auth_session.get(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr1/status")
        gstr1_data = gstr1_response.json()
        actual_taxable = gstr1_data.get("total_taxable_value", 0)
        
        response = auth_session.post(
            f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/gstr3b/validate",
            json={
                "outward_taxable_supplies": actual_taxable,  # Matching!
                "cgst_payable": 4500,
                "sgst_payable": 4500,
                "igst_payable": 13500
            }
        )
        assert response.status_code == 200
        data = response.json()
        
        assert data.get("success") == True, f"GSTR-3B validation failed: {data.get('errors')}"
        assert data.get("reconciled") == True
        print(f"GSTR-3B validated and reconciled!")


class TestGSTPreviewExportAPI:
    """Preview and Export API Tests"""
    
    @pytest.fixture(scope="class")
    def auth_session(self):
        """Get authenticated session"""
        session = requests.Session()
        
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
            login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}
            response = session.post(f"{BASE_URL}/api/auth/login", json=login_data)
            if response.status_code != 200:
                pytest.skip(f"Could not authenticate: {response.text}")
            token = response.json().get("access_token")
        
        session.headers.update({"Authorization": f"Bearer {token}"})
        return session
    
    def test_preview(self, auth_session):
        """Test preview API"""
        response = auth_session.get(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/preview")
        assert response.status_code == 200
        
        data = response.json()
        assert "gstr1_summary" in data
        assert "gstr3b_summary" in data
        assert "ready_to_export" in data
        assert "total_amount_due" in data
        
        print(f"Preview loaded. Ready to export: {data.get('ready_to_export')}")
        print(f"Total amount due: {data.get('total_amount_due')}")
    
    def test_export(self, auth_session):
        """Test export API - final step"""
        response = auth_session.post(f"{BASE_URL}/api/gst/{TEST_GSTIN}/{TEST_PERIOD}/export")
        assert response.status_code == 200
        
        data = response.json()
        assert data.get("success") == True, f"Export failed: {data}"
        assert "gstr1_json" in data
        assert "gstr3b_json" in data
        
        gstr1_json = data.get("gstr1_json", {})
        gstr3b_json = data.get("gstr3b_json", {})
        
        assert gstr1_json.get("gstin") == TEST_GSTIN
        assert "b2b" in gstr1_json
        assert "b2cs" in gstr1_json
        
        print(f"Export successful!")
        print(f"GSTR-1 JSON keys: {list(gstr1_json.keys())}")
        print(f"GSTR-3B JSON keys: {list(gstr3b_json.keys())}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
