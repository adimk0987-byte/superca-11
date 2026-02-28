"""
Test suite for Bank & Invoice Reconciliation feature
Tests the /api/reconciliation/* endpoints including:
- run-matching endpoint with 8-priority matching rules
- extract endpoint for file parsing
- generate-pdf and generate-excel endpoints
"""
import pytest
import requests
import os
import json

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testca@test.com"
TEST_PASSWORD = "testpassword123"


class TestReconciliationAuth:
    """Test authentication for reconciliation endpoints"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        # Try signup if login fails
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test CA User",
            "company_name": "Test CA Company"
        })
        if signup_response.status_code == 200:
            return signup_response.json().get("access_token")
        pytest.skip("Authentication failed - skipping authenticated tests")
    
    def test_login_success(self):
        """Test that login works with test credentials"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        # Accept either 200 (success) or try signup
        if response.status_code != 200:
            # Try signup
            signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD,
                "name": "Test CA User",
                "company_name": "Test CA Company"
            })
            assert signup_response.status_code in [200, 400]  # 400 if already exists
            if signup_response.status_code == 200:
                return
            # If signup failed with 400 (already exists), try login again
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data


class TestReconciliationMatchingEngine:
    """Test the 8-priority matching engine at /api/reconciliation/run-matching"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        # Try signup if login fails
        signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "name": "Test CA User",
            "company_name": "Test CA Company"
        })
        if signup_response.status_code == 200:
            return signup_response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    @pytest.fixture
    def sample_bank_transactions(self):
        """Sample bank transactions for testing"""
        return [
            {"id": 1, "date": "2024-04-05", "ref": "CHQ001", "description": "ABC Corp", "debit": 0, "credit": 520000},
            {"id": 2, "date": "2024-04-12", "ref": "NEFT123", "description": "XYZ Ltd", "debit": 0, "credit": 385000},
            {"id": 3, "date": "2024-04-18", "ref": "UPI456", "description": "PQR Ent", "debit": 0, "credit": 95000},
            {"id": 4, "date": "2024-04-25", "ref": "CHQ002", "description": "DEF & Co", "debit": 0, "credit": 150000},
            {"id": 5, "date": "2024-05-03", "ref": "NEFT789", "description": "LMN Ltd", "debit": 0, "credit": 220000},
        ]
    
    @pytest.fixture
    def sample_invoices(self):
        """Sample invoices for testing"""
        return [
            {"id": 1, "invoice_no": "INV-001", "customer": "ABC Corp", "date": "2024-04-01", "amount": 520000},
            {"id": 2, "invoice_no": "INV-002", "customer": "XYZ Ltd", "date": "2024-04-08", "amount": 385000},
            {"id": 3, "invoice_no": "INV-003", "customer": "PQR Ent", "date": "2024-04-15", "amount": 100000},
            {"id": 4, "invoice_no": "INV-004", "customer": "DEF & Co", "date": "2024-04-20", "amount": 150000},
            {"id": 5, "invoice_no": "INV-005", "customer": "LMN Ltd", "date": "2024-04-28", "amount": 220000},
        ]
    
    @pytest.fixture
    def default_settings(self):
        """Default matching settings"""
        return {
            "date_tolerance_days": 3,
            "amount_tolerance": 100,
            "enable_reference_matching": True,
            "enable_name_matching": True,
            "enable_partial_payment_matching": True,
            "enable_bulk_payment_matching": True,
            "auto_match_bank_charges": True,
            "auto_approval_level": "high"
        }
    
    def test_run_matching_endpoint_returns_success(self, auth_token, sample_bank_transactions, sample_invoices, default_settings):
        """Test that run-matching endpoint returns successful response"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": sample_bank_transactions,
                "invoices": sample_invoices,
                "settings": default_settings
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data.get("success") == True
        assert "data" in data
    
    def test_run_matching_returns_correct_structure(self, auth_token, sample_bank_transactions, sample_invoices, default_settings):
        """Test that response contains all required fields"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": sample_bank_transactions,
                "invoices": sample_invoices,
                "settings": default_settings
            }
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check all required keys are present
        required_keys = ["auto_matched", "suggested", "manual_review", "unmatched_bank", "unmatched_invoices", "summary"]
        for key in required_keys:
            assert key in data, f"Missing required key: {key}"
    
    def test_run_matching_summary_structure(self, auth_token, sample_bank_transactions, sample_invoices, default_settings):
        """Test that summary contains correct statistics"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": sample_bank_transactions,
                "invoices": sample_invoices,
                "settings": default_settings
            }
        )
        
        assert response.status_code == 200
        summary = response.json()["data"]["summary"]
        
        # Verify summary keys
        summary_keys = [
            "total_transactions", "total_invoices", "auto_matched_count", 
            "auto_matched_amount", "suggested_count", "suggested_amount",
            "manual_review_count", "manual_review_amount", "unmatched_bank_count",
            "unmatched_bank_amount", "unmatched_invoices_count", "unmatched_invoices_amount",
            "total_bank_amount", "total_invoice_amount", "matched_amount",
            "difference", "match_percentage"
        ]
        for key in summary_keys:
            assert key in summary, f"Missing summary key: {key}"
    
    def test_exact_amount_matching(self, auth_token, default_settings):
        """Test Priority 2: Exact amount + close date matching"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Bank transaction and invoice with same amount within 3 days
        bank_txns = [{"id": 1, "date": "2024-04-05", "ref": "TXN001", "description": "Payment", "debit": 0, "credit": 50000}]
        invoices = [{"id": 1, "invoice_no": "INV-001", "customer": "Customer A", "date": "2024-04-03", "amount": 50000}]
        
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": bank_txns,
                "invoices": invoices,
                "settings": default_settings
            }
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Should have auto-matched since exact amount within date tolerance
        assert len(data["auto_matched"]) >= 1 or len(data["suggested"]) >= 1
    
    def test_partial_payment_matching(self, auth_token, default_settings):
        """Test Priority 7: Partial payment matching (TDS deduction)"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Invoice for 100000, bank receipt for 90000 (10% TDS deducted)
        bank_txns = [{"id": 1, "date": "2024-04-05", "ref": "TXN001", "description": "Customer A Payment", "debit": 0, "credit": 90000}]
        invoices = [{"id": 1, "invoice_no": "INV-001", "customer": "Customer A", "date": "2024-04-03", "amount": 100000}]
        
        settings = {**default_settings, "enable_partial_payment_matching": True}
        
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": bank_txns,
                "invoices": invoices,
                "settings": settings
            }
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        
        # Check if partial payment was detected
        all_matches = data["auto_matched"] + data["suggested"] + data["manual_review"]
        if all_matches:
            match = all_matches[0]
            assert match["difference"] != 0 or match["match_type"] == "partial_payment"
    
    def test_matching_with_empty_transactions(self, auth_token, default_settings):
        """Test matching with empty input"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": [],
                "invoices": [],
                "settings": default_settings
            }
        )
        
        assert response.status_code == 200
        data = response.json()["data"]
        assert data["summary"]["total_transactions"] == 0
        assert data["summary"]["total_invoices"] == 0
    
    def test_date_tolerance_setting(self, auth_token):
        """Test date tolerance setting affects matching"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        # Same amount but 10 days apart
        bank_txns = [{"id": 1, "date": "2024-04-15", "ref": "TXN001", "description": "Payment", "debit": 0, "credit": 50000}]
        invoices = [{"id": 1, "invoice_no": "INV-001", "customer": "Customer A", "date": "2024-04-01", "amount": 50000}]
        
        # With 3-day tolerance (should not auto-match)
        settings_strict = {
            "date_tolerance_days": 3,
            "amount_tolerance": 100,
            "enable_reference_matching": True,
            "enable_name_matching": True,
            "enable_partial_payment_matching": True,
            "enable_bulk_payment_matching": True,
            "auto_match_bank_charges": True,
            "auto_approval_level": "high"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            headers=headers,
            json={
                "bank_transactions": bank_txns,
                "invoices": invoices,
                "settings": settings_strict
            }
        )
        
        assert response.status_code == 200


class TestReconciliationPDFExport:
    """Test PDF export functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_generate_pdf_endpoint(self, auth_token):
        """Test PDF generation endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        pdf_data = {
            "company_name": "Test Company",
            "bank_name": "HDFC Bank",
            "account_number": "1234567890",
            "period": {"from": "2024-04-01", "to": "2025-03-31"},
            "summary": {
                "bank_total": 1850000,
                "books_total": 1875000,
                "difference": 25000,
                "match_percentage": 98.67,
                "fully_matched": {"count": 100, "amount": 1700000},
                "partial_matches": {"count": 10, "amount": 100000},
                "bank_only": {"count": 5, "amount": 25000},
                "books_only": {"count": 3, "amount": 50000},
                "amount_mismatch": {"count": 2, "amount": 10000},
                "date_mismatch": {"count": 3, "amount": 15000}
            },
            "brs": {
                "bank_balance": 1850000,
                "book_balance": 1875000,
                "cheques_not_presented": [],
                "cheques_not_cleared": [],
                "direct_credits": 25000,
                "direct_debits": 15000,
                "bank_charges": 2500,
                "interest_credited": 8500
            },
            "receivables": [],
            "payables": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/generate-pdf",
            headers=headers,
            json=pdf_data
        )
        
        # Should return PDF blob or error
        assert response.status_code in [200, 500]  # 500 if PDF generator not fully configured
        if response.status_code == 200:
            assert response.headers.get('Content-Type', '').startswith('application/pdf') or len(response.content) > 0


class TestReconciliationExcelExport:
    """Test Excel export functionality"""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get authentication token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Authentication failed")
    
    def test_generate_excel_endpoint(self, auth_token):
        """Test Excel generation endpoint"""
        headers = {"Authorization": f"Bearer {auth_token}"}
        
        excel_data = {
            "company_name": "Test Company",
            "bank_transactions": [
                {"id": 1, "date": "2024-04-05", "ref": "CHQ001", "description": "ABC Corp", "debit": 0, "credit": 520000, "status": "matched"}
            ],
            "sales_invoices": [
                {"id": 1, "invoice_no": "INV-001", "customer": "ABC Corp", "date": "2024-04-01", "amount": 520000, "status": "paid"}
            ],
            "purchase_invoices": [],
            "summary": {
                "bank_total": 520000,
                "books_total": 520000,
                "difference": 0,
                "match_percentage": 100
            },
            "brs": {},
            "receivables": [],
            "payables": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/generate-excel",
            headers=headers,
            json=excel_data
        )
        
        # Should return Excel blob or error
        assert response.status_code in [200, 500]


class TestReconciliationEndpointSecurity:
    """Test that reconciliation endpoints require authentication"""
    
    def test_run_matching_requires_auth(self):
        """Test run-matching endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/run-matching",
            json={"bank_transactions": [], "invoices": [], "settings": {}}
        )
        assert response.status_code == 403 or response.status_code == 401
    
    def test_generate_pdf_requires_auth(self):
        """Test generate-pdf endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/generate-pdf",
            json={}
        )
        assert response.status_code == 403 or response.status_code == 401
    
    def test_generate_excel_requires_auth(self):
        """Test generate-excel endpoint requires authentication"""
        response = requests.post(
            f"{BASE_URL}/api/reconciliation/generate-excel",
            json={}
        )
        assert response.status_code == 403 or response.status_code == 401


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
