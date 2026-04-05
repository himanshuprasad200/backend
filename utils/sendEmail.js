const nodeMailer = require('nodemailer');

// Create the transporter once to reuse connections (Pooling)
const transporter = nodeMailer.createTransport({
    // Instead of service, explicitly define host & port to bypass cloud outbound firewalls
    host: process.env.SMPT_HOST || 'smtp.gmail.com',
    port: process.env.SMPT_PORT || 587, // Port 587 (STARTTLS) is less likely to be blocked than 465
    secure: false,        // true for 465, false for 587
    requireTLS: true,     // Force TLS for security on port 587
    pool: true,           // Use connection pool to avoid creating new connections for every email
    maxConnections: 5,    // Limit simultaneous connections
    maxMessages: 100,     // Re-use connection for multiple messages
    connectionTimeout: 20000, // Fail fast: 20s timeout connecting to SMTP
    greetingTimeout: 20000,   // 20s timeout waiting for greeting
    socketTimeout: 30000,     // 30s timeout on inactive socket
    auth: {
        user: process.env.SMPT_MAIL,
        pass: process.env.SMPT_PASSWORD,
    },
    tls: {
        rejectUnauthorized: false // Helps avoid SSL hand-shake errors in strict proxy environments
    }
});

const sendEmail = async (options) => {
    const mailOptions = {
        from: `FlexiWork <${process.env.SMPT_MAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    let attempt = 0;
    const maxRetries = 3;

    while (attempt < maxRetries) {
        try {
            await transporter.sendMail(mailOptions);
            console.log(`Email successfully sent to: ${options.email}`);
            return; // Success, exit function
        } catch (error) {
            attempt++;
            console.error(`Email delivery attempt ${attempt} failed to ${options.email}:`, error.message);
            
            if (attempt >= maxRetries) {
                console.error(`All retry attempts failed. Email not sent to ${options.email}.`);
                throw error; // Rethrow to let the controller handle it
            }
            
            // Wait for a short time before retrying (exponential backoff: 1s, 2s)
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
        }
    }
};

module.exports = sendEmail;