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
 * Client creates a Razorpay order for a milestone and saves a pending Payment document.
 */
async function createRazorpayOrder(req, res) {
  try {
    const { gigId, milestoneId, milestoneTitle, amount, currency } = req.body;

    if (!gigId || !mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "gigId must be a valid Gig document id." });
    }

    if (!milestoneTitle || typeof milestoneTitle !== "string" || !milestoneTitle.trim()) {
      return res.status(400).json({ message: "milestoneTitle is required." });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount < 1) {
      return res.status(400).json({ message: "amount must be a positive number." });
    }

    const participants = await resolveGigParticipants(gigId);
    if (!participants.ok) {
      return res.status(participants.code).json({ message: participants.message });
    }

    if (String(req.user.id) !== participants.clientId) {
      return res.status(403).json({ message: "Only the client who owns this gig can create payments." });
    }

    const billCurrency = (typeof currency === "string" && currency.trim()) ? currency.trim().toUpperCase() : "INR";

    let razorpayInstance;
    try {
      razorpayInstance = buildRazorpayInstance();
    } catch (configError) {
      console.error("Razorpay Instance Config Failure:", configError.message);
      return res.status(500).json({ message: "Payment gateway configuration fields are missing in the server environment." });
    }

    const amountInSubunit = Math.round(parsedAmount * 100);

    // CRITICAL FIX: Sanitize incoming milestoneId to prevent Mongoose validation cast crashes
    const sanitizedMilestoneId = (milestoneId && mongoose.Types.ObjectId.isValid(milestoneId)) 
      ? milestoneId 
      : null;

    let razorpayOrder;
    try {
      razorpayOrder = await razorpayInstance.orders.create({
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
    } catch (razorpayError) {
      console.error("createRazorpayOrder — Razorpay API Core Exception:", razorpayError?.error || razorpayError);
      return res.status(500).json({ message: "The external payment gateway refused to sign this order request block." });
    }

    const paymentRecord = await Payment.create({
      gig: gigId,
      client: participants.clientId,
      freelancer: participants.freelancerId,
      milestoneId: sanitizedMilestoneId, // Saved cleanly as a genuine ObjectId or null descriptor
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
    // Explicit server log trace tracking exactly what exception line is hit
    console.error("CRITICAL ERROR inside createRazorpayOrder interceptor execution:", error);
    return res.status(500).json({ message: "Could not create payment order process: " + (error?.message || error) });
  }
}

/**
 * Client verifies Razorpay signature, marks Payment as completed, AND updates Embedded Gig Milestone Status.
 */
async function verifyPayment(req, res) {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "razorpay_order_id, razorpay_payment_id, and razorpay_signature are required.",
      });
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      return res.status(500).json({ message: "Payment gateway is not configured." });
    }

    const expectedSignature = crypto
      .createHmac("sha256", keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Payment verification failed: invalid signature." });
    }

    const paymentRecord = await Payment.findOne({ razorpayOrderId: razorpay_order_id });

    if (!paymentRecord) {
      return res.status(404).json({ message: "No payment record found for this order." });
    }

    if (String(paymentRecord.client) !== String(req.user.id)) {
      return res.status(403).json({ message: "You are not authorized to verify this payment." });
    }

    if (paymentRecord.status === "completed") {
      return res.status(409).json({ message: "This payment has already been verified." });
    }

    paymentRecord.razorpayPaymentId = razorpay_payment_id;
    paymentRecord.razorpaySignature = razorpay_signature;
    paymentRecord.status = "completed";
    await paymentRecord.save();

    const gigRecord = await Gig.findById(paymentRecord.gig);
    if (gigRecord) {
      let targetMilestone = null;

      // Primary validation matcher: Query using the explicit sub-document identification path
      if (paymentRecord.milestoneId && mongoose.Types.ObjectId.isValid(paymentRecord.milestoneId)) {
        targetMilestone = gigRecord.milestones.id(paymentRecord.milestoneId);
      }

      // Secondary fallback matcher: Fallback to case-insensitive string title evaluation 
      if (!targetMilestone) {
        targetMilestone = gigRecord.milestones.find(
          (m) => m.title.trim().toLowerCase() === paymentRecord.milestoneTitle.trim().toLowerCase()
        );
      }

      if (targetMilestone) {
        targetMilestone.paymentStatus = "paid";
      } else {
        console.warn(`Milestone sync warning: Could not find milestone target matching reference identifier [${paymentRecord.milestoneId}] or title [${paymentRecord.milestoneTitle}]`);
      }
      
      if (gigRecord.status === "assigned") {
        gigRecord.status = "in-progress";
      }
      
      await gigRecord.save();
    }

    return res.status(200).json({
      message: "Payment verified and milestone marked as paid.",
      payment: paymentRecord.toObject(),
    });
  } catch (error) {
    console.error("verifyPayment Exception Context:", error?.message || error);
    return res.status(500).json({ message: "Could not verify payment structure safely." });
  }
}

/**
 * All participants can view payment history for their assigned gig.
 */
async function getGigPayments(req, res) {
  try {
    const { gigId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(gigId)) {
      return res.status(400).json({ message: "Invalid gig id." });
    }

    const participants = await resolveGigParticipants(gigId);
    if (!participants.ok) {
      return res.status(participants.code).json({ message: participants.message });
    }

    const userId = String(req.user.id);
    if (userId !== participants.clientId && userId !== participants.freelancerId) {
      return res.status(403).json({ message: "You are not a participant in this gig." });
    }

    const paymentList = await Payment.find({ gig: gigId })
      .sort({ createdAt: -1 })
      .lean();

    return res.status(200).json({ payments: paymentList });
  } catch (error) {
    console.error("getGigPayments Error Trace:", error?.message || error);
    return res.status(500).json({ message: "Could not load payment records." });
  }
}

module.exports = {
  createRazorpayOrder,
  verifyPayment,
  getGigPayments,
};