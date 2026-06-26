// services/mailer.js â€” Nodemailer email notification service
const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
  });
  return transporter;
};

const sendProjectNotification = async (project) => {
  const mailer = getTransporter();
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; background: #0a0a0f; color: #e0e0e0; }
        .container { max-width: 600px; margin: 0 auto; padding: 24px; }
        .header { background: linear-gradient(135deg, #b8860b, #1a2a4a); padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
        .header h1 { color: #ffd700; margin: 0; font-size: 22px; letter-spacing: 2px; }
        .body { background: #111827; padding: 24px; border-radius: 0 0 8px 8px; border: 1px solid #b8860b44; }
        .field { margin-bottom: 14px; }
        .label { color: #b8860b; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .value { color: #f0f0f0; font-size: 15px; margin-top: 4px; padding: 8px; background: #1a1a2e; border-radius: 4px; border-left: 3px solid #b8860b; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .badge { display: inline-block; background: #b8860b22; border: 1px solid #b8860b; color: #ffd700; padding: 4px 12px; border-radius: 20px; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>âš¡ APEX CREATIONS</h1>
          <p style="color:#aaa;margin:6px 0 0">New Project Registration Alert</p>
        </div>
        <div class="body">
          <p style="color:#ffd700;margin-bottom:20px">Lord Nejju, a new client has submitted a project registration.</p>

          <div class="field">
            <div class="label">Project Name</div>
            <div class="value">${escapeHtml(project.project_name)}</div>
          </div>
          <div class="field">
            <div class="label">Project Type</div>
            <div class="value"><span class="badge">${escapeHtml(project.project_type)}</span></div>
          </div>
          <div class="field">
            <div class="label">Available Budget</div>
            <div class="value">${escapeHtml(project.budget)}</div>
          </div>
          <div class="field">
            <div class="label">Contact Phone</div>
            <div class="value">${escapeHtml(project.contact_phone || 'Not provided')}</div>
          </div>
          <div class="field">
            <div class="label">Contact Email</div>
            <div class="value">${escapeHtml(project.contact_email || 'Not provided')}</div>
          </div>
          <div class="field">
            <div class="label">Business / Company</div>
            <div class="value">${escapeHtml(project.business_name || 'Not provided')}</div>
          </div>
          <div class="field">
            <div class="label">Address / Location</div>
            <div class="value">${escapeHtml(project.address || 'Not provided')}</div>
          </div>
          ${project.custom_concept ? `
          <div class="field">
            <div class="label">Custom Concept / Idea</div>
            <div class="value">${escapeHtml(project.custom_concept)}</div>
          </div>` : ''}
          ${project.additional_description ? `
          <div class="field">
            <div class="label">Additional Description</div>
            <div class="value">${escapeHtml(project.additional_description)}</div>
          </div>` : ''}

          <div class="field" style="margin-top:24px">
            <div class="label">Submitted At</div>
            <div class="value">${new Date().toUTCString()}</div>
          </div>
        </div>
        <div class="footer">
          <p>Apex Creations Admin System Â· Auto-notification</p>
          <p>ðŸ“ž +251970061607 Â· +251976062692</p>
        </div>
      </div>
    </body>
    </html>
  `;

  await mailer.sendMail({
    from: `"Apex Creations System" <${process.env.EMAIL_USER}>`,
    to: process.env.EMAIL_TO,
    subject: `ðŸš€ New Project: ${project.project_name} â€” ${project.project_type}`,
    html,
  });
};

const escapeHtml = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
};

module.exports = { sendProjectNotification };
