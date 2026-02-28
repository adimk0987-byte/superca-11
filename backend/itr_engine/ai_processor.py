"""
AI Document Processor with Multi-Provider Fallback

Supports:
1. Emergent LLM Key (Primary - works for OpenAI/Gemini/Claude)
2. Direct OpenAI (Fallback 1)
3. Direct Gemini (Fallback 2)

Extracts data from:
- Form 16
- Bank Statements
- AIS/TIS
- Investment Proofs
"""

import os
import json
import logging
import tempfile
import base64
from typing import Dict, Any, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)

# Try importing AI libraries
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType
    EMERGENT_AVAILABLE = True
except ImportError:
    EMERGENT_AVAILABLE = False
    logger.warning("Emergent integrations not available")

try:
    import openai
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    logger.warning("OpenAI not available")

try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    logger.warning("Gemini not available")


class AIDocumentProcessor:
    """Multi-provider AI document processor with automatic fallback"""
    
    def __init__(
        self,
        emergent_key: Optional[str] = None,
        openai_key: Optional[str] = None,
        gemini_key: Optional[str] = None
    ):
        self.emergent_key = emergent_key or os.environ.get('EMERGENT_LLM_KEY', '')
        self.openai_key = openai_key or os.environ.get('OPENAI_API_KEY', '')
        self.gemini_key = gemini_key or os.environ.get('GEMINI_API_KEY', '')
        
        # Determine available providers
        self.providers = []
        if self.emergent_key and EMERGENT_AVAILABLE:
            self.providers.append('emergent')
        if self.openai_key and OPENAI_AVAILABLE:
            self.providers.append('openai')
        if self.gemini_key and GEMINI_AVAILABLE:
            self.providers.append('gemini')
        
        logger.info(f"AI Processor initialized with providers: {self.providers}")
    
    async def extract_form16_data(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """
        Extract data from Form 16
        
        Args:
            file_content: File bytes
            file_name: Original file name
            mime_type: MIME type
        
        Returns:
            Extracted Form 16 data
        """
        prompt = """Extract ALL the following data from this Form-16 document:

1. Employee PAN
2. Employee Name
3. Employer TAN
4. Employer Name
5. Financial Year (e.g., 2024-25)
6. Assessment Year
7. Gross Salary (Total income under head salaries)
8. Allowances exempt under Section 10
9. Standard Deduction
10. Professional Tax
11. Section 80C deductions (total)
12. Section 80D deductions (health insurance)
13. Section 80CCD(1B) - NPS
14. Section 80CCD(2) - Employer NPS
15. Section 80E - Education loan interest
16. Section 80G - Donations
17. Other deductions
18. Total Chapter VI-A deductions
19. Taxable Income
20. Tax on Total Income
21. Rebate u/s 87A (if applicable)
22. Surcharge
23. Health & Education Cess
24. Total Tax Liability
25. TDS Deducted (Total)
26. Relief under Section 89 (if any)

Return ONLY a valid JSON object with these exact keys (no markdown, no explanation):
{
    "employee_pan": "string or null",
    "employee_name": "string or null",
    "employer_tan": "string or null",
    "employer_name": "string or null",
    "financial_year": "string or null",
    "assessment_year": "string or null",
    "gross_salary": number or 0,
    "allowances_exempt": number or 0,
    "standard_deduction": number or 0,
    "professional_tax": number or 0,
    "section_80c": number or 0,
    "section_80d": number or 0,
    "section_80ccd1b": number or 0,
    "section_80ccd2": number or 0,
    "section_80e": number or 0,
    "section_80g": number or 0,
    "other_deductions": number or 0,
    "total_chapter_vi_a": number or 0,
    "taxable_income": number or 0,
    "tax_on_income": number or 0,
    "rebate_87a": number or 0,
    "surcharge": number or 0,
    "cess": number or 0,
    "total_tax_liability": number or 0,
    "tds_deducted": number or 0,
    "relief_89": number or 0
}

For any missing field, use null for strings and 0 for numbers."""

        return await self._process_document(file_content, file_name, mime_type, prompt, "form16")
    
    async def extract_bank_statement(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """Extract data from bank statement"""
        prompt = """Analyze this bank statement and extract:

1. Account holder name
2. Account number
3. Bank name
4. Statement period (start and end dates)
5. Opening balance
6. Closing balance
7. Total credits
8. Total debits
9. Interest earned (if visible)
10. Large transactions (above Rs. 50,000) - list each with date, description, amount
11. TDS on interest (if deducted)

Return ONLY a valid JSON object:
{
    "account_holder": "string or null",
    "account_number": "string or null",
    "bank_name": "string or null",
    "period_start": "YYYY-MM-DD or null",
    "period_end": "YYYY-MM-DD or null",
    "opening_balance": number or 0,
    "closing_balance": number or 0,
    "total_credits": number or 0,
    "total_debits": number or 0,
    "interest_earned": number or 0,
    "tds_on_interest": number or 0,
    "large_transactions": [
        {"date": "YYYY-MM-DD", "description": "string", "amount": number, "type": "credit/debit"}
    ]
}"""

        return await self._process_document(file_content, file_name, mime_type, prompt, "bank_statement")
    
    async def extract_ais_data(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """Extract data from Annual Information Statement (AIS)"""
        prompt = """Extract ALL information from this Annual Information Statement (AIS):

1. PAN of the taxpayer
2. Name
3. Financial Year
4. Salary income reported
5. Interest income reported (from all sources)
6. Dividend income reported
7. Securities transactions (buy/sell)
8. Property transactions
9. Foreign remittances
10. High-value transactions
11. TDS credits (section-wise)
12. TCS credits
13. Advance tax payments
14. Self-assessment tax payments
15. Specified Financial Transactions (SFT)

Return ONLY a valid JSON object:
{
    "pan": "string or null",
    "name": "string or null",
    "financial_year": "string or null",
    "salary_income": number or 0,
    "interest_income": number or 0,
    "dividend_income": number or 0,
    "capital_gains_reported": number or 0,
    "property_transactions": [
        {"type": "sale/purchase", "value": number, "date": "string"}
    ],
    "high_value_transactions": [
        {"type": "string", "value": number}
    ],
    "tds_credits": {
        "192_salary": number,
        "194A_interest": number,
        "194_dividend": number,
        "other": number,
        "total": number
    },
    "tcs_credits": number or 0,
    "advance_tax": number or 0,
    "self_assessment_tax": number or 0,
    "sft_transactions": [
        {"type": "string", "value": number}
    ]
}"""

        return await self._process_document(file_content, file_name, mime_type, prompt, "ais")
    
    async def extract_investment_proofs(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str = "application/pdf"
    ) -> Dict[str, Any]:
        """Extract investment proof details"""
        prompt = """Analyze this investment document and extract:

1. Type of investment (PPF/ELSS/LIC/FD/NPS/Sukanya/etc.)
2. Investment amount
3. Policy/Account number
4. Investor name
5. Investment date
6. Financial year
7. Section for deduction (80C/80CCD/80D etc.)
8. Maturity date (if applicable)
9. Premium/contribution frequency

Return ONLY a valid JSON object:
{
    "investment_type": "string",
    "section": "80C/80CCD/80D/etc",
    "amount": number,
    "account_number": "string or null",
    "investor_name": "string or null",
    "investment_date": "string or null",
    "financial_year": "string or null",
    "maturity_date": "string or null",
    "frequency": "annual/monthly/quarterly/one-time",
    "eligible_for_deduction": true/false
}"""

        return await self._process_document(file_content, file_name, mime_type, prompt, "investment")
    
    async def _process_document(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str,
        prompt: str,
        doc_type: str
    ) -> Dict[str, Any]:
        """
        Process document with multi-provider fallback
        
        Tries providers in order: Emergent -> OpenAI -> Gemini
        """
        last_error = None
        
        for provider in self.providers:
            try:
                logger.info(f"Trying {provider} for {doc_type} extraction")
                
                if provider == 'emergent':
                    result = await self._process_with_emergent(file_content, file_name, mime_type, prompt)
                elif provider == 'openai':
                    result = await self._process_with_openai(file_content, file_name, mime_type, prompt)
                elif provider == 'gemini':
                    result = await self._process_with_gemini(file_content, file_name, mime_type, prompt)
                else:
                    continue
                
                if result:
                    result['_provider'] = provider
                    result['_extracted_at'] = datetime.now().isoformat()
                    result['_doc_type'] = doc_type
                    return result
                    
            except Exception as e:
                logger.error(f"Error with {provider}: {str(e)}")
                last_error = e
                continue
        
        # All providers failed
        if last_error:
            raise Exception(f"All AI providers failed. Last error: {str(last_error)}")
        else:
            raise Exception("No AI providers available. Please configure EMERGENT_LLM_KEY, OPENAI_API_KEY, or GEMINI_API_KEY")
    
    async def _process_with_emergent(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str,
        prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Process with Emergent LLM (supports OpenAI/Gemini/Claude via universal key)"""
        if not self.emergent_key:
            return None
        
        # Save to temp file
        suffix = self._get_suffix(file_name)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            file_obj = FileContentWithMimeType(
                mime_type=mime_type,
                file_path=tmp_path
            )
            
            # Try Gemini first (better for document analysis)
            chat = LlmChat(
                api_key=self.emergent_key,
                session_id=f"itr_extract_{datetime.now().timestamp()}",
                system_message="You are an expert document analyzer for Indian tax documents. Extract data accurately."
            ).with_model("gemini", "gemini-2.5-pro")
            
            message = UserMessage(text=prompt, file_contents=[file_obj])
            response = await chat.send_message(message)
            
            return self._parse_json_response(response)
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    async def _process_with_openai(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str,
        prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Process with OpenAI GPT-4 Vision"""
        if not self.openai_key:
            return None
        
        client = openai.OpenAI(api_key=self.openai_key)
        
        # Convert to base64
        b64_content = base64.b64encode(file_content).decode('utf-8')
        
        # Determine image type for OpenAI
        if 'pdf' in mime_type.lower():
            # OpenAI doesn't directly support PDF - would need conversion
            # For now, skip if PDF
            logger.warning("OpenAI doesn't support PDF directly, skipping")
            return None
        
        image_url = f"data:{mime_type};base64,{b64_content}"
        
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert document analyzer for Indian tax documents. Extract data accurately."
                },
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {"type": "image_url", "image_url": {"url": image_url}}
                    ]
                }
            ],
            max_tokens=4096
        )
        
        return self._parse_json_response(response.choices[0].message.content)
    
    async def _process_with_gemini(
        self,
        file_content: bytes,
        file_name: str,
        mime_type: str,
        prompt: str
    ) -> Optional[Dict[str, Any]]:
        """Process with Google Gemini"""
        if not self.gemini_key:
            return None
        
        genai.configure(api_key=self.gemini_key)
        model = genai.GenerativeModel('gemini-2.0-flash')
        
        # Upload file
        suffix = self._get_suffix(file_name)
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
            tmp.write(file_content)
            tmp_path = tmp.name
        
        try:
            uploaded_file = genai.upload_file(tmp_path, mime_type=mime_type)
            response = model.generate_content([prompt, uploaded_file])
            return self._parse_json_response(response.text)
        finally:
            try:
                os.unlink(tmp_path)
            except:
                pass
    
    @staticmethod
    def _parse_json_response(response: str) -> Dict[str, Any]:
        """Parse JSON from AI response"""
        if not response:
            return {}
        
        response = response.strip()
        
        # Remove markdown code blocks
        if response.startswith('```json'):
            response = response[7:]
        if response.startswith('```'):
            response = response[3:]
        if response.endswith('```'):
            response = response[:-3]
        
        response = response.strip()
        
        try:
            return json.loads(response)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse error: {e}")
            # Try to extract JSON from response
            import re
            json_match = re.search(r'\{[\s\S]*\}', response)
            if json_match:
                try:
                    return json.loads(json_match.group())
                except:
                    pass
            return {}
    
    @staticmethod
    def _get_suffix(file_name: str) -> str:
        """Get file suffix from name"""
        if '.' in file_name:
            return '.' + file_name.rsplit('.', 1)[-1].lower()
        return '.pdf'


class DataReconciler:
    """Reconcile data from multiple sources"""
    
    THRESHOLD_MINOR = 100  # Auto-fix differences under Rs. 100
    THRESHOLD_MAJOR = 10000  # Flag differences over Rs. 10,000
    
    def reconcile(
        self,
        form16_data: Dict[str, Any],
        ais_data: Optional[Dict[str, Any]] = None,
        bank_data: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Reconcile data from Form 16, AIS, and Bank Statement
        
        Returns:
            Reconciled data with mismatches flagged
        """
        result = {
            "reconciled_data": {},
            "mismatches": [],
            "auto_fixed": [],
            "needs_review": [],
            "confidence_score": 1.0
        }
        
        # Start with Form 16 as base
        result["reconciled_data"] = form16_data.copy()
        
        if ais_data:
            # Reconcile salary
            self._reconcile_field(
                result,
                "salary",
                form16_data.get('gross_salary', 0),
                ais_data.get('salary_income', 0),
                "Form 16",
                "AIS"
            )
            
            # Reconcile TDS
            self._reconcile_field(
                result,
                "tds",
                form16_data.get('tds_deducted', 0),
                ais_data.get('tds_credits', {}).get('total', 0),
                "Form 16",
                "AIS"
            )
            
            # Add interest income from AIS
            if ais_data.get('interest_income', 0) > 0:
                result["reconciled_data"]["interest_income"] = ais_data['interest_income']
            
            # Add dividend income from AIS
            if ais_data.get('dividend_income', 0) > 0:
                result["reconciled_data"]["dividend_income"] = ais_data['dividend_income']
        
        if bank_data:
            # Reconcile interest income
            bank_interest = bank_data.get('interest_earned', 0)
            ais_interest = ais_data.get('interest_income', 0) if ais_data else 0
            
            if bank_interest > 0 or ais_interest > 0:
                self._reconcile_field(
                    result,
                    "interest_income",
                    bank_interest,
                    ais_interest,
                    "Bank Statement",
                    "AIS"
                )
            
            # TDS on interest
            if bank_data.get('tds_on_interest', 0) > 0:
                result["reconciled_data"]["tds_on_interest"] = bank_data['tds_on_interest']
        
        # Calculate confidence score based on mismatches
        total_mismatches = len(result["mismatches"])
        major_mismatches = len(result["needs_review"])
        
        if major_mismatches > 0:
            result["confidence_score"] = max(0.5, 1.0 - (major_mismatches * 0.15))
        elif total_mismatches > 0:
            result["confidence_score"] = max(0.8, 1.0 - (total_mismatches * 0.05))
        
        return result
    
    def _reconcile_field(
        self,
        result: Dict,
        field: str,
        value1: float,
        value2: float,
        source1: str,
        source2: str
    ):
        """Reconcile a single field between two sources"""
        if value1 == 0 and value2 == 0:
            return
        
        diff = abs(value1 - value2)
        
        if diff == 0:
            return
        
        mismatch = {
            "field": field,
            source1: value1,
            source2: value2,
            "difference": diff
        }
        
        if diff <= self.THRESHOLD_MINOR:
            # Auto-fix: use higher value
            result["reconciled_data"][field] = max(value1, value2)
            result["auto_fixed"].append({
                **mismatch,
                "action": f"Auto-fixed to {max(value1, value2)} (rounding difference)"
            })
        elif diff <= self.THRESHOLD_MAJOR:
            # Minor mismatch: flag but use Form 16 value
            result["mismatches"].append({
                **mismatch,
                "severity": "warning",
                "recommendation": f"Minor difference of Rs. {diff:,.0f}. Using {source1} value."
            })
        else:
            # Major mismatch: needs review
            result["needs_review"].append({
                **mismatch,
                "severity": "error",
                "recommendation": f"Major difference of Rs. {diff:,.0f}. Please verify with {source2}."
            })
            result["mismatches"].append(mismatch)


class ITRFormSelector:
    """Select appropriate ITR form based on income sources"""
    
    @staticmethod
    def select_form(user_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Select ITR form type
        
        Returns:
            {
                "form": "ITR-1/2/3/4",
                "reason": "explanation",
                "eligible_forms": ["list of forms user can file"]
            }
        """
        income = user_data.get('income', {})
        
        # Check income sources
        has_salary = income.get('salary', {}).get('gross_salary', 0) > 0
        has_hp = income.get('house_property', {}).get('rental_income', 0) > 0
        has_cg = (
            income.get('capital_gains', {}).get('short_term', 0) > 0 or
            income.get('capital_gains', {}).get('long_term', 0) > 0
        )
        has_business = income.get('business', {}).get('gross_receipts', 0) > 0
        has_foreign = user_data.get('personal', {}).get('has_foreign_income', False)
        has_multiple_hp = income.get('house_property', {}).get('property_count', 1) > 1
        
        gross_income = income.get('salary', {}).get('gross_salary', 0)
        
        # ITR-1 (Sahaj): Simplest
        # - Salary/pension upto 50L
        # - One house property
        # - Other sources (interest, etc.)
        # - NO capital gains, NO business income, NO foreign income
        
        if (has_salary and 
            gross_income <= 5000000 and 
            not has_cg and 
            not has_business and 
            not has_foreign and
            not has_multiple_hp):
            return {
                "form": "ITR-1",
                "reason": "You have salary income up to Rs. 50 lakhs with no capital gains or business income",
                "eligible_forms": ["ITR-1", "ITR-2"],
                "description": "ITR-1 (Sahaj) - For individuals with salary/pension and interest income"
            }
        
        # ITR-2: Individuals with capital gains or multiple properties
        if (not has_business and (has_cg or has_multiple_hp or has_foreign)):
            return {
                "form": "ITR-2",
                "reason": "You have capital gains, multiple house properties, or foreign income",
                "eligible_forms": ["ITR-2"],
                "description": "ITR-2 - For individuals with capital gains or foreign income"
            }
        
        # ITR-4 (Sugam): Presumptive income
        business_income = income.get('business', {}).get('gross_receipts', 0)
        if has_business and business_income <= 20000000:  # Upto 2 crore
            return {
                "form": "ITR-4",
                "reason": "You have business income under Rs. 2 crore, eligible for presumptive taxation",
                "eligible_forms": ["ITR-3", "ITR-4"],
                "description": "ITR-4 (Sugam) - For presumptive income scheme"
            }
        
        # ITR-3: Business/profession income
        if has_business:
            return {
                "form": "ITR-3",
                "reason": "You have business/profession income",
                "eligible_forms": ["ITR-3"],
                "description": "ITR-3 - For individuals with business/profession income"
            }
        
        # Default to ITR-2
        return {
            "form": "ITR-2",
            "reason": "Based on your income sources, ITR-2 is recommended",
            "eligible_forms": ["ITR-2"],
            "description": "ITR-2 - For individuals and HUFs not having income from business"
        }
