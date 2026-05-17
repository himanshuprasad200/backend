const { google } = require('googleapis');

/**
 * sendEmail — sends a transactional email via the Gmail REST API.
 * 
 * This uses standard HTTPS (port 443) which bypasses any outbound SMTP
 * restrictions imposed by free tier cloud providers like Render.
 */
const sendEmail = async (options) => {
    // Ensure credentials are provided
    if (!process.env.OAUTH_CLIENT_ID || !process.env.OAUTH_CLIENT_SECRET || !process.env.OAUTH_REFRESH_TOKEN) {
        console.error("ERROR: Gmail OAuth credentials missing in .env.");
        throw new Error("Email configuration missing: OAuth credentials not set.");
    }

    // Set up the OAuth2 client
    const oAuth2Client = new google.auth.OAuth2(
        process.env.OAUTH_CLIENT_ID,
        process.env.OAUTH_CLIENT_SECRET,
        "https://developers.google.com/oauthplayground"
    );

    oAuth2Client.setCredentials({ refresh_token: process.env.OAUTH_REFRESH_TOKEN });

    const gmail = google.gmail({ version: 'v1', auth: oAuth2Client });

    // Construct the email string according to RFC 2822
    // We encode the subject to properly handle special characters
    const utf8Subject = `=?utf-8?B?${Buffer.from(options.subject).toString('base64')}?=`;
    const messageParts = [
        `From: FlexiWork <${process.env.SMPT_MAIL}>`,
        `To: ${options.email}`,
        'Content-Type: text/html; charset=utf-8',
        'MIME-Version: 1.0',
        `Subject: ${utf8Subject}`,
        '', // Empty line between headers and body
        options.html || `<p>${options.message}</p>`,
    ];
    const message = messageParts.join('\n');

    // The Gmail API requires a base64url encoded string
    const encodedMessage = Buffer.from(message)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');

    try {
        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: encodedMessage,
            },
        });
        console.log(`Email successfully sent to: ${options.email} | Message-ID: ${res.data.id}`);
    } catch (error) {
        console.error(`Gmail API error sending to ${options.email}:`, error);
        throw new Error(error.message || 'Failed to send email via Gmail REST API');
    }
};

module.exports = sendEmail;