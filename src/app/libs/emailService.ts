import prismadb from "./prismadb";
import { pusherServer, pusherEvents, userChannel } from "./pusher";
import { Prisma } from "@prisma/client";

export async function sendEmail(
  to: string,
  subject: string,
  body: string,
  type: string,
  userId?: string,
  metadata?: Record<string, unknown>
) {
  try {
    const log = await prismadb.emailLog.create({
      data: {
        to,
        subject,
        body,
        type,
        status: "sent",
        userId: userId || null,
        metadata: (metadata as Prisma.InputJsonValue) || undefined,
      },
    });

    if (userId) {
      const user = await prismadb.user.findUnique({ where: { id: userId } });
      if (user?.email) {
        await pusherServer.trigger(userChannel(user.email), pusherEvents.DASHBOARD_ACTIVITY, {
          type: "email_sent",
          emailType: type,
          subject,
        });
      }
    }

    console.log(`[EMAIL_SENT] to=${to} subject="${subject}" type=${type}`);
    return log;
  } catch (error) {
    console.error("[EMAIL_SEND_ERROR]", error);
    throw error;
  }
}

export async function sendPriceAlertEmail(
  userId: string,
  hotelName: string,
  targetPrice: number,
  currentPrice: number
) {
  const user = await prismadb.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const subject = `Cảnh báo giá: ${hotelName}`;
  const body = `Khách sạn "${hotelName}" hiện có giá ${currentPrice.toLocaleString("vi-VN")}đ, thấp hơn mục tiêu ${targetPrice.toLocaleString("vi-VN")}đ của bạn.`;

  return sendEmail(user.email, subject, body, "price_alert", userId, {
    hotelName,
    targetPrice,
    currentPrice,
  });
}

export async function sendWelcomeEmail(userId: string, userName: string) {
  const user = await prismadb.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const subject = "Chào mừng bạn đến với Hotel Search";
  const body = `Xin chào ${userName || "bạn"},\n\nChào mừng bạn đến với Hotel Search! Hệ thống sẽ giúp bạn tìm kiếm khách sạn phù hợp với giá tốt nhất.\n\nTrân trọng,\nĐội ngũ Hotel Search`;

  return sendEmail(user.email, subject, body, "welcome", userId);
}

export async function sendSystemAlertEmail(userId: string, message: string) {
  const user = await prismadb.user.findUnique({ where: { id: userId } });
  if (!user?.email) return;

  const subject = "Thông báo hệ thống";
  const body = message;

  return sendEmail(user.email, subject, body, "system", userId);
}
