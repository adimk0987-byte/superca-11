"""
GST PDF Generator - Complete Reports Package
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from io import BytesIO
from datetime import datetime
from typing import Dict, Any


class GSTPDFGenerator:
    """Generate GST return PDFs"""
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_styles()
    
    def _setup_styles(self):
        self.styles.add(ParagraphStyle(
            name='GSTTitle', parent=self.styles['Heading1'],
            fontSize=16, spaceAfter=12, alignment=TA_CENTER,
            textColor=colors.HexColor('#1e3a5f')
        ))
        self.styles.add(ParagraphStyle(
            name='GSTSubtitle', parent=self.styles['Heading2'],
            fontSize=12, spaceAfter=8, textColor=colors.HexColor('#2c5282')
        ))
        self.styles.add(ParagraphStyle(
            name='GSTNormal', parent=self.styles['Normal'], fontSize=10, spaceAfter=4
        ))
    
    def generate_gstr3b_pdf(self, summary: Dict[str, Any]) -> bytes:
        """Generate GSTR-3B PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        story = []
        
        header = summary.get('header', {})
        sales = summary.get('sales_summary', {})
        itc = summary.get('itc_summary', {})
        payment = summary.get('payment_summary', {})
        
        # Title
        story.append(Paragraph("GSTR-3B SUMMARY", self.styles['GSTTitle']))
        story.append(Paragraph(f"Return Period: {header.get('return_period', '')}", self.styles['GSTSubtitle']))
        story.append(Spacer(1, 12))
        
        # Business Info
        info_data = [
            ['GSTIN', header.get('gstin', '')],
            ['Business Name', header.get('business_name', '')],
            ['Generated On', datetime.now().strftime('%d-%m-%Y %H:%M')]
        ]
        info_table = Table(info_data, colWidths=[150, 300])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e2e8f0')),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 20))
        
        # 3.1 - Outward Supplies
        story.append(Paragraph("3.1 - Outward Supplies", self.styles['GSTSubtitle']))
        sales_data = [
            ['Particulars', 'Taxable Value', 'CGST', 'SGST', 'IGST'],
            ['Outward taxable supplies', f"₹{sales.get('total_taxable_value', 0):,.0f}", 
             f"₹{sales.get('cgst', 0):,.0f}", f"₹{sales.get('sgst', 0):,.0f}", f"₹{sales.get('igst', 0):,.0f}"],
        ]
        sales_table = Table(sales_data, colWidths=[180, 90, 70, 70, 70])
        sales_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(sales_table)
        story.append(Spacer(1, 16))
        
        # 4 - Input Tax Credit
        story.append(Paragraph("4 - Eligible ITC", self.styles['GSTSubtitle']))
        itc_data = [
            ['Particulars', 'CGST', 'SGST', 'IGST'],
            ['ITC Available', f"₹{itc.get('cgst', 0):,.0f}", f"₹{itc.get('sgst', 0):,.0f}", f"₹{itc.get('igst', 0):,.0f}"],
            ['ITC Reversed', f"₹{itc.get('reversed_itc', 0)/2:,.0f}", f"₹{itc.get('reversed_itc', 0)/2:,.0f}", '₹0'],
            ['Net ITC', f"₹{itc.get('cgst', 0) - itc.get('reversed_itc', 0)/2:,.0f}", 
             f"₹{itc.get('sgst', 0) - itc.get('reversed_itc', 0)/2:,.0f}", f"₹{itc.get('igst', 0):,.0f}"],
        ]
        itc_table = Table(itc_data, colWidths=[200, 100, 100, 100])
        itc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#e2e8f0')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        story.append(itc_table)
        story.append(Spacer(1, 16))
        
        # 6 - Tax Payable
        story.append(Paragraph("6 - Tax Payment", self.styles['GSTSubtitle']))
        payment_data = [
            ['Tax Type', 'Amount Payable'],
            ['CGST', f"₹{payment.get('cgst_payable', 0):,.0f}"],
            ['SGST', f"₹{payment.get('sgst_payable', 0):,.0f}"],
            ['IGST', f"₹{payment.get('igst_payable', 0):,.0f}"],
            ['TOTAL', f"₹{payment.get('total_payable', 0):,.0f}"],
        ]
        payment_table = Table(payment_data, colWidths=[250, 150])
        payment_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#c6f6d5') if payment.get('total_payable', 0) == 0 else colors.HexColor('#fed7d7')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        story.append(payment_table)
        story.append(Spacer(1, 20))
        
        # Due Date
        story.append(Paragraph(f"Due Date: {payment.get('due_date', '20th of next month')}", self.styles['GSTSubtitle']))
        
        doc.build(story)
        return buffer.getvalue()
    
    def generate_reconciliation_pdf(self, reconciliation: Dict[str, Any], header: Dict[str, Any]) -> bytes:
        """Generate GSTR-2A Reconciliation PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        story = []
        
        summary = reconciliation.get('summary', {})
        
        # Title
        story.append(Paragraph("GSTR-2A RECONCILIATION REPORT", self.styles['GSTTitle']))
        story.append(Paragraph(f"GSTIN: {header.get('gstin', '')} | Period: {header.get('return_period', '')}", self.styles['GSTSubtitle']))
        story.append(Spacer(1, 16))
        
        # Summary Box
        match_pct = summary.get('match_percentage', 0)
        match_color = colors.HexColor('#c6f6d5') if match_pct >= 90 else colors.HexColor('#fef3c7') if match_pct >= 70 else colors.HexColor('#fed7d7')
        
        summary_data = [
            ['Metric', 'Count', 'Value'],
            ['Total Invoices in Books', str(summary.get('total_invoices_in_books', 0)), '-'],
            ['Total Invoices in GSTR-2A', str(summary.get('total_invoices_in_2a', 0)), '-'],
            ['Matched Invoices', str(summary.get('matched_count', 0)), f"₹{summary.get('matched_value', 0):,.0f}"],
            ['Missing in 2A', str(summary.get('missing_in_2a_count', 0)), f"₹{summary.get('missing_in_2a_value', 0):,.0f}"],
            ['Match Percentage', f"{match_pct}%", '-'],
        ]
        summary_table = Table(summary_data, colWidths=[200, 100, 150])
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'CENTER'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), match_color),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 20))
        
        # Missing in 2A
        missing = reconciliation.get('missing_in_2a', [])
        if missing:
            story.append(Paragraph(f"Missing in GSTR-2A ({len(missing)} invoices)", self.styles['GSTSubtitle']))
            missing_data = [['Invoice No', 'Vendor', 'Value', 'Action']]
            for m in missing[:10]:  # Show first 10
                missing_data.append([
                    m.get('invoice_no', ''),
                    m.get('vendor', '')[:20],
                    f"₹{m.get('value', 0):,.0f}",
                    'Follow up'
                ])
            if len(missing) > 10:
                missing_data.append(['...', f'+{len(missing)-10} more', '', ''])
            
            missing_table = Table(missing_data, colWidths=[100, 150, 80, 120])
            missing_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e53e3e')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (2, 0), (2, -1), 'RIGHT'),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
                ('FONTSIZE', (0, 0), (-1, -1), 9),
                ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
                ('TOPPADDING', (0, 0), (-1, -1), 6),
            ]))
            story.append(missing_table)
            story.append(Spacer(1, 16))
        
        # Recommendations
        recs = reconciliation.get('recommendations', [])
        if recs:
            story.append(Paragraph("Recommendations", self.styles['GSTSubtitle']))
            for rec in recs:
                story.append(Paragraph(f"• {rec}", self.styles['GSTNormal']))
        
        doc.build(story)
        return buffer.getvalue()
    
    def generate_itc_statement_pdf(self, itc_summary: Dict[str, Any], header: Dict[str, Any]) -> bytes:
        """Generate ITC Statement PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=20*mm, leftMargin=20*mm, topMargin=20*mm, bottomMargin=20*mm)
        story = []
        
        # Title
        story.append(Paragraph("INPUT TAX CREDIT STATEMENT", self.styles['GSTTitle']))
        story.append(Paragraph(f"GSTIN: {header.get('gstin', '')} | Period: {header.get('return_period', '')}", self.styles['GSTSubtitle']))
        story.append(Spacer(1, 16))
        
        # ITC Summary
        itc_data = [
            ['Particulars', 'CGST', 'SGST', 'IGST', 'Total'],
            ['Total ITC as per Books', f"₹{itc_summary.get('total_itc_available', 0)/2:,.0f}", 
             f"₹{itc_summary.get('total_itc_available', 0)/2:,.0f}", '₹0',
             f"₹{itc_summary.get('total_itc_available', 0):,.0f}"],
            ['Less: Blocked ITC (Sec 17(5))', f"₹{itc_summary.get('blocked_itc', 0)/2:,.0f}",
             f"₹{itc_summary.get('blocked_itc', 0)/2:,.0f}", '₹0',
             f"₹{itc_summary.get('blocked_itc', 0):,.0f}"],
            ['Less: Reversed ITC (Rule 42/43)', f"₹{itc_summary.get('reversed_itc', 0)/2:,.0f}",
             f"₹{itc_summary.get('reversed_itc', 0)/2:,.0f}", '₹0',
             f"₹{itc_summary.get('reversed_itc', 0):,.0f}"],
            ['Eligible ITC', f"₹{itc_summary.get('cgst', 0):,.0f}",
             f"₹{itc_summary.get('sgst', 0):,.0f}",
             f"₹{itc_summary.get('igst', 0):,.0f}",
             f"₹{itc_summary.get('eligible_itc', 0):,.0f}"],
        ]
        
        itc_table = Table(itc_data, colWidths=[180, 70, 70, 70, 80])
        itc_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2c5282')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (1, 0), (-1, -1), 'RIGHT'),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#c6f6d5')),
            ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ]))
        story.append(itc_table)
        
        doc.build(story)
        return buffer.getvalue()
