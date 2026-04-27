import { NextResponse } from 'next/server';

// This API route handles sending emails
// In production, you would integrate with a real email service like SendGrid, AWS SES, etc.

export async function POST(request: Request) {
  try {
    const { to, subject, html } = await request.json();

    if (!to || !subject || !html) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Log email for development purposes
    console.log('=== EMAIL SENT ===');
    console.log('To:', to);
    console.log('Subject:', subject);
    console.log('=================');

    // In a production environment, you would use an actual email service
    // For now, we simulate success
    // Example integration with a service like Resend, SendGrid, etc.:
    
    /*
    // Example with Resend:
    const { data, error } = await resend.emails.send({
      from: 'CNSC Evaluation System <noreply@cnsc.edu.ph>',
      to: [to],
      subject: subject,
      html: html,
    });
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    */

    return NextResponse.json({ 
      success: true, 
      message: 'Email sent successfully',
      // In development, include details for debugging
      details: {
        to,
        subject,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
