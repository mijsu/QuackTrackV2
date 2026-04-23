/**
 * Email Service for QuackTrack
 * Uses Resend SDK for reliable email delivery
 */

import { Resend } from 'resend';

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface EmailResult {
  success: boolean;
  error?: string;
  devMode?: boolean; // Indicates email was logged but not actually sent
}

// Initialize Resend client if API key is available
const getResendClient = () => {
  if (process.env.RESEND_API_KEY) {
    return new Resend(process.env.RESEND_API_KEY);
  }
  return null;
};

/**
 * Send an email using the configured email service
 * Priority: Resend > Console (development)
 */
export async function sendEmail({ to, subject, html, text }: EmailParams): Promise<EmailResult> {
  try {
    const resend = getResendClient();
    
    // Check if we have a Resend API key
    if (resend) {
      return await sendWithResend(resend, { to, subject, html, text });
    }
    
    // Development mode - log to console
    console.log('========================================');
    console.log('📧 EMAIL (Development Mode - NOT SENT)');
    console.log('========================================');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('----------------------------------------');
    console.log(text || html.replace(/<[^>]*>/g, ''));
    console.log('========================================');
    console.log('');
    console.log('💡 To send real emails:');
    console.log('   1. Get a free API key at: https://resend.com');
    console.log('   2. Add RESEND_API_KEY to your .env file');
    console.log('   3. Verify your sender domain in Resend dashboard');
    console.log('');
    
    // Return success but indicate dev mode
    return { success: true, devMode: true };
  } catch (error) {
    console.error('Failed to send email:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to send email' 
    };
  }
}

/**
 * Send email using Resend SDK
 */
async function sendWithResend(
  resend: Resend, 
  { to, subject, html, text }: EmailParams
): Promise<{ success: boolean; error?: string }> {
  try {
    const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
    
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: [to],
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ''),
    });

    if (error) {
      console.error('Resend API error:', error);
      return { success: false, error: error.message || 'Failed to send email via Resend' };
    }

    console.log('✅ Email sent via Resend! ID:', data?.id);
    return { success: true };
  } catch (error) {
    console.error('Resend error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Resend API failed' };
  }
}

/**
 * Send faculty account credentials to personal email
 */
export async function sendFacultyCredentials(params: {
  personalEmail: string;
  facultyName: string;
  institutionalEmail: string;
  password: string;
}): Promise<{ success: boolean; error?: string }> {
  const { personalEmail, facultyName, institutionalEmail, password } = params;

  const subject = 'Welcome to QuackTrack - Your PTC Faculty Account';
  
  const loginUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to QuackTrack</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="margin: 0;">🎓 QuackTrack</h1>
        <p style="margin: 10px 0 0 0;">Pateros Technological College</p>
      </div>
      
      <div style="background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none;">
        <h2 style="color: #1e40af; margin-top: 0;">Welcome to QuackTrack, ${facultyName}!</h2>
        
        <p>Your faculty account has been created. Below are your login credentials:</p>
        
        <div style="background: white; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #1e40af;">📋 Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-weight: bold;">Email:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; font-family: monospace; font-size: 16px;">${institutionalEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Password:</td>
              <td style="padding: 10px 0; font-family: monospace; font-size: 16px; color: #dc2626;">${password}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
          <strong>⚠️ Important:</strong>
          <ul style="margin: 10px 0 0 0; padding-left: 20px;">
            <li>Please log in using your <strong>institutional email</strong> (${institutionalEmail})</li>
            <li>Change your password immediately after your first login</li>
            <li>Keep your credentials secure and do not share them</li>
          </ul>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${loginUrl}" 
             style="background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%); color: white; padding: 15px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
            Login to QuackTrack
          </a>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        
        <p style="font-size: 14px; color: #6b7280;">
          If you have any questions or need assistance, please contact the IT Department.
        </p>
        
        <p style="font-size: 12px; color: #9ca3af; text-align: center; margin-top: 30px;">
          This is an automated message from QuackTrack - Pateros Technological College<br>
          © ${new Date().getFullYear()} PTC. All rights reserved.
        </p>
      </div>
    </body>
    </html>
  `;

  const text = `
Welcome to QuackTrack, ${facultyName}!

Your faculty account has been created. Below are your login credentials:

Email: ${institutionalEmail}
Password: ${password}

IMPORTANT:
- Please log in using your institutional email (${institutionalEmail})
- Change your password immediately after your first login
- Keep your credentials secure and do not share them

Login at: ${loginUrl}

If you have any questions or need assistance, please contact the IT Department.

This is an automated message from QuackTrack - Pateros Technological College
  `.trim();

  return sendEmail({ to: personalEmail, subject, html, text });
}

/**
 * Generate a random password
 * - Exactly 6 characters long
 * - Uses random letters and numbers
 * - All characters must be uppercase
 */
export function generatePassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

/**
 * Generate institutional email from name
 * Format: lastname.firstname@ptc.edu.ph
 */
export function generateInstitutionalEmail(firstName: string, lastName: string): string {
  // Clean and normalize the names
  const cleanFirst = firstName
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, ''); // Remove non-alphabetic characters
  
  const cleanLast = lastName
    .toLowerCase()
    .trim()
    .replace(/[^a-z]/g, ''); // Remove non-alphabetic characters
  
  return `${cleanLast}.${cleanFirst}@ptc.edu.ph`;
}

/**
 * Parse name into first and last name
 * Assumes format: "FirstName LastName" or "FirstName MiddleName LastName"
 */
export function parseName(fullName: string): { firstName: string; lastName: string } {
  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { firstName: parts[0], lastName: parts[0] };
  }
  
  // Last word is the last name, everything else is first name
  const lastName = parts[parts.length - 1];
  const firstName = parts.slice(0, -1).join(' ');
  
  return { firstName, lastName };
}
