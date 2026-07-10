"use client";
import { Button } from "@/components/ui/button";
import React, { useState, useRef } from "react";
import Image from "next/image";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validatorUploadImage";
import { trackInitiateCheckout, trackPurchase } from "@/lib/tracking";

// Define os estados da transferencia
type CardState =
  | { status: "idle" }
  | { status: "analyzing" }
  | {
      status: "approved";
      bank: string | null;
      amount: number | null;
      confidence: number;
    }
  | { status: "rejected"; message: string };

// Link do WhatsApp para entrar no grupo VIP
const whats_link =
  "https://api.whatsapp.com/send?phone=5511999999999&text=Olá!%20Enviei%20o%20comprovante%20do%20meu%20Pix.%20Pode%20verificar%3F";

// Componente de cartão de verificação do Pix
export function VerificationCard() {
  const [cardState, setCardState] = useState<CardState>({ status: "idle" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setValidationError(null);

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      setValidationError("Formato inválido. Envie JPG, PNG ou WEBP.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setValidationError("Arquivo muito grande. Máx. 5MB.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setPreviewUrl(URL.createObjectURL(file));
    handleSubmit(file);
  }

  // Função para enviar o arquivo para validação do Pix
  async function handleSubmit(file: File) {
    setCardState({ status: "analyzing" });
    trackInitiateCheckout();

    const formData = new FormData();
    formData.append("receipt", file);

    try {
      const response = await fetch("/api/pix/validate", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();

      if (data.success) {
        trackPurchase({
          transactionId: data.recordId,
          value: data.amount,
          bank: data.bank,
        });
        setCardState({
          status: "approved",
          bank: data.bank,
          amount: data.amount,
          confidence: data.confidence,
        });
      } else {
        setCardState({ status: "rejected", message: data.message });
      }
    } catch (error) {
      setCardState({
        status: "rejected",
        message: "Erro ao enviar o comprovante. Tente novamente.",
      });
    }
  }

  // Função para reiniciar o processo de validação
  function handleRetry() {
    setCardState({ status: "idle" });
    setPreviewUrl(null);
    setValidationError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 flex flex-col gap-4">
      {cardState.status === "idle" && (
        <>
          <p className="font-mono text-sm uppercase tracking-wider text-text-muted text-center">
            Passo 1 de 1
          </p>
          <label className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border py-10 px-4 cursor-pointer hover:bg-surface-hover transition-colors">
            {validationError && (
              <p className="text-sm text-attention text-center" role="alert">
                {validationError}
              </p>
            )}
            <span className="text-sm text-text text-center">
              Clique aqui para enviar o print comprovante do seu Pix.
            </span>
            <span className=" text-xs text-text-muted">
              JPG, PNG ou WEBP - até 5MB
            </span>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </>
      )}

      {cardState.status === "analyzing" && (
        <div className="flex flex-col items-center gap-4 py-8">
          {previewUrl && (
            <Image
              src={previewUrl}
              alt="Comprovante enviado"
              width={96}
              height={96}
              className="w-24 h-24 object-cover rounded-lg border border-border opacity-60"
              unoptimized
            />
          )}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-attention animate-pulse" />
            <span className="font-mono text-sm text-text-muted">
              Analisando o comprovante do Pix...
            </span>
          </div>
        </div>
      )}

      {cardState.status === "approved" && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="w-10 h-10 rounded-full bg-approve-dim flex items-center justify-center text-approve text-xl">
            ✓
          </span>
          <div>
            <p className="font-display text-lg font-bold text-text">
              Pix confirmado
            </p>
            <p className="font-mono text-sm text-text-muted mt-1">
              {cardState.bank ?? "Banco não identificado"} - R$
              {cardState.amount?.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <Button
            render={
              <a href={whats_link} target="_blank" rel="noopener noreferrer" />
            }
            nativeButton={false}
            className="w-full bg-approve text-bg hover:opacity-90 transition-opacity py-6 text-base"
          >
            Entrar no grupo VIP
          </Button>
        </div>
      )}

      {cardState.status === "rejected" && (
        <div className="flex flex-col items-center gap-4 py-4 text-center">
          <span className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center text-attention text-xl">
            !
          </span>
          <div>
            <p className="font-display text-lg font-bold text-text">
              Não foi possivel confirmar o Pix
            </p>
            <p className="text-sm text-text-muted mt-1">{cardState.message}</p>
          </div>
          <Button
            variant="outline"
            onClick={handleRetry}
            className="w-full bg-red-600 border-border text-text hover:bg-surface-hover"
          >
            Tentar novamente
          </Button>
        </div>
      )}
    </div>
  );
}
