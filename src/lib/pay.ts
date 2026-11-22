/* Client side of the payment flow.
   The API returns a PaymentOrder; this opens Razorpay Checkout for real orders,
   or simulates a quick success for mock orders (dev, no keys configured).
   Pass the returned proof back to the API's confirm endpoint. */

export type PaymentOrder = { provider: "mock" | "razorpay"; orderId: string; amount: number; currency: "INR"; keyId?: string };
export type PaymentProof = { provider: "mock" | "razorpay"; orderId: string; paymentId?: string; signature?: string };

type RazorpayResponse = { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string };
type RazorpayCtor = new (opts: Record<string, unknown>) => { open: () => void; on: (ev: string, cb: () => void) => void };

function loadCheckout(): Promise<RazorpayCtor> {
  const w = window as unknown as { Razorpay?: RazorpayCtor };
  if (w.Razorpay) return Promise.resolve(w.Razorpay);
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => (w.Razorpay ? resolve(w.Razorpay) : reject(new Error("Checkout failed to load")));
    s.onerror = () => reject(new Error("Checkout failed to load"));
    document.body.appendChild(s);
  });
}

export async function pay(order: PaymentOrder, opts: { name: string; description: string; phone?: string }): Promise<PaymentProof> {
  if (order.provider === "mock") {
    await new Promise((r) => setTimeout(r, 900)); // feels like a real payment
    return { provider: "mock", orderId: order.orderId };
  }
  const Razorpay = await loadCheckout();
  return new Promise((resolve, reject) => {
    const rz = new Razorpay({
      key: order.keyId,
      order_id: order.orderId,
      amount: Math.round(order.amount * 100),
      currency: "INR",
      name: opts.name,
      description: opts.description,
      prefill: opts.phone ? { contact: opts.phone } : undefined,
      theme: { color: "#FF7A1A" },
      handler: (r: RazorpayResponse) => resolve({ provider: "razorpay", orderId: r.razorpay_order_id, paymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => reject(new Error("Payment cancelled")) },
    });
    rz.open();
  });
}

export const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;
