const crypto = require("crypto");
const Razorpay = require("razorpay");
const mongoose = require("mongoose");

const Gig = require("../models/Gig");
const Proposal = require("../models/Proposal");
const Payment = require("../models/Payment");

function buildRazorpayInstance() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials are not configured inside the environment (.env) definitions.");
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

async function resolveGigParticipants(gigId) {
  const gigRecord = await Gig.findById(gigId).lean();

  if (!gigRecord) {
    return { ok: false, code: 404, message: "Gig not found." };
  }

  const activeStatuses = ["assigned", "in-progress"];
  if (!activeStatuses.includes(gigRecord.status)) {
    return { ok: false, code: 400, message: "Payments are only allowed for active contracts." };
  }

  const acceptedProposal = await Proposal.findOne({
    gig: gigRecord._id,
    status: "accepted",
  }).lean();

  if (!acceptedProposal) {
    return { ok: false, code: 400, message: "No accepted proposal found for this gig." };
  }

  return {
    ok: true,
    gigRecord,
    clientId: String(gigRecord.user),
    freelancerId: String(acceptedProposal.freelancer),
  };
}

/**
 * 1. ESCROW & MILESTONE PAYMENTS: Client creates a Razorpay order.
 */
async function createRazorpayOrder(req, res) {
  try {
    const { gigId, milestoneId, milestoneTitle, amount, currency } = req.body;

    if (!gigId || !mongoose.Types.ObjectId.isValid(gigId)) return res.status(400).json({ message: "Valid gigId required." });
    if (!milestoneTitle || !milestoneTitle.trim()) return res.status(400).json({ message: "milestoneTitle is required." });

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 1) return res.status(400).json({ message: "amount must be a positive number." });

    const participants = await resolveGigParticipants(gigId);
    if (!participants.ok) return res.status(participants.code).json({ message: participants.message });
    if (String(req.user.id) !== participants.clientId) return res.status(403).json({ message: "Only the client can create payments." });

    const billCurrency = (typeof currency === "string" && currency.trim()) ? currency.trim().toUpperCase() : "INR";
    const razorpayInstance = buildRazorpayInstance();
    const amountInSubunit = Math.round(parsedAmount * 100);

    const sanitizedMilestoneId = (milestoneId && mongoose.Types.ObjectId.isValid(milestoneId)) ? milestoneId : null;

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: amountInSubunit,
      currency: billCurrency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        gigId,
        milestoneId: sanitizedMilestoneId ? String(sanitizedMilestoneId) : "",
        milestoneTitle: milestoneTitle.trim(),
        clientId: participants.clientId,
        freelancerId: participants.freelancerId,
      },
    });

    const paymentRecord = await Payment.create({
      gig: gigId,
      client: participants.clientId,
      freelancer: participants.freelancerId,
      milestoneId: sanitizedMilestoneId, 
      milestoneTitle: milestoneTitle.trim(),
      amount: parsedAmount,
      currency: billCurrency,
      razorpayOrderId: razorpayOrder.id,
      status: "pending",
    });

    return res.status(201).json({
      message: "Razorpay order created successfully.",
      orderId: razorpayOrder.id,
      currency: razorpayOrder.currency,
      amount: razorpayOrder.amount,
      payment: paymentRecord.toObject(),
    });
  } catch (error) {
    console.error("createRazorpayOrder ERROR:", error);
    return res.status(500).json({ message: "Could not create payment order." });
  }
}

/**
 * 2. ESCROW SECURED: Client verifies signature, marking funds as locked.
 */
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay verification parameters." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) return res.status(400).json({ message: "Invalid signature." });

    const paymentRecord = await Payment.findOne({ razorpayOrderId: razorpay_order_id });
    if (!paymentRecord) return res.status(404).json({ message: "Payment record not found." });
    if (String(paymentRecord.client) !== String(req.user.id)) return res.status(403).json({ message: "Unauthorized." });
    if (paymentRecord.status === "completed") return res.status(409).json({ message: "Already verified." });

    paymentRecord.razorpayPaymentId = razorpay_payment_id;
    paymentRecord.razorpaySignature = razorpay_signature;
    paymentRecord.status = "completed"; // Funds are now safely in ESCROW
    await paymentRecord.save();

    const gigRecord = await Gig.findById(paymentRecord.gig);
    if (gigRecord) {
      let targetMilestone = paymentRecord.milestoneId 
        ? gigRecord.milestones.id(paymentRecord.milestoneId)
        : gigRecord.milestones.find((m) => m.title.trim().toLowerCase() === paymentRecord.milestoneTitle.trim().toLowerCase());

      if (targetMilestone) targetMilestone.paymentStatus = "paid"; // Paid = Escrowed
      if (gigRecord.status === "assigned") gigRecord.status = "in-progress";
      await gigRecord.save();
    }

    return res.status(200).json({
      message: "Payment verified. Funds are now in escrow.",
      payment: paymentRecord.toObject(),
    });
  } catch (error) {
    console.error("verifyPayment ERROR:", error);
    return res.status(500).json({ message: "Could not verify payment." });
  }
}

/**
 * 🌟 NEW FEATURE 3: AUTOMATIC FREELANCER PAYOUT 
 * Called by the backend when the Client approves the milestone work.
 */
async function releaseEscrowToFreelancer(paymentId) {
  try {
    const payment = await Payment.findById(paymentId);
    if (!payment || payment.status !== "completed") return false;

    // In a live production environment with Razorpay Route, you would trigger:
    // const razorpay = buildRazorpayInstance();
    // await razorpay.payments.transfer(payment.razorpayPaymentId, { transfers: [{ account: "freelancer_acc_id", amount: payment.amount * 100, currency: "INR" }] });

    // Mark as paid out to freelancer
    payment.status = "released_to_freelancer";
    payment.releasedAt = Date.now();
    await payment.save();
    return true;
  } catch (error) {
    console.error("Escrow Release Error:", error);
    return false;
  }
}

/**
 * 🌟 NEW FEATURE 4: REFUND MANAGEMENT
 * Admin or system triggers a refund back to the client.
 */
async function processRefund(req, res) {
  try {
    const { paymentId } = req.body;
    const payment = await Payment.findById(paymentId);

    if (!payment) return res.status(404).json({ message: "Payment not found." });
    if (payment.status !== "completed") return res.status(400).json({ message: "Only completed escrow payments can be refunded." });

    const razorpay = buildRazorpayInstance();
    const refund = await razorpay.payments.refund(payment.razorpayPaymentId, {
      amount: payment.amount * 100,
      notes: { reason: "Milestone cancelled / Disputed" }
    });

    payment.status = "refunded";
    await payment.save();

    return res.status(200).json({ message: "Refund processed successfully.", refund });
  } catch (error) {
    console.error("processRefund ERROR:", error);
    return res.status(500).json({ message: "Failed to process refund with Razorpay." });
  }
}

/**
 * Single Gig Payment History
 */
async function getGigPayments(req, res) {
  try {
    const { gigId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(gigId)) return res.status(400).json({ message: "Invalid gig id." });

    const paymentList = await Payment.find({ gig: gigId }).sort({ createdAt: -1 }).lean();
    return res.status(200).json({ payments: paymentList });
  } catch (error) {
    return res.status(500).json({ message: "Could not load payment records." });
  }
}

/**
 * 🌟 NEW FEATURE 5: GLOBAL TRANSACTION HISTORY
 * Returns all payments for a user (either sent as client or received as freelancer).
 */
async function getUserTransactions(req, res) {
  try {
    const userId = req.user.id;
    
    // Find all payments where the user is either the client (sender) or freelancer (receiver)
    const transactions = await Payment.find({
      $or: [{ client: userId }, { freelancer: userId }]
    })
    .populate('gig', 'title status')
    .sort({ createdAt: -1 })
    .lean();

    return res.status(200).json({ transactions });
  } catch (error) {
    console.error("getUserTransactions ERROR:", error);
    return res.status(500).json({ message: "Failed to fetch user transaction history." });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  getGigPayments,
  releaseEscrowToFreelancer, // Exported for gigController to use
  processRefund,
  getUserTransactions
};