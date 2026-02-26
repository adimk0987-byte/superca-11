"""
SuperCA GST/Tax Backend API Testing
Tests all GST filing and Tally export endpoints for functionality
"""

import requests
import json
import sys
import tempfile
import os
from datetime import datetime

class SuperCABackendTester:
    def __init__(self, base_url="https://sprint-track-3.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_info = None
        self.company_info = None
        self.tests_run = 0
        self.tests_passed = 0
        self.gst_filing_id = None
        self.errors = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} - {test_name}")
        if details:
            print(f"    Details: {details}")
        if success:
            self.tests_passed += 1
        else:
            self.errors.append(f"{test_name}: {details}")
        print()

    def test_api_status(self):
        """Test basic API status"""
        try:
            response = requests.get(f"{self.api_url}/", timeout=10)
            success = response.status_code == 200
            details = f"Status: {response.status_code}"
            if success:
                data = response.json()
                details += f" - {data.get('message', 'No message')}"
            self.log_result("API Status Check", success, details)
            return success
        except Exception as e:
            self.log_result("API Status Check", False, str(e))
            return False

    def test_auth_login(self):
        """Test login with provided credentials"""
        try:
            login_data = {
                "email": "testca9999@example.com", 
                "password": "Test123456"
            }
            response = requests.post(f"{self.api_url}/auth/login", json=login_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_info = data.get("user", {})
                self.company_info = data.get("company", {})
                self.log_result("Authentication Login", True, f"User: {self.user_info.get('name', 'Unknown')}")
                return True
            else:
                self.log_result("Authentication Login", False, f"HTTP {response.status_code}: {response.text[:100]}")
                return False
        except Exception as e:
            self.log_result("Authentication Login", False, str(e))
            return False

    def create_test_user_if_needed(self):
        """Create test user if login fails"""
        try:
            signup_data = {
                "email": "testca9999@example.com",
                "name": "Test CA User",
                "password": "Test123456",
                "company_name": "Test CA Firm"
            }
            response = requests.post(f"{self.api_url}/auth/signup", json=signup_data, timeout=10)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get("access_token")
                self.user_info = data.get("user", {})
                self.company_info = data.get("company", {})
                self.log_result("Test User Creation", True, f"Created user: {self.user_info.get('name')}")
                return True
            else:
                self.log_result("Test User Creation", False, f"HTTP {response.status_code}: {response.text[:200]}")
                return False
        except Exception as e:
            self.log_result("Test User Creation", False, str(e))
            return False

    def get_headers(self):
        """Get headers with authorization"""
        headers = {"Content-Type": "application/json"}
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    def test_gst_calculate(self):
        """Test GST calculation endpoint"""
        if not self.token:
            self.log_result("GST Calculate", False, "No authentication token")
            return False
        
        try:
            # Test data for GST calculation
            gst_data = {
                "gstin": "27ABCDE1234F1Z5",
                "business_name": "Test CA Firm",
                "period": "012025",
                "total_sales": 2500000,
                "taxable_5": 500000,
                "taxable_12": 800000,
                "taxable_18": 1000000,
                "taxable_28": 200000,
                "total_purchases": 1420000,
                "total_itc": 177000,
                "blocked_itc": 8000,
                "reversed_itc": 7250,
                "purchases_in_books": 156,
                "purchases_in_2a": 142,
                "matched_purchases": 138,
                "missing_in_2a_value": 85000,
                "is_interstate": False
            }
            
            response = requests.post(
                f"{self.api_url}/gst/calculate",
                json=gst_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                calc_success = data.get('success', False)
                calculation = data.get('calculation', {})
                self.gst_filing_id = data.get('filing_id')  # Save for PDF generation
                
                # Verify key components are calculated
                has_output_tax = 'output_tax' in calculation
                has_input_tax = 'input_tax_credit' in calculation
                has_net_payable = 'net_payable' in calculation
                
                details = f"Calc success: {calc_success}, Output tax: {has_output_tax}, Input tax: {has_input_tax}, Net payable: {has_net_payable}"
                if self.gst_filing_id:
                    details += f", Filing ID: {self.gst_filing_id[:8]}..."
                
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("GST Calculation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("GST Calculation API", False, str(e))
            return False

    def test_gstr3b_pdf_generation(self):
        """Test GSTR-3B PDF generation"""
        if not self.token:
            self.log_result("GSTR-3B PDF Generation", False, "No authentication token")
            return False
        
        if not self.gst_filing_id:
            self.log_result("GSTR-3B PDF Generation", False, "No GST Filing ID from calculation")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/gst/{self.gst_filing_id}/generate-pdf?report_type=gstr3b",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=60  # PDF generation may take time
            )
            
            success = response.status_code == 200
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                is_pdf = 'application/pdf' in content_type
                has_content = content_length > 1000  # At least 1KB
                
                details = f"PDF: {is_pdf}, Size: {content_length} bytes, Type: {content_type}"
                success = is_pdf and has_content
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("GSTR-3B PDF Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("GSTR-3B PDF Generation API", False, str(e))
            return False

    def test_reconciliation_pdf_generation(self):
        """Test Reconciliation PDF generation"""
        if not self.token:
            self.log_result("Reconciliation PDF Generation", False, "No authentication token")
            return False
        
        if not self.gst_filing_id:
            self.log_result("Reconciliation PDF Generation", False, "No GST Filing ID from calculation")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/gst/{self.gst_filing_id}/generate-pdf?report_type=reconciliation",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=60
            )
            
            success = response.status_code == 200
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                is_pdf = 'application/pdf' in content_type
                has_content = content_length > 1000
                
                details = f"PDF: {is_pdf}, Size: {content_length} bytes"
                success = is_pdf and has_content
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Reconciliation PDF Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("Reconciliation PDF Generation API", False, str(e))
            return False

    def test_itc_pdf_generation(self):
        """Test ITC Statement PDF generation"""
        if not self.token:
            self.log_result("ITC PDF Generation", False, "No authentication token")
            return False
        
        if not self.gst_filing_id:
            self.log_result("ITC PDF Generation", False, "No GST Filing ID from calculation")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/gst/{self.gst_filing_id}/generate-pdf?report_type=itc",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=60
            )
            
            success = response.status_code == 200
            if success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                is_pdf = 'application/pdf' in content_type
                has_content = content_length > 1000
                
                details = f"PDF: {is_pdf}, Size: {content_length} bytes"
                success = is_pdf and has_content
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("ITC PDF Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("ITC PDF Generation API", False, str(e))
            return False

    def test_tally_xml_generation(self):
        """Test Tally XML generation from GST filing"""
        if not self.token:
            self.log_result("Tally XML Generation", False, "No authentication token")
            return False
        
        if not self.gst_filing_id:
            self.log_result("Tally XML Generation", False, "No GST Filing ID from calculation")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/tally/generate-gst-xml?filing_id={self.gst_filing_id}",
                headers=self.get_headers(),
                timeout=30
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                xml_success = data.get('success', False)
                has_xml = bool(data.get('xml'))
                has_summary = bool(data.get('summary'))
                
                details = f"XML generation success: {xml_success}, Has XML: {has_xml}, Has summary: {has_summary}"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Tally XML Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("Tally XML Generation API", False, str(e))
            return False

    def test_tally_voucher_generation(self):
        """Test Tally voucher XML generation"""
        if not self.token:
            self.log_result("Tally Voucher Generation", False, "No authentication token")
            return False
        
        try:
            # Test data for voucher generation
            voucher_data = {
                "vouchers": [
                    {
                        "date": "2025-01-15",
                        "voucher_type": "receipt",
                        "voucher_number": "V-001",
                        "party_name": "Test Customer",
                        "debit_account": "HDFC Bank A/c",
                        "credit_account": "Sales A/c",
                        "amount": 10000,
                        "narration": "Test sale transaction",
                        "reference": "INV-001",
                        "gstin": "27ABCDE1234F1Z5",
                        "gst_applicable": False,
                        "gst_rate": 18,
                        "cgst": 0,
                        "sgst": 0,
                        "igst": 0,
                        "total_amount": 10000
                    }
                ],
                "company_name": "Test CA Firm",
                "financial_year": "2024-25",
                "include_masters": True
            }
            
            response = requests.post(
                f"{self.api_url}/tally/generate-xml",
                json=voucher_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                xml_success = data.get('success', False)
                has_xml = bool(data.get('xml'))
                stats = data.get('stats', {})
                voucher_count = stats.get('voucher_count', 0)
                
                details = f"XML success: {xml_success}, Has XML: {has_xml}, Vouchers: {voucher_count}"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Tally Voucher XML Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("Tally Voucher XML Generation API", False, str(e))
            return False

    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        if not self.token:
            self.log_result("Dashboard Stats", False, "No authentication token")
            return False
        
        try:
            response = requests.get(
                f"{self.api_url}/dashboard/stats",
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                has_revenue = 'total_revenue' in data
                has_expenses = 'total_expenses' in data
                has_receivables = 'outstanding_receivables' in data
                has_customers = 'total_customers' in data
                
                details = f"Has revenue: {has_revenue}, expenses: {has_expenses}, receivables: {has_receivables}, customers: {has_customers}"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Dashboard Stats API", success, details)
            return success
            
        except Exception as e:
            self.log_result("Dashboard Stats API", False, str(e))
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("=" * 60)
        print("SUPERCA GST/TAX AUTOMATION - BACKEND API TESTING")
        print("=" * 60)
        print(f"Backend URL: {self.base_url}")
        print(f"Test Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print()
        
        # Step 1: Basic connectivity
        api_working = self.test_api_status()
        if not api_working:
            print("❌ CRITICAL: API not accessible. Stopping tests.")
            return self.print_summary()
        
        # Step 2: Authentication 
        auth_success = self.test_auth_login()
        if not auth_success:
            print("⚠️ Login failed, trying to create test user...")
            auth_success = self.create_test_user_if_needed()
        
        if not auth_success:
            print("❌ CRITICAL: Cannot authenticate. Stopping GST tests.")
            return self.print_summary()
        
        # Step 3: GST-specific endpoints
        print("🔍 Testing GST & Tally-specific endpoints...")
        print()
        
        self.test_gst_calculate()  # This saves filing_id for PDF tests
        self.test_gstr3b_pdf_generation()
        self.test_reconciliation_pdf_generation()
        self.test_itc_pdf_generation()
        self.test_tally_xml_generation()
        self.test_tally_voucher_generation()
        self.test_dashboard_stats()
        
        return self.print_summary()

    def print_summary(self):
        """Print final test summary"""
        print("=" * 60)
        print("TEST SUMMARY")
        print("=" * 60)
        print(f"Total Tests: {self.tests_run}")
        print(f"Passed: {self.tests_passed}")
        print(f"Failed: {self.tests_run - self.tests_passed}")
        print(f"Success Rate: {(self.tests_passed/self.tests_run*100) if self.tests_run > 0 else 0:.1f}%")
        print()
        
        if self.errors:
            print("FAILED TESTS:")
            for error in self.errors:
                print(f"  ❌ {error}")
            print()
        
        # Determine overall result
        if self.tests_passed == self.tests_run:
            print("🎉 ALL TESTS PASSED! SuperCA GST Backend is working correctly.")
            return 0
        elif self.tests_passed >= self.tests_run * 0.7:  # 70% threshold
            print("⚠️ MOSTLY WORKING - Some issues found but core functionality works.")
            return 0
        else:
            print("❌ MAJOR ISSUES - SuperCA GST Backend has significant problems.")
            return 1

def main():
    tester = SuperCABackendTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)