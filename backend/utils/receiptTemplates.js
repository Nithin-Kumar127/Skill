/**
 * Generates a clean, styled HTML receipt email template for milestones
 */
function generateMilestoneReceiptHTML({ gigTitle, milestoneTitle, amount, clientName, freelancerName, transactionId }) {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; color: #1a202c;">
      <div style="background-color: #2563eb; padding: 24px; text-align: center;">
        <h1 style="color: #ffffff; margin: 0; font-size: 22px; font-weight: 700;">SkillSphere Marketplace</h1>
        <p style="color: #93c5fd; margin: 4px 0 0 0; font-size: 14px;">Official Transaction Receipt</p>
      </div>
      <div style="padding: 24px; bg-color: #ffffff;">
        <p style="font-size: 16px; margin-top: 0;">Hello,</p>
        <p style="font-size: 14px; line-height: 1.6; color: #4a5568;">
          This email confirms that funds held in escrow for the milestone <strong>${milestoneTitle}</strong> have been successfully released.
        </p>
        
        <div style="background-color: #f7fafc; border: 1px solid #edf2f7; border-radius: 8px; padding: 16px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #2d3748; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em;">Transaction Details</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #718096; width: 40%;">Project:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #2d3748;">${gigTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;">Milestone:</td>
              <td style="padding: 6px 0; font-weight: 600; color: #2d3748;">${milestoneTitle}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;">Amount Released:</td>
              <td style="padding: 6px 0; font-weight: 700; color: #16a34a;">$${amount} USD</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;">Client:</td>
              <td style="padding: 6px 0; color: #2d3748;">${clientName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;">Freelancer:</td>
              <td style="padding: 6px 0; color: #2d3748;">${freelancerName}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #718096;">Reference ID:</td>
              <td style="padding: 6px 0; font-family: monospace; color: #4a5568;">${transactionId}</td>
            </tr>
          </table>
        </div>

        <p style="font-size: 12px; color: #a0aec0; text-align: center; margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          Thank you for using SkillSphere. If you have any questions regarding this transfer, please reach out to our support team.
        </p>
      </div>
    </div>
  `;
}

module.exports = { generateMilestoneReceiptHTML };