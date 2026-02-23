"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  DollarSign, 
  Loader2, 
  CheckCircle,
  Clock,
  XCircle,
  CreditCard,
  Calendar
} from "lucide-react";
import NotificationModal from "@/components/NotificationModal";

interface Bill {
  id: string;
  month: string;
  rentAmount: number;
  waterAmount: number;
  garbageAmount: number;
  totalAmount: number;
  status: string;
  dueDate: string;
  paidDate: string | null;
  property: {
    name: string;
    paystackActive: boolean;
  };
  unit: {
    unitNumber: string;
  };
}

export default function TenantPaymentsPage() {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState<string | null>(null);

  const [notification, setNotification] = useState<{
    isOpen: boolean;
    type: "success" | "error";
    title: string;
    message: string;
  }>({
    isOpen: false,
    type: "success",
    title: "",
    message: "",
  });

  useEffect(() => {
    fetchBills();
  }, []);
 
   // Check for payment success redirect
   useEffect(() => {
      const searchParams = new URLSearchParams(window.location.search);
      const paymentStatus = searchParams.get("payment");
      const reference = searchParams.get("reference");

      if (paymentStatus === "success" && reference) {
        console.log("Verifying payment:", reference);

        // Verify payment
        fetch(`/api/tenant/payments/verify?reference=${reference}`)
          .then(res => res.json())
          .then(data => {
            if (data.success) {
              setNotification({
                isOpen: true,
                type: "success",
                title: "Payment Successful!",
                message: `Your payment of ${formatCurrency(data.amount)} has been confirmed.`,
              });

              // Refresh bills after 2 seconds
              setTimeout(() => {
                fetchBills();
                //  Clean URL
                window.history.replaceState({}, '', '/dashboard/tenant/payments');
              }, 2000);
            } else {
               setNotification({
                 isOpen: true,
                 type: "error",
                 title: "Payment Verification Failed",
                 message: "We couldn't verify your payment. Please contact support.",
               });
              }
            })
            .catch(error => {
               console.error("Verification error:", error);
            });
         }
       }, []);

  const fetchBills = async () => {
    try {
      const response = await fetch("/api/tenant/bills");
      if (response.ok) {
        const data = await response.json();
        setBills(data.bills);
      }
    } catch (error) {
      console.error("Error fetching bills:", error);
    } finally {
      setLoading(false);
    }
  };

  const handlePayNow = async (billId: string) => {
    setPaying(billId);

    try {
      const response = await fetch("/api/tenant/payments/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billId }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate payment");
      }

      const data = await response.json();

      // Redirect to Paystack checkout
      window.location.href = data.authorizationUrl;
    } catch (error: any) {
      setNotification({
        isOpen: true,
        type: "error",
        title: "Payment Failed",
        message: error.message,
      });
      setPaying(null);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-500/10 text-green-400 border-green-500/30";
      case "PENDING":
        return "bg-yellow-500/10 text-yellow-400 border-yellow-500/30";
      case "OVERDUE":
        return "bg-red-500/10 text-red-400 border-red-500/30";
      default:
        return "bg-gray-500/10 text-gray-400 border-gray-500/30";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4" />;
      case "PENDING":
        return <Clock className="h-4 w-4" />;
      case "OVERDUE":
        return <XCircle className="h-4 w-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">💰 My Payments</h1>
        <p className="text-gray-400 mt-1">View and pay your bills</p>
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {bills.length === 0 ? (
          <Card className="bg-gray-900/50 border-gray-700">
            <CardContent className="py-12 text-center">
              <DollarSign className="h-16 w-16 mx-auto text-gray-600 mb-4" />
              <p className="text-gray-400">No bills found</p>
            </CardContent>
          </Card>
        ) : (
          bills.map((bill) => (
            <Card key={bill.id} className="bg-gray-900/50 border-gray-700">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-white">
                      {new Date(bill.month).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "long",
                      })}
                    </CardTitle>
                    <p className="text-gray-400 text-sm mt-1">
                      {bill.property.name} - Unit {bill.unit.unitNumber}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(bill.status)}`}>
                    {getStatusIcon(bill.status)}
                    {bill.status}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Bill Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Rent</p>
                    <p className="text-white font-semibold">{formatCurrency(bill.rent)}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Water</p>
                    <p className="text-white font-semibold">{formatCurrency(bill.water)}</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <p className="text-xs text-gray-400 mb-1">Garbage</p>
                    <p className="text-white font-semibold">{formatCurrency(bill.garbage)}</p>
                  </div>
                  <div className="p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                    <p className="text-xs text-purple-400 mb-1">Total Due</p>
                    <p className="text-white font-bold text-lg">{formatCurrency(bill.total)}</p>
                  </div>
                </div>

                {/* Due Date */}
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Due Date:</span>
                  <span className="text-white">{formatDate(bill.dueDate)}</span>
                </div>

                {/* Payment Actions */}
                {bill.status === "PENDING" && (
                  <div className="flex gap-3">
                    {bill.property.paystackActive ? (
                      <button
                        onClick={() => handlePayNow(bill.id)}
                        disabled={paying === bill.id}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:shadow-lg transition flex items-center justify-center gap-2 disabled:opacity-50"
                      >
                        {paying === bill.id ? (
                          <>
                            <Loader2 className="h-5 w-5 animate-spin" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-5 w-5" />
                            Pay Now (M-Pesa / Card)
                          </>
                        )}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setNotification({
                            isOpen: true,
                            type: "error",
                            title: "Payment Unavailable",
                            message: "Online payment not configured. Please contact property manager.",
                          });
                        }}
                        className="flex-1 px-6 py-3 bg-gray-700 text-gray-400 rounded-lg cursor-not-allowed"
                      >
                        Online Payment Unavailable
                      </button>
                    )}
                  </div>
                )}

                {bill.status === "PAID" && bill.paidDate && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
                    <p className="text-xs text-green-400 font-medium mb-1">Paid on:</p>
                    <p className="text-white text-sm">{formatDate(bill.paidDate)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <NotificationModal
        isOpen={notification.isOpen}
        type={notification.type}
        title={notification.title}
        message={notification.message}
        onClose={() => setNotification({ ...notification, isOpen: false })}
      />
    </div>
  );
}
