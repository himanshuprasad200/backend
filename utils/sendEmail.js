const nodeMailer = require('nodemailer');

const sendEmail = async (options) => {
    // Use host and port from environment variables for greater flexibility
    const host = process.env.SMPT_HOST || 'smtp.gmail.com';
    const port = parseInt(process.env.SMPT_PORT, 10) || 465;
    
    // For Gmail on port 465, secure must be true. For 587, it should be false (STARTTLS).
    const isSecure = port === 465;

    const transporter = nodeMailer.createTransport({
        host: host,
        port: port,
        secure: false, // Use false for port 587 (STARTTLS)
        requireTLS: true,
        auth: {
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD,
        },
        tls: {
            // This can help with some connection issues in cloud environments
            rejectUnauthorized: false,
            minVersion: "TLSv1.2"
        },
        connectionTimeout: 10000, 
        greetingTimeout: 10000,
        socketTimeout: 20000,
    });



    const mailOptions = {
        from: `FlexiWork <${process.env.SMPT_MAIL}>`,
        to: options.email,
        subject: options.subject,
        text: options.message,
        html: options.html
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Email successfully sent to: ${options.email}`);
    } catch (error) {
        console.error(`Email delivery failed to ${options.email}:`, error);
        throw error; // Rethrow to let the controller handle it
    }
};

module.exports = sendEmail;