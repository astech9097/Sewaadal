/**
 * This utility handles sending SMS/WhatsApp notifications to members.
 * It tries multiple free/trial gateways to maximize delivery without requiring paid keys.
 */
export async function sendPhoneNotification(phone: string, message: string) {
  const cleanPhone = phone.replace(/\D/g, "");
  
  if (!cleanPhone || cleanPhone.length < 10) {
    console.error("[Notification] Invalid phone number:", phone);
    return false;
  }

  const formattedPhone = cleanPhone.length === 10 ? `+91${cleanPhone}` : `+${cleanPhone}`;

  // 1. Try CallMeBot (WhatsApp - Free for personal use)
  // This is the most reliable "Free" way to get notifications on a phone.
  // The user needs to follow a 10-second setup: https://www.callmebot.com/blog/free-api-whatsapp-messages/
  const whatsappApiKey = process.env.WHATSAPP_FREE_API_KEY;
  if (whatsappApiKey) {
    try {
      console.log(`[Notification] Trying WhatsApp (CallMeBot) for ${cleanPhone}...`);
      const url = `https://api.callmebot.com/whatsapp.php?phone=${cleanPhone}&text=${encodeURIComponent(message)}&apikey=${whatsappApiKey}`;
      const response = await fetch(url);
      if (response.ok) {
        console.log(`[Notification] WhatsApp sent via CallMeBot to ${cleanPhone}`);
        return true;
      }
    } catch (err) {
      console.error("[Notification] CallMeBot failed:", err);
    }
  }

  // 2. Try Textbelt (Free - 1 SMS per day per IP)
  // No API key required for the free tier.
  console.log(`[Notification] Attempting Textbelt Free SMS for ${formattedPhone}...`);
  try {
    const response = await fetch("https://textbelt.com/text", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
        key: "textbelt",
      }),
    });

    const data = await response.json();
    console.log(`[Notification] Textbelt Response for ${formattedPhone}:`, JSON.stringify(data));

    if (data.success) {
      console.log(`[Notification] Textbelt FREE SMS success: ${formattedPhone}`);
      return true;
    }
    
    // Check for common error: "Only one free text is allowed per day"
    if (data.error && data.error.toLowerCase().includes("one free text")) {
      console.warn(`[Notification] Textbelt daily quota reached for this IP address.`);
    } else {
      console.warn(`[Notification] Textbelt failed for ${formattedPhone}:`, data.error);
    }
  } catch (err) {
    console.error(`[Notification] Textbelt connection failed for ${formattedPhone}:`, err);
  }

  // 3. Fallback: Log to a "virtual inbox" for the developer to see
  // This ensures the app doesn't crash and you can verify the message content.
  console.log(`\n--- [SMS SIMULATION] ---`);
  console.log(`To: ${formattedPhone}`);
  console.log(`Msg: ${message}`);
  console.log(`Reason: All free API quotas likely reached. Please add an API key for production.`);
  console.log(`------------------------\n`);

  return false;
}

export async function broadcastToAllMembers(prisma: any, title: string, message: string) {
  try {
    const users = await prisma.user.findMany({
      where: { 
        role: "MEMBER",
        NOT: [
          { phone: null },
          { phone: "" }
        ]
      },
      select: { phone: true, name: true }
    });

    console.log(`[Broadcast] Sending phone notifications to ${users.length} members...`);

    const fullMessage = `Sewadal Notice: ${title}\n\n${message}`;

    // Send notifications in parallel
    const results = await Promise.allSettled(
      users.map((user: { phone: string, name: string }) => sendPhoneNotification(user.phone, fullMessage))
    );

    const successCount = results.filter(
      r => r.status === 'fulfilled' && r.value === true
    ).length;
    console.log(`[Broadcast] Successfully sent ${successCount} phone notifications.`);
    
    return successCount;
  } catch (err) {
    console.error("[Broadcast] Failed to send phone notifications:", err);
    return 0;
  }
}
