import nodemailer from "nodemailer";
import { createMailOutbox, updateMailOutbox } from "../models/account.model.js";

let transport;

export function mailConfiguration() {
  const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  return {
    configured: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && password),
    host: process.env.SMTP_HOST || null,
    user: process.env.SMTP_USER || null,
    from: process.env.SMTP_FROM || process.env.MAIL_FROM || null
  };
}

function getTransport() {
  if (transport) return transport;
  const password = process.env.SMTP_PASSWORD || process.env.SMTP_PASS;
  transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false") === "true",
    auth: { user: process.env.SMTP_USER, pass: password }
  });
  return transport;
}

export async function sendTransactionalMail(input) {
  const outboxId = await createMailOutbox(input);
  if (!mailConfiguration().configured) {
    await updateMailOutbox(outboxId, "falhou", { error: "SMTP nao configurado." });
    return { queued: true, sent: false };
  }
  try {
    const result = await getTransport().sendMail({ from: process.env.SMTP_FROM || process.env.MAIL_FROM || `Arena Camp <${process.env.SMTP_USER}>`, to: input.recipient, subject: input.subject, html: input.html });
    await updateMailOutbox(outboxId, "enviado", { message_id: result.messageId });
    return { queued: true, sent: true };
  } catch (error) {
    await updateMailOutbox(outboxId, "falhou", { error: String(error.message).slice(0, 1000) });
    return { queued: true, sent: false };
  }
}
