"""PDF Service Implementation using ReportLab."""

import os
from datetime import datetime
from typing import Optional
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
)
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT

from src.application.ports.pdf_service import PDFServicePort
from src.domain.entities.invoice import Invoice


class PDFService(PDFServicePort):
    """Implementation of PDF generation service using ReportLab."""

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles."""
        self.styles.add(ParagraphStyle(
            name="InvoiceTitle",
            parent=self.styles["Heading1"],
            fontSize=24,
            alignment=TA_CENTER,
            spaceAfter=30
        ))
        self.styles.add(ParagraphStyle(
            name="InvoiceHeader",
            parent=self.styles["Normal"],
            fontSize=10,
            alignment=TA_RIGHT
        ))
        self.styles.add(ParagraphStyle(
            name="CompanyInfo",
            parent=self.styles["Normal"],
            fontSize=10,
            alignment=TA_LEFT
        ))
        self.styles.add(ParagraphStyle(
            name="CustomerInfo",
            parent=self.styles["Normal"],
            fontSize=10,
            alignment=TA_LEFT,
            leftIndent=0
        ))
        self.styles.add(ParagraphStyle(
            name="TableHeader",
            parent=self.styles["Normal"],
            fontSize=10,
            textColor=colors.white,
            alignment=TA_CENTER
        ))
        self.styles.add(ParagraphStyle(
            name="Footer",
            parent=self.styles["Normal"],
            fontSize=8,
            alignment=TA_CENTER,
            textColor=colors.grey
        ))

    def _format_currency(self, amount: float) -> str:
        """Format amount as currency."""
        return f"{amount:.2f} EUR"

    def _format_date(self, date_str: str) -> str:
        """Format date string for display."""
        try:
            date_obj = datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return date_obj.strftime("%d/%m/%Y")
        except (ValueError, AttributeError):
            return date_str or ""

    async def generate_invoice_pdf(
        self,
        invoice: Invoice,
        company_name: str,
        company_address: str,
        company_tax_id: str,
        logo_path: Optional[str] = None
    ) -> bytes:
        """Generate a PDF for an invoice and return the bytes."""
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=2 * cm,
            bottomMargin=2 * cm
        )

        elements = []

        # Logo and company header
        header_data = []
        if logo_path and os.path.exists(logo_path):
            logo = Image(logo_path, width=4 * cm, height=2 * cm)
            header_data.append([logo, ""])
        else:
            header_data.append(["", ""])

        # Company info
        company_info = f"""
        <b>{company_name}</b><br/>
        {company_address}<br/>
        CIF/NIF: {company_tax_id}
        """
        header_data[0][0] = Paragraph(company_info, self.styles["CompanyInfo"])

        # Invoice info
        invoice_info = f"""
        <b>FACTURA</b><br/>
        Numero: {invoice.invoice_number}<br/>
        Fecha: {self._format_date(invoice.issue_date)}<br/>
        """
        header_data[0][1] = Paragraph(invoice_info, self.styles["InvoiceHeader"])

        header_table = Table(header_data, colWidths=[10 * cm, 7 * cm])
        header_table.setStyle(TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
        ]))
        elements.append(header_table)
        elements.append(Spacer(1, 1 * cm))

        # Customer info section
        customer_info = f"""
        <b>Datos del cliente:</b><br/>
        {invoice.customer_name or "N/A"}<br/>
        {invoice.customer_address or ""}<br/>
        {f"CIF/NIF: {invoice.customer_tax_id}" if invoice.customer_tax_id else ""}
        """
        elements.append(Paragraph(customer_info, self.styles["CustomerInfo"]))
        elements.append(Spacer(1, 1 * cm))

        # Line items table
        table_data = [["Descripcion", "Cantidad", "Precio Unit.", "IVA %", "Total"]]

        for item in invoice.line_items:
            subtotal = item.quantity * item.unit_price
            tax_amount = subtotal * (item.tax_rate / 100)
            total = subtotal + tax_amount
            table_data.append([
                item.description,
                str(item.quantity),
                self._format_currency(item.unit_price),
                f"{item.tax_rate:.0f}%",
                self._format_currency(total)
            ])

        # Add totals
        table_data.append(["", "", "", "Base Imponible:", self._format_currency(invoice.subtotal)])
        table_data.append(["", "", "", "IVA:", self._format_currency(invoice.tax_amount)])
        table_data.append(["", "", "", "TOTAL:", self._format_currency(invoice.total_amount)])

        items_table = Table(
            table_data,
            colWidths=[7 * cm, 2 * cm, 3 * cm, 2 * cm, 3 * cm]
        )
        items_table.setStyle(TableStyle([
            # Header style
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2563eb")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, 0), 10),
            ("ALIGN", (0, 0), (-1, 0), "CENTER"),
            ("BOTTOMPADDING", (0, 0), (-1, 0), 12),
            ("TOPPADDING", (0, 0), (-1, 0), 12),

            # Body style
            ("FONTNAME", (0, 1), (-1, -4), "Helvetica"),
            ("FONTSIZE", (0, 1), (-1, -1), 9),
            ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ("ALIGN", (0, 1), (0, -1), "LEFT"),
            ("BOTTOMPADDING", (0, 1), (-1, -1), 8),
            ("TOPPADDING", (0, 1), (-1, -1), 8),

            # Grid
            ("GRID", (0, 0), (-1, -4), 0.5, colors.grey),
            ("LINEABOVE", (3, -3), (-1, -3), 1, colors.black),

            # Totals style
            ("FONTNAME", (3, -3), (-1, -1), "Helvetica-Bold"),
            ("BACKGROUND", (3, -1), (-1, -1), colors.HexColor("#f3f4f6")),

            # Alternating row colors
            ("ROWBACKGROUNDS", (0, 1), (-1, -4), [colors.white, colors.HexColor("#f9fafb")]),
        ]))
        elements.append(items_table)
        elements.append(Spacer(1, 2 * cm))

        # Payment info
        if invoice.notes:
            elements.append(Paragraph(f"<b>Notas:</b> {invoice.notes}", self.styles["Normal"]))
            elements.append(Spacer(1, 0.5 * cm))

        # Footer
        footer_text = "Documento generado electronicamente - Conserve este documento para su contabilidad"
        elements.append(Spacer(1, 1 * cm))
        elements.append(Paragraph(footer_text, self.styles["Footer"]))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    async def save_invoice_pdf(
        self,
        invoice: Invoice,
        output_dir: str,
        company_name: str,
        company_address: str,
        company_tax_id: str,
        logo_path: Optional[str] = None
    ) -> str:
        """Generate and save an invoice PDF, returning the file path."""
        # Ensure output directory exists
        os.makedirs(output_dir, exist_ok=True)

        # Generate PDF bytes
        pdf_bytes = await self.generate_invoice_pdf(
            invoice=invoice,
            company_name=company_name,
            company_address=company_address,
            company_tax_id=company_tax_id,
            logo_path=logo_path
        )

        # Save to file
        filename = f"factura_{invoice.invoice_number.replace('/', '-')}.pdf"
        filepath = os.path.join(output_dir, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        return filepath

    async def generate_license_certificate_pdf(
        self,
        member_name: str,
        license_number: str,
        license_type: str,
        issue_date: str,
        expiration_date: str,
        club_name: str
    ) -> bytes:
        """Generate a license certificate PDF."""
        buffer = BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2 * cm,
            leftMargin=2 * cm,
            topMargin=3 * cm,
            bottomMargin=2 * cm
        )

        elements = []

        # Title
        elements.append(Paragraph("CERTIFICADO DE LICENCIA FEDERATIVA", self.styles["InvoiceTitle"]))
        elements.append(Spacer(1, 2 * cm))

        # Certificate content
        certificate_text = f"""
        Se certifica que:
        <br/><br/>
        <b>{member_name}</b>
        <br/><br/>
        Es titular de la licencia federativa numero <b>{license_number}</b>,
        con categoria <b>{license_type}</b>, perteneciente al club <b>{club_name}</b>.
        <br/><br/>
        <b>Fecha de emision:</b> {self._format_date(issue_date)}
        <br/>
        <b>Fecha de vencimiento:</b> {self._format_date(expiration_date)}
        """
        elements.append(Paragraph(certificate_text, self.styles["Normal"]))
        elements.append(Spacer(1, 3 * cm))

        # Signature area
        signature_table = Table([
            ["", "Firma y sello", ""],
            ["", "_" * 30, ""],
        ], colWidths=[6 * cm, 5 * cm, 6 * cm])
        signature_table.setStyle(TableStyle([
            ("ALIGN", (1, 0), (1, -1), "CENTER"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
        ]))
        elements.append(signature_table)

        # Footer
        elements.append(Spacer(1, 2 * cm))
        footer_text = f"Documento generado el {datetime.now().strftime('%d/%m/%Y')}"
        elements.append(Paragraph(footer_text, self.styles["Footer"]))

        doc.build(elements)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes
