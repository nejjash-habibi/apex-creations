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

