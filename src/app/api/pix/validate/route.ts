import { analysePixReceipt } from "@/lib/aiVision";
import { prisma } from "@/lib/prisma";
import { ALLOWED_MIME_TYPES, MAX_FILE_SIZE } from "@/lib/validatorUploadImage";
import { NextRequest, NextResponse } from "next/server";

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

    const minRequired = parseFloat(process.env.MIN_CONFIDENCE || "0");
    const approved =
      analysisResult.success &&
      analysisResult.amount !== null &&
      analysisResult.amount >= minRequired &&
      analysisResult.confidence >= 0.7;

    const record = await prisma.pixValidation.create({
      data: {
        bankName: analysisResult.bank,
        amount: analysisResult.amount ?? undefined,
        currency: analysisResult.currency,
        confidence: analysisResult.confidence,
        status: approved ? "approved" : "rejected",
        minRequired: minRequired,
        rawMessage: analysisResult.message,
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
    console.error("Erro ao validar o recibo do PIX:", err);
    return NextResponse.json(
      { success: false, message: "Erro ao validar o recibo do PIX." },
      { status: 500 },
    );
  }
}
