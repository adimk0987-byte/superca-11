"""
ITR PDF Generator Backend API Testing
Tests all ITR-related endpoints for functionality
"""

import requests
import json
import sys
import tempfile
import os
from datetime import datetime

class ITRBackendTester:
    def __init__(self, base_url="https://sprint-log.preview.emergentagent.com"):
        self.base_url = base_url
        self.api_url = f"{base_url}/api"
        self.token = None
        self.user_info = None
        self.company_info = None
        self.tests_run = 0
        self.tests_passed = 0
        self.itr_id = None
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
                "email": "test@itr.com", 
                "password": "test123"
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
                "email": "test@itr.com",
                "name": "Test User ITR",
                "password": "test123",
                "company_name": "Test Company ITR"
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

    def test_upload_form16(self):
        """Test Form-16 upload endpoint"""
        if not self.token:
            self.log_result("Form-16 Upload", False, "No authentication token")
            return False
        
        try:
            # Create a dummy PDF file for testing
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                tmp_file.write(b'%PDF-1.4\n%Test PDF content for ITR testing')
                tmp_file_path = tmp_file.name
            
            # Upload file
            with open(tmp_file_path, 'rb') as f:
                files = {'file': ('test_form16.pdf', f, 'application/pdf')}
                headers = {"Authorization": f"Bearer {self.token}"}
                response = requests.post(
                    f"{self.api_url}/itr/upload-form16",
                    files=files,
                    headers=headers,
                    timeout=30
                )
            
            # Cleanup
            os.unlink(tmp_file_path)
            
            success = response.status_code == 200
            if success:
                data = response.json()
                extracted_success = data.get('success', False)
                details = f"Upload success: {extracted_success}, Data extracted: {bool(data.get('data'))}"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Form-16 Upload", success, details)
            return success
            
        except Exception as e:
            self.log_result("Form-16 Upload", False, str(e))
            return False

    def test_calculate_tax(self):
        """Test tax calculation endpoint"""
        if not self.token:
            self.log_result("Tax Calculation", False, "No authentication token")
            return False
        
        try:
            # Test data for tax calculation
            form16_data = {
                "employee_pan": "ABCDE1234F",
                "employee_name": "Test User ITR",
                "employer_tan": "ABCD12345D",
                "employer_name": "Test Employer Ltd",
                "financial_year": "2024-25",
                "gross_salary": 1200000,
                "section_80c": 150000,
                "section_80d": 25000,
                "other_deductions": 0,
                "total_deductions": 175000,
                "tds_deducted": 120000,
                "hra_claimed": 200000
            }
            
            response = requests.post(
                f"{self.api_url}/itr/calculate-tax",
                json=form16_data,
                headers=self.get_headers(),
                timeout=30
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                calc_success = data.get('success', False)
                calculation = data.get('calculation', {})
                self.itr_id = data.get('itr_id')  # Save for PDF generation
                
                # Verify both regimes are calculated
                has_old_regime = 'old_regime_tax' in calculation
                has_new_regime = 'new_regime_tax' in calculation
                has_suggestion = 'suggested_regime' in calculation
                
                details = f"Calc success: {calc_success}, Old regime: {has_old_regime}, New regime: {has_new_regime}, Suggestion: {has_suggestion}"
                if self.itr_id:
                    details += f", ITR ID: {self.itr_id[:8]}..."
                
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Tax Calculation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("Tax Calculation API", False, str(e))
            return False

    def test_pdf_generation(self):
        """Test ITR PDF generation"""
        if not self.token:
            self.log_result("ITR PDF Generation", False, "No authentication token")
            return False
        
        if not self.itr_id:
            self.log_result("ITR PDF Generation", False, "No ITR ID from calculation")
            return False
        
        try:
            response = requests.get(
                f"{self.api_url}/itr/{self.itr_id}/generate-pdf",
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
            
            self.log_result("ITR PDF Generation API", success, details)
            return success
            
        except Exception as e:
            self.log_result("ITR PDF Generation API", False, str(e))
            return False

    def test_document_processing(self):
        """Test multi-document processing endpoint"""
        if not self.token:
            self.log_result("Document Processing", False, "No authentication token")
            return False
        
        try:
            # Create test files
            files_to_upload = []
            temp_files = []
            
            # Form 16
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                tmp.write(b'%PDF-1.4\n%Test Form16 content')
                temp_files.append(tmp.name)
                files_to_upload.append(('files', ('form16.pdf', open(tmp.name, 'rb'), 'application/pdf')))
            
            # Bank Statement
            with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp:
                tmp.write(b'%PDF-1.4\n%Test Bank Statement content')
                temp_files.append(tmp.name)
                files_to_upload.append(('files', ('bank_statement.pdf', open(tmp.name, 'rb'), 'application/pdf')))
            
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.post(
                f"{self.api_url}/itr/process-documents",
                files=files_to_upload,
                headers=headers,
                timeout=60
            )
            
            # Cleanup
            for f in files_to_upload:
                f[1][1].close()
            for temp_file in temp_files:
                try:
                    os.unlink(temp_file)
                except:
                    pass
            
            success = response.status_code == 200
            if success:
                data = response.json()
                has_extracted = bool(data.get('extracted_data'))
                has_reconciliation = data.get('reconciliation') is not None
                has_suggestion = data.get('suggested_itr_form') is not None
                
                details = f"Extracted: {has_extracted}, Reconciliation: {has_reconciliation}, ITR suggestion: {has_suggestion}"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("Document Processing API", success, details)
            return success
            
        except Exception as e:
            self.log_result("Document Processing API", False, str(e))
            return False

    def test_itr_history(self):
        """Test ITR filing history endpoint"""
        if not self.token:
            self.log_result("ITR History", False, "No authentication token")
            return False
        
        try:
            response = requests.get(
                f"{self.api_url}/itr/history",
                headers=self.get_headers(),
                timeout=10
            )
            
            success = response.status_code == 200
            if success:
                data = response.json()
                filings_count = len(data) if isinstance(data, list) else 0
                details = f"Found {filings_count} ITR filings in history"
            else:
                details = f"HTTP {response.status_code}: {response.text[:200]}"
            
            self.log_result("ITR History API", success, details)
            return success
            
        except Exception as e:
            self.log_result("ITR History API", False, str(e))
            return False

    def run_all_tests(self):
        """Run complete test suite"""
        print("=" * 60)
        print("ITR PDF GENERATOR - BACKEND API TESTING")
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
            print("❌ CRITICAL: Cannot authenticate. Stopping ITR tests.")
            return self.print_summary()
        
        # Step 3: ITR-specific endpoints
        print("🔍 Testing ITR-specific endpoints...")
        print()
        
        self.test_upload_form16()
        self.test_calculate_tax()  # This saves itr_id for PDF test
        self.test_pdf_generation()
        self.test_document_processing()
        self.test_itr_history()
        
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
            print("🎉 ALL TESTS PASSED! ITR Backend is working correctly.")
            return 0
        elif self.tests_passed >= self.tests_run * 0.7:  # 70% threshold
            print("⚠️ MOSTLY WORKING - Some issues found but core functionality works.")
            return 0
        else:
            print("❌ MAJOR ISSUES - ITR Backend has significant problems.")
            return 1

def main():
    tester = ITRBackendTester()
    return tester.run_all_tests()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)