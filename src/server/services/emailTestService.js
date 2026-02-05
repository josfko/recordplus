/**
 * Email Test Service
 *
 * Provides email testing utilities using Mailtrap or similar services.
 * Allows verification of actual email delivery, not just SMTP response.
 *
 * Usage:
 *   1. Set MAILTRAP_API_TOKEN in environment
 *   2. Configure SMTP to use Mailtrap sandbox in test mode
 *   3. Use verifyEmailDelivery() to confirm emails actually arrived
 */

/**
 * Mailtrap configuration for sandbox testing
 * Sign up at https://mailtrap.io and get your inbox credentials
 */
export const MAILTRAP_CONFIG = {
  // Sandbox SMTP settings (replace with your Mailtrap inbox credentials)
  smtp: {
    host: "sandbox.smtp.mailtrap.io",
    port: 2525,
    secure: false,
    // Get these from: Mailtrap > Email Testing > Inboxes > SMTP Settings
    user: process.env.MAILTRAP_USER || "your_mailtrap_user",
    password: process.env.MAILTRAP_PASSWORD || "your_mailtrap_password",
  },
  // API settings for verification
  api: {
    baseUrl: "https://mailtrap.io/api",
    token: process.env.MAILTRAP_API_TOKEN || "",
    // Get inbox ID from: Mailtrap > Email Testing > Inboxes
    inboxId: process.env.MAILTRAP_INBOX_ID || "",
    accountId: process.env.MAILTRAP_ACCOUNT_ID || "",
  },
};

/**
 * Check if Mailtrap is configured
 * @returns {boolean}
 */
export function isMailtrapConfigured() {
  return !!(
    MAILTRAP_CONFIG.api.token &&
    MAILTRAP_CONFIG.api.inboxId &&
    MAILTRAP_CONFIG.api.accountId
  );
}

/**
 * Get Mailtrap SMTP config for nodemailer
 * Use this in test environment instead of production SMTP
 * @returns {Object} Nodemailer transport config
 */
export function getMailtrapTransportConfig() {
  return {
    host: MAILTRAP_CONFIG.smtp.host,
    port: MAILTRAP_CONFIG.smtp.port,
    secure: MAILTRAP_CONFIG.smtp.secure,
    auth: {
      user: MAILTRAP_CONFIG.smtp.user,
      pass: MAILTRAP_CONFIG.smtp.password,
    },
  };
}

/**
 * Verify email was actually delivered to Mailtrap inbox
 * This checks the ACTUAL inbox, not just SMTP response
 *
 * @param {Object} options - Search options
 * @param {string} options.subject - Email subject to search for
 * @param {string} [options.to] - Recipient email address
 * @param {number} [options.waitMs=5000] - Time to wait for email to arrive
 * @param {number} [options.maxAttempts=3] - Max polling attempts
 * @returns {Promise<{delivered: boolean, email: Object|null, error: string|null}>}
 */
export async function verifyEmailDelivery({
  subject,
  to,
  waitMs = 5000,
  maxAttempts = 3,
}) {
  if (!isMailtrapConfigured()) {
    return {
      delivered: false,
      email: null,
      error: "Mailtrap not configured. Set MAILTRAP_API_TOKEN, MAILTRAP_INBOX_ID, MAILTRAP_ACCOUNT_ID",
    };
  }

  const { baseUrl, token, inboxId, accountId } = MAILTRAP_CONFIG.api;
  const url = `${baseUrl}/accounts/${accountId}/inboxes/${inboxId}/messages`;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      // Wait before checking (email needs time to arrive)
      if (attempt > 1) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }

      const response = await fetch(url, {
        headers: {
          "Api-Token": token,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Mailtrap API error: ${response.status}`);
      }

      const messages = await response.json();

      // Search for matching email
      const matchingEmail = messages.find((msg) => {
        const subjectMatch = msg.subject?.includes(subject);
        const toMatch = to ? msg.to_email?.includes(to) : true;
        return subjectMatch && toMatch;
      });

      if (matchingEmail) {
        return {
          delivered: true,
          email: {
            id: matchingEmail.id,
            subject: matchingEmail.subject,
            from: matchingEmail.from_email,
            to: matchingEmail.to_email,
            receivedAt: matchingEmail.created_at,
            hasAttachments: matchingEmail.attachments_count > 0,
          },
          error: null,
        };
      }

      console.log(`Attempt ${attempt}/${maxAttempts}: Email not found yet...`);
    } catch (err) {
      if (attempt === maxAttempts) {
        return {
          delivered: false,
          email: null,
          error: err.message,
        };
      }
    }
  }

  return {
    delivered: false,
    email: null,
    error: `Email with subject "${subject}" not found after ${maxAttempts} attempts`,
  };
}

/**
 * Clear all emails from Mailtrap inbox
 * Useful before running tests
 * @returns {Promise<boolean>}
 */
export async function clearMailtrapInbox() {
  if (!isMailtrapConfigured()) {
    console.warn("Mailtrap not configured, skipping inbox clear");
    return false;
  }

  const { baseUrl, token, inboxId, accountId } = MAILTRAP_CONFIG.api;
  const url = `${baseUrl}/accounts/${accountId}/inboxes/${inboxId}/clean`;

  try {
    const response = await fetch(url, {
      method: "PATCH",
      headers: {
        "Api-Token": token,
      },
    });
    return response.ok;
  } catch (err) {
    console.error("Failed to clear Mailtrap inbox:", err.message);
    return false;
  }
}

/**
 * Get email content including HTML body and attachments
 * @param {string} messageId - Mailtrap message ID
 * @returns {Promise<Object|null>}
 */
export async function getEmailContent(messageId) {
  if (!isMailtrapConfigured()) {
    return null;
  }

  const { baseUrl, token, inboxId, accountId } = MAILTRAP_CONFIG.api;
  const url = `${baseUrl}/accounts/${accountId}/inboxes/${inboxId}/messages/${messageId}`;

  try {
    const response = await fetch(url, {
      headers: {
        "Api-Token": token,
      },
    });

    if (!response.ok) {
      throw new Error(`Mailtrap API error: ${response.status}`);
    }

    return await response.json();
  } catch (err) {
    console.error("Failed to get email content:", err.message);
    return null;
  }
}

/**
 * Document email test result in standard format
 * @param {Object} params
 * @param {string} params.testName - Name of the test
 * @param {Object} params.smtpResponse - Response from SMTP send
 * @param {Object} params.deliveryVerification - Result from verifyEmailDelivery
 * @returns {Object} Documented test result
 */
export function documentEmailTestResult({
  testName,
  smtpResponse,
  deliveryVerification,
}) {
  return {
    testName,
    timestamp: new Date().toISOString(),
    smtpResponse: {
      success: !!smtpResponse?.messageId,
      messageId: smtpResponse?.messageId,
      response: smtpResponse?.response,
    },
    actualDelivery: {
      verified: deliveryVerification.delivered,
      email: deliveryVerification.email,
      error: deliveryVerification.error,
    },
    conclusion:
      smtpResponse?.messageId && deliveryVerification.delivered
        ? "✅ PASSED - Email sent AND delivered"
        : smtpResponse?.messageId && !deliveryVerification.delivered
          ? "⚠️ FALSE POSITIVE - SMTP succeeded but email NOT delivered"
          : "❌ FAILED - Email not sent",
  };
}
