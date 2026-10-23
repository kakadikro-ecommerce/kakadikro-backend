import Order from "../order/order.model.js";
import Payment from "../payment/payment.model.js";
import { hashGuestToken, isGuestToken } from "./guest-token.js";

export const normalizeCheckoutEmail = (email) =>
  String(email || "")
    .trim()
    .toLowerCase();

/**
 * Link guest orders/payments to a user account by matching checkout email.
 * Used after register/login so history appears for the same email used at Magic Checkout.
 */
export const claimGuestCheckoutByEmail = async (user) => {
  if (!user?._id) {
    return { orders: 0, payments: 0 };
  }

  const email = normalizeCheckoutEmail(user.email);
  if (!email) {
    return { orders: 0, payments: 0 };
  }

  const orderFilter = {
    isActive: true,
    isGuest: true,
    $or: [{ user: null }, { user: { $exists: false } }],
    "guestContact.email": email,
  };

  const orders = await Order.find(orderFilter).select("_id").lean();
  const orderIds = orders.map((order) => order._id);

  let ordersClaimed = 0;
  if (orderIds.length > 0) {
    const orderResult = await Order.updateMany(orderFilter, {
      $set: { user: user._id, isGuest: false },
    });
    ordersClaimed = orderResult.modifiedCount || 0;
  }

  const paymentResult = await Payment.updateMany(
    {
      $or: [{ userId: null }, { userId: { $exists: false } }],
      customerEmail: email,
    },
    { $set: { userId: user._id } }
  );

  // Also link payments for claimed orders that may still lack customerEmail
  if (orderIds.length > 0) {
    await Payment.updateMany(
      {
        orderId: { $in: orderIds },
        $or: [{ userId: null }, { userId: { $exists: false } }],
      },
      { $set: { userId: user._id } }
    );
  }

  return {
    orders: ordersClaimed,
    payments: paymentResult.modifiedCount || 0,
  };
};

/**
 * On login, merge cart and claim only unpaid guest checkout for this browser session.
 * Never reassign paid/successful payments to an unrelated login via guest cart token.
 */
export const claimUnpaidGuestSession = async (user, guestCartToken) => {
  if (!user?._id || !isGuestToken(guestCartToken)) {
    return;
  }

  const guestTokenHash = hashGuestToken(guestCartToken);

  await Order.updateMany(
    {
      guestTokenHash,
      isActive: true,
      isGuest: true,
      paymentStatus: { $ne: "paid" },
      $or: [{ user: null }, { user: { $exists: false } }],
    },
    { $set: { user: user._id, isGuest: false } }
  );

  await Payment.updateMany(
    {
      guestTokenHash,
      status: "pending",
      $or: [{ userId: null }, { userId: { $exists: false } }],
    },
    { $set: { userId: user._id } }
  );
};

/**
 * Claim a single guest order by guest order access token (unpaid or paid).
 */
export const claimGuestOrderByAccessToken = async (user, guestOrderToken) => {
  if (!user?._id || !isGuestToken(guestOrderToken)) {
    return;
  }

  const order = await Order.findOne({
    guestAccessTokenHash: hashGuestToken(guestOrderToken),
    isActive: true,
    $or: [{ user: null }, { user: { $exists: false } }],
  }).select("_id");

  if (!order) {
    return;
  }

  await Order.updateOne(
    { _id: order._id },
    { $set: { user: user._id, isGuest: false } }
  );

  await Payment.updateMany(
    {
      orderId: order._id,
      $or: [{ userId: null }, { userId: { $exists: false } }],
    },
    { $set: { userId: user._id } }
  );
};
