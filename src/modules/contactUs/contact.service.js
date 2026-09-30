import Contact from "./contact.model.js";
import {
  badRequest,
  ensureFound,
  ensureValidObjectId,
} from "../../shared/errors/http-error.js";
import AppError from "../../shared/errors/app-error.js";
import { getBusinessInbox, sendMail } from "../../shared/mail/mail.service.js";
import {
  buildAdminInquiryEmail,
  buildUserConfirmationEmail,
} from "./contact.templates.js";

const cleanOptional = (value) => String(value || "").trim();

const deliverContactEmails = async (contact) => {
  const inquiry = {
    name: contact.name,
    email: contact.email,
    phone: cleanOptional(contact.phone),
    subject: cleanOptional(contact.subject),
    message: contact.message,
    submittedAt: contact.createdAt || new Date(),
  };
  const inbox = getBusinessInbox();
  const adminEmail = buildAdminInquiryEmail(inquiry);
  const confirmationEmail = buildUserConfirmationEmail(inquiry);

  await sendMail({
    to: inbox,
    replyTo: inquiry.email,
    subject: "New Contact Us Inquiry",
    html: adminEmail.html,
    text: adminEmail.text,
    attachments: adminEmail.attachments,
  });

  try {
    await sendMail({
      to: inquiry.email,
      replyTo: inbox,
      subject: "Thanks for reaching out to Kakadikro",
      html: confirmationEmail.html,
      text: confirmationEmail.text,
      attachments: confirmationEmail.attachments,
    });
  } catch (error) {
    console.error("Contact confirmation email failed", {
      code: error instanceof AppError ? "CONFIRMATION_NOT_SENT" : "UNKNOWN",
    });
  }
};

export const createContact = async (payload, user) => {
  let contact;

  try {
    contact = await Contact.create({
      name: payload.name,
      email: payload.email,
      phone: cleanOptional(payload.phone),
      subject: cleanOptional(payload.subject),
      message: payload.message,
      user: user?._id || null,
    });

    contact = await contact.populate("user", "name email");
  } catch (error) {
    throw badRequest("Failed to submit contact message");
  }

  await deliverContactEmails(contact);

  return contact;
};

export const getAllContacts = async () => {
  try {
    return await Contact.find()
      .populate("user", "name email")
      .sort({ createdAt: -1 });
  } catch (error) {
    throw badRequest("Failed to fetch contact messages");
  }
};

export const getContactById = async (id) => {
  try {
    ensureValidObjectId(id, "contact");

    const contact = await Contact.findById(id).populate(
      "user",
      "name email"
    );

    return ensureFound(contact, "Contact message not found");
  } catch (error) {
    throw error;
  }
};

export const deleteContact = async (id) => {
  try {
    ensureValidObjectId(id, "contact");

    const contact = await Contact.findByIdAndDelete(id);

    return ensureFound(contact, "Contact message not found");
  } catch (error) {
    throw error;
  }
};