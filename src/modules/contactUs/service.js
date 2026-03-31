import Contact from "./model.js";
import {
  badRequest,
  ensureFound,
  ensureValidObjectId,
} from "../../shared/errors/http-error.js";

export const createContact = async (payload, user) => {
  try {
    const contact = await Contact.create({
      ...payload,
      user: user?._id || null,
    });

    return await contact.populate("user", "name email");
  } catch (error) {
    throw badRequest("Failed to submit contact message");
  }
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