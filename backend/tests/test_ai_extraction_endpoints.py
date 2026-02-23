"""
Test AI extraction endpoints for CA Automation Platform
Tests: /api/gst/extract-invoice, /api/tds/extract-data, /api/tally/extract-statement, /api/financial/extract-trial-balance
"""

import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

class TestAIExtractionEndpoints:
    """Test all AI extraction endpoints - should return 422 when no file is provided"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token for authenticated requests"""
        # Login to get token
        login_response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@example.com",
            "password": "testpassword"
        })
        
        if login_response.status_code == 200:
            self.token = login_response.json().get("access_token")
            self.headers = {"Authorization": f"Bearer {self.token}"}
        else:
            # Try signup
            signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
                "email": "testuser@example.com",
                "password": "testpassword",
                "name": "Test User",
                "company_name": "Test Company"
            })
            if signup_response.status_code == 200:
                self.token = signup_response.json().get("access_token")
                self.headers = {"Authorization": f"Bearer {self.token}"}
            else:
                self.token = None
                self.headers = {}

    def test_gst_extract_invoice_endpoint_exists(self):
        """Test /api/gst/extract-invoice endpoint exists and requires file"""
        response = requests.post(
            f"{BASE_URL}/api/gst/extract-invoice",
            headers=self.headers
        )
        # 422 = Validation Error (no file), which means endpoint exists
        # 404 would mean endpoint doesn't exist
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}: {response.text}"
        print(f"✓ GST extract-invoice endpoint exists, returns {response.status_code}")

    def test_tds_extract_data_endpoint_exists(self):
        """Test /api/tds/extract-data endpoint exists and requires file"""
        response = requests.post(
            f"{BASE_URL}/api/tds/extract-data",
            headers=self.headers
        )
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}: {response.text}"
        print(f"✓ TDS extract-data endpoint exists, returns {response.status_code}")

    def test_tally_extract_statement_endpoint_exists(self):
        """Test /api/tally/extract-statement endpoint exists and requires file"""
        response = requests.post(
            f"{BASE_URL}/api/tally/extract-statement",
            headers=self.headers
        )
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}: {response.text}"
        print(f"✓ Tally extract-statement endpoint exists, returns {response.status_code}")

    def test_financial_extract_trial_balance_endpoint_exists(self):
        """Test /api/financial/extract-trial-balance endpoint exists and requires file"""
        response = requests.post(
            f"{BASE_URL}/api/financial/extract-trial-balance",
            headers=self.headers
        )
        assert response.status_code in [422, 400], f"Expected 422/400, got {response.status_code}: {response.text}"
        print(f"✓ Financial extract-trial-balance endpoint exists, returns {response.status_code}")


class TestHealthAndBasicEndpoints:
    """Basic health and auth tests"""

    def test_api_health(self):
        """Test API root endpoint"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"✓ API health check passed: {data['message']}")

    def test_login_endpoint(self):
        """Test login endpoint works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": "testuser@example.com",
            "password": "testpassword"
        })
        # Either 200 (success) or 401 (wrong password) - both valid responses
        assert response.status_code in [200, 401], f"Expected 200/401, got {response.status_code}"
        print(f"✓ Login endpoint accessible, returned {response.status_code}")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
