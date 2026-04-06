const nodeMailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodeMailer.createTransport({
        host: process.env.SMPT_HOST || 'smtp.gmail.com',
        port: process.env.SMPT_PORT || 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD,
        },
        tls: {
            rejectUnauthorized: false
        }
    });

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
            // Verify connection configuration
            await transporter.verify();
            
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