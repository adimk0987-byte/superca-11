#!/usr/bin/env python3

import requests
import sys
import json
import os
from datetime import datetime
from pathlib import Path

class FinancialStatementsAPITester:
    def __init__(self, base_url="https://ca-workflow-pro.preview.emergentagent.com"):
        self.base_url = f"{base_url}/api"
        self.tests_run = 0
        self.tests_passed = 0
        self.errors = []

    def log_test(self, name, success, error=None):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name}")
        else:
            print(f"❌ {name}")
            if error:
                print(f"   Error: {error}")
                self.errors.append(f"{name}: {error}")

    def test_api_status(self):
        """Test basic API connectivity"""
        try:
            response = requests.get(f"{self.base_url}/", timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = "Financial Statement API" in data.get("message", "")
            self.log_test("API Status Check", success, 
                         None if success else f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("API Status Check", False, str(e))
            return False

    def test_ratio_calculation(self):
        """Test financial ratio calculation endpoint"""
        try:
            test_data = {
                "current_assets": 1000000,
                "current_liabilities": 400000,
                "inventory": 300000,
                "cash": 100000,
                "total_assets": 2500000,
                "total_equity": 1500000,
                "total_debt": 600000,
                "revenue": 3000000,
                "gross_profit": 1200000,
                "operating_profit": 800000,
                "net_profit": 600000,
                "interest_expense": 50000,
                "cost_of_goods_sold": 1800000,
                "trade_receivables": 500000,
                "trade_payables": 200000
            }
            
            response = requests.post(f"{self.base_url}/financial/calculate-ratios", 
                                   json=test_data, timeout=15)
            success = response.status_code == 200
            
            if success:
                data = response.json()
                success = data.get("success") and "ratios" in data
                if success:
                    ratios = data["ratios"]
                    # Verify expected ratio categories
                    expected_categories = ["profitability", "liquidity", "solvency", "efficiency"]
                    success = all(cat in ratios for cat in expected_categories)
            
            self.log_test("Ratio Calculation", success,
                         None if success else f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Ratio Calculation", False, str(e))
            return False

    def test_financial_statements_crud(self):
        """Test financial statements CRUD operations"""
        try:
            # Test data
            statement_data = {
                "company_name": "Test Company Ltd",
                "financial_year": "2024-25", 
                "period_end_date": "2025-03-31",
                "trial_balance": [
                    {"id": "1", "account_name": "Cash", "account_group": "current_assets", 
                     "debit": 100000, "credit": 0},
                    {"id": "2", "account_name": "Share Capital", "account_group": "equity", 
                     "debit": 0, "credit": 100000}
                ],
                "status": "draft"
            }
            
            # Test Create
            response = requests.post(f"{self.base_url}/financial/statements", 
                                   json=statement_data, timeout=15)
            success = response.status_code == 200
            statement_id = None
            
            if success:
                data = response.json()
                success = data.get("success")
                statement_id = data.get("id")
            
            self.log_test("Create Financial Statement", success,
                         None if success else f"Status: {response.status_code}")
            
            if not success or not statement_id:
                return False
            
            # Test Get All
            response = requests.get(f"{self.base_url}/financial/statements", timeout=10)
            success = response.status_code == 200
            if success:
                statements = response.json()
                success = isinstance(statements, list) and len(statements) > 0
            
            self.log_test("Get All Financial Statements", success,
                         None if success else f"Status: {response.status_code}")
            
            # Test Get Single
            response = requests.get(f"{self.base_url}/financial/statements/{statement_id}", timeout=10)
            success = response.status_code == 200
            if success:
                data = response.json()
                success = data.get("id") == statement_id
            
            self.log_test("Get Single Financial Statement", success,
                         None if success else f"Status: {response.status_code}")
            
            return True
        except Exception as e:
            self.log_test("Financial Statements CRUD", False, str(e))
            return False

    def test_pdf_generation(self):
        """Test PDF generation endpoint"""
        try:
            # Test data for PDF generation
            pdf_data = {
                "company_name": "Test Company Ltd",
                "financial_year": "2024-25",
                "period_end_date": "2025-03-31",
                "trial_balance": [
                    {"account_name": "Cash", "debit": 100000, "credit": 0},
                    {"account_name": "Share Capital", "debit": 0, "credit": 100000}
                ],
                "balance_sheet": {
                    "as_on": "2025-03-31",
                    "assets": {"total": 100000},
                    "liabilities": {"total": 100000},
                    "total_assets": 100000,
                    "total_liabilities": 100000
                },
                "profit_loss": {
                    "period": "2024-25",
                    "revenue": 500000,
                    "total_expenses": 300000,
                    "net_profit": 200000
                },
                "cash_flow": {
                    "operating": 150000,
                    "investing": -50000,
                    "financing": -20000,
                    "net_change": 80000,
                    "opening_cash": 20000,
                    "closing_cash": 100000
                },
                "ratios": {
                    "profitability": {"net_profit_margin": 40.0},
                    "liquidity": {"current_ratio": 2.5}
                }
            }
            
            response = requests.post(f"{self.base_url}/financial/generate-pdf", 
                                   json=pdf_data, timeout=30)
            success = response.status_code == 200
            
            if success:
                # Check if response is PDF content
                success = response.headers.get('content-type') == 'application/pdf'
                if success and len(response.content) > 1000:  # Basic size check
                    success = True
                else:
                    success = False
            
            self.log_test("PDF Generation", success,
                         None if success else f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("PDF Generation", False, str(e))
            return False

    def test_excel_generation(self):
        """Test Excel generation endpoint"""
        try:
            # Test data for Excel generation
            excel_data = {
                "company_name": "Test Company Ltd",
                "financial_year": "2024-25",
                "trial_balance": [
                    {"account_name": "Cash", "debit": 100000, "credit": 0},
                    {"account_name": "Share Capital", "debit": 0, "credit": 100000}
                ],
                "balance_sheet": {
                    "assets": {
                        "current_assets": {
                            "items": [{"name": "Cash", "amount": 100000}]
                        }
                    },
                    "liabilities": {
                        "equity": {
                            "items": [{"name": "Share Capital", "amount": 100000}]
                        }
                    }
                },
                "profit_loss": {
                    "income": {
                        "items": [{"name": "Sales", "amount": 500000}]
                    },
                    "expenses": {
                        "items": [{"name": "Cost of Sales", "amount": 300000}]
                    }
                },
                "ratios": {
                    "profitability": {"net_profit_margin": 40.0},
                    "liquidity": {"current_ratio": 2.5}
                }
            }
            
            response = requests.post(f"{self.base_url}/financial/generate-excel", 
                                   json=excel_data, timeout=30)
            success = response.status_code == 200
            
            if success:
                # Check if response is Excel content
                content_type = response.headers.get('content-type', '')
                success = 'spreadsheetml' in content_type
                if success and len(response.content) > 1000:  # Basic size check
                    success = True
                else:
                    success = False
            
            self.log_test("Excel Generation", success,
                         None if success else f"Status: {response.status_code}")
            return success
        except Exception as e:
            self.log_test("Excel Generation", False, str(e))
            return False

    def run_all_tests(self):
        """Run all backend API tests"""
        print("🔍 Starting Financial Statements API Tests...")
        print(f"Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test API connectivity first
        if not self.test_api_status():
            print("\n❌ API not accessible. Stopping tests.")
            return False
        
        # Run all tests
        self.test_ratio_calculation()
        self.test_financial_statements_crud()
        self.test_pdf_generation()
        self.test_excel_generation()
        
        # Print summary
        print("=" * 60)
        print(f"📊 Test Results: {self.tests_passed}/{self.tests_run} passed")
        
        if self.errors:
            print("\n🚨 Errors encountered:")
            for error in self.errors:
                print(f"   - {error}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"Success Rate: {success_rate:.1f}%")
        
        return self.tests_passed == self.tests_run

def main():
    """Main test execution"""
    tester = FinancialStatementsAPITester()
    success = tester.run_all_tests()
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())