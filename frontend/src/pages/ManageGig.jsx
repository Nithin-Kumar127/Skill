import { useEffect, useState, useRef } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { io } from "socket.io-client";
import {
  fetchGigById,
  getGigs,
  submitMilestoneWork,
  approveMilestoneWork,
  reset as resetGigs,
} from "../features/gigs/gigSlice";
import {
  getGigProposals,
  acceptProposal,
  reset as resetProposals,
} from "../features/proposals/proposalSlice";
import { createPaymentOrder, verifyPaymentSignature, resetPaymentState } from "../features/payments/paymentSlice";
import { fetchGigMessages, receiveSocketMessage, clearUnreadCount, resetChatState } from "../features/messages/messageSlice";

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function ManageGig() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const role = user?.role || user?.user?.role;
  const currentUserId = user?.id || user?.user?._id || user?._id;
  
  const { selectedGig, isLoading: gigLoading } = useSelector((state) => state.gigs);
  const { proposals, isLoading: proposalsLoading } = useSelector((state) => state.proposals);
  const { messages, unreadCount } = useSelector((state) => state.messages) || { messages: [], unreadCount: 0 };
  const { isSuccess: paymentSuccess } = useSelector((state) => state.payments) || {};

  const [submissionForms, setSubmissionForms] = useState({});
  const [activeFormId, setActiveFormId] = useState(null);
  const [typedMessage, setTypedMessage] = useState("");
  const [isChatOpen, setIsChatOpen] = useState(false);

  const socketRef = useRef(null);
  const messageEndRef = useRef(null);
  const isChatOpenRef = useRef(isChatOpen);

  useEffect(() => {
    isChatOpenRef.current = isChatOpen;
  }, [isChatOpen]);

  useEffect(() => {
    if (id) {
      dispatch(fetchGigById(id));
      dispatch(fetchGigMessages(id));
      if (role === "client") dispatch(getGigProposals(id));
    }

    return () => {
      dispatch(resetGigs());
      dispatch(resetProposals());
      dispatch(resetPaymentState());
      dispatch(resetChatState());
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [dispatch, id, role]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token || !id) return;

    const backendUrl = import.meta.env?.VITE_API_URL || "http://localhost:5000";
    socketRef.current = io(backendUrl, {
      auth: { token },
      transports: ["websocket", "polling"]
    });

    socketRef.current.emit("join_chat", { gigId: id });

    socketRef.current.on("message_received", (msgDocument) => {
      if (String(msgDocument.gig).trim() === String(id).trim()) {
        dispatch(receiveSocketMessage({
          ...msgDocument,
          isMinimized: !isChatOpenRef.current
        }));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.off("message_received");
        socketRef.current.disconnect();
      }
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (isChatOpen) {
      messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isChatOpen]);

  const toggleChatDrawer = () => {
    if (!isChatOpen) {
      dispatch(clearUnreadCount());
    }
    setIsChatOpen(!isChatOpen);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!typedMessage.trim() || !socketRef.current) return;

    socketRef.current.emit("send_message", {
      gigId: id,
      content: typedMessage.trim(),
    });
    setTypedMessage("");
  };

  const handleAcceptProposal = (proposalId) => {
    if (window.confirm("Accept this proposal and launch contract operations?")) {
      dispatch(acceptProposal(proposalId))
        .unwrap()
        .then(() => {
          dispatch(fetchGigById(id));
          dispatch(getGigProposals(id));
          if (role === "client") dispatch(getGigs());
        });
    }
  };

  const handleFundMilestone = async (milestone) => {
    const scriptLoaded = await loadRazorpayScript();
    if (!scriptLoaded) {
      alert("Failed to load payment gateway components.");
      return;
    }

    try {
      const targetMilestoneId = milestone._id === "default-milestone-id-1" ? id : milestone._id;
      const orderPayload = {
        gigId: id,
        milestoneId: targetMilestoneId, 
        milestoneTitle: milestone.title,
        amount: milestone.amount,
        currency: "INR"
      };
      
      const orderData = await dispatch(createPaymentOrder(orderPayload)).unwrap();
      const razorpayKey = import.meta.env?.VITE_RAZORPAY_KEY_ID;

      const options = {
        key: razorpayKey, 
        amount: orderData.amount,
        currency: orderData.currency,
        name: "SkillSphere Marketplace",
        description: `Escrow Funding: ${milestone.title}`,
        order_id: orderData.orderId,
        handler: async function (response) {
          const verificationPayload = {
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          };

          await dispatch(verifyPaymentSignature(verificationPayload)).unwrap();
          dispatch(fetchGigById(id));
          alert("Milestone escrow funds locked successfully.");
        },
        prefill: {
          name: user?.name || "Client User",
          email: user?.email || "billing@skillsphere.com",
        },
        theme: { color: "#2563EB" },
      };

      const paymentWindow = new window.Razorpay(options);
      paymentWindow.open();
    } catch (err) {
      alert("Payment interface error: " + err);
    }
  };

  const handleWorkDeliverySubmit = (e, milestoneId) => {
    e.preventDefault();
    const formValues = submissionForms[milestoneId] || {};
    if (!formValues.submissionUrl?.trim()) {
      alert("A valid delivery link URL is required.");
      return;
    }

    const verifiedTargetId = milestoneId === "default-milestone-id-1" ? id : milestoneId;

    dispatch(submitMilestoneWork({
      gigId: id,
      milestoneId: verifiedTargetId,
      submissionData: {
        submissionUrl: formValues.submissionUrl.trim(),
        workNotes: formValues.workNotes?.trim() || ""
      }
    }))
    .unwrap()
    .then(() => {
      alert("Deliverable package successfully transmitted.");
      setActiveFormId(null);
      dispatch(fetchGigById(id));
    })
    .catch((err) => alert("Submission processing failed: " + err));
  };

  const handleInputChange = (milestoneId, field, value) => {
    setSubmissionForms(prev => ({ ...prev, [milestoneId]: { ...prev[milestoneId], [field]: value } }));
  };

  const handleApproveMilestone = (milestoneId) => {
    if (window.confirm("Approve this work payload and release escrow funds to the expert?")) {
      const verifiedTargetId = milestoneId === "default-milestone-id-1" ? id : milestoneId;

      dispatch(approveMilestoneWork({ gigId: id, milestoneId: verifiedTargetId }))
        .unwrap()
        .then(() => {
          alert("Milestone approved and closed.");
          dispatch(fetchGigById(id));
        })
        .catch((err) => alert("Approval validation failed: " + err));
    }
  };

  if (gigLoading || proposalsLoading) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 flex justify-center items-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!selectedGig) {
    return (
      <div className="mx-auto w-full max-w-4xl px-4 py-8 text-center text-red-600 font-semibold">
        Project contract data layer not found.
      </div>
    );
  }

  const isInProgress = selectedGig.status === "in-progress" || selectedGig.status === "assigned" || selectedGig.status === "completed";

  const projectMilestones = selectedGig.milestones && selectedGig.milestones.length > 0 
    ? selectedGig.milestones 
    : [
        {
          _id: "default-milestone-id-1",
          title: "Full Project Completion Deliverable",
          amount: selectedGig.maxPr || 0,
          paymentStatus: selectedGig.status === "completed" ? "completed" : (paymentSuccess || selectedGig.status === "in-progress" ? "paid" : "pending")
        }
      ];

  // REAL-TIME MATHEMATICAL PROGRESS PROGRESS CALCULATOR
  const completedCount = projectMilestones.filter(m => m.paymentStatus === "completed").length;
  const totalCount = projectMilestones.length;
  const calculatedPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 relative min-h-screen pb-24">
      
      {/* CONTRACT WORKSPACE HEADER */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b pb-6 border-gray-200">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{selectedGig.title}</h1>
          <div className="mt-3 flex flex-wrap items-center gap-4">
            <span className={`rounded-xl px-3 py-1 text-xs font-bold uppercase tracking-wider border ${
              selectedGig.status === 'completed' ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-green-50 text-green-700 border-green-200'
            }`}>
              {selectedGig.status}
            </span>
            <span className="text-sm font-semibold text-gray-600">
              Contract Budget: <span className="text-green-600">${selectedGig.maxPr}</span>
            </span>
          </div>
        </div>
        <button onClick={() => navigate("/dashboard")} className="rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-xs font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition">
          ← Return to Dashboard
        </button>
      </div>

      {isInProgress ? (
        <div className="grid gap-6 lg:grid-cols-3 items-start">
          
          <div className="lg:col-span-2 space-y-6">
            
            {/* LIVE TRACK PROGRESS BAR DISPLAY PANEL */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg animate-fadeIn">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-extrabold uppercase tracking-wider text-gray-400">📊 Overall Contract Progress</h3>
                <span className="text-sm font-black text-blue-600 bg-blue-50 px-2.5 py-1 rounded-xl border border-blue-100">
                  {calculatedPercentage}% Settled
                </span>
              </div>
              <div className="w-full bg-gray-100 h-3.5 rounded-full overflow-hidden border border-gray-200/60 p-0.5">
                <div 
                  className="bg-gradient-to-r from-blue-500 to-blue-600 h-full rounded-full transition-all duration-500 ease-out shadow-sm"
                  style={{ width: `${calculatedPercentage}%` }}
                />
              </div>
              <p className="text-[11px] text-gray-500 mt-2.5 font-medium">
                Closed {completedCount} out of {totalCount} total contract milestones.
              </p>
            </div>

            {/* MILESTONE LOOP BLOCKS */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-gray-100 bg-gray-50/50 px-6 py-4">
                <h2 className="text-md font-bold text-gray-900">Project milestones</h2>
              </div>
              
              <div className="p-6 divide-y divide-gray-100 space-y-4">
                {projectMilestones.map((milestoneItem, index) => {
                  const mId = milestoneItem._id || index;
                  const isFormActive = activeFormId === mId;
                  
                  return (
                    <div key={mId} className="flex flex-col pt-4 first:pt-0 gap-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full font-bold text-sm ${
                            milestoneItem.paymentStatus === 'completed' ? 'bg-purple-50 text-purple-700 ring-1 ring-purple-100' :
                            milestoneItem.paymentStatus === 'submitted' ? 'bg-orange-50 text-orange-700 ring-1 ring-orange-100' :
                            milestoneItem.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 ring-1 ring-green-100' : 'bg-blue-50 text-blue-700'
                          }`}>
                            {index + 1}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 text-sm">{milestoneItem.title}</h4>
                            <p className="text-xs text-gray-500 mt-0.5">Valued: <span className="font-semibold text-gray-800">${milestoneItem.amount}</span></p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 self-end sm:self-auto">
                          <span className={`rounded-xl px-2.5 py-1 text-[11px] font-bold uppercase border ${
                            milestoneItem.paymentStatus === 'completed' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                            milestoneItem.paymentStatus === 'submitted' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                            milestoneItem.paymentStatus === 'paid' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                            {milestoneItem.paymentStatus}
                          </span>
                          
                          {role === 'client' && milestoneItem.paymentStatus === 'pending' && (
                            <button onClick={() => handleFundMilestone(milestoneItem)} className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-blue-700 transition cursor-pointer">Fund Milestone</button>
                          )}
                          {role === 'freelancer' && milestoneItem.paymentStatus === 'paid' && !isFormActive && (
                            <button onClick={() => setActiveFormId(mId)} className="rounded-xl bg-orange-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-orange-700 transition cursor-pointer">Submit Work</button>
                          )}
                          {role === 'client' && milestoneItem.paymentStatus === 'submitted' && (
                            <button onClick={() => handleApproveMilestone(milestoneItem._id)} className="rounded-xl bg-purple-600 px-3.5 py-2 text-xs font-bold text-white shadow hover:bg-purple-700 transition cursor-pointer">Approve Delivery</button>
                          )}
                        </div>
                      </div>

                      {/* WORK DISPATCH METADATA DISPLAY */}
                      {(milestoneItem.paymentStatus === 'submitted' || milestoneItem.paymentStatus === 'completed') && (milestoneItem.submissionUrl || selectedGig.submissionUrl) && (
                        <div className="text-xs bg-gray-50 border border-gray-200/60 rounded-xl p-4 space-y-1.5 animate-fadeIn">
                          <p className="text-gray-700"><strong>Artifact URL:</strong> <a href={milestoneItem.submissionUrl || selectedGig.submissionUrl} target="_blank" rel="noreferrer" className="text-blue-600 font-medium underline break-all hover:text-blue-800">{milestoneItem.submissionUrl || selectedGig.submissionUrl}</a></p>
                          {(milestoneItem.workNotes || selectedGig.workNotes) && <p className="text-gray-600 italic mt-1 bg-white p-2.5 rounded-lg border border-gray-100"><strong>Notes:</strong> "{milestoneItem.workNotes || selectedGig.workNotes}"</p>}
                        </div>
                      )}

                      {isFormActive && (
                        <form onSubmit={(e) => handleWorkDeliverySubmit(e, milestoneItem._id)} className="mt-2 p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3 animate-fadeIn">
                          <input type="url" required placeholder="Project Asset Repository URL (e.g., GitHub, Drive) *" value={submissionForms[milestoneItem._id]?.submissionUrl || ""} onChange={(e) => handleInputChange(milestoneItem._id, 'submissionUrl', e.target.value)} className="w-full text-xs rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500" />
                          <textarea rows={2} placeholder="Add annotations or revision remarks for the client review..." value={submissionForms[milestoneItem._id]?.workNotes || ""} onChange={(e) => handleInputChange(milestoneItem._id, 'workNotes', e.target.value)} className="w-full text-xs rounded-xl border border-gray-300 bg-white px-3 py-2.5 outline-none resize-none" />
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => setActiveFormId(null)} className="rounded-xl border border-gray-300 bg-white px-3.5 py-1.5 text-xs font-bold text-gray-600 cursor-pointer">Cancel</button>
                            <button type="submit" className="rounded-xl bg-orange-600 px-3.5 py-1.5 text-xs font-bold text-white shadow hover:bg-orange-700 cursor-pointer">Send Deliverables</button>
                          </div>
                        </form>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* CONTRACT SUMMARY SIDEBAR */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm text-xs space-y-3.5">
              <h4 className="font-bold text-gray-400 uppercase tracking-wider border-b pb-2">Contract Agreement</h4>
              <p className="text-gray-600"><strong>Hired Expert:</strong> <span className="font-semibold text-gray-900">{selectedGig.hiredFreelancer?.name || "Verified Freelancer"}</span></p>
              <p className="text-gray-600"><strong>Project Client:</strong> <span className="font-semibold text-gray-900">{selectedGig.user?.name || "Contract Owner"}</span></p>
              <p className="text-gray-600"><strong>Budget Ceiling:</strong> <span className="font-semibold text-gray-900">${selectedGig.maxPr}</span></p>
            </div>
          </div>
        </div>
      ) : (
        /* PROPOSAL SELECTION INTERFACE */
        <div className="bg-white border border-gray-200 shadow-sm rounded-2xl overflow-hidden p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Proposals Received</h2>
          {proposals && proposals.length > 0 ? (
            <div className="space-y-4">
              {proposals.map((proposal) => (
                <div key={proposal._id} className="border border-gray-200/80 rounded-2xl p-4 hover:border-gray-300 transition">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-base font-bold text-gray-900">{proposal.freelancer?.name || "Anonymous Bidder"}</h3>
                    <span className="rounded-xl px-2 py-0.5 bg-yellow-50 border border-yellow-200 text-yellow-800 text-[10px] font-extrabold uppercase tracking-wide">{proposal.status}</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Bid Offer Amount: <span className="font-bold text-green-600">${proposal.bidAmount}</span></p>
                  <p className="text-xs text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100 leading-relaxed font-medium">"{proposal.coverLetter}"</p>
                  {proposal.status === "pending" && selectedGig.status === "open" && (
                    <button onClick={() => handleAcceptProposal(proposal._id)} className="mt-4 px-4 py-2 text-xs font-bold text-white bg-green-600 hover:bg-green-700 rounded-xl transition cursor-pointer shadow-sm shadow-green-600/10">Accept Proposal</button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-6 text-sm font-medium italic">No proposals or active bids received yet.</p>
          )}
        </div>
      )}

      {/* CHAT HUB WIDGET CONTAINER */}
      {isInProgress && (
        <div className="fixed bottom-0 right-6 z-50 w-80 sm:w-96 rounded-t-2xl shadow-2xl border border-gray-200 bg-white overflow-hidden flex flex-col transition-all duration-300"
             style={{ height: isChatOpen ? "450px" : "48px" }}>
          
          <div onClick={toggleChatDrawer} className="bg-blue-600 px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-blue-700 transition shrink-0 select-none">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse"></span>
              <h3 className="text-sm font-bold text-white">Workspace Messenger</h3>
              {!isChatOpen && unreadCount > 0 && (
                <span className="ml-2 bg-red-500 text-white rounded-full px-2 py-0.5 text-[10px] font-extrabold shadow-md">
                  {unreadCount} new
                </span>
              )}
            </div>
            <button className="text-white text-xs font-bold focus:outline-none">
              {isChatOpen ? "✕ Minimize" : "▲ Expand Chat"}
            </button>
          </div>

          {isChatOpen && (
            <div className="flex-1 flex flex-col min-h-0 bg-white">
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {messages && messages.length > 0 ? (
                  messages.map((msg) => {
                    const senderObj = msg.sender && typeof msg.sender === "object" ? msg.sender : null;
                    const senderId = senderObj ? senderObj._id : msg.sender;
                    const isMe = String(senderId) === String(currentUserId);
                    const senderName = isMe
                      ? "You"
                      : senderObj?.name || msg.senderName || (role === "client" ? "Freelancer" : "Client");

                    return (
                      <div key={msg._id} className={`flex flex-col ${isMe ? "items-end" : "items-start"}`}>
                        <div className="mb-1">
                          <span className={`text-[10px] font-bold ${isMe ? "text-blue-600" : "text-gray-400"}`}>
                            {senderName}
                          </span>
                        </div>
                        <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-xs shadow-sm ${
                          isMe ? "bg-blue-600 text-white rounded-br-none" : "bg-white text-gray-900 rounded-bl-none border border-gray-200"
                        }`}>
                          <p className="leading-relaxed break-words font-medium">{msg.content}</p>
                        </div>
                        <span className="text-[9px] text-gray-400 mt-1 px-1">
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}
                        </span>
                      </div>
                    );
                  })
                ) : (
                  <div className="h-full flex items-center justify-center text-center p-6 text-gray-400 italic text-xs font-medium">
                    No active messages found. Send an message to sync live.
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 bg-white flex gap-2 shrink-0">
                <input 
                  type="text"
                  required
                  placeholder="Type your message here..."
                  value={typedMessage}
                  onChange={(e) => setTypedMessage(e.target.value)}
                  className="flex-1 text-xs rounded-xl border border-gray-300 px-3 py-2 bg-white text-gray-900 outline-none focus:border-blue-500 font-medium"
                />
                <button type="submit" className="rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition shadow cursor-pointer">
                  Send
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}