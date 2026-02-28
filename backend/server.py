from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Form
from fastapi.responses import Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import json
import tempfile
from emergentintegrations.llm.chat import LlmChat, UserMessage, FileContentWithMimeType

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# API Keys
GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')
EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

class TrialBalanceEntry(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    account_name: str
    account_group: str = ""
    debit: float = 0.0
    credit: float = 0.0

class FinancialContext(BaseModel):
    company_name: str
    financial_year: str = "2024-25"
    period_end_date: str = "2025-03-31"

class ScheduleItem(BaseModel):
    name: str
    amount: float
    previous_year: float = 0.0

class ShareCapitalSchedule(BaseModel):
    authorized_capital: float = 0.0
    issued_capital: float = 0.0
    paid_up_capital: float = 0.0
    shareholders: List[Dict[str, Any]] = []

class ReservesSchedule(BaseModel):
    securities_premium: float = 0.0
    general_reserve: float = 0.0
    retained_earnings: float = 0.0
    other_reserves: float = 0.0

class FixedAssetItem(BaseModel):
    asset_class: str
    gross_block: float = 0.0
    dep_rate: float = 0.0
    dep_for_year: float = 0.0
    wdv: float = 0.0

class InventorySchedule(BaseModel):
    raw_materials: float = 0.0
    work_in_progress: float = 0.0
    finished_goods: float = 0.0
    stock_in_trade: float = 0.0
    stores_spares: float = 0.0
    loose_tools: float = 0.0

class AgeingEntry(BaseModel):
    name: str
    days_0_30: float = 0.0
    days_31_60: float = 0.0
    days_61_90: float = 0.0
    days_over_90: float = 0.0

class FinancialStatement(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    company_name: str
    financial_year: str
    period_end_date: str
    trial_balance: List[Dict[str, Any]] = []
    share_capital: Optional[Dict[str, Any]] = None
    reserves: Optional[Dict[str, Any]] = None
    fixed_assets: List[Dict[str, Any]] = []
    inventory: Optional[Dict[str, Any]] = None
    debtors: List[Dict[str, Any]] = []
    creditors: List[Dict[str, Any]] = []
    notes: List[Dict[str, Any]] = []
    balance_sheet: Optional[Dict[str, Any]] = None
    profit_loss: Optional[Dict[str, Any]] = None
    cash_flow: Optional[Dict[str, Any]] = None
    ratios: Optional[Dict[str, Any]] = None
    status: str = "draft"
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== HELPER FUNCTIONS ====================

def serialize_doc(doc):
    if isinstance(doc, dict):
        for key, value in doc.items():
            if isinstance(value, datetime):
                doc[key] = value.isoformat()
            elif isinstance(value, list):
                doc[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
    return doc

def format_inr(amount):
    """Format amount in Indian Rupee style"""
    if amount < 0:
        return f"({abs(amount):,.2f})"
    return f"{amount:,.2f}"

# ==================== AI EXTRACTION ====================

async def extract_trial_balance_with_ai(file_path: str, mime_type: str) -> Dict[str, Any]:
    """Extract trial balance from uploaded file using Gemini 3 Flash"""
    try:
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"tb_extract_{uuid.uuid4()}",
            system_message="You are an expert Indian Chartered Accountant. Extract financial data accurately from documents."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text="""Extract the Trial Balance data from this document. Return ONLY a JSON object (no markdown):
{
    "company_name": "string or null",
    "financial_year": "string like 2024-25 or null",
    "accounts": [
        {
            "account_name": "string",
            "account_group": "fixed_assets|current_assets|investments|equity|non_current_liabilities|current_liabilities|income|expenses",
            "debit": number or 0,
            "credit": number or 0
        }
    ]
}

Account Group Classification:
- fixed_assets: Land, Building, Plant & Machinery, Furniture, Vehicles, Computers
- current_assets: Cash, Bank, Trade Receivables, Inventory, Prepaid
- investments: Long term and short term investments
- equity: Share Capital, Reserves, Retained Earnings
- non_current_liabilities: Long Term Borrowings, Deferred Tax
- current_liabilities: Trade Payables, Short Term Borrowings, Provisions
- income: Sales, Service Revenue, Interest Income, Other Income
- expenses: Cost of Goods Sold, Salary, Rent, Depreciation, Interest Expense

Extract ALL accounts with their debit/credit balances. Numbers should be without currency symbols.""",
            file_contents=[file_content]
        )
        
        response = await chat.send_message(user_message)
        
        response_text = response.strip()
        if response_text.startswith('```json'):
            response_text = response_text[7:]
        if response_text.startswith('```'):
            response_text = response_text[3:]
        if response_text.endswith('```'):
            response_text = response_text[:-3]
        
        return json.loads(response_text.strip())
    except Exception as e:
        logger.error(f"AI extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

async def extract_fixed_assets_with_ai(file_path: str, mime_type: str) -> Dict[str, Any]:
    """Extract fixed asset register using Gemini 3 Flash"""
    try:
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"fa_extract_{uuid.uuid4()}",
            system_message="You are an expert CA. Extract fixed asset data accurately."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text="""Extract Fixed Asset Register data. Return ONLY JSON:
{
    "assets": [
        {
            "asset_class": "Building|Plant & Machinery|Furniture|Vehicles|Computers|Intangible",
            "gross_block": number,
            "dep_rate": number (percentage),
            "dep_for_year": number,
            "wdv": number
        }
    ],
    "additions": [
        {"date": "DD-MM-YYYY", "asset": "string", "amount": number}
    ],
    "deletions": [
        {"date": "DD-MM-YYYY", "asset": "string", "sale_amount": number, "profit_loss": number}
    ]
}""",
            file_contents=[file_content]
        )
        
        response = await chat.send_message(user_message)
        response_text = response.strip()
        if '```' in response_text:
            response_text = response_text.split('```')[1].replace('json', '').strip()
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Fixed asset extraction error: {str(e)}")
        return {"assets": [], "additions": [], "deletions": []}

async def extract_ageing_with_ai(file_path: str, mime_type: str, doc_type: str) -> List[Dict[str, Any]]:
    """Extract debtors/creditors ageing using Gemini 3 Flash"""
    try:
        file_content = FileContentWithMimeType(
            file_path=file_path,
            mime_type=mime_type
        )
        
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"ageing_extract_{uuid.uuid4()}",
            system_message="You are an expert CA. Extract ageing data accurately."
        ).with_model("gemini", "gemini-2.5-flash")
        
        user_message = UserMessage(
            text=f"""Extract {doc_type} Ageing data. Return ONLY JSON array:
[
    {{
        "name": "Party/Customer/Vendor name",
        "days_0_30": number,
        "days_31_60": number,
        "days_61_90": number,
        "days_over_90": number
    }}
]""",
            file_contents=[file_content]
        )
        
        response = await chat.send_message(user_message)
        response_text = response.strip()
        if '```' in response_text:
            response_text = response_text.split('```')[1].replace('json', '').strip()
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Ageing extraction error: {str(e)}")
        return []

# ==================== ROUTES ====================

@api_router.get("/")
async def root():
    return {"message": "Financial Statement API v1.0", "status": "running"}

# Trial Balance Extraction
@api_router.post("/financial/extract-trial-balance")
async def extract_trial_balance(file: UploadFile = File(...)):
    """Extract trial balance from uploaded file using Gemini AI"""
    temp_file_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else '.pdf'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_file_path = temp_file.name
        
        mime_type = file.content_type or "application/pdf"
        if file.filename:
            if file.filename.endswith('.xlsx') or file.filename.endswith('.xls'):
                mime_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            elif file.filename.endswith('.csv'):
                mime_type = "text/csv"
            elif file.filename.endswith(('.png', '.jpg', '.jpeg')):
                mime_type = f"image/{file.filename.split('.')[-1]}"
        
        data = await extract_trial_balance_with_ai(temp_file_path, mime_type)
        
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Trial balance extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

# Fixed Assets Extraction
@api_router.post("/financial/extract-fixed-assets")
async def extract_fixed_assets(file: UploadFile = File(...)):
    """Extract fixed asset register using Gemini AI"""
    temp_file_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else '.pdf'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_file_path = temp_file.name
        
        mime_type = file.content_type or "application/pdf"
        data = await extract_fixed_assets_with_ai(temp_file_path, mime_type)
        
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Fixed assets extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

# Ageing Extraction
@api_router.post("/financial/extract-ageing")
async def extract_ageing(file: UploadFile = File(...), doc_type: str = Form("debtors")):
    """Extract debtors/creditors ageing using Gemini AI"""
    temp_file_path = None
    try:
        suffix = Path(file.filename).suffix if file.filename else '.pdf'
        with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
            contents = await file.read()
            temp_file.write(contents)
            temp_file_path = temp_file.name
        
        mime_type = file.content_type or "application/pdf"
        data = await extract_ageing_with_ai(temp_file_path, mime_type, doc_type)
        
        return {"success": True, "data": data}
    except Exception as e:
        logger.error(f"Ageing extraction error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if temp_file_path and os.path.exists(temp_file_path):
            os.unlink(temp_file_path)

# Save Financial Statement
@api_router.post("/financial/statements")
async def save_financial_statement(statement: FinancialStatement):
    """Save a financial statement to database"""
    doc = serialize_doc(statement.model_dump())
    await db.financial_statements.insert_one(doc)
    return {"success": True, "id": statement.id}

# Get Financial Statements
@api_router.get("/financial/statements")
async def get_financial_statements():
    """Get all financial statements"""
    statements = await db.financial_statements.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return statements

# Get Single Financial Statement
@api_router.get("/financial/statements/{statement_id}")
async def get_financial_statement(statement_id: str):
    """Get a single financial statement"""
    statement = await db.financial_statements.find_one({"id": statement_id}, {"_id": 0})
    if not statement:
        raise HTTPException(status_code=404, detail="Statement not found")
    return statement

# Update Financial Statement
@api_router.put("/financial/statements/{statement_id}")
async def update_financial_statement(statement_id: str, statement: FinancialStatement):
    """Update a financial statement"""
    doc = serialize_doc(statement.model_dump())
    result = await db.financial_statements.update_one(
        {"id": statement_id},
        {"$set": doc}
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Statement not found")
    return {"success": True}

# Calculate Ratios
@api_router.post("/financial/calculate-ratios")
async def calculate_ratios(data: Dict[str, Any]):
    """Calculate financial ratios from statement data"""
    try:
        # Extract values
        current_assets = data.get('current_assets', 0)
        current_liabilities = data.get('current_liabilities', 0)
        inventory = data.get('inventory', 0)
        cash = data.get('cash', 0)
        total_assets = data.get('total_assets', 0)
        total_equity = data.get('total_equity', 0)
        total_debt = data.get('total_debt', 0)
        revenue = data.get('revenue', 0)
        gross_profit = data.get('gross_profit', 0)
        operating_profit = data.get('operating_profit', 0)
        net_profit = data.get('net_profit', 0)
        interest_expense = data.get('interest_expense', 1)
        cost_of_goods_sold = data.get('cost_of_goods_sold', 0)
        trade_receivables = data.get('trade_receivables', 0)
        trade_payables = data.get('trade_payables', 0)
        
        # Profitability Ratios
        gross_profit_margin = (gross_profit / revenue * 100) if revenue > 0 else 0
        operating_profit_margin = (operating_profit / revenue * 100) if revenue > 0 else 0
        net_profit_margin = (net_profit / revenue * 100) if revenue > 0 else 0
        roe = (net_profit / total_equity * 100) if total_equity > 0 else 0
        roa = (net_profit / total_assets * 100) if total_assets > 0 else 0
        
        # Liquidity Ratios
        current_ratio = (current_assets / current_liabilities) if current_liabilities > 0 else 0
        quick_ratio = ((current_assets - inventory) / current_liabilities) if current_liabilities > 0 else 0
        cash_ratio = (cash / current_liabilities) if current_liabilities > 0 else 0
        
        # Solvency Ratios
        debt_equity_ratio = (total_debt / total_equity) if total_equity > 0 else 0
        interest_coverage = (operating_profit / interest_expense) if interest_expense > 0 else 0
        
        # Efficiency Ratios
        inventory_turnover = (cost_of_goods_sold / inventory) if inventory > 0 else 0
        debtors_turnover = (revenue / trade_receivables) if trade_receivables > 0 else 0
        creditors_turnover = (cost_of_goods_sold / trade_payables) if trade_payables > 0 else 0
        working_capital = current_assets - current_liabilities
        working_capital_turnover = (revenue / working_capital) if working_capital > 0 else 0
        
        ratios = {
            "profitability": {
                "gross_profit_margin": round(gross_profit_margin, 2),
                "operating_profit_margin": round(operating_profit_margin, 2),
                "net_profit_margin": round(net_profit_margin, 2),
                "return_on_equity": round(roe, 2),
                "return_on_assets": round(roa, 2)
            },
            "liquidity": {
                "current_ratio": round(current_ratio, 2),
                "quick_ratio": round(quick_ratio, 2),
                "cash_ratio": round(cash_ratio, 2)
            },
            "solvency": {
                "debt_equity_ratio": round(debt_equity_ratio, 2),
                "interest_coverage_ratio": round(interest_coverage, 2)
            },
            "efficiency": {
                "inventory_turnover": round(inventory_turnover, 2),
                "debtors_turnover": round(debtors_turnover, 2),
                "creditors_turnover": round(creditors_turnover, 2),
                "working_capital_turnover": round(working_capital_turnover, 2)
            }
        }
        
        return {"success": True, "ratios": ratios}
    except Exception as e:
        logger.error(f"Ratio calculation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate PDF
@api_router.post("/financial/generate-pdf")
async def generate_pdf(data: Dict[str, Any]):
    """Generate financial statements PDF package"""
    try:
        from reportlab.lib import colors
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import mm
        from reportlab.lib.enums import TA_CENTER, TA_RIGHT
        from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
        from io import BytesIO
        
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        
        styles = getSampleStyleSheet()
        styles.add(ParagraphStyle(name='Title2', parent=styles['Heading1'], fontSize=16, spaceAfter=12, alignment=TA_CENTER))
        styles.add(ParagraphStyle(name='Subtitle', parent=styles['Heading2'], fontSize=12, spaceAfter=8))
        
        story = []
        
        company_name = data.get('company_name', 'Company Name')
        financial_year = data.get('financial_year', '2024-25')
        
        # Cover Page
        story.append(Paragraph(company_name.upper(), styles['Title2']))
        story.append(Paragraph(f"Financial Statements for FY {financial_year}", styles['Subtitle']))
        story.append(Spacer(1, 24))
        
        # Balance Sheet
        balance_sheet = data.get('balance_sheet', {})
        if balance_sheet:
            story.append(Paragraph("BALANCE SHEET", styles['Title2']))
            story.append(Paragraph(f"As on {data.get('period_end_date', '31st March 2025')}", styles['Subtitle']))
            story.append(Spacer(1, 12))
            
            bs_data = [['Particulars', 'Amount (Rs.)']]
            
            # Assets
            bs_data.append(['ASSETS', ''])
            assets = balance_sheet.get('assets', {})
            for category, items in assets.items():
                if isinstance(items, dict) and 'total' in items:
                    bs_data.append([category.replace('_', ' ').title(), f"{items['total']:,.2f}"])
            bs_data.append(['Total Assets', f"{balance_sheet.get('total_assets', 0):,.2f}"])
            
            # Liabilities
            bs_data.append(['', ''])
            bs_data.append(['EQUITY & LIABILITIES', ''])
            liabilities = balance_sheet.get('liabilities', {})
            for category, items in liabilities.items():
                if isinstance(items, dict) and 'total' in items:
                    bs_data.append([category.replace('_', ' ').title(), f"{items['total']:,.2f}"])
            bs_data.append(['Total Equity & Liabilities', f"{balance_sheet.get('total_liabilities', 0):,.2f}"])
            
            bs_table = Table(bs_data, colWidths=[350, 120])
            bs_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(bs_table)
            story.append(PageBreak())
        
        # Profit & Loss
        profit_loss = data.get('profit_loss', {})
        if profit_loss:
            story.append(Paragraph("STATEMENT OF PROFIT AND LOSS", styles['Title2']))
            story.append(Paragraph(f"For the year ended {data.get('period_end_date', '31st March 2025')}", styles['Subtitle']))
            story.append(Spacer(1, 12))
            
            pl_data = [['Particulars', 'Amount (Rs.)']]
            pl_data.append(['Revenue from Operations', f"{profit_loss.get('revenue', 0):,.2f}"])
            pl_data.append(['Other Income', f"{profit_loss.get('other_income', 0):,.2f}"])
            pl_data.append(['Total Income', f"{profit_loss.get('total_income', 0):,.2f}"])
            pl_data.append(['', ''])
            pl_data.append(['Total Expenses', f"{profit_loss.get('total_expenses', 0):,.2f}"])
            pl_data.append(['Profit Before Tax', f"{profit_loss.get('profit_before_tax', 0):,.2f}"])
            pl_data.append(['Tax Expense', f"{profit_loss.get('tax_expense', 0):,.2f}"])
            pl_data.append(['Profit After Tax', f"{profit_loss.get('net_profit', 0):,.2f}"])
            
            pl_table = Table(pl_data, colWidths=[350, 120])
            pl_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(pl_table)
            story.append(PageBreak())
        
        # Cash Flow Statement
        cash_flow = data.get('cash_flow', {})
        if cash_flow:
            story.append(Paragraph("CASH FLOW STATEMENT", styles['Title2']))
            story.append(Spacer(1, 12))
            
            cf_data = [['Particulars', 'Amount (Rs.)']]
            cf_data.append(['A. Cash Flow from Operating Activities', f"{cash_flow.get('operating', 0):,.2f}"])
            cf_data.append(['B. Cash Flow from Investing Activities', f"{cash_flow.get('investing', 0):,.2f}"])
            cf_data.append(['C. Cash Flow from Financing Activities', f"{cash_flow.get('financing', 0):,.2f}"])
            cf_data.append(['Net Increase/(Decrease) in Cash', f"{cash_flow.get('net_change', 0):,.2f}"])
            cf_data.append(['Opening Cash Balance', f"{cash_flow.get('opening_cash', 0):,.2f}"])
            cf_data.append(['Closing Cash Balance', f"{cash_flow.get('closing_cash', 0):,.2f}"])
            
            cf_table = Table(cf_data, colWidths=[350, 120])
            cf_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(cf_table)
            story.append(PageBreak())
        
        # Ratio Analysis
        ratios = data.get('ratios', {})
        if ratios:
            story.append(Paragraph("FINANCIAL RATIO ANALYSIS", styles['Title2']))
            story.append(Spacer(1, 12))
            
            for category, category_ratios in ratios.items():
                story.append(Paragraph(category.replace('_', ' ').title() + " Ratios", styles['Subtitle']))
                ratio_data = [['Ratio', 'Value']]
                for ratio_name, value in category_ratios.items():
                    ratio_data.append([ratio_name.replace('_', ' ').title(), f"{value}"])
                
                ratio_table = Table(ratio_data, colWidths=[350, 120])
                ratio_table.setStyle(TableStyle([
                    ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
                    ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                    ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
                    ('FONTSIZE', (0, 0), (-1, -1), 9),
                    ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                    ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ]))
                story.append(ratio_table)
                story.append(Spacer(1, 12))
        
        # Footer
        story.append(Spacer(1, 24))
        story.append(Paragraph(f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')}", styles['Normal']))
        
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename=Financial_Statements_{financial_year}.pdf"
            }
        )
    except Exception as e:
        logger.error(f"PDF generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Generate Excel
@api_router.post("/financial/generate-excel")
async def generate_excel(data: Dict[str, Any]):
    """Generate financial statements Excel package"""
    try:
        import pandas as pd
        from io import BytesIO
        
        buffer = BytesIO()
        
        with pd.ExcelWriter(buffer, engine='openpyxl') as writer:
            # Trial Balance
            trial_balance = data.get('trial_balance', [])
            if trial_balance:
                tb_df = pd.DataFrame(trial_balance)
                tb_df.to_excel(writer, sheet_name='Trial Balance', index=False)
            
            # Balance Sheet
            balance_sheet = data.get('balance_sheet', {})
            if balance_sheet:
                bs_rows = []
                assets = balance_sheet.get('assets', {})
                for cat, items in assets.items():
                    if isinstance(items, dict):
                        for item in items.get('items', []):
                            bs_rows.append({'Category': 'Assets', 'Sub-Category': cat, 'Item': item.get('name'), 'Amount': item.get('amount', 0)})
                liabilities = balance_sheet.get('liabilities', {})
                for cat, items in liabilities.items():
                    if isinstance(items, dict):
                        for item in items.get('items', []):
                            bs_rows.append({'Category': 'Liabilities', 'Sub-Category': cat, 'Item': item.get('name'), 'Amount': item.get('amount', 0)})
                if bs_rows:
                    bs_df = pd.DataFrame(bs_rows)
                    bs_df.to_excel(writer, sheet_name='Balance Sheet', index=False)
            
            # Profit & Loss
            profit_loss = data.get('profit_loss', {})
            if profit_loss:
                pl_rows = []
                income_items = profit_loss.get('income', {}).get('items', [])
                for item in income_items:
                    pl_rows.append({'Type': 'Income', 'Item': item.get('name'), 'Amount': item.get('amount', 0)})
                expense_items = profit_loss.get('expenses', {}).get('items', [])
                for item in expense_items:
                    pl_rows.append({'Type': 'Expense', 'Item': item.get('name'), 'Amount': item.get('amount', 0)})
                if pl_rows:
                    pl_df = pd.DataFrame(pl_rows)
                    pl_df.to_excel(writer, sheet_name='Profit & Loss', index=False)
            
            # Ratios
            ratios = data.get('ratios', {})
            if ratios:
                ratio_rows = []
                for category, cat_ratios in ratios.items():
                    for ratio_name, value in cat_ratios.items():
                        ratio_rows.append({'Category': category, 'Ratio': ratio_name, 'Value': value})
                if ratio_rows:
                    ratio_df = pd.DataFrame(ratio_rows)
                    ratio_df.to_excel(writer, sheet_name='Ratios', index=False)
        
        excel_bytes = buffer.getvalue()
        financial_year = data.get('financial_year', '2024-25')
        
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename=Financial_Statements_{financial_year}.xlsx"
            }
        )
    except Exception as e:
        logger.error(f"Excel generation error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# Include the router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
