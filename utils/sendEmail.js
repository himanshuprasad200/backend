const { Resend } = require('resend');

/**
 * sendEmail — sends a transactional email via the Resend HTTPS API.
 * 
 * Unlike nodemailer + SMTP, Resend communicates entirely over HTTPS so it
 * works on Render (and any cloud host) without port-blocking issues.
 */
const sendEmail = async (options) => {
    // We initialize Resend inside the function to ensure process.env.RESEND_API_KEY
    // is loaded (by dotenv) before we use it. This also prevents the server
    // from crashing on boot if the key is missing.
    if (!process.env.RESEND_API_KEY || process.env.RESEND_API_KEY === 're_YOUR_API_KEY_HERE') {
        console.error("ERROR: Resend API Key is missing or default. Please set RESEND_API_KEY in your .env file.");
        throw new Error("Email configuration missing: RESEND_API_KEY is not set.");
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    // Determine the sender address.
    const from = process.env.RESEND_FROM_EMAIL || 'FlexiWork <onboarding@resend.dev>';

    const { data, error } = await resend.emails.send({
        from,
        to: [options.email],
        subject: options.subject,
        text: options.message,
        html: options.html || `<p>${options.message}</p>`,
    });

    if (error) {
        console.error(`Resend API error sending to ${options.email}:`, error);
        throw new Error(error.message || 'Failed to send email via Resend');
    }

    console.log(`Email sent successfully to ${options.email} | id: ${data?.id}`);
};

module.exports = sendEmail;