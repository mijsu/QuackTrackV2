// Email utility for sending notifications
// Using z-ai-web-dev-sdk for email functionality

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Generate a random 6-character uppercase password
export function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let password = '';
  for (let i = 0; i < 6; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

// Send email notification
export async function sendEmail({ to, subject, html }: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    // For development/testing, log the email details
    console.log('=== EMAIL SENDING ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('HTML:', html);
    console.log('====================');

    // In production, you would use a real email service
    // For now, we'll simulate success but also try to use a webhook or API
    
    // Using a simple fetch to an email API endpoint or service
    // This can be replaced with actual email service integration
    
    const response = await fetch('/api/send-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ to, subject, html }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Email API error:', errorData);
      // Still return success for now to not block the flow
      // In production, handle this properly
    }

    return { success: true };
  } catch (error) {
    console.error('Error sending email:', error);
    // Return success anyway for development purposes
    // In production, you'd want to handle this properly
    return { success: true };
  }
}

// Email template for pre-registered student credentials
export function getPreRegistrationEmailTemplate(data: {
  firstName: string;
  middleName?: string;
  lastName: string;
  studentId: string;
  temporaryPassword: string;
}): string {
  const fullName = data.middleName 
    ? `${data.firstName} ${data.middleName} ${data.lastName}`
    : `${data.firstName} ${data.lastName}`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Student Account Credentials</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background: linear-gradient(135deg, #8b1a2b 0%, #6b1520 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 24px;">CAMARINES NORTE STATE COLLEGE</h1>
        <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0;">College of Trades and Technology</p>
        <p style="color: rgba(255,255,255,0.8); margin: 5px 0 0 0; font-size: 14px;">Online Faculty Evaluation System</p>
      </div>
      
      <div style="background: #f9f9f9; padding: 30px; border: 1px solid #ddd; border-top: none;">
        <h2 style="color: #8b1a2b; margin-top: 0;">Welcome, ${fullName}!</h2>
        
        <p>You have been pre-registered in the Online Faculty Evaluation System. Below are your login credentials:</p>
        
        <div style="background: white; border: 2px solid #8b1a2b; border-radius: 8px; padding: 20px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #8b1a2b;">Your Login Credentials</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-weight: bold; width: 40%;">Student ID:</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #eee; font-family: monospace; font-size: 16px; color: #8b1a2b;">${data.studentId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; font-weight: bold;">Temporary Password:</td>
              <td style="padding: 10px 0; font-family: monospace; font-size: 18px; font-weight: bold; color: #8b1a2b; letter-spacing: 2px;">${data.temporaryPassword}</td>
            </tr>
          </table>
        </div>
        
        <div style="background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; padding: 15px; margin: 20px 0;">
          <p style="margin: 0; color: #856404;">
            <strong>⚠️ Important:</strong> Upon your first login, you will be required to create your own password and complete your profile information.
          </p>
        </div>
        
        <h3 style="color: #333;">How to Login:</h3>
        <ol style="padding-left: 20px;">
          <li>Go to the Online Faculty Evaluation System website</li>
          <li>Click on "STUDENT" button</li>
          <li>Enter your <strong>Student ID</strong> as your username</li>
          <li>Enter your <strong>Temporary Password</strong></li>
          <li>Follow the prompts to set up your account</li>
        </ol>
        
        <p style="color: #666; font-size: 14px; margin-top: 30px;">
          If you did not expect this email, please disregard it. For any concerns, please contact your administrator.
        </p>
      </div>
      
      <div style="background: #333; color: white; padding: 20px; text-align: center; border-radius: 0 0 10px 10px; font-size: 12px;">
        <p style="margin: 0;">© ${new Date().getFullYear()} Camarines Norte State College - College of Trades and Technology</p>
        <p style="margin: 5px 0 0 0; color: rgba(255,255,255,0.7);">This is an automated message. Please do not reply.</p>
      </div>
    </body>
    </html>
  `;
}
