import * as contactService from "./service.js";
import { createContactSchema } from "./validation.js";
import { badRequest } from "../../shared/errors/http-error.js";

export const createContact = async (req, res, next) => {
  try {
    const { error, value } = createContactSchema.validate(req.body);

    if (error) {
      return next(badRequest(error.details[0].message));
    }

    const contact = await contactService.createContact(
      value,
      req.user
    );

    res.status(201).json({
      success: true,
      message: "Message sent successfully",
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const getAllContacts = async (req, res, next) => {
  try {
    const contacts = await contactService.getAllContacts();

    res.status(200).json({
      success: true,
      message: "Contacts fetched successfully",
      data: contacts,
    });
  } catch (error) {
    next(error);
  }
};

export const getContactById = async (req, res, next) => {
  try {
    const contact = await contactService.getContactById(req.params.id);

    res.status(200).json({
      success: true,
      message: "Contact fetched successfully",
      data: contact,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteContact = async (req, res, next) => {
  try {
    await contactService.deleteContact(req.params.id);

    res.status(200).json({
      success: true,
      message: "Contact deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};