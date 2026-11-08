from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, HRFlowable, Image, PageBreak
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas
from reportlab.platypus.tableofcontents import TableOfContents
from reportlab.platypus.flowables import Flowable
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from io import BytesIO
from datetime import datetime
from typing import Dict, Any
import traceback
import os
from PIL import Image as PILImage
try:
    from backend.services.pdf_translations import get_translation
except ModuleNotFoundError:
    from services.pdf_translations import get_translation
import arabic_reshaper
from bidi.algorithm import get_display

def reshape_arabic_text(text: str, lang: str = 'en') -> str:
    """
    Reshape Arabic text for proper display in PDFs.
    Arabic text needs to be reshaped and reordered for RTL display.

    Args:
        text: The text to reshape
        lang: Language code ('en' or 'ar')

    Returns:
        Reshaped text ready for PDF display
    """
    if lang != 'ar' or not text:
        return text

    try:
        # Convert to string if not already
        text = str(text)
        # Reshape Arabic text (connects letters properly)
        reshaped_text = arabic_reshaper.reshape(text)
        # Apply bidirectional algorithm (handles RTL)
        bidi_text = get_display(reshaped_text)
        return bidi_text
    except Exception as e:
        print(f"Error reshaping Arabic text: {e}")
        return text

def create_table_cell(text: str, lang: str, style=None) -> Paragraph:
    """
    Create a table cell with proper formatting for the given language.
    Wraps text in a Paragraph to ensure proper font rendering.

    Args:
        text: The text content
        lang: Language code ('en' or 'ar')
        style: Optional ParagraphStyle to use

    Returns:
        Paragraph object ready for table cell
    """
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.platypus import Paragraph

    if style is None:
        styles = getSampleStyleSheet()
        style = ParagraphStyle(
            'TableCell',
            parent=styles['Normal'],
            fontSize=10,
            fontName=get_font_name(lang),
            leading=12
        )

    # Text is assumed to be already reshaped if Arabic
    return Paragraph(str(text), style)

def parse_numeric_value(value) -> float:
    """
    Parse a numeric value that might be a string with currency symbols or units.
    Examples: "16.00 OMR", "16.00", 16.0, "0 كم"

    Args:
        value: The value to parse (can be string, int, or float)

    Returns:
        Float value
    """
    if value is None:
        return 0.0

    # If already a number, return it
    if isinstance(value, (int, float)):
        return float(value)

    # If string, extract the numeric part
    if isinstance(value, str):
        try:
            # Remove common currency symbols and units
            import re
            # Extract first number (handles formats like "16.00 OMR" or "0 كم")
            match = re.search(r'[-+]?\d*\.?\d+', value)
            if match:
                return float(match.group())
            return 0.0
        except Exception as e:
            print(f"Error parsing numeric value '{value}': {e}")
            return 0.0

    return 0.0

# Flag to track if fonts have been registered
_fonts_registered = False

def register_arabic_fonts():
    """Register Arabic-compatible fonts for PDF generation"""
    global _fonts_registered

    if _fonts_registered:
        return

    try:
        # Try to register fonts that support Arabic
        # Priority order: Traditional Arabic, Segoe UI, Tahoma, Times New Roman, Arial
        font_paths = [
            # Windows paths - Traditional Arabic has the best Arabic support
            ('C:/Windows/Fonts/trado.ttf', 'C:/Windows/Fonts/tradbdo.ttf'),
            # Segoe UI has good Arabic support and is modern
            ('C:/Windows/Fonts/segoeui.ttf', 'C:/Windows/Fonts/segoeuib.ttf'),
            # Times New Roman has good Arabic glyph coverage
            ('C:/Windows/Fonts/times.ttf', 'C:/Windows/Fonts/timesbd.ttf'),
            # Tahoma has excellent Arabic support
            ('C:/Windows/Fonts/tahoma.ttf', 'C:/Windows/Fonts/tahomabd.ttf'),
            ('C:/Windows/Fonts/arial.ttf', 'C:/Windows/Fonts/arialbd.ttf'),
            ('C:/Windows/Fonts/calibri.ttf', 'C:/Windows/Fonts/calibrib.ttf'),
            ('C:/Windows/Fonts/arialuni.ttf', None),  # Arial Unicode MS
            # Linux paths
            ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'),
            ('/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf'),
            # Mac paths
            ('/Library/Fonts/Arial Unicode.ttf', None),
            ('/System/Library/Fonts/Supplemental/Arial Unicode.ttf', None),
        ]

        font_registered = False
        for font_path, bold_path in font_paths:
            if os.path.exists(font_path):
                try:
                    pdfmetrics.registerFont(TTFont('Arabic', font_path))
                    # For bold, try to find the bold variant or use the same font
                    if bold_path and os.path.exists(bold_path):
                        pdfmetrics.registerFont(TTFont('Arabic-Bold', bold_path))
                    else:
                        pdfmetrics.registerFont(TTFont('Arabic-Bold', font_path))
                    font_registered = True
                    print(f"Successfully registered Arabic font from: {font_path}")
                    break
                except Exception as e:
                    print(f"Failed to register font from {font_path}: {e}")
                    continue

        if not font_registered:
            print("Warning: Could not find Arabic-compatible font. Arabic text may not display correctly.")
            print("Attempted paths:")
            for font_path, _ in font_paths:
                print(f"  - {font_path}: {'EXISTS' if os.path.exists(font_path) else 'NOT FOUND'}")

        _fonts_registered = font_registered

    except Exception as e:
        print(f"Error registering Arabic fonts: {e}")
        traceback.print_exc()

# Register fonts on module import
register_arabic_fonts()

def get_font_name(lang: str, bold: bool = False) -> str:
    """
    Get the appropriate font name based on language.

    Args:
        lang: Language code ('en' or 'ar')
        bold: Whether to use bold font

    Returns:
        Font name string
    """
    if lang == 'ar':
        if _fonts_registered:
            return 'Arabic-Bold' if bold else 'Arabic'
        else:
            # Fallback to Helvetica for Arabic if fonts not registered
            # This will show boxes but at least won't crash
            print(f"Warning: Arabic font not registered, falling back to Helvetica for {'bold' if bold else 'normal'} text")
            return 'Helvetica-Bold' if bold else 'Helvetica'
    else:
        return 'Helvetica-Bold' if bold else 'Helvetica'

class ColoredBox(Flowable):
    """Custom flowable for colored background boxes"""
    def __init__(self, width, height, color):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.color = color

    def draw(self):
        self.canv.setFillColor(self.color)
        self.canv.rect(0, 0, self.width, self.height, fill=1, stroke=0)

def get_logo_image():
    """Get the Rentyl logo for PDF inclusion"""
    try:
        possible_paths = [
            os.path.join(os.path.dirname(__file__), '..', 'assets', 'logo-whitebackground.jpg'),
            os.path.join('/backend', 'assets', 'logo-whitebackground.jpg'),
            os.path.join(os.path.dirname(__file__), '..', '..', 'backend', 'assets', 'logo-whitebackground.jpg'),
            os.path.join(os.getcwd(), 'backend', 'assets', 'logo-whitebackground.jpg'),
            '/backend/assets/logo-whitebackground.jpg'
        ]
        
        for logo_path in possible_paths:
            if os.path.exists(logo_path):
                return logo_path
        
        return None
        
    except Exception as e:
        return None

class LogoFlowable(Flowable):
    """Custom flowable for the Rentyl logo with proper aspect ratio"""
    def __init__(self, logo_path=None, max_width=100, max_height=40):
        Flowable.__init__(self)
        self.logo_path = logo_path
        self.max_width = max_width
        self.max_height = max_height
        # Calculate proper dimensions maintaining aspect ratio
        self.width = max_width
        self.height = max_height
    
    def draw(self):
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                # Get actual image dimensions to maintain aspect ratio
                with PILImage.open(self.logo_path) as img:
                    img_width, img_height = img.size
                    aspect_ratio = img_width / img_height
                
                # Calculate display dimensions maintaining aspect ratio
                if aspect_ratio > (self.max_width / self.max_height):
                    # Image is wider, constrain by width
                    display_width = self.max_width
                    display_height = self.max_width / aspect_ratio
                else:
                    # Image is taller, constrain by height
                    display_height = self.max_height
                    display_width = self.max_height * aspect_ratio
                
                # Center the image
                x_offset = (self.width - display_width) / 2
                y_offset = (self.height - display_height) / 2
                
                # Draw the actual logo image with proper aspect ratio
                self.canv.drawImage(self.logo_path, x_offset, y_offset, 
                                  width=display_width, height=display_height, 
                                  preserveAspectRatio=True)
            except Exception:
                pass
    

class CompactHeaderSection(Flowable):
    """Centered header with logo and receipt text"""
    def __init__(self, width, logo_path=None, height=100, receipt_text="RECEIPT", lang='en'):
        Flowable.__init__(self)
        self.width = width
        self.height = height
        self.logo_path = logo_path
        self.receipt_text = receipt_text
        self.lang = lang
    
    def draw(self):
        self.canv.saveState()
        
        # Center everything
        center_x = self.width / 2
        
        # Logo dimensions
        logo_width = 180
        logo_height = 50
        
        # Position logo in center top
        logo_x = center_x - (logo_width / 2)
        logo_y = self.height - logo_height - 10
        
        if self.logo_path and os.path.exists(self.logo_path):
            try:
                # Get actual image dimensions to maintain aspect ratio
                with PILImage.open(self.logo_path) as img:
                    img_width, img_height = img.size
                    aspect_ratio = img_width / img_height
                
                # Calculate display dimensions maintaining aspect ratio
                if aspect_ratio > (logo_width / logo_height):
                    display_width = logo_width
                    display_height = logo_width / aspect_ratio
                else:
                    display_height = logo_height
                    display_width = logo_height * aspect_ratio
                
                # Center the logo
                logo_x = center_x - (display_width / 2)
                logo_y = self.height - display_height - 10
                
                self.canv.drawImage(self.logo_path, logo_x, logo_y, 
                                  width=display_width, height=display_height, 
                                  preserveAspectRatio=True)
            except Exception as e:
                print(f"Error drawing logo in CompactHeaderSection: {str(e)}")
                import traceback
                traceback.print_exc()
        
        # Draw "RECEIPT" text centered below logo with appropriate font
        self.canv.setFillColor(colors.HexColor('#1f2937'))
        font_name = get_font_name(self.lang, bold=True)
        self.canv.setFont(font_name, 24)
        # receipt_text is already reshaped by get_translation(), don't reshape again
        receipt_width = self.canv.stringWidth(self.receipt_text, font_name, 24)
        receipt_x = center_x - (receipt_width / 2)
        receipt_y = 15  # Position at bottom of header
        self.canv.drawString(receipt_x, receipt_y, self.receipt_text)
        
        self.canv.restoreState()
    

class ModernHeaderFooter:
    """Custom header and footer for modern design (no IDs)"""
    def __init__(self, company_name):
        self.company_name = company_name
    def header(self, canvas, doc):
        pass
    def footer(self, canvas, doc):
        canvas.saveState()
        canvas.setFont('Helvetica', 10)
        canvas.setFillColor(colors.HexColor('#6b7280'))
        # No ID in footer
        canvas.restoreState()

def generate_rental_receipt_pdf(rental_data: Dict[str, Any], client_data: Dict[str, Any], car_data: Dict[str, Any], company_data: Dict[str, Any] = None, lang: str = 'en') -> BytesIO:
    """
    Generate a modern, professional PDF receipt for a rental contract.

    Args:
        rental_data: Dictionary containing rental information
        client_data: Dictionary containing client information
        car_data: Dictionary containing car information
        company_data: Dictionary containing company information (optional)
        lang: Language code for PDF content ('en' or 'ar', default: 'en')

    Returns:
        BytesIO: PDF file as bytes
    """
    # Register Arabic fonts if needed
    register_arabic_fonts()

    buffer = BytesIO()

    try:
        # Modern color palette
        PRIMARY_COLOR = colors.HexColor('#3b82f6')      # Modern blue
        SECONDARY_COLOR = colors.HexColor('#1e40af')    # Darker blue
        ACCENT_COLOR = colors.HexColor('#06b6d4')       # Cyan
        TEXT_DARK = colors.HexColor('#1f2937')          # Dark gray
        TEXT_MEDIUM = colors.HexColor('#4b5563')        # Medium gray
        TEXT_LIGHT = colors.HexColor('#6b7280')         # Light gray
        BACKGROUND_LIGHT = colors.HexColor('#f8fafc')   # Very light gray
        SUCCESS_COLOR = colors.HexColor('#10b981')      # Green
        WARNING_COLOR = colors.HexColor('#f59e0b')      # Orange
        ERROR_COLOR = colors.HexColor('#ef4444')        # Red
        
        company_name = company_data.get('name', 'Rentyl') if company_data else 'Rentyl'
        
        # Create document with custom header/footer - reduced margins
        doc = SimpleDocTemplate(
            buffer, 
            pagesize=A4, 
            rightMargin=50, 
            leftMargin=50,
            topMargin=50,
            bottomMargin=70,
            title="Rental Receipt"
        )
        
        # Set up header/footer
        header_footer = ModernHeaderFooter(company_name)
        
        # Container for the 'Flowable' objects
        elements = []
        
        # Modern styles
        styles = getSampleStyleSheet()
        
        # Section heading style
        section_heading_style = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            fontName=get_font_name(lang, bold=True),
            spaceBefore=25,
            spaceAfter=12,
            textColor=SECONDARY_COLOR,
            letterSpacing=1,
            borderPadding=8,
            leftIndent=0,
            backColor=BACKGROUND_LIGHT
        )
        
        # Modern normal style
        modern_normal_style = ParagraphStyle(
            'ModernNormal',
            parent=styles['Normal'],
            fontSize=10,
            fontName=get_font_name(lang),
            spaceAfter=4,
            textColor=TEXT_DARK,
            leading=14
        )
        
        # Highlight style for important info
        highlight_style = ParagraphStyle(
            'Highlight',
            parent=styles['Normal'],
            fontSize=12,
            fontName=get_font_name(lang, bold=True),
            spaceAfter=6,
            textColor=PRIMARY_COLOR,
            alignment=TA_CENTER,
            borderColor=PRIMARY_COLOR,
            borderWidth=1,
            borderPadding=8,
            backColor=colors.HexColor('#eff6ff')
        )
        
        # Get currency symbol
        currency_symbol = rental_data.get('currency_symbol', '$')

        # Centered header with logo and receipt text
        logo_path = get_logo_image()
        header_section = CompactHeaderSection(width=A4[0] - 100, logo_path=logo_path, height=100, receipt_text=get_translation(lang, 'receipt'), lang=lang)  # Account for margins
        elements.append(header_section)
        elements.append(Spacer(1, 20))

        # Format date/time based on language
        now = datetime.now()
        if lang == 'ar':
            # For Arabic: "December 14, 2025 في 20:10" (date first, then time)
            receipt_date = f"{now.strftime('%B %d, %Y')} {get_translation(lang, 'at')} {now.strftime('%H:%M')}"
        else:
            receipt_date = now.strftime('%B %d, %Y at %H:%M')
        
        # Modern receipt info style
        receipt_info_style = ParagraphStyle(
            'ReceiptInfo',
            parent=styles['Normal'],
            fontSize=11,
            fontName=get_font_name(lang),
            spaceAfter=20,
            alignment=TA_CENTER,
            textColor=TEXT_MEDIUM,
            spaceBefore=5
        )
        
        receipt_info = f"""
        <para align=center>
        <b>{get_translation(lang, 'receipt_date')}:</b> {receipt_date}
        </para>
        """
        elements.append(Paragraph(receipt_info, receipt_info_style))
        
        # CLIENT INFORMATION with modern card design
        elements.append(Paragraph(get_translation(lang, 'client_information'), section_heading_style))
        
        # Client info table (show raw ID on document)
        # Reshape dynamic text for Arabic
        client_name = reshape_arabic_text(client_data.get('name') if client_data and client_data.get('name') else 'N/A', lang)
        phone_number = client_data.get('phone_number') if client_data and client_data.get('phone_number') else 'N/A'
        
        client_info_data = [
            [f"{get_translation(lang, 'contract_id')}:", rental_data.get('rental_id', 'N/A')],
            [f"{get_translation(lang, 'client_name')}:", client_name],
            [f"{get_translation(lang, 'phone_number')}:", phone_number],
        ]
        
        if client_data and client_data.get('address'):
            address = reshape_arabic_text(client_data.get('address'), lang)
            client_info_data.append([get_translation(lang, 'address'), address])
        
        # Reverse columns for RTL if Arabic
        if lang == 'ar':
            client_info_data = [[row[1], row[0]] for row in client_info_data]
            col_widths = [4*inch, 2*inch]
            align = 'RIGHT'
            label_col = 1
            value_col = 0
        else:
            col_widths = [2*inch, 4*inch]
            align = 'LEFT'
            label_col = 0
            value_col = 1
        
        client_table = Table(client_info_data, colWidths=col_widths)
        client_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TEXTCOLOR', (label_col, 0), (label_col, -1), TEXT_MEDIUM),
            ('TEXTCOLOR', (value_col, 0), (value_col, -1), TEXT_DARK),
            ('ALIGN', (0, 0), (-1, -1), align),
            ('FONTNAME', (label_col, 0), (label_col, -1), get_font_name(lang, bold=True)),
            ('FONTNAME', (value_col, 0), (value_col, -1), get_font_name(lang)),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e5e7eb')),
            ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(client_table)
        elements.append(Spacer(1, 20))
        
        # VEHICLE INFORMATION with modern styling
        elements.append(Paragraph(get_translation(lang, 'vehicle_information'), section_heading_style))
        
        # Vehicle info table (no ID)
        # Reshape dynamic text for Arabic
        make = reshape_arabic_text(car_data.get('make', 'N/A'), lang)
        model = reshape_arabic_text(car_data.get('model', 'N/A'), lang)
        
        vehicle_info_data = [
            [f"{get_translation(lang, 'make')}:", make],
            [f"{get_translation(lang, 'model')}:", model],
            [f"{get_translation(lang, 'year')}:", car_data.get('year', 'N/A')],
            [f"{get_translation(lang, 'license_plate')}:", car_data.get('license_plate', 'N/A')],
        ]
        
        if rental_data.get('mileage_after') is not None:
            vehicle_info_data.append([get_translation(lang, 'ending_mileage'), rental_data.get('mileage_after_display', 'N/A')])
            if rental_data.get('total_distance_display'):
                vehicle_info_data.append([get_translation(lang, 'total_distance'), rental_data.get('total_distance_display')])
            else:
                # Fallback without units
                total_distance = rental_data.get('mileage_after', 0) - rental_data.get('mileage_before', 0)
                vehicle_info_data.append([get_translation(lang, 'total_distance'), f"{total_distance:,}"])
        
        # Reverse columns for RTL if Arabic
        if lang == 'ar':
            vehicle_info_data = [[row[1], row[0]] for row in vehicle_info_data]
            col_widths = [4*inch, 2*inch]
            align = 'RIGHT'
            label_col = 1
            value_col = 0
        else:
            col_widths = [2*inch, 4*inch]
            align = 'LEFT'
            label_col = 0
            value_col = 1
        
        vehicle_table = Table(vehicle_info_data, colWidths=col_widths)
        vehicle_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TEXTCOLOR', (label_col, 0), (label_col, -1), TEXT_MEDIUM),
            ('TEXTCOLOR', (value_col, 0), (value_col, -1), TEXT_DARK),
            ('ALIGN', (0, 0), (-1, -1), align),
            ('FONTNAME', (label_col, 0), (label_col, -1), get_font_name(lang, bold=True)),
            ('FONTNAME', (value_col, 0), (value_col, -1), get_font_name(lang)),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e5e7eb')),
            ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(vehicle_table)
        elements.append(Spacer(1, 20))
        

        
        # RENTAL PERIOD with timeline design
        elements.append(Paragraph(get_translation(lang, 'rental_period'), section_heading_style))
        
        start_date = rental_data.get('rental_start_date')
        end_date = rental_data.get('rental_end_date')
        total_days = rental_data.get('total_days', 0)
        
        # Format dates
        try:
            if isinstance(start_date, str):
                start_date = datetime.fromisoformat(start_date.replace('Z', '+00:00')).strftime('%B %d, %Y')
            elif hasattr(start_date, 'strftime'):
                start_date = start_date.strftime('%B %d, %Y')
        except:
            start_date = str(start_date) if start_date else 'N/A'
        
        try:
            if isinstance(end_date, str):
                end_date = datetime.fromisoformat(end_date.replace('Z', '+00:00')).strftime('%B %d, %Y')
            elif hasattr(end_date, 'strftime'):
                end_date = end_date.strftime('%B %d, %Y')
        except:
            end_date = str(end_date) if end_date else 'N/A'
        
        period_data = [
            [get_translation(lang, 'start_date'), str(start_date)],
            [get_translation(lang, 'end_date'), str(end_date)],
            [get_translation(lang, 'duration'), f"{total_days} {get_translation(lang, 'days' if total_days != 1 else 'day')}"],
        ]
        
        # Reverse columns for RTL if Arabic
        if lang == 'ar':
            period_data = [[row[1], row[0]] for row in period_data]
            col_widths = [4*inch, 2*inch]
            align = 'RIGHT'
            label_col = 1
            value_col = 0
        else:
            col_widths = [2*inch, 4*inch]
            align = 'LEFT'
            label_col = 0
            value_col = 1
        
        period_table = Table(period_data, colWidths=col_widths)
        period_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, -1), colors.white),
            ('TEXTCOLOR', (label_col, 0), (label_col, -1), TEXT_MEDIUM),
            ('TEXTCOLOR', (value_col, 0), (value_col, -1), TEXT_DARK),
            ('ALIGN', (0, 0), (-1, -1), align),
            ('FONTNAME', (label_col, 0), (label_col, -1), get_font_name(lang, bold=True)),
            ('FONTNAME', (value_col, 0), (value_col, -1), get_font_name(lang)),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('LINEBELOW', (0, 0), (-1, -2), 0.5, colors.HexColor('#e5e7eb')),
            ('LINEBELOW', (0, -1), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
        ]))
        elements.append(period_table)
        elements.append(Spacer(1, 25))
        
        # Force page break before pricing breakdown
        elements.append(PageBreak())
        
        # PRICING BREAKDOWN with modern invoice styling
        elements.append(Paragraph(get_translation(lang, 'pricing_breakdown'), section_heading_style))

        # Get pricing data - use parse_numeric_value to handle strings with currency symbols
        daily_rate_display = parse_numeric_value(rental_data.get('daily_rate_display', rental_data.get('daily_rate', 0)))
        additional_charges_display = parse_numeric_value(rental_data.get('additional_charges_display', rental_data.get('additional_charges', 0)))
        final_price_display = parse_numeric_value(rental_data.get('final_price_display', rental_data.get('final_price', 0)))
        amount_paid_display = parse_numeric_value(rental_data.get('amount_paid_display', rental_data.get('amount_paid', 0)))
        balance_due_display = final_price_display - amount_paid_display
        
        # Build pricing table data
        pricing_data = [
            [get_translation(lang, 'description'), get_translation(lang, 'rate'), get_translation(lang, 'days'), get_translation(lang, 'amount')],
            [get_translation(lang, 'daily_rental_rate'), f"{currency_symbol}{daily_rate_display:.2f}", str(total_days), f"{currency_symbol}{daily_rate_display * total_days:.2f}"]
        ]
        
        # Add additional charges if any
        if additional_charges_display > 0:
            # Get the description and translate if it contains "Future booking charge"
            additional_desc_raw = rental_data.get('additional_charges_description', get_translation(lang, 'additional_charges'))
            if 'Future booking charge' in additional_desc_raw or 'future' in additional_desc_raw.lower():
                # Use translated text (already reshaped by get_translation)
                additional_desc = get_translation(lang, 'future_booking_charge')
            else:
                # Only reshape if it's not from get_translation
                additional_desc = reshape_arabic_text(additional_desc_raw, lang)
            pricing_data.append([additional_desc, '', '', f"{currency_symbol}{additional_charges_display:.2f}"])
        
        # Add spacing and totals
        pricing_data.extend([
            ['', '', '', ''],  # Spacing
            ['', '', f"{get_translation(lang, 'subtotal')}:", f"{currency_symbol}{final_price_display:.2f}"],
            ['', '', f"{get_translation(lang, 'amount_paid')}:", f"{currency_symbol}{amount_paid_display:.2f}"],
        ])
        
        # Add balance due
        if balance_due_display > 0:
            pricing_data.append(['', '', f"{get_translation(lang, 'balance_due')}:", f"{currency_symbol}{balance_due_display:.2f}"])
        elif balance_due_display < 0:
            pricing_data.append(['', '', f"{get_translation(lang, 'refund_due')}:", f"{currency_symbol}{abs(balance_due_display):.2f}"])
        else:
            pricing_data.append(['', '', f"{get_translation(lang, 'status')}:", get_translation(lang, 'paid_in_full')])
        
        # Reverse columns for RTL if Arabic
        if lang == 'ar':
            pricing_data = [[row[3], row[2], row[1], row[0]] for row in pricing_data]
            col_widths = [1.5*inch, 1*inch, 1*inch, 2.5*inch]
            align_header = 'CENTER'
            align_data_left = 'RIGHT'
            align_data_right = 'LEFT'
        else:
            col_widths = [2.5*inch, 1*inch, 1*inch, 1.5*inch]
            align_header = 'CENTER'
            align_data_left = 'LEFT'
            align_data_right = 'RIGHT'
        
        pricing_table = Table(pricing_data, colWidths=col_widths)
        pricing_table.setStyle(TableStyle([
            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), get_font_name(lang, bold=True)),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('ALIGN', (0, 0), (-1, 0), align_header),
            
            # Data rows
            ('BACKGROUND', (0, 1), (-1, -4), colors.white),
            ('TEXTCOLOR', (0, 1), (-1, -4), TEXT_DARK),
            ('FONTNAME', (0, 1), (-1, -4), get_font_name(lang)),
            ('FONTSIZE', (0, 1), (-1, -4), 10),
            ('ALIGN', (0, 1), (0, -4), align_data_left),
            ('ALIGN', (1, 1), (-1, -4), align_data_right),
            
            # Total section
            ('BACKGROUND', (0, -3), (-1, -1), BACKGROUND_LIGHT),
            ('TEXTCOLOR', (0, -3), (-1, -1), TEXT_DARK),
            ('FONTNAME', (0, -3), (-1, -3), get_font_name(lang, bold=True)),
            ('FONTNAME', (0, -2), (-1, -1), get_font_name(lang, bold=True)),
            ('FONTSIZE', (0, -3), (-1, -1), 11),
            ('ALIGN', (0, -3), (-1, -1), align_data_right),
            
            # Borders and padding
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, 0), 1, colors.white),
            ('LINEBELOW', (0, 0), (-1, 0), 2, colors.white),

        ]))
        
        elements.append(pricing_table)
        elements.append(Spacer(1, 25))
        
        # Payment Status with modern badge design
        payment_status = rental_data.get('payment_status', 'unpaid').upper().replace('_', ' ')
        
        if payment_status == 'PAID':
            status_color = SUCCESS_COLOR
            status_bg = colors.HexColor('#d1fae5')
            status_icon = '✅'
        elif payment_status == 'OVERDUE':
            status_color = ERROR_COLOR
            status_bg = colors.HexColor('#fee2e2')
            status_icon = '❌'
        else:
            status_color = WARNING_COLOR
            status_bg = colors.HexColor('#fef3c7')
            status_icon = '⏳'
        
        status_style = ParagraphStyle(
            'StatusStyle',
            parent=styles['Normal'],
            fontSize=16,
            fontName=get_font_name(lang, bold=True),
            alignment=TA_CENTER,
            textColor=status_color,
            borderColor=status_color,
            borderWidth=2,
            borderPadding=12,
            backColor=status_bg,
            spaceAfter=20
        )
        
        elements.append(Paragraph(f"{status_icon} {get_translation(lang, 'payment_status')}: {get_translation(lang, payment_status.lower(), payment_status)}", status_style))
        
        # Notes section if any
        notes = rental_data.get('notes')
        if notes:
            elements.append(Paragraph(get_translation(lang, 'additional_notes'), section_heading_style))
            notes_style = ParagraphStyle(
                'Notes',
                parent=modern_normal_style,
                fontSize=10,
                borderPadding=10,
                backColor=BACKGROUND_LIGHT,
                borderColor=colors.HexColor('#d1d5db'),
                borderWidth=1
            )
            # Reshape notes text for Arabic
            notes_text = reshape_arabic_text(notes, lang)
            elements.append(Paragraph(notes_text, notes_style))
            elements.append(Spacer(1, 20))
        
        # Modern footer section
        elements.append(Spacer(1, 30))
        
        # Decorative separator instead of plain line
        elements.append(HRFlowable(width="100%", thickness=2, color=PRIMARY_COLOR))
        elements.append(Spacer(1, 15))
        
        footer_style = ParagraphStyle(
            'ModernFooter',
            parent=styles['Normal'],
            fontSize=9,
            fontName=get_font_name(lang),
            alignment=TA_CENTER,
            textColor=TEXT_LIGHT,
            leading=12
        )

        # Build footer text with proper Arabic reshaping
        thank_you_text = f"{get_translation(lang, 'thank_you')} {company_name}!"
        support_text = get_translation(lang, 'support_message')

        # For Arabic, format the date text properly
        if lang == 'ar':
            # Format as: "تم إنشاء هذا الإيصال في December 14, 2025 في 20:28"
            # The date stays in English (common practice), only surrounding text is Arabic
            generated_text = f"{get_translation(lang, 'generated_on')} {receipt_date}"
        else:
            generated_text = f"{get_translation(lang, 'generated_on')} {receipt_date}"

        footer_text = f"""
        <para align=center>
        <b>{thank_you_text}</b><br/>
        {support_text}<br/>
        {generated_text}
        </para>
        """
        elements.append(Paragraph(footer_text, footer_style))
        
        # Build PDF with custom page template
        def add_page_decorations(canvas, doc):
            header_footer.header(canvas, doc)
            header_footer.footer(canvas, doc)
        
        doc.build(elements, onFirstPage=add_page_decorations, onLaterPages=add_page_decorations)
        buffer.seek(0)
        
        # Clean up temporary PNG files
        try:
            logo_path = get_logo_image()
            if logo_path and logo_path.endswith('_temp.png') and os.path.exists(logo_path):
                os.remove(logo_path)
        except:
            pass
        
        return buffer
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}")
        traceback.print_exc()
        
        # Enhanced fallback PDF with modern styling
        try:
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=A4, 
                                  rightMargin=50, leftMargin=50,
                                  topMargin=50, bottomMargin=70)
            elements = []
            styles = getSampleStyleSheet()
            
            # Fallback styling with modern colors
            title_style = ParagraphStyle(
                'FallbackTitle',
                parent=styles['Title'],
                fontSize=20,
                textColor=colors.HexColor('#3b82f6'),
                alignment=TA_CENTER,
                spaceAfter=20
            )
            
            # Add centered header to fallback PDF too
            logo_path = get_logo_image()
            header_section = CompactHeaderSection(width=A4[0] - 100, logo_path=logo_path, height=100, lang=lang)
            elements.append(header_section)
            elements.append(Spacer(1, 20))

            # Format date/time based on language
            now = datetime.now()
            if lang == 'ar':
                # For Arabic: "December 14, 2025 في 20:10" (date first, then time)
                receipt_date = f"{now.strftime('%B %d, %Y')} {get_translation(lang, 'at')} {now.strftime('%H:%M')}"
            else:
                receipt_date = now.strftime('%B %d, %Y at %H:%M')
            
            # Receipt info
            receipt_info_style = ParagraphStyle(
                'FallbackReceiptInfo',
                parent=styles['Normal'],
                fontSize=11,
                fontName=get_font_name(lang),
                spaceAfter=25,
                alignment=TA_CENTER,
                textColor=colors.HexColor('#4b5563')
            )
            
            receipt_info = f"""
            <para align=center>
            <b>Receipt Date:</b> {receipt_date}
            </para>
            """
            elements.append(Paragraph(receipt_info, receipt_info_style))
            
            # Essential information in a clean format
            info_style = ParagraphStyle(
                'FallbackInfo',
                parent=styles['Normal'],
                fontSize=10,
                fontName=get_font_name(lang),
                spaceAfter=8,
                textColor=colors.HexColor('#1f2937')
            )
            
            elements.append(Paragraph(f"<b>Client:</b> {(client_data.get('name', 'N/A') if client_data else 'N/A')}", info_style))
            elements.append(Paragraph(f"<b>Phone:</b> {(client_data.get('phone_number', 'N/A') if client_data else 'N/A')}", info_style))
            elements.append(Spacer(1, 15))
            
            elements.append(Paragraph(f"<b>Vehicle:</b> {car_data.get('make', 'N/A')} {car_data.get('model', 'N/A')}", info_style))
            elements.append(Paragraph(f"<b>License Plate:</b> {car_data.get('license_plate', 'N/A')}", info_style))
            elements.append(Spacer(1, 15))
            
            # Pricing information
            currency_symbol = rental_data.get('currency_symbol', '$')
            total_amount = rental_data.get('final_price', 0)
            
            total_style = ParagraphStyle(
                'FallbackTotal',
                parent=styles['Normal'],
                fontSize=14,
                fontName=get_font_name(lang, bold=True),
                spaceAfter=20,
                textColor=colors.HexColor('#3b82f6'),
                alignment=TA_CENTER,
                borderColor=colors.HexColor('#3b82f6'),
                borderWidth=1,
                borderPadding=10
            )
            
            elements.append(Paragraph(f"<b>Total Amount:</b> {currency_symbol}{total_amount:.2f}", total_style))
            elements.append(Spacer(1, 30))
            
            # Footer message
            footer_style = ParagraphStyle(
                'FallbackFooter',
                parent=styles['Normal'],
                fontSize=9,
                fontName=get_font_name(lang),
                textColor=colors.HexColor('#6b7280'),
                alignment=TA_CENTER
            )
            
            elements.append(Paragraph("This is a simplified receipt generated due to a formatting issue with the detailed version.", footer_style))
            
            doc.build(elements)
            
            # Clean up temporary files for fallback too
            try:
                if logo_path and logo_path.endswith('_temp.png') and os.path.exists(logo_path):
                    os.remove(logo_path)
            except:
                pass
            
            buffer.seek(0)
            return buffer
            
        except Exception as fallback_error:
            print(f"Fallback PDF generation also failed: {str(fallback_error)}")
            raise e


def generate_net_income_statement_pdf(
    month_start: str,
    month_end: str,
    company_id: int,
    currency_symbol: str = "$",
    company_data: Dict[str, Any] = None,
    lang: str = 'en'
) -> BytesIO:
    """
    Generate a professional Net Income Statement PDF for fleet financial reporting.

    Args:
        month_start: Start date string (YYYY-MM-DD format)
        month_end: End date string (YYYY-MM-DD format)
        company_id: Company ID for data filtering
        currency_symbol: Currency symbol for display
        company_data: Dictionary containing company information (optional)
        lang: Language code for PDF content ('en' or 'ar', default: 'en')

    Returns:
        BytesIO: PDF file as bytes
    """
    from backend.supabase.client import supabase
    from datetime import datetime

    # Register Arabic fonts if needed
    register_arabic_fonts()

    buffer = BytesIO()

    try:
        # Modern color palette
        PRIMARY_COLOR = colors.HexColor('#3b82f6')      # Modern blue
        SECONDARY_COLOR = colors.HexColor('#1e40af')    # Darker blue
        TEXT_DARK = colors.HexColor('#1f2937')          # Dark gray
        TEXT_MEDIUM = colors.HexColor('#4b5563')        # Medium gray
        TEXT_LIGHT = colors.HexColor('#6b7280')         # Light gray
        BACKGROUND_LIGHT = colors.HexColor('#f8fafc')   # Very light gray
        SUCCESS_COLOR = colors.HexColor('#10b981')      # Green
        ERROR_COLOR = colors.HexColor('#ef4444')        # Red

        # Parse dates
        start_date = datetime.fromisoformat(month_start.replace("Z", "+00:00"))
        end_date = datetime.fromisoformat(month_end.replace("Z", "+00:00"))

        # Calculate month end if same month
        if month_start == month_end:
            if end_date.month == 12:
                end_date = end_date.replace(year=end_date.year + 1, month=1, day=1)
            else:
                end_date = end_date.replace(month=end_date.month + 1, day=1)

        # Fetch rental data
        rentals_result = supabase.table("rentalrecords").select(
            "final_price, amount_paid"
        ).eq("company_id", company_id).gte(
            "created_at", start_date.isoformat()
        ).lt("created_at", end_date.isoformat()).execute()

        rentals = rentals_result.data or []

        # Fetch maintenance data
        maintenance_result = supabase.table("maintenancerecords").select(
            "maintenance_cost, maintenance_type"
        ).eq("company_id", company_id).gte(
            "created_at", start_date.isoformat()
        ).lt("created_at", end_date.isoformat()).execute()

        maintenance_records = maintenance_result.data or []

        # Calculate revenue metrics
        total_invoiced = sum(r.get("final_price", 0) or 0 for r in rentals)
        total_paid = sum(r.get("amount_paid", 0) or 0 for r in rentals)
        total_unpaid = total_invoiced - total_paid

        # Calculate expense metrics
        regular_maintenance = sum(
            m.get("maintenance_cost", 0) or 0
            for m in maintenance_records
            if m.get("maintenance_type") == "regular"
        )
        irregular_maintenance = sum(
            m.get("maintenance_cost", 0) or 0
            for m in maintenance_records
            if m.get("maintenance_type") == "irregular"
        )
        total_expenses = regular_maintenance + irregular_maintenance

        # Calculate net income
        net_income = total_paid - total_expenses

        # Get company name
        company_name = company_data.get('company_name', 'Rentyl') if company_data else 'Rentyl'

        # Create document
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=70,
            title="Net Income Statement"
        )

        # Container for flowables
        elements = []

        # Styles
        styles = getSampleStyleSheet()

        # Title style
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Title'],
            fontSize=24,
            fontName=get_font_name(lang, bold=True),
            textColor=SECONDARY_COLOR,
            alignment=TA_CENTER,
            spaceAfter=10,
            spaceBefore=20
        )

        # Subtitle style
        subtitle_style = ParagraphStyle(
            'Subtitle',
            parent=styles['Normal'],
            fontSize=12,
            fontName=get_font_name(lang),
            textColor=TEXT_MEDIUM,
            alignment=TA_CENTER,
            spaceAfter=30
        )

        # Section heading style
        section_heading_style = ParagraphStyle(
            'SectionHeading',
            parent=styles['Heading2'],
            fontSize=14,
            fontName=get_font_name(lang, bold=True),
            spaceBefore=20,
            spaceAfter=10,
            textColor=SECONDARY_COLOR,
            backColor=BACKGROUND_LIGHT,
            borderPadding=8
        )

        # Add title
        elements.append(Paragraph(get_translation(lang, 'net_income_statement'), title_style))

        # Add date range subtitle
        if month_start == month_end or (end_date - start_date).days <= 31:
            date_text = start_date.strftime("%B %Y")
        else:
            date_text = f"{start_date.strftime('%B %Y')} - {end_date.strftime('%B %Y')}"
        elements.append(Paragraph(date_text, subtitle_style))

        # Add company name
        company_style = ParagraphStyle(
            'CompanyName',
            parent=styles['Normal'],
            fontSize=16,
            fontName=get_font_name(lang, bold=True),
            textColor=TEXT_DARK,
            alignment=TA_CENTER,
            spaceAfter=20
        )
        elements.append(Paragraph(company_name, company_style))

        # Create financial data table
        # Handle unpaid rentals display (could be positive for unpaid or negative for overpayment)
        if total_unpaid >= 0:
            unpaid_display = f'({currency_symbol}{total_unpaid:,.2f})'
            unpaid_label = get_translation(lang, 'less_unpaid_rentals')
        else:
            unpaid_display = f'{currency_symbol}{abs(total_unpaid):,.2f}'
            unpaid_label = get_translation(lang, 'add_overpayments')

        table_data = [
            [get_translation(lang, 'section'), get_translation(lang, 'description'), get_translation(lang, 'amount')],
            # Revenue Section Header
            [get_translation(lang, 'revenue'), '', ''],
            ['', get_translation(lang, 'rental_income_invoiced'), f'{currency_symbol}{total_invoiced:,.2f}'],
            ['', unpaid_label, unpaid_display],
            ['', get_translation(lang, 'net_rental_income'), f'{currency_symbol}{total_paid:,.2f}'],
            # Empty row
            ['', '', ''],
            # Expenses Section Header
            [get_translation(lang, 'expenses'), '', ''],
            ['', get_translation(lang, 'regular_maintenance'), f'{currency_symbol}{regular_maintenance:,.2f}'],
            ['', get_translation(lang, 'irregular_maintenance'), f'{currency_symbol}{irregular_maintenance:,.2f}'],
            ['', '', ''],
            ['', get_translation(lang, 'total_expenses'), f'{currency_symbol}{total_expenses:,.2f}'],
            # Empty row
            ['', '', ''],
            # Net Income
            [get_translation(lang, 'net_income'), get_translation(lang, 'cash_basis'),
             f'{currency_symbol}{net_income:,.2f}']
        ]

        # Reverse columns for RTL if Arabic
        if lang == 'ar':
            table_data = [[row[2], row[1], row[0]] for row in table_data]
            col_widths = [120, 240, 120]
            align_amounts = 'LEFT'
            padding_col = 0  # Reverse padding column
        else:
            col_widths = [120, 240, 120]
            align_amounts = 'RIGHT'
            padding_col = 1
        
        # Create table
        table = Table(table_data, colWidths=col_widths)

        # Define table style
        table_style = TableStyle([
            # Default font for all cells (MUST be first to be overridden by specific styles)
            ('FONTNAME', (0, 0), (-1, -1), get_font_name(lang)),
            ('FONTSIZE', (0, 0), (-1, -1), 10),

            # Header row
            ('BACKGROUND', (0, 0), (-1, 0), SECONDARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('FONTNAME', (0, 0), (-1, 0), get_font_name(lang, bold=True)),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),

            # Section headers (Revenue, Expenses, Net Income)
            ('BACKGROUND', (0, 1), (-1, 1), BACKGROUND_LIGHT),  # Revenue
            ('BACKGROUND', (0, 6), (-1, 6), BACKGROUND_LIGHT),  # Expenses
            ('BACKGROUND', (0, 12), (-1, 12), SUCCESS_COLOR if net_income >= 0 else ERROR_COLOR),
            ('FONTNAME', (0, 1), (0, 1), get_font_name(lang, bold=True)),
            ('FONTNAME', (0, 6), (0, 6), get_font_name(lang, bold=True)),
            ('FONTNAME', (0, 12), (-1, 12), get_font_name(lang, bold=True)),
            ('TEXTCOLOR', (0, 12), (-1, 12), colors.white),

            # Indentation for sub-items
            ('LEFTPADDING' if lang == 'en' else 'RIGHTPADDING', (padding_col, 2), (padding_col, 4), 20),  # Revenue items
            ('LEFTPADDING' if lang == 'en' else 'RIGHTPADDING', (padding_col, 7), (padding_col, 10), 20),  # Expense items

            # Amount column alignment
            ('ALIGN', (2 if lang == 'en' else 0, 0), (2 if lang == 'en' else 0, -1), align_amounts),

            # Total rows bold
            ('FONTNAME', (1, 4), (-1, 4), get_font_name(lang, bold=True)),  # Net Rental Income
            ('FONTNAME', (1, 10), (-1, 10), get_font_name(lang, bold=True)),  # Total Expenses

            # Grid and borders
            ('GRID', (0, 0), (-1, -1), 0.5, TEXT_LIGHT),
            ('LINEABOVE', (0, 4), (-1, 4), 1.5, SECONDARY_COLOR),  # Line above Net Rental Income
            ('LINEABOVE', (0, 10), (-1, 10), 1.5, SECONDARY_COLOR),  # Line above Total Expenses
            ('LINEABOVE', (0, 12), (-1, 12), 2, SECONDARY_COLOR),  # Line above Net Income

            # Padding
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 10),
            ('RIGHTPADDING', (0, 0), (-1, -1), 10),
        ])

        table.setStyle(table_style)
        elements.append(table)

        # Add footer notes
        elements.append(Spacer(1, 30))

        footer_style = ParagraphStyle(
            'Footer',
            parent=styles['Normal'],
            fontSize=8,
            fontName=get_font_name(lang),
            textColor=TEXT_LIGHT,
            alignment=TA_CENTER
        )

        elements.append(Paragraph(
            f"{get_translation(lang, 'generated_on_at')} {datetime.now().strftime('%B %d, %Y')} {get_translation(lang, 'at')} {datetime.now().strftime('%H:%M')}",
            footer_style
        ))

        # Build PDF
        doc.build(elements)

        buffer.seek(0)
        return buffer

    except Exception as e:
        print(f"Error generating net income statement PDF: {str(e)}")
        traceback.print_exc()
        raise e