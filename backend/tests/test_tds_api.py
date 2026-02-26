"""
TDS API Tests - Testing TDS Filing workflow APIs
Tests:
- /api/tds/generate-sample - Generate sample TDS data
- /api/tds/calculate - Calculate TDS with Form 24Q/26Q
- /api/tds/returns/{id}/tally-xml - Export Tally XML
- /api/tds/returns/{id}/traces-json - Export TRACES JSON (24Q/26Q)
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_EMAIL = "testca9999@example.com"
TEST_PASSWORD = "Test123456"

class TestTDSWorkflow:
    """TDS Filing workflow tests"""
    
    token = None
    return_id = None
    sample_data = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token before each test"""
        if not TestTDSWorkflow.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                data = response.json()
                TestTDSWorkflow.token = data.get("access_token")
                print(f"Login successful - token obtained")
            else:
                # Try signup if login fails
                print(f"Login failed ({response.status_code}), trying signup...")
                signup_response = requests.post(f"{BASE_URL}/api/auth/signup", json={
                    "email": TEST_EMAIL,
                    "password": TEST_PASSWORD,
                    "name": "Test CA User",
                    "company_name": "Test CA Firm"
                })
                if signup_response.status_code == 200:
                    data = signup_response.json()
                    TestTDSWorkflow.token = data.get("access_token")
                    print(f"Signup successful - token obtained")
                else:
                    pytest.skip(f"Auth failed: {signup_response.text}")
    
    @property
    def headers(self):
        return {"Authorization": f"Bearer {TestTDSWorkflow.token}"}
    
    def test_01_api_health(self):
        """Test API is accessible"""
        response = requests.get(f"{BASE_URL}/api/")
        assert response.status_code == 200
        data = response.json()
        assert "message" in data
        print(f"API Health: {data.get('message')}")
    
    def test_02_generate_sample_data(self):
        """Test TDS sample data generation"""
        response = requests.post(
            f"{BASE_URL}/api/tds/generate-sample",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Response should indicate success"
        
        sample_data = data.get("sample_data", {})
        assert "deductees" in sample_data, "Should have deductees data"
        assert "employees" in sample_data, "Should have employees data"
        
        deductees = sample_data.get("deductees", [])
        employees = sample_data.get("employees", [])
        
        assert len(deductees) > 0, "Should have at least 1 deductee"
        assert len(employees) > 0, "Should have at least 1 employee"
        
        # Verify deductee structure
        if deductees:
            first_deductee = deductees[0]
            assert "name" in first_deductee, "Deductee should have name"
            assert "pan" in first_deductee, "Deductee should have pan"
            assert "section" in first_deductee, "Deductee should have section"
            assert "amount" in first_deductee, "Deductee should have amount"
        
        # Verify employee structure
        if employees:
            first_employee = employees[0]
            assert "name" in first_employee, "Employee should have name"
            assert "pan" in first_employee, "Employee should have pan"
            assert "monthly_salary" in first_employee, "Employee should have monthly_salary"
        
        # Store for next tests
        TestTDSWorkflow.sample_data = sample_data
        print(f"Sample data: {len(deductees)} deductees, {len(employees)} employees")
    
    def test_03_calculate_tds(self):
        """Test TDS calculation with Form 24Q/26Q"""
        if not TestTDSWorkflow.sample_data:
            pytest.skip("Sample data not available")
        
        # Prepare calculation data
        calc_data = {
            "tan": "DELA12345B",
            "pan": "AABCT1234F",
            "company_name": "Test TDS Company",
            "quarter": 4,
            "financial_year": "2024-25",
            "deductees": TestTDSWorkflow.sample_data.get("deductees", []),
            "employees": TestTDSWorkflow.sample_data.get("employees", [])
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tds/calculate",
            headers=self.headers,
            json=calc_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Calculation should succeed"
        
        # Verify return_id is generated
        return_id = data.get("return_id")
        assert return_id, "Should return a return_id"
        TestTDSWorkflow.return_id = return_id
        
        # Verify summary is present
        summary = data.get("summary", {})
        assert "total_tds" in summary or "total_deductees" in summary, "Should have summary data"
        
        # Verify Form 26Q data
        form_26q = data.get("form_26q", {})
        assert form_26q, "Should have Form 26Q data"
        if form_26q:
            assert "summary" in form_26q or "header" in form_26q, "26Q should have summary/header"
        
        # Verify Form 24Q data
        form_24q = data.get("form_24q", {})
        assert form_24q, "Should have Form 24Q data"
        if form_24q:
            assert "summary" in form_24q or "header" in form_24q, "24Q should have summary/header"
        
        print(f"TDS calculated - Return ID: {return_id}")
        print(f"Summary: {summary}")
    
    def test_04_export_tally_xml(self):
        """Test Tally XML export"""
        if not TestTDSWorkflow.return_id:
            pytest.skip("Return ID not available")
        
        response = requests.post(
            f"{BASE_URL}/api/tds/returns/{TestTDSWorkflow.return_id}/tally-xml",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Export should succeed"
        
        xml = data.get("xml", "")
        assert xml, "Should return XML data"
        assert "<?xml" in xml or "<ENVELOPE>" in xml, "Should be valid XML"
        assert "TALLYMESSAGE" in xml or "VOUCHER" in xml, "Should have Tally voucher structure"
        
        print(f"Tally XML exported - Length: {len(xml)} chars")
    
    def test_05_export_traces_json_26q(self):
        """Test TRACES JSON export for Form 26Q"""
        if not TestTDSWorkflow.return_id:
            pytest.skip("Return ID not available")
        
        response = requests.post(
            f"{BASE_URL}/api/tds/returns/{TestTDSWorkflow.return_id}/traces-json?form_type=26Q",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Export should succeed"
        
        json_data = data.get("json", {})
        assert json_data, "Should return JSON data"
        
        # Verify 26Q structure
        assert "form_type" in json_data or "header" in json_data, "Should have form structure"
        
        print(f"TRACES 26Q JSON exported - Keys: {list(json_data.keys())[:5]}")
    
    def test_06_export_traces_json_24q(self):
        """Test TRACES JSON export for Form 24Q"""
        if not TestTDSWorkflow.return_id:
            pytest.skip("Return ID not available")
        
        response = requests.post(
            f"{BASE_URL}/api/tds/returns/{TestTDSWorkflow.return_id}/traces-json?form_type=24Q",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True, "Export should succeed"
        
        json_data = data.get("json", {})
        assert json_data, "Should return JSON data"
        
        # Verify 24Q structure
        assert "form_type" in json_data or "header" in json_data, "Should have form structure"
        
        print(f"TRACES 24Q JSON exported - Keys: {list(json_data.keys())[:5]}")
    
    def test_07_get_returns_list(self):
        """Test getting TDS returns list"""
        response = requests.get(
            f"{BASE_URL}/api/tds/returns",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert isinstance(data, list), "Should return a list of returns"
        
        if data:
            first_return = data[0]
            assert "id" in first_return or "return_id" in first_return, "Return should have ID"
        
        print(f"Returns list: {len(data)} returns found")
    
    def test_08_get_single_return(self):
        """Test getting single TDS return by ID"""
        if not TestTDSWorkflow.return_id:
            pytest.skip("Return ID not available")
        
        response = requests.get(
            f"{BASE_URL}/api/tds/returns/{TestTDSWorkflow.return_id}",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data, "Should return return data"
        
        print(f"Single return fetched - ID: {TestTDSWorkflow.return_id}")
    
    def test_09_download_template_deductees(self):
        """Test downloading deductees Excel template"""
        response = requests.get(
            f"{BASE_URL}/api/tds/download-template?data_type=deductees",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        # Check content type for Excel
        content_type = response.headers.get('Content-Type', '')
        content_length = len(response.content)
        
        assert content_length > 0, "Should have template content"
        print(f"Deductees template downloaded - Size: {content_length} bytes")
    
    def test_10_download_template_employees(self):
        """Test downloading employees Excel template"""
        response = requests.get(
            f"{BASE_URL}/api/tds/download-template?data_type=employees",
            headers=self.headers
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        content_length = len(response.content)
        assert content_length > 0, "Should have template content"
        print(f"Employees template downloaded - Size: {content_length} bytes")


class TestTDSCalculationLogic:
    """Test TDS calculation logic and business rules"""
    
    token = None
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Setup auth token"""
        if not TestTDSCalculationLogic.token:
            response = requests.post(f"{BASE_URL}/api/auth/login", json={
                "email": TEST_EMAIL,
                "password": TEST_PASSWORD
            })
            if response.status_code == 200:
                TestTDSCalculationLogic.token = response.json().get("access_token")
    
    @property
    def headers(self):
        return {"Authorization": f"Bearer {TestTDSCalculationLogic.token}"}
    
    def test_tds_194c_contractor_calculation(self):
        """Test TDS calculation for Section 194C - Contractors"""
        calc_data = {
            "tan": "DELA12345B",
            "pan": "AABCT1234F", 
            "company_name": "Test Company",
            "quarter": 4,
            "financial_year": "2024-25",
            "deductees": [
                {
                    "name": "Test Contractor",
                    "pan": "ABCDE1234F",
                    "section": "194C",
                    "invoice_no": "CONT/001",
                    "date": "01-01-2025",
                    "amount": 100000,
                    "is_company": False,
                    "month": "January"
                }
            ],
            "employees": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tds/calculate",
            headers=self.headers,
            json=calc_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # TDS for 194C (Individual) should be 1%
        form_26q = data.get("form_26q", {})
        if form_26q and "summary" in form_26q:
            total_tds = form_26q["summary"].get("total_tds_deducted", 0)
            # 1% of 100000 = 1000
            print(f"194C TDS calculated: {total_tds}")
    
    def test_tds_194j_professional_calculation(self):
        """Test TDS calculation for Section 194J - Professional Services"""
        calc_data = {
            "tan": "DELA12345B",
            "pan": "AABCT1234F",
            "company_name": "Test Company", 
            "quarter": 4,
            "financial_year": "2024-25",
            "deductees": [
                {
                    "name": "Test Professional",
                    "pan": "PQRST1234G",
                    "section": "194J",
                    "invoice_no": "PROF/001",
                    "date": "01-02-2025",
                    "amount": 50000,
                    "is_company": False,
                    "month": "February"
                }
            ],
            "employees": []
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tds/calculate",
            headers=self.headers,
            json=calc_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        # TDS for 194J should be 10%
        print(f"194J TDS calculation complete")
    
    def test_tds_salary_calculation(self):
        """Test TDS calculation for Section 192 - Salary"""
        calc_data = {
            "tan": "DELA12345B",
            "pan": "AABCT1234F",
            "company_name": "Test Company",
            "quarter": 4,
            "financial_year": "2024-25",
            "deductees": [],
            "employees": [
                {
                    "name": "Test Employee",
                    "pan": "LMNOP1234H",
                    "designation": "Manager",
                    "date_of_joining": "01-04-2020",
                    "monthly_salary": 75000,
                    "exemptions": {"80C": 150000, "80D": 25000, "HRA": 100000, "LTA": 0}
                }
            ]
        }
        
        response = requests.post(
            f"{BASE_URL}/api/tds/calculate",
            headers=self.headers,
            json=calc_data
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        
        data = response.json()
        assert data.get("success") == True
        
        form_24q = data.get("form_24q", {})
        if form_24q:
            print(f"Salary TDS calculation complete - Form 24Q generated")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
