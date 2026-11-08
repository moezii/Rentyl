// Email Security Utility for EmailJS Forms
import DOMPurify from 'dompurify';

class EmailSecurityManager {
  constructor() {
    this.BLOCKED_DOMAINS = [
      'tempmail.org',
      '10minutemail.com',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
      'throwaway.email',
      'getnada.com',
      'maildrop.cc',
      'mailnesia.com',
      'trashmail.com',
      'mohmal.com',
      'sharklasers.com',
      'guerrillamailblock.com',
      'pokemail.net',
      'spam4.me',
      'meltmail.com',
      'rhyta.com',
      'emkei.cf',
    ];
    this.SUSPICIOUS_PATTERNS = [
      /script/i,
      /javascript/i,
      /vbscript/i,
      /onload/i,
      /onerror/i,
      /onclick/i,
      /onmouseover/i,
      /eval/i,
      /alert/i,
      /confirm/i,
      /prompt/i,
      /document\./i,
      /window\./i,
      /<[^>]*>/g,
      /&lt;[^&]*&gt;/g,
    ];
  }

  /**
   * Comprehensive email validation
   */
  validateEmail(email) {
    if (!email || typeof email !== 'string') {
      return { valid: false, error: 'Email is required' };
    }

    // Trim and convert to lowercase
    email = email.trim().toLowerCase();

    // Basic format validation
    const emailRegex =
      /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

    if (!emailRegex.test(email)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }

    // Length validation
    if (email.length > 254) {
      return { valid: false, error: 'Email address is too long' };
    }

    // Domain validation
    const domain = email.split('@')[1];
    if (!domain || domain.length < 2) {
      return { valid: false, error: 'Invalid email domain' };
    }

    // Check for blocked domains
    if (this.BLOCKED_DOMAINS.includes(domain)) {
      return { valid: false, error: 'Temporary email addresses are not allowed' };
    }

    // Check for suspicious patterns
    if (this.containsSuspiciousContent(email)) {
      return { valid: false, error: 'Email contains invalid characters' };
    }

    return { valid: true, email: email };
  }

  /**
   * Validate and sanitize form data
   */
  validateFormData(formData) {
    const errors = {};
    const sanitizedData = {};

    // Validate required fields
    const requiredFields = ['name', 'email', 'message'];

    for (const field of requiredFields) {
      if (!formData[field] || formData[field].trim() === '') {
        errors[field] = `${field.charAt(0).toUpperCase() + field.slice(1)} is required`;
        continue;
      }

      // Sanitize the field
      sanitizedData[field] = this.sanitizeInput(formData[field]);
    }

    // Special email validation
    if (formData.email) {
      const emailValidation = this.validateEmail(formData.email);
      if (!emailValidation.valid) {
        errors.email = emailValidation.error;
      } else {
        sanitizedData.email = emailValidation.email;
      }
    }

    // Validate optional fields
    const optionalFields = ['company', 'phone', 'fleetSize'];
    for (const field of optionalFields) {
      if (formData[field]) {
        sanitizedData[field] = this.sanitizeInput(formData[field]);
      }
    }

    // Special phone validation
    if (formData.phone && formData.phone.trim()) {
      const phoneValidation = this.validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      } else {
        sanitizedData.phone = phoneValidation.phone;
      }
    }

    // Message length validation
    if (sanitizedData.message && sanitizedData.message.length > 2000) {
      errors.message = 'Message is too long (maximum 2000 characters)';
    }

    // Name validation
    if (sanitizedData.name && sanitizedData.name.length > 100) {
      errors.name = 'Name is too long (maximum 100 characters)';
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
      data: sanitizedData,
    };
  }

  /**
   * Sanitize input to prevent XSS and injection attacks
   */
  sanitizeInput(input) {
    if (!input || typeof input !== 'string') return '';

    // Remove HTML tags and scripts
    let sanitized = DOMPurify.sanitize(input, {
      ALLOWED_TAGS: [],
      ALLOWED_ATTR: [],
    });

    // Remove suspicious patterns
    for (const pattern of this.SUSPICIOUS_PATTERNS) {
      sanitized = sanitized.replace(pattern, '');
    }

    // Trim and limit length
    sanitized = sanitized.trim().substring(0, 2000);

    return sanitized;
  }

  /**
   * Check for suspicious content
   */
  containsSuspiciousContent(text) {
    if (!text) return false;

    return this.SUSPICIOUS_PATTERNS.some(pattern => pattern.test(text));
  }

  /**
   * Validate phone number
   */
  validatePhone(phone) {
    if (!phone || typeof phone !== 'string') {
      return { valid: false, error: 'Invalid phone number' };
    }

    // Remove all non-digit characters for validation
    const cleanPhone = phone.replace(/\D/g, '');

    // Check length (between 7 and 15 digits)
    if (cleanPhone.length < 7 || cleanPhone.length > 15) {
      return { valid: false, error: 'Phone number must be between 7 and 15 digits' };
    }

    // Basic format validation (allow common formats)
    const phoneRegex = /^[\+]?[1-9][\d]{0,3}[-.\s]?[\d]{1,4}[-.\s]?[\d]{1,4}[-.\s]?[\d]{1,9}$/;

    if (!phoneRegex.test(phone.trim())) {
      return { valid: false, error: 'Please enter a valid phone number' };
    }

    return { valid: true, phone: phone.trim() };
  }

  /**
   * Generate secure template parameters for EmailJS
   */
  generateSecureTemplateParams(formData, formType = 'contact') {
    const validation = this.validateFormData(formData);

    if (!validation.valid) {
      throw new Error('Form validation failed: ' + Object.values(validation.errors).join(', '));
    }

    const data = validation.data;
    const timestamp = new Date().toISOString();
    const userAgent = navigator.userAgent.substring(0, 200); // Truncate for security

    return {
      form_type: formType,
      timestamp: timestamp,
      from_name: data.name,
      from_email: data.email,
      company: data.company || 'Not specified',
      phone: data.phone || 'Not specified',
      fleet_size: data.fleetSize || 'Not specified',
      message: data.message,
      user_agent: userAgent,
      to_email: 'support@rentyl.app',
      // Add security headers
      security_check: 'validated',
      submission_id: this.generateSubmissionId(),
    };
  }

  /**
   * Generate unique submission ID
   */
  generateSubmissionId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  /**
   * Secure email submission with all validations
   */
  async secureEmailSubmission(formData, emailjsConfig, formType = 'contact') {
    // Generate secure template parameters
    const templateParams = this.generateSecureTemplateParams(formData, formType);

    // Import emailjs dynamically for security
    const emailjs = await import('@emailjs/browser');

    // Send email with security measures
    try {
      const result = await emailjs.default.send(
        emailjsConfig.serviceId,
        emailjsConfig.templateId,
        templateParams
      );

      return {
        success: true,
        result: result,
        submissionId: templateParams.submission_id,
      };
    } catch (error) {
      console.error('EmailJS submission failed:', error);
      throw new Error('Failed to send message. Please try again later.');
    }
  }
}

// Create singleton instance
export const emailSecurity = new EmailSecurityManager();
export default emailSecurity;
