import { normalizePhone } from "@/lib/phone";

/**
 * Send SMS OTP. Configure one of:
 * - FAST2SMS_API_KEY (India) — https://docs.fast2sms.com
 * - TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN + TWILIO_FROM
 *
 * In development, OTP is logged to the server console if SMS is not configured.
 */
export async function sendOtpSms(
  phone: string,
  otp: string
): Promise<{ sent: boolean; devOtp?: string }> {
  const message = `Your Sewadal Attendance OTP is ${otp}. Valid for 10 minutes. Do not share.`;
  const normalized = normalizePhone(phone);

  const fast2smsKey = process.env.FAST2SMS_API_KEY;
  if (fast2smsKey) {
    const res = await fetch("https://www.fast2sms.com/dev/bulkV2", {
      method: "POST",
      headers: {
        authorization: fast2smsKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        route: "otp",
        variables_values: otp,
        numbers: normalized,
      }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`SMS failed: ${text}`);
    }
    return { sent: true };
  }

  const twilioSid = process.env.TWILIO_ACCOUNT_SID;
  const twilioToken = process.env.TWILIO_AUTH_TOKEN;
  const twilioFrom = process.env.TWILIO_FROM;

  if (twilioSid && twilioToken && twilioFrom) {
    const to = normalized.length === 10 ? `+91${normalized}` : `+${normalized}`;
    const auth = Buffer.from(`${twilioSid}:${twilioToken}`).toString("base64");
    const body = new URLSearchParams({
      To: to,
      From: twilioFrom,
      Body: message,
    });
    const res = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Twilio SMS failed: ${text}`);
    }
    return { sent: true };
  }

  if (process.env.NODE_ENV === "development") {
    console.log(`[DEV OTP] Phone ${normalized}: ${otp}`);
    return { sent: false, devOtp: otp };
  }

  throw new Error(
    "SMS is not configured. Set FAST2SMS_API_KEY or Twilio env variables."
  );
}
