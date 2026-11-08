# PDF Translation dictionaries for multilingual PDF generation
import arabic_reshaper
from bidi.algorithm import get_display

PDF_TRANSLATIONS = {
    'en': {
        # Receipt translations
        'receipt': 'RECEIPT',
        'receipt_date': 'Receipt Date',
        'client_information': '👤 CLIENT INFORMATION',
        'contract_id': 'Contract ID',
        'client_name': 'Client Name',
        'phone_number': 'Phone Number',
        'address': 'Address',
        'vehicle_information': '🚗 VEHICLE INFORMATION',
        'make': 'Make',
        'model': 'Model',
        'year': 'Year',
        'license_plate': 'License Plate',
        'ending_mileage': 'Ending Mileage',
        'total_distance': 'Total Distance',
        'rental_period': '📅 RENTAL PERIOD',
        'start_date': 'Start Date',
        'end_date': 'End Date',
        'duration': 'Duration',
        'day': 'day',
        'days': 'days',
        'pricing_breakdown': 'PRICING BREAKDOWN',
        'description': 'Description',
        'rate': 'Rate',
        'amount': 'Amount',
        'daily_rental_rate': 'Daily Rental Rate',
        'additional_charges': 'Additional charges',
        'subtotal': 'SUBTOTAL',
        'amount_paid': 'AMOUNT PAID',
        'balance_due': 'BALANCE DUE',
        'refund_due': 'REFUND DUE',
        'status': 'STATUS',
        'paid_in_full': 'PAID IN FULL ✓',
        'payment_status': 'PAYMENT STATUS',
        'paid': 'PAID',
        'unpaid': 'UNPAID',
        'overdue': 'OVERDUE',
        'partially_paid': 'PARTIALLY PAID',
        'additional_notes': '📝 ADDITIONAL NOTES',
        'thank_you': 'Thank you for choosing',
        'support_message': 'For support or questions, please contact us.',
        'generated_on': 'This receipt was generated on',
        'future_booking_charge': 'Future booking charge',

        # Income statement translations
        'net_income_statement': 'Net Income Statement',
        'revenue': 'Revenue',
        'rental_income_invoiced': 'Rental Income (Invoiced)',
        'less_unpaid_rentals': 'Less: Unpaid Rentals',
        'add_overpayments': 'Add: Overpayments',
        'net_rental_income': 'Net Rental Income (Collected)',
        'expenses': 'Expenses',
        'regular_maintenance': 'Regular Maintenance',
        'irregular_maintenance': 'Irregular Maintenance',
        'total_expenses': 'Total Expenses',
        'net_income': 'Net Income',
        'cash_basis': 'Cash Basis (Collected Income - Expenses)',
        'section': 'Section',
        'generated_on_at': 'Generated on',
        'at': 'at'
    },
    'ar': {
        # Receipt translations
        'receipt': 'إيصال',
        'receipt_date': 'تاريخ الإيصال',
        'client_information': '👤 معلومات العميل',
        'contract_id': 'رقم العقد',
        'client_name': 'اسم العميل',
        'phone_number': 'رقم الهاتف',
        'address': 'العنوان',
        'vehicle_information': '🚗 معلومات المركبة',
        'make': 'الصانع',
        'model': 'الطراز',
        'year': 'السنة',
        'license_plate': 'لوحة الترخيص',
        'ending_mileage': 'المسافة النهائية',
        'total_distance': 'إجمالي المسافة',
        'rental_period': '📅 فترة الإيجار',
        'start_date': 'تاريخ البداية',
        'end_date': 'تاريخ النهاية',
        'duration': 'المدة',
        'day': 'يوم',
        'days': 'أيام',
        'pricing_breakdown': 'تفصيل الأسعار',
        'description': 'الوصف',
        'rate': 'السعر',
        'amount': 'المبلغ',
        'daily_rental_rate': 'السعر اليومي للإيجار',
        'additional_charges': 'رسوم إضافية',
        'subtotal': 'المجموع الفرعي',
        'amount_paid': 'المبلغ المدفوع',
        'balance_due': 'المبلغ المستحق',
        'refund_due': 'المبلغ المسترد',
        'status': 'الحالة',
        'paid_in_full': 'مدفوع بالكامل ✓',
        'payment_status': 'حالة الدفع',
        'paid': 'مدفوع',
        'unpaid': 'غير مدفوع',
        'overdue': 'متأخر',
        'partially_paid': 'مدفوع جزئياً',
        'additional_notes': '📝 ملاحظات إضافية',
        'thank_you': 'شكراً لاختيارك',
        'support_message': 'للدعم أو الاستفسارات، يرجى الاتصال بنا.',
        'generated_on': 'تم إنشاء هذا الإيصال في',
        'future_booking_charge': 'رسوم الحجز المستقبلي',

        # Income statement translations
        'net_income_statement': 'بيان صافي الدخل',
        'revenue': 'الإيرادات',
        'rental_income_invoiced': 'دخل الإيجار (المفوتر)',
        'less_unpaid_rentals': 'ناقص: الإيجارات غير المدفوعة',
        'add_overpayments': 'إضافة: المدفوعات الزائدة',
        'net_rental_income': 'صافي دخل الإيجار (المحصل)',
        'expenses': 'المصروفات',
        'regular_maintenance': 'الصيانة الدورية',
        'irregular_maintenance': 'الصيانة غير الدورية',
        'total_expenses': 'إجمالي المصروفات',
        'net_income': 'صافي الدخل',
        'cash_basis': 'الأساس النقدي (الدخل المحصل - المصروفات)',
        'section': 'القسم',
        'generated_on_at': 'تم الإنشاء في',
        'at': 'في'
    }
}

def get_translation(lang: str, key: str, default: str = None) -> str:
    """
    Get translation for a specific key in the given language.
    Automatically reshapes Arabic text for proper PDF display.
    
    Args:
        lang: Language code ('en' or 'ar')
        key: Translation key
        default: Default value if translation not found
    
    Returns:
        Translated string (reshaped if Arabic)
    """
    if lang not in PDF_TRANSLATIONS:
        lang = 'en'  # Fallback to English
    
    translation = PDF_TRANSLATIONS.get(lang, {}).get(key)
    if translation is None:
        # Fallback to English if translation not found
        translation = PDF_TRANSLATIONS.get('en', {}).get(key, default or key)
    
    # Reshape Arabic text for proper display
    if lang == 'ar' and translation:
        try:
            reshaped_text = arabic_reshaper.reshape(translation)
            translation = get_display(reshaped_text)
        except Exception as e:
            print(f"Error reshaping Arabic text for key '{key}': {e}")
    
    return translation
