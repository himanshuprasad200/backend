const nodeMailer = require('nodemailer');

const sendEmail = async (options) => {
    const transporter = nodeMailer.createTransport({
        service: process.env.SMPT_SERVICE || 'gmail',
        auth: {
            user: process.env.SMPT_MAIL,
            pass: process.env.SMPT_PASSWORD,
        },
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