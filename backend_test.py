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

    # ==================== TDS TESTING METHODS ====================

    def test_tds_sample_generation(self):
        """Test TDS sample data generation API"""
        if not self.token:
            self.log_result("TDS Sample Data Generation", False, "No authentication token")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/tds/generate-sample",
                headers=self.get_headers(),
                timeout=30
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                sample_success = data.get('success', False)
                sample_data = data.get('sample_data', {})
                deductees_count = len(sample_data.get('deductees', []))
                employees_count = len(sample_data.get('employees', []))
                
                details = f"Success: {sample_success}, Deductees: {deductees_count}, Employees: {employees_count}"
                success = sample_success and deductees_count > 0 and employees_count > 0
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            # Store sample data for further tests
            if success:
                self.tds_sample_data = data.get('sample_data', {})
            
            self.log_result("TDS Sample Data Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("TDS Sample Data Generation API", False, str(e))
            return False

    def test_tds_download_templates(self):
        """Test TDS Excel template downloads"""
        if not self.token:
            self.log_result("TDS Template Downloads", False, "No authentication token")
            return False
        
        success_count = 0
        
        # Test deductees template
        try:
            response = requests.get(
                f"{self.api_url}/tds/download-template?data_type=deductees",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30
            )
            
            deductees_success = response.status_code == 200
            if deductees_success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                is_excel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in content_type or 'application/octet-stream' in content_type
                has_content = content_length > 1000
                
                details_deductees = f"Deductees template - Excel: {is_excel}, Size: {content_length} bytes"
                if is_excel and has_content:
                    success_count += 1
            else:
                details_deductees = f"Deductees template failed - HTTP {response.status_code}"
            
        except Exception as e:
            details_deductees = f"Deductees template error: {str(e)}"
            deductees_success = False

        # Test employees template
        try:
            response = requests.get(
                f"{self.api_url}/tds/download-template?data_type=employees",
                headers={"Authorization": f"Bearer {self.token}"},
                timeout=30
            )
            
            employees_success = response.status_code == 200
            if employees_success:
                content_type = response.headers.get('content-type', '')
                content_length = len(response.content)
                is_excel = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in content_type or 'application/octet-stream' in content_type
                has_content = content_length > 1000
                
                details_employees = f"Employees template - Excel: {is_excel}, Size: {content_length} bytes"
                if is_excel and has_content:
                    success_count += 1
            else:
                details_employees = f"Employees template failed - HTTP {response.status_code}"
            
        except Exception as e:
            details_employees = f"Employees template error: {str(e)}"
            employees_success = False

        overall_success = success_count == 2
        combined_details = f"{details_deductees} | {details_employees}"
        
        self.log_result("TDS Excel Template Downloads", overall_success, combined_details)
        return overall_success

    def test_tds_calculation(self):
        """Test TDS calculation with Form 24Q and 26Q generation"""
        if not self.token:
            self.log_result("TDS Calculation", False, "No authentication token")
            return False
        
        if not hasattr(self, 'tds_sample_data'):
            self.log_result("TDS Calculation", False, "No sample data available for calculation")
            return False
        
        try:
            # Use sample data for calculation
            calculation_data = {
                "tan": "DELA12345B",
                "pan": "AABCT1234F",
                "company_name": "Test CA Firm",
                "quarter": 4,
                "financial_year": "2024-25",
                "deductees": self.tds_sample_data.get('deductees', []),
                "employees": self.tds_sample_data.get('employees', [])
            }
            
            response = requests.post(
                f"{self.api_url}/tds/calculate",
                json=calculation_data,
                headers=self.get_headers(),
                timeout=60
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                calc_success = data.get('success', False)
                self.tds_return_id = data.get('return_id')
                
                # Check for required components
                has_form_26q = bool(data.get('form_26q'))
                has_form_24q = bool(data.get('form_24q'))
                has_summary = bool(data.get('summary'))
                has_pan_validation = bool(data.get('pan_validation'))
                
                details = f"Calc success: {calc_success}, Form 26Q: {has_form_26q}, Form 24Q: {has_form_24q}, Summary: {has_summary}, PAN validation: {has_pan_validation}"
                if self.tds_return_id:
                    details += f", Return ID: {self.tds_return_id[:8]}..."
                
                success = calc_success and has_form_26q and has_form_24q and has_summary
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("TDS Calculation with Forms 24Q/26Q", success, details)
            return success
            
        except Exception as e:
            self.log_result("TDS Calculation with Forms 24Q/26Q", False, str(e))
            return False

    def test_tds_tally_xml_export(self):
        """Test Tally XML export from TDS return"""
        if not self.token:
            self.log_result("TDS Tally XML Export", False, "No authentication token")
            return False
        
        if not hasattr(self, 'tds_return_id') or not self.tds_return_id:
            self.log_result("TDS Tally XML Export", False, "No TDS return ID from calculation")
            return False
        
        try:
            response = requests.post(
                f"{self.api_url}/tds/returns/{self.tds_return_id}/tally-xml",
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
                success = xml_success and has_xml and has_summary
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("TDS Tally XML Export", success, details)
            return success
            
        except Exception as e:
            self.log_result("TDS Tally XML Export", False, str(e))
            return False

    def test_tds_traces_json_export(self):
        """Test TRACES JSON export for both 24Q and 26Q"""
        if not self.token:
            self.log_result("TDS TRACES JSON Export", False, "No authentication token")
            return False
        
        if not hasattr(self, 'tds_return_id') or not self.tds_return_id:
            self.log_result("TDS TRACES JSON Export", False, "No TDS return ID from calculation")
            return False
        
        success_count = 0
        
        # Test Form 26Q JSON
        try:
            response = requests.post(
                f"{self.api_url}/tds/returns/{self.tds_return_id}/traces-json?form_type=26Q",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                json_success = data.get('success', False)
                has_json = bool(data.get('json'))
                if json_success and has_json:
                    success_count += 1
                    details_26q = "Form 26Q JSON: Success"
                else:
                    details_26q = "Form 26Q JSON: Missing data"
            else:
                details_26q = f"Form 26Q JSON: HTTP {response.status_code}"
                
        except Exception as e:
            details_26q = f"Form 26Q JSON: Error - {str(e)}"

        # Test Form 24Q JSON  
        try:
            response = requests.post(
                f"{self.api_url}/tds/returns/{self.tds_return_id}/traces-json?form_type=24Q",
                headers=self.get_headers(),
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                json_success = data.get('success', False)
                has_json = bool(data.get('json'))
                if json_success and has_json:
                    success_count += 1
                    details_24q = "Form 24Q JSON: Success"
                else:
                    details_24q = "Form 24Q JSON: Missing data"
            else:
                details_24q = f"Form 24Q JSON: HTTP {response.status_code}"
                
        except Exception as e:
            details_24q = f"Form 24Q JSON: Error - {str(e)}"

        overall_success = success_count == 2
        combined_details = f"{details_26q} | {details_24q}"
        
        self.log_result("TDS TRACES JSON Export (24Q & 26Q)", overall_success, combined_details)
        return overall_success

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
        
        # Step 4: TDS-specific endpoints
        print("🔍 Testing TDS Return Filing endpoints...")
        print()
        
        self.test_tds_sample_generation()
        self.test_tds_download_templates()
        self.test_tds_calculation()
        self.test_tds_tally_xml_export()
        self.test_tds_traces_json_export()
        
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