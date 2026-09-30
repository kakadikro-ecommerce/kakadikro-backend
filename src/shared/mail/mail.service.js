import {
  getContactInbox,
  getMailer,
  getSenderAddress,
  getSmtpConfigStatus,
} from "../../config/mail.js";
import { badRequest, createHttpError } from "../errors/http-error.js";

const HEADER_BREAK = /[\r\n]/;

const assertHeaderValue = (value, label) => {
  const text = String(value ?? "").trim();

  if (!text || HEADER_BREAK.test(text)) {
    throw badRequest(`Invalid ${label}`);
  }

  return text;
};

const assertEmailAddress = (value, label) => {
  const email = assertHeaderValue(value, label).toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw badRequest(`Invalid ${label}`);
  }

  return email;
};

const logMailFailure = (error) => {
  console.error("Email delivery failed", {
    code: error?.code || "UNKNOWN",
    responseCode: error?.responseCode || null,
    command: error?.command || null,
  });
};

export const sendMail = async ({ to, subject, html, text, replyTo, attachments }) => {
  const status = getSmtpConfigStatus();

  if (!status.ready) {
    console.error("Email delivery failed", {
      code: "SMTP_NOT_CONFIGURED",
      responseCode: null,
      command: null,
    });
    throw createHttpError(
      "We could not send your message right now. Please try again shortly.",
      503
    );
  }

  let sender;

  try {
    sender = assertEmailAddress(getSenderAddress(), "sender");
  } catch {
    logMailFailure({ code: "SMTP_SENDER_INVALID" });
    throw createHttpError(
      "We could not send your message right now. Please try again shortly.",
      503
    );
  }

  const recipient = assertEmailAddress(to, "recipient");
  const safeSubject = assertHeaderValue(subject, "subject");
  const safeReplyTo = replyTo ? assertEmailAddress(replyTo, "reply-to") : sender;

  try {
    await getMailer().sendMail({
      from: {
        name: "Kakadikro",
        address: sender,
      },
      to: recipient,
      replyTo: safeReplyTo,
      subject: safeSubject,
      html,
      text,
      attachments: Array.isArray(attachments) && attachments.length > 0 ? attachments : undefined,
    });
  } catch (error) {
    logMailFailure(error);
    throw createHttpError(
      "We could not send your message right now. Please try again shortly.",
      502
    );
  }
};

export const getBusinessInbox = () => {
  try {
    return assertEmailAddress(getContactInbox(), "inbox");
  } catch {
    logMailFailure({ code: "SMTP_INBOX_INVALID" });
    throw createHttpError(
      "We could not send your message right now. Please try again shortly.",
      503
    );
  }
};
