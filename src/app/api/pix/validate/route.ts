import { analysePixReceipt } from "@/lib/aiVision";
import { type ValidatorUploadImage } from "@/lib/validatorUploadImage";
import { prisma } from "@/lib/prisma";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validatorUploadImage";
import { NextRequest, NextResponse } from "next/server";

// Função para validar se o destinatário da transação corresponde ao esperado, com base nas variáveis de ambiente EXPECTED_RECIPIENT_NAME e EXPECTED_RECIPIENT_KEY.
function recipientMatches(aiResult: ValidatorUploadImage): boolean {
  const expectedName = process.env.EXPECTED_RECIPIENT_NAME ?? "";
  const expectedKey = process.env.EXPECTED_RECIPIENT_KEY ?? "";

  // Se nenhuma das duas variáveis estiver configurada, a validação de
  // destinatário fica desativada (comportamento explícito para ambiente
  // de teste/dev — em produção, sempre configure pelo menos uma).
  if (!expectedName && !expectedKey) {
    return true;
  }

  const nameMatch =
    expectedName &&
    aiResult.recipientName?.toLowerCase().includes(expectedName.toLowerCase());

  const keyMatch =
    expectedKey &&
    aiResult.recipientKey?.replace(/\D/g, "") ===
      expectedKey.replace(/\D/g, "");

  return Boolean(nameMatch || keyMatch);
}

// Função para verificar se o valor do Pix é exatamente igual ao esperado, considerando uma tolerância de 0,01 (1 centavo) para evitar problemas de arredondamento.
function isExactAmount(
  amount: number,
  expected: number,
  tolerance = 0.01,
): boolean {
  return Math.abs(amount - expected) <= tolerance;
}

// Função para lidar com a requisição POST para validação do comprovante de pagamento Pix.
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("receipt") as File | null;

    if (!file) {
      return NextResponse.json(
        { success: false, message: "Nenhum arquivo enviado." },
        { status: 400 },
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { success: false, message: "Tipo de arquivo inválido." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { success: false, message: "Arquivo muito grande (máx. 5MB)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const analysisResult = await analysePixReceipt(base64, file.type);

    const expectedAmount = parseFloat(process.env.PIX_AMOUNT || "0");
    const approved =
      analysisResult.success &&
      analysisResult.amount !== null &&
      isExactAmount(analysisResult.amount, expectedAmount) &&
      analysisResult.confidence >= 0.7 &&
      recipientMatches(analysisResult);

    // Salva o resultado da validação no banco de dados
    const record = await prisma.pixValidation.create({
      data: {
        bankName: analysisResult.bank,
        amount: analysisResult.amount ?? undefined,
        currency: analysisResult.currency,
        confidence: analysisResult.confidence,
        status: approved ? "approved" : "rejected",
        minRequired: expectedAmount,
        rawMessage: analysisResult.message,
        recipientName: analysisResult.recipientName,
        recipientKey: analysisResult.recipientKey,
      },
    });

    return NextResponse.json({
      success: approved,
      recordId: record.id,
      bank: analysisResult.bank,
      amount: analysisResult.amount,
      currency: analysisResult.currency,
      confidence: analysisResult.confidence,
      status: record.status,
      message: analysisResult.message,
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, message: "Erro ao validar o recibo do PIX." },
      { status: 500 },
    );
  }
}
