declare global {
  interface Window {
    fbq?: (...args: unknown[]) => void;
    gtag?: (...args: unknown[]) => void;
  }
}

// Função para enviar o evento de checkout iniciado
export function trackInitiateCheckout() {
  if (typeof window === "undefined") return;

  window.fbq?.("track", "InitiateCheckout", {
    content_name: "Grupo VIP Dicas",
  });

  window.gtag?.("event", "begin_checkout", {
    currency: "BRL",
    items: [
      {
        item_id: "grupo-vip",
        item_name: "Grupo VIP Dicas",
      },
    ],
  });
}

// Função para enviar o evento de compra concluída
export function trackPurchase(params: {
  transactionId: string;
  value: number;
  bank: string | null;
}) {
  if (typeof window === "undefined") return;

  window.fbq?.("track", "Purchase", {
    content_name: "Grupo VIP Dicas ",
    value: params.value,
    currency: "BRL",
    payment_method: "pix",
  });

  window.gtag?.("event", "purchase", {
    transaction_id: params.transactionId,
    value: params.value,
    currency: "BRL",
    items: [
      {
        item_id: "grupo-vip",
        item_name: "Grupo VIP Dicas",
      },
    ],
  });
}
