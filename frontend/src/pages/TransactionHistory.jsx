import { useEffect, useMemo } from "react";
import { useSelector, useDispatch } from "react-redux";
import { Link } from "react-router-dom";
import { fetchTransactionHistory, resetPaymentState } from "../features/payments/paymentSlice";

export default function TransactionHistory() {
  const dispatch = useDispatch();

  const { user } = useSelector((state) => state.auth);
  const { transactions, isLoading, isError, message } = useSelector((state) => state.payments) || { transactions: [] };

  const currentUserId = user?.id || user?.user?._id || user?._id;

  useEffect(() => {
    dispatch(fetchTransactionHistory());
    return () => {
      dispatch(resetPaymentState());
    };
  }, [dispatch]);

  // Calculate quick financial stats based on the transaction array
  const stats = useMemo(() => {
    let spent = 0;
    let earned = 0;
    let escrowed = 0;

    if (Array.isArray(transactions)) {
      transactions.forEach((tx) => {
        const isClient = String(tx.client) === String(currentUserId);
        
        if (isClient) {
          if (tx.status === "completed" || tx.status === "released_to_freelancer") spent += tx.amount;
        } else {
          if (tx.status === "released_to_freelancer") earned += tx.amount;
          if (tx.status === "completed") escrowed += tx.amount; // Held in escrow for them
        }
      });
    }
    return { spent, earned, escrowed };
  }, [transactions, currentUserId]);

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-8">
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700 border border-red-200">
          Failed to load ledger: {message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 min-h-screen">
      
      {/* HEADER */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900">Financial Ledger</h1>
          <p className="mt-2 text-sm text-gray-600">Track all your escrow deposits, milestone payouts, and refunds.</p>
        </div>
        <Link
          to="/dashboard"
          className="rounded-xl border border-gray-300 bg-white px-4 py-2 text-sm font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* FINANCIAL SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Earned</p>
          <p className="mt-2 text-2xl font-black text-green-600">₹{stats.earned.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Pending in Escrow (To You)</p>
          <p className="mt-2 text-2xl font-black text-blue-600">₹{stats.escrowed.toLocaleString()}</p>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Spent (Client)</p>
          <p className="mt-2 text-2xl font-black text-gray-900">₹{stats.spent.toLocaleString()}</p>
        </div>
      </div>

      {/* TRANSACTION LIST */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 bg-gray-50/80 px-6 py-4">
          <h2 className="text-sm font-bold text-gray-900 uppercase tracking-wider">Transaction History</h2>
        </div>

        {transactions && transactions.length > 0 ? (
          <ul className="divide-y divide-gray-100">
            {transactions.map((tx) => {
              const isClient = String(tx.client) === String(currentUserId);
              const gigTitle = tx.gig?.title || "Unknown Contract";
              
              return (
                <li key={tx._id} className="p-6 hover:bg-gray-50/50 transition">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    
                    {/* LEFT SIDE: Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                          isClient ? "bg-gray-100 text-gray-600 border-gray-200" : "bg-purple-50 text-purple-700 border-purple-200"
                        }`}>
                          {isClient ? "Expense (Client)" : "Income (Freelancer)"}
                        </span>
                        
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase tracking-wider border ${
                          tx.status === "completed" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          tx.status === "released_to_freelancer" ? "bg-green-50 text-green-700 border-green-200" :
                          tx.status === "refunded" ? "bg-red-50 text-red-700 border-red-200" :
                          "bg-yellow-50 text-yellow-700 border-yellow-200"
                        }`}>
                          {tx.status === "completed" ? "In Escrow" : tx.status.replace(/_/g, " ")}
                        </span>
                      </div>
                      
                      <Link to={`/manage-gig/${tx.gig?._id}`} className="text-base font-bold text-gray-900 hover:text-blue-600 transition">
                        {gigTitle}
                      </Link>
                      <p className="text-sm text-gray-500 mt-0.5">Milestone: <span className="font-semibold text-gray-700">{tx.milestoneTitle}</span></p>
                      
                      <p className="text-xs text-gray-400 mt-2 font-medium">
                        {new Date(tx.createdAt).toLocaleDateString("en-US", {
                          year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit"
                        })}
                        <span className="mx-2">•</span>
                        Order ID: {tx.razorpayOrderId}
                      </p>
                    </div>

                    {/* RIGHT SIDE: Amount */}
                    <div className="text-left sm:text-right">
                      <p className={`text-xl font-black ${
                        isClient && tx.status !== "refunded" ? "text-gray-900" : 
                        tx.status === "refunded" ? "text-gray-400 line-through" :
                        "text-green-600"
                      }`}>
                        {isClient ? "-" : "+"} ₹{tx.amount?.toLocaleString()}
                      </p>
                      {tx.status === "completed" && !isClient && (
                        <p className="text-[10px] font-bold text-blue-500 mt-1 uppercase tracking-wider">Awaiting Release</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="px-6 py-12 text-center">
            <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="mt-4 text-sm font-medium text-gray-500">No transactions found in your ledger.</p>
          </div>
        )}
      </div>
    </div>
  );
}