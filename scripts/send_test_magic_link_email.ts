
import 'dotenv/config';
import { sendEmail } from '../packages/core/src/lib/email/transporter';
import { generateMagicLinkEmail } from '../packages/core/src/components/email/templates/MagicLinkInvite';

async function main() {
    const recipient = "emmanuel.aigbehi@gmail.com";
    console.log(`Preparing to send test email to: ${recipient}`);

    const mockData = {
        inviteUrl: "http://localhost:5173/auth/redeem-link?token=TEST-LIVE-SEND-TOKEN",
        recipientEmail: recipient,
        inviterName: "ComplianceOS Admin",
        planTier: "pro", // Testing Pro tier display
        role: "admin",   // Testing Admin role display
        expiresInDays: 7
    };

    console.log("Generating email template...");
    const { html, subject } = generateMagicLinkEmail(mockData);

    console.log("Attempting to send via SMTP...");
    try {
        const response = await sendEmail({
            to: recipient,
            subject: "[TEST] " + subject,
            html,
        });
        console.log("✅ Email sent successfully!");
        console.log("Response:", JSON.stringify(response, null, 2));
    } catch (error) {
        console.error("❌ Failed to send email.");
        console.error(error);
        process.exit(1);
    }
}

main().catch(console.error);
