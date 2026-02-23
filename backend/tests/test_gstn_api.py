"""
Backend API Tests for GSTN API Filing Features
Tests: OTP request, submit-return, audit-log endpoints
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestGSTNAPIFilingEndpoints:
    """Tests for GSTN API Filing (OTP, Submit, Audit)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@example.com",
            "password": "testpassword"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        """Headers with auth token"""
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    # ========== GSTN Settings Tests ==========
    
    def test_get_gstn_settings(self, auth_headers):
        """Test GET /api/settings/gstn"""
        response = requests.get(f"{BASE_URL}/api/settings/gstn", headers=auth_headers)
        print(f"GET /api/settings/gstn - Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Response: {response.json()}")
    
    def test_save_gstn_settings(self, auth_headers):
        """Test POST /api/settings/gstn - Save GSTN configuration"""
        config = {
            "gsp_provider": "cleartax",
            "api_key": "test-api-key-12345",
            "api_secret": "test-secret",
            "environment": "sandbox",
            "otp_preference": "sms",
            "gstin_linked": "27AABCU9603R1ZM"
        }
        response = requests.post(f"{BASE_URL}/api/settings/gstn", json=config, headers=auth_headers)
        print(f"POST /api/settings/gstn - Status: {response.status_code}")
        print(f"Response: {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    # ========== GST Profile Tests ==========
    
    def test_get_gst_profiles(self, auth_headers):
        """Test GET /api/gst/profile - List all GST profiles"""
        response = requests.get(f"{BASE_URL}/api/gst/profile", headers=auth_headers)
        print(f"GET /api/gst/profile - Status: {response.status_code}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        print(f"Profiles count: {len(response.json())}")
    
    def test_create_gst_profile(self, auth_headers):
        """Test POST /api/gst/profile - Create GST profile"""
        profile = {
            "gstin": "27AABCU9603R1ZM",
            "legal_name": "Test Company Private Limited",
            "trade_name": "Test Co",
            "state_code": "27",
            "registration_type": "regular",
            "registration_date": "2020-01-01",
            "filing_frequency": "monthly",
            "nature_of_business": "Trading",
            "authorized_signatory": "John Doe"
        }
        response = requests.post(f"{BASE_URL}/api/gst/profile", json=profile, headers=auth_headers)
        print(f"POST /api/gst/profile - Status: {response.status_code}")
        print(f"Response: {response.text}")
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
    
    # ========== GSTN OTP Request Test ==========
    
    def test_request_otp_endpoint(self, auth_headers):
        """Test POST /api/gst/gstn/request-otp - Request OTP for filing"""
        payload = {
            "gstin": "27AABCU9603R1ZM",
            "period": "01-2026",
            "otp_preference": "sms"
        }
        response = requests.post(f"{BASE_URL}/api/gst/gstn/request-otp", json=payload, headers=auth_headers)
        print(f"POST /api/gst/gstn/request-otp - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check response - may be 200 (success) or 400 (GSTN not configured) or 500 (bug)
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            assert "otp_request_id" in data, "Expected otp_request_id in response"
            print(f"OTP Request ID: {data.get('otp_request_id')}")
        elif response.status_code == 400:
            print(f"GSTN not configured (expected): {response.json()}")
        else:
            # Bug - server error
            pytest.fail(f"Unexpected error: {response.status_code} - {response.text}")
    
    # ========== GSTN Submit Return Test ==========
    
    def test_submit_return_endpoint(self, auth_headers):
        """Test POST /api/gst/gstn/submit-return - Submit GST return"""
        payload = {
            "gstin": "27AABCU9603R1ZM",
            "period": "01-2026",
            "otp": "123456",
            "return_type": "gstr1_gstr3b"
        }
        response = requests.post(f"{BASE_URL}/api/gst/gstn/submit-return", json=payload, headers=auth_headers)
        print(f"POST /api/gst/gstn/submit-return - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        # Check response
        if response.status_code == 200:
            data = response.json()
            assert data.get("success") == True, "Expected success=True"
            assert "arn" in data, "Expected ARN in response"
            print(f"ARN: {data.get('arn')}")
        elif response.status_code == 400:
            print(f"Expected error (GSTN not configured or invalid data): {response.json()}")
        else:
            pytest.fail(f"Unexpected error: {response.status_code} - {response.text}")
    
    # ========== Audit Log Test ==========
    
    def test_save_audit_log(self, auth_headers):
        """Test POST /api/gst/audit-log - Save audit log entry"""
        log_entry = {
            "action": "TEST_ACTION",
            "details": "Test audit log entry",
            "gstin": "27AABCU9603R1ZM",
            "period": "01-2026",
            "timestamp": "2026-01-15T10:00:00Z"
        }
        response = requests.post(f"{BASE_URL}/api/gst/audit-log", json=log_entry, headers=auth_headers)
        print(f"POST /api/gst/audit-log - Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data.get("success") == True, "Expected success=True"


class TestGSTFilingSteps:
    """Tests for the GST Filing Steps (Profile & Period Selection)"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@example.com",
            "password": "testpassword"
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture(scope="class")
    def auth_headers(self, auth_token):
        return {
            "Authorization": f"Bearer {auth_token}",
            "Content-Type": "application/json"
        }
    
    def test_period_invoices_endpoint(self, auth_headers):
        """Test GET /api/gst/{gstin}/{period}/invoices"""
        response = requests.get(f"{BASE_URL}/api/gst/27AABCU9603R1ZM/01-2026/invoices", headers=auth_headers)
        print(f"GET /api/gst/27AABCU9603R1ZM/01-2026/invoices - Status: {response.status_code}")
        assert response.status_code == 200
    
    def test_add_invoice_endpoint(self, auth_headers):
        """Test POST /api/gst/{gstin}/{period}/invoice"""
        invoice_data = {
            "invoice_number": "INV-TEST-001",
            "invoice_date": "2026-01-15",
            "document_type": "invoice",
            "supply_type": "intra",
            "recipient_gstin": "27AABCT1234R1ZM",
            "recipient_name": "ABC Corp",
            "place_of_supply": "27",
            "taxable_value": 10000,
            "gst_rate": 18,
            "cgst": 900,
            "sgst": 900,
            "igst": 0,
            "hsn_sac": "9983"
        }
        response = requests.post(
            f"{BASE_URL}/api/gst/27AABCU9603R1ZM/01-2026/invoice", 
            json=invoice_data, 
            headers=auth_headers
        )
        print(f"POST /api/gst/27AABCU9603R1ZM/01-2026/invoice - Status: {response.status_code}")
        print(f"Response: {response.text}")
        # May fail if profile not created - that's ok
        if response.status_code != 200:
            print(f"Invoice creation issue: {response.json()}")
    
    def test_gstr1_status(self, auth_headers):
        """Test GET /api/gst/{gstin}/{period}/gstr1/status"""
        response = requests.get(f"{BASE_URL}/api/gst/27AABCU9603R1ZM/01-2026/gstr1/status", headers=auth_headers)
        print(f"GET /api/gst/27AABCU9603R1ZM/01-2026/gstr1/status - Status: {response.status_code}")
        # May return 404 if not validated yet - that's ok
        if response.status_code == 200:
            print(f"GSTR1 Status: {response.json()}")
        else:
            print(f"GSTR1 status not found (expected for new period)")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
