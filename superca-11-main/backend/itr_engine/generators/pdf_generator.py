"""
ITR PDF Generator - Production-Ready

Generates ITR PDFs with:
1. Complete computation sheet
2. ITR form summary
3. Schedule breakdowns (80C, 80D, TDS, etc.)
4. Verification page

Uses ReportLab for PDF generation (reliable, no external templates needed).
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, Optional
import base64


class ITRPDFGenerator:
    """Generate ITR PDFs matching official format"""
    
    # ITR form mapping
    ITR_FORMS = {
        'ITR-1': 'For individuals with salary/pension and interest income (upto 50L)',
        'ITR-2': 'For individuals with capital gains or more than one house property',
        'ITR-3': 'For individuals with business/profession income',
        'ITR-4': 'For presumptive income scheme (44AD/44ADA/44AE)'
    }
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        """Setup custom PDF styles"""
        self.styles.add(ParagraphStyle(
            name='ITRTitle',
            parent=self.styles['Heading1'],
            fontSize=16,
            spaceAfter=12,
            alignment=TA_CENTER,
            textColor=colors.HexColor('#1a365d')
        ))
        
        self.styles.add(ParagraphStyle(
            name='ITRSubtitle',
            parent=self.styles['Heading2'],
            fontSize=12,
            spaceAfter=8,
            textColor=colors.HexColor('#2c5282')
        ))
        
        self.styles.add(ParagraphStyle(
            name='ITRNormal',
            parent=self.styles['Normal'],
            fontSize=10,
            spaceAfter=4
        ))
        
        self.styles.add(ParagraphStyle(
            name='ITRSmall',
            parent=self.styles['Normal'],
            fontSize=8,
            textColor=colors.grey
        ))
        
        self.styles.add(ParagraphStyle(
            name='ITRRight',
            parent=self.styles['Normal'],
            fontSize=10,
            alignment=TA_RIGHT
        ))
    
    def generate_complete_itr(
        self,
        user_data: Dict[str, Any],
        tax_calculation: Dict[str, Any],
        itr_type: str = 'ITR-1',
        financial_year: str = '2024-25'
    ) -> bytes:
        """
        Generate complete ITR PDF package
        
        Args:
            user_data: Standardized user data (PAN, name, income, deductions)
            tax_calculation: Complete tax calculation result
            itr_type: ITR form type
            financial_year: Financial year
        
        Returns:
            PDF as bytes
        """
        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=20*mm,
            bottomMargin=20*mm
        )
        
        story = []
        
        # 1. Cover Page
        story.extend(self._build_cover_page(user_data, itr_type, financial_year))
        story.append(PageBreak())
        
        # 2. Computation Sheet
        story.extend(self._build_computation_sheet(user_data, tax_calculation))
        story.append(PageBreak())
        
        # 3. Income Schedule
        story.extend(self._build_income_schedule(user_data))
        story.append(PageBreak())
        
        # 4. Deductions Schedule
        story.extend(self._build_deductions_schedule(user_data, tax_calculation.get('regime', 'new')))
        story.append(PageBreak())
        
        # 5. TDS Schedule
        story.extend(self._build_tds_schedule(user_data))
        story.append(PageBreak())
        
        # 6. Tax Summary & Verification
        story.extend(self._build_verification_page(user_data, tax_calculation, financial_year))
        
        doc.build(story)
        return buffer.getvalue()
    
    def _build_cover_page(self, user_data: Dict, itr_type: str, fy: str) -> list:
        """Build ITR cover page"""
        elements = []
        
        # Header
        elements.append(Paragraph(
            "INCOME TAX RETURN",
            self.styles['ITRTitle']
        ))
        elements.append(Paragraph(
            f"{itr_type} - {self.ITR_FORMS.get(itr_type, '')}",
            self.styles['ITRSubtitle']
        ))
        elements.append(Spacer(1, 12))
        
        # Assessment Year
        ay = self._get_assessment_year(fy)
        elements.append(Paragraph(
            f"Assessment Year: {ay}",
            self.styles['ITRNormal']
        ))
        elements.append(Paragraph(
            f"Financial Year: {fy}",
            self.styles['ITRNormal']
        ))
        elements.append(Spacer(1, 24))
        
        # Personal Details Table
        personal = user_data.get('personal', {})
        pan = personal.get('pan', 'XXXXX0000X')
        name = personal.get('name', 'Taxpayer Name')
        
        personal_data = [
            ['PAN', pan],
            ['Name', name],
            ['Father\'s Name', personal.get('fathers_name', '-')],
            ['Date of Birth', personal.get('dob', '-')],
            ['Status', 'Individual'],
            ['Residential Status', personal.get('residential_status', 'Resident')],
        ]
        
        personal_table = Table(personal_data, colWidths=[150, 300])
        personal_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ]))
        
        elements.append(Paragraph("Personal Information", self.styles['ITRSubtitle']))
        elements.append(personal_table)
        elements.append(Spacer(1, 24))
        
        # Filing Status
        elements.append(Paragraph("Filing Status", self.styles['ITRSubtitle']))
        
        filing_data = [
            ['Original/Revised', 'Original'],
            ['E-Filing Acknowledgement No.', '[Generated on Filing]'],
            ['Date of Filing', datetime.now().strftime('%d-%m-%Y')],
        ]
        
        filing_table = Table(filing_data, colWidths=[200, 250])
        filing_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(filing_table)
        
        return elements
    
    def _build_computation_sheet(self, user_data: Dict, tax_calc: Dict) -> list:
        """Build tax computation sheet"""
        elements = []
        
        elements.append(Paragraph(
            "COMPUTATION OF TOTAL INCOME AND TAX LIABILITY",
            self.styles['ITRTitle']
        ))
        elements.append(Spacer(1, 12))
        
        regime = tax_calc.get('regime', 'new')
        regime_text = "New Tax Regime (Section 115BAC)" if regime == 'new' else "Old Tax Regime"
        elements.append(Paragraph(f"Tax Regime: {regime_text}", self.styles['ITRSubtitle']))
        elements.append(Spacer(1, 12))
        
        # Income Computation
        income = user_data.get('income', {})
        
        income_rows = [
            ['PARTICULARS', 'AMOUNT (Rs.)'],
            ['A. Income from Salary', ''],
            ['    Gross Salary', self._format_amount(income.get('salary', {}).get('gross_salary', 0))],
            ['    Less: Standard Deduction', f"({self._format_amount(tax_calc.get('standard_deduction', 0))})"],
            ['    Net Salary Income', self._format_amount(
                income.get('salary', {}).get('gross_salary', 0) - tax_calc.get('standard_deduction', 0)
            )],
            ['', ''],
            ['B. Income from House Property', ''],
            ['    Rental Income', self._format_amount(income.get('house_property', {}).get('rental_income', 0))],
            ['    Less: Interest on Home Loan', f"({self._format_amount(income.get('house_property', {}).get('interest_on_loan', 0))})"],
            ['    Net HP Income', self._format_amount(
                income.get('house_property', {}).get('rental_income', 0) - income.get('house_property', {}).get('interest_on_loan', 0)
            )],
            ['', ''],
            ['C. Income from Capital Gains', ''],
            ['    Short Term Capital Gains', self._format_amount(income.get('capital_gains', {}).get('short_term', 0))],
            ['    Long Term Capital Gains', self._format_amount(income.get('capital_gains', {}).get('long_term', 0))],
            ['', ''],
            ['D. Income from Other Sources', ''],
            ['    Interest Income', self._format_amount(income.get('other_sources', {}).get('interest', 0))],
            ['    Dividend Income', self._format_amount(income.get('other_sources', {}).get('dividends', 0))],
            ['', ''],
            ['GROSS TOTAL INCOME', self._format_amount(tax_calc.get('gross_income', 0))],
        ]
        
        # Add deductions for old regime
        if regime == 'old':
            income_rows.extend([
                ['', ''],
                ['E. Deductions under Chapter VI-A', ''],
                ['    Section 80C', self._format_amount(user_data.get('deductions', {}).get('section_80c', {}).get('amount', 0))],
                ['    Section 80D', self._format_amount(user_data.get('deductions', {}).get('section_80d', {}).get('amount', 0))],
                ['    Section 80G', self._format_amount(user_data.get('deductions', {}).get('section_80g', {}).get('amount', 0))],
                ['    Total Deductions', self._format_amount(tax_calc.get('total_deductions', 0))],
            ])
        
        income_rows.extend([
            ['', ''],
            ['TOTAL TAXABLE INCOME', self._format_amount(tax_calc.get('taxable_income', 0))],
        ])
        
        income_table = Table(income_rows, colWidths=[350, 120])
        income_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(income_table)
        elements.append(Spacer(1, 24))
        
        # Tax Calculation
        elements.append(Paragraph("TAX CALCULATION", self.styles['ITRSubtitle']))
        
        tax_rows = [
            ['PARTICULARS', 'AMOUNT (Rs.)'],
            ['Tax on Taxable Income', self._format_amount(tax_calc.get('tax_on_income', 0))],
            ['Add: Surcharge', self._format_amount(tax_calc.get('surcharge', 0))],
            ['Add: Health & Education Cess (4%)', self._format_amount(tax_calc.get('cess', 0))],
            ['GROSS TAX LIABILITY', self._format_amount(tax_calc.get('total_tax_liability', 0))],
            ['', ''],
            ['Less: TDS Deducted', f"({self._format_amount(tax_calc.get('tds_paid', 0))})"],
            ['Less: Advance Tax Paid', f"({self._format_amount(tax_calc.get('advance_tax_paid', 0))})"],
            ['Add: Interest u/s 234B', self._format_amount(tax_calc.get('interest_234b', 0))],
            ['Add: Interest u/s 234C', self._format_amount(tax_calc.get('interest_234c', 0))],
            ['', ''],
        ]
        
        if tax_calc.get('is_refund', False):
            tax_rows.append(['REFUND DUE', self._format_amount(tax_calc.get('refund_due', 0))])
        else:
            tax_rows.append(['TAX PAYABLE', self._format_amount(tax_calc.get('net_tax_payable', 0))])
        
        tax_table = Table(tax_rows, colWidths=[350, 120])
        tax_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#c6f6d5') if tax_calc.get('is_refund') else colors.HexColor('#fed7d7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(tax_table)
        
        return elements
    
    def _build_income_schedule(self, user_data: Dict) -> list:
        """Build detailed income schedule"""
        elements = []
        
        elements.append(Paragraph("SCHEDULE - INCOME DETAILS", self.styles['ITRTitle']))
        elements.append(Spacer(1, 12))
        
        income = user_data.get('income', {})
        
        # Salary Schedule
        elements.append(Paragraph("Schedule S - Income from Salary", self.styles['ITRSubtitle']))
        
        salary = income.get('salary', {})
        salary_rows = [
            ['Component', 'Amount (Rs.)'],
            ['Basic Salary', self._format_amount(salary.get('basic', 0))],
            ['House Rent Allowance (HRA)', self._format_amount(salary.get('hra', 0))],
            ['Special Allowance', self._format_amount(salary.get('special_allowance', 0))],
            ['Leave Travel Allowance (LTA)', self._format_amount(salary.get('lta', 0))],
            ['Other Allowances', self._format_amount(salary.get('other_allowances', 0))],
            ['Perquisites', self._format_amount(salary.get('perquisites', 0))],
            ['Gross Salary', self._format_amount(salary.get('gross_salary', 0))],
        ]
        
        salary_table = Table(salary_rows, colWidths=[350, 120])
        salary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(salary_table)
        elements.append(Spacer(1, 16))
        
        # House Property Schedule
        elements.append(Paragraph("Schedule HP - Income from House Property", self.styles['ITRSubtitle']))
        
        hp = income.get('house_property', {})
        hp_rows = [
            ['Particulars', 'Amount (Rs.)'],
            ['Gross Annual Value', self._format_amount(hp.get('gross_annual_value', hp.get('rental_income', 0)))],
            ['Municipal Taxes Paid', self._format_amount(hp.get('municipal_taxes', 0))],
            ['Net Annual Value', self._format_amount(hp.get('rental_income', 0))],
            ['Standard Deduction (30%)', self._format_amount(hp.get('rental_income', 0) * 0.3)],
            ['Interest on Housing Loan', self._format_amount(hp.get('interest_on_loan', 0))],
            ['Net Income from HP', self._format_amount(
                hp.get('rental_income', 0) * 0.7 - hp.get('interest_on_loan', 0)
            )],
        ]
        
        hp_table = Table(hp_rows, colWidths=[350, 120])
        hp_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(hp_table)
        elements.append(Spacer(1, 16))
        
        # Capital Gains Schedule
        elements.append(Paragraph("Schedule CG - Capital Gains", self.styles['ITRSubtitle']))
        
        cg = income.get('capital_gains', {})
        cg_rows = [
            ['Type', 'Amount (Rs.)'],
            ['Short Term Capital Gains (15%)', self._format_amount(cg.get('short_term', 0))],
            ['Long Term Capital Gains', self._format_amount(cg.get('long_term', 0))],
            ['Exempt LTCG (upto Rs.1,00,000)', self._format_amount(min(cg.get('long_term', 0), 100000))],
            ['Taxable LTCG (12.5%)', self._format_amount(max(0, cg.get('long_term', 0) - 100000))],
        ]
        
        cg_table = Table(cg_rows, colWidths=[350, 120])
        cg_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(cg_table)
        
        return elements
    
    def _build_deductions_schedule(self, user_data: Dict, regime: str) -> list:
        """Build Chapter VI-A deductions schedule"""
        elements = []
        
        elements.append(Paragraph("SCHEDULE VI-A - DEDUCTIONS", self.styles['ITRTitle']))
        elements.append(Spacer(1, 12))
        
        if regime == 'new':
            elements.append(Paragraph(
                "Note: Under New Tax Regime (Section 115BAC), Chapter VI-A deductions are not available except Section 80CCD(2) - Employer's NPS contribution.",
                self.styles['ITRNormal']
            ))
            elements.append(Spacer(1, 12))
        
        deductions = user_data.get('deductions', {})
        
        # Section 80C
        elements.append(Paragraph("Section 80C - Investments", self.styles['ITRSubtitle']))
        
        sec_80c = deductions.get('section_80c', {})
        breakdown = sec_80c.get('breakdown', {})
        
        sec_80c_rows = [
            ['Investment Type', 'Amount (Rs.)', 'Max Limit'],
            ['Life Insurance Premium (LIC)', self._format_amount(breakdown.get('lic', 0)), '-'],
            ['Public Provident Fund (PPF)', self._format_amount(breakdown.get('ppf', 0)), '-'],
            ['Employee Provident Fund (EPF)', self._format_amount(breakdown.get('epf', 0)), '-'],
            ['Equity Linked Savings (ELSS)', self._format_amount(breakdown.get('elss', 0)), '-'],
            ['Tax Saving FD', self._format_amount(breakdown.get('tax_saving_fd', 0)), '-'],
            ['National Savings Certificate', self._format_amount(breakdown.get('nsc', 0)), '-'],
            ['Home Loan Principal', self._format_amount(breakdown.get('home_loan_principal', 0)), '-'],
            ['Tuition Fees', self._format_amount(breakdown.get('tuition_fees', 0)), '-'],
            ['Sukanya Samriddhi', self._format_amount(breakdown.get('sukanya', 0)), '-'],
            ['Total Section 80C', self._format_amount(sec_80c.get('amount', 0)), '1,50,000'],
        ]
        
        sec_80c_table = Table(sec_80c_rows, colWidths=[280, 100, 90])
        sec_80c_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(sec_80c_table)
        elements.append(Spacer(1, 16))
        
        # Section 80D
        elements.append(Paragraph("Section 80D - Health Insurance", self.styles['ITRSubtitle']))
        
        sec_80d = deductions.get('section_80d', {})
        sec_80d_breakdown = sec_80d.get('breakdown', {})
        
        sec_80d_rows = [
            ['Type', 'Amount (Rs.)', 'Max Limit'],
            ['Self & Family Premium', self._format_amount(sec_80d_breakdown.get('self_family', 0)), '25,000'],
            ['Parents Premium (below 60)', self._format_amount(sec_80d_breakdown.get('parents', 0)), '25,000'],
            ['Parents Premium (60+)', self._format_amount(sec_80d_breakdown.get('parents_senior', 0)), '50,000'],
            ['Preventive Health Checkup', self._format_amount(sec_80d_breakdown.get('checkup', 0)), '5,000'],
            ['Total Section 80D', self._format_amount(sec_80d.get('amount', 0)), '1,00,000'],
        ]
        
        sec_80d_table = Table(sec_80d_rows, colWidths=[280, 100, 90])
        sec_80d_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(sec_80d_table)
        elements.append(Spacer(1, 16))
        
        # Other Deductions
        elements.append(Paragraph("Other Deductions", self.styles['ITRSubtitle']))
        
        other_rows = [
            ['Section', 'Description', 'Amount (Rs.)'],
            ['80CCD(1B)', 'NPS - Additional', self._format_amount(deductions.get('section_80ccd1b', {}).get('amount', 0))],
            ['80CCD(2)', 'NPS - Employer', self._format_amount(deductions.get('section_80ccd2', {}).get('amount', 0))],
            ['80E', 'Education Loan Interest', self._format_amount(deductions.get('section_80e', {}).get('amount', 0))],
            ['80G', 'Donations', self._format_amount(deductions.get('section_80g', {}).get('amount', 0))],
            ['80TTA/80TTB', 'Savings Interest', self._format_amount(deductions.get('section_80tta', {}).get('amount', 0))],
            ['80U', 'Disability', self._format_amount(deductions.get('section_80u', {}).get('amount', 0))],
        ]
        
        other_table = Table(other_rows, colWidths=[80, 250, 140])
        other_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
        ]))
        
        elements.append(other_table)
        
        return elements
    
    def _build_tds_schedule(self, user_data: Dict) -> list:
        """Build TDS schedule"""
        elements = []
        
        elements.append(Paragraph("SCHEDULE TDS - TAX DEDUCTED AT SOURCE", self.styles['ITRTitle']))
        elements.append(Spacer(1, 12))
        
        tax_paid = user_data.get('tax_paid', {})
        tds = tax_paid.get('tds', {})
        tds_entries = tds.get('entries', [])
        
        if not tds_entries:
            # Default TDS from salary
            tds_entries = [{
                'deductor_tan': user_data.get('personal', {}).get('employer_tan', '-'),
                'deductor_name': user_data.get('personal', {}).get('employer_name', 'Employer'),
                'amount': tds.get('amount', 0),
                'section': '192'
            }]
        
        # TDS Summary
        tds_rows = [['Deductor TAN', 'Deductor Name', 'Section', 'Amount (Rs.)']]
        
        total_tds = 0
        for entry in tds_entries:
            tds_rows.append([
                entry.get('deductor_tan', '-'),
                entry.get('deductor_name', '-'),
                entry.get('section', '192'),
                self._format_amount(entry.get('amount', 0))
            ])
            total_tds += entry.get('amount', 0)
        
        tds_rows.append(['', '', 'TOTAL TDS', self._format_amount(total_tds)])
        
        tds_table = Table(tds_rows, colWidths=[100, 200, 70, 100])
        tds_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#4a5568')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
            ('TOPPADDING', (0, 0), (-1, -1), 6),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#edf2f7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(tds_table)
        elements.append(Spacer(1, 16))
        
        # TDS Verification Note
        elements.append(Paragraph(
            "Note: Please verify TDS amounts with Form 26AS available on TRACES portal. "
            "Any mismatch should be resolved with the deductor before filing.",
            self.styles['ITRSmall']
        ))
        
        return elements
    
    def _build_verification_page(self, user_data: Dict, tax_calc: Dict, fy: str) -> list:
        """Build verification page"""
        elements = []
        
        elements.append(Paragraph("VERIFICATION", self.styles['ITRTitle']))
        elements.append(Spacer(1, 12))
        
        personal = user_data.get('personal', {})
        pan = personal.get('pan', 'XXXXX0000X')
        name = personal.get('name', 'Taxpayer')
        
        # Summary Box
        summary_data = [
            ['Gross Total Income', self._format_amount(tax_calc.get('gross_income', 0))],
            ['Total Deductions', self._format_amount(tax_calc.get('total_deductions', 0))],
            ['Total Taxable Income', self._format_amount(tax_calc.get('taxable_income', 0))],
            ['Total Tax Liability', self._format_amount(tax_calc.get('total_tax_liability', 0))],
            ['Tax Already Paid', self._format_amount(tax_calc.get('tax_already_paid', 0))],
        ]
        
        if tax_calc.get('is_refund', False):
            summary_data.append(['REFUND CLAIMED', self._format_amount(tax_calc.get('refund_due', 0))])
        else:
            summary_data.append(['TAX PAYABLE', self._format_amount(tax_calc.get('net_tax_payable', 0))])
        
        summary_table = Table(summary_data, colWidths=[300, 170])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#edf2f7')),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#c6f6d5') if tax_calc.get('is_refund') else colors.HexColor('#fed7d7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        
        elements.append(summary_table)
        elements.append(Spacer(1, 24))
        
        # Declaration
        elements.append(Paragraph("DECLARATION", self.styles['ITRSubtitle']))
        
        declaration_text = f"""
        I, {name}, having PAN {pan}, do hereby declare that:
        
        1. I am filing this return in my capacity as an individual.
        
        2. I have disclosed all the income chargeable to tax during the previous year {fy} in this return.
        
        3. The information given in this return and the schedules and statements accompanying it is true, correct and complete to the best of my knowledge and belief.
        
        4. I am making this return in accordance with the provisions of the Income-tax Act, 1961.
        
        5. I am liable to pay tax on the income returned.
        
        6. I undertake to comply with any notice issued for verification of this return.
        """
        
        elements.append(Paragraph(declaration_text, self.styles['ITRNormal']))
        elements.append(Spacer(1, 24))
        
        # Signature Block
        sig_data = [
            ['Place:', '_________________'],
            ['Date:', datetime.now().strftime('%d-%m-%Y')],
            ['', ''],
            ['Signature:', '_________________'],
            ['Name:', name],
            ['PAN:', pan],
        ]
        
        sig_table = Table(sig_data, colWidths=[100, 200])
        sig_table.setStyle(TableStyle([
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        
        elements.append(sig_table)
        elements.append(Spacer(1, 24))
        
        # Footer
        elements.append(Paragraph(
            f"Generated on: {datetime.now().strftime('%d-%m-%Y %H:%M:%S')} | This is a computer generated document",
            self.styles['ITRSmall']
        ))
        
        return elements
    
    @staticmethod
    def _format_amount(amount: float) -> str:
        """Format amount with Indian numbering"""
        if amount == 0:
            return "0"
        if amount < 0:
            return f"({abs(amount):,.0f})"
        return f"{amount:,.0f}"
    
    @staticmethod
    def _get_assessment_year(fy: str) -> str:
        """Convert FY to AY"""
        if '-' in fy:
            years = fy.split('-')
            start = int(years[0])
            return f"{start + 1}-{int(years[1]) + 1}"
        return fy


# Convenience function
def generate_itr_pdf(
    user_data: Dict[str, Any],
    tax_calculation: Dict[str, Any],
    itr_type: str = 'ITR-1',
    financial_year: str = '2024-25'
) -> bytes:
    """Generate ITR PDF - convenience function"""
    generator = ITRPDFGenerator()
    return generator.generate_complete_itr(user_data, tax_calculation, itr_type, financial_year)
