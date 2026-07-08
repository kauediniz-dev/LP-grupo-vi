import {
  ValidatorUploadImage,
  validatorUploadImageSchema,
} from "./validatorUploadImage";

const SYSTEM_PROMPT = `Você recebe um print de comprovante de pagamento Pix.
Extraia as seguintes informações:
- bank: nome do banco emissor (ex: "Nubank", "Itaú", "Bradesco")
- amount: valor numérico transferido, formato decimal (ex: 97.00)
- currency: sempre "BRL"
- confidence: sua confiança de 0 a 1 na leitura
- success: true se conseguiu ler com confiança razoável, false caso contrário
- message: mensagem curta explicando o resultado

Se a imagem não for um comprovante Pix reconhecível, retorne success=false,
bank=null, amount=null, confidence baixo, e uma message explicando.`;

export async function analysePixReceipt(
  imageBase64: string,
  mimeType: string,
): Promise<ValidatorUploadImage> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const model = "gemini-2.5-flash";

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: [
          {
            role: "user",
            parts: [
              { inline_data: { mime_type: mimeType, data: imageBase64 } },
              { text: "Analise este comprovante de pagamento Pix." },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              success: { type: "boolean" },
              bank: { type: "string", nullable: true },
              amount: { type: "number", nullable: true },
              currency: { type: "string" },
              confidence: { type: "number" },
              message: { type: "string" },
            },
            required: [
              "success",
              "bank",
              "amount",
              "currency",
              "confidence",
              "message",
            ],
          },
        },
      }),
    },
  );

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("Gemini API error body:", errorBody);
    throw new Error(`AI vision API error: ${response.status}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error("Resposta vazia da API de visão AI");
  }

  const parsed = JSON.parse(text);

  return validatorUploadImageSchema.parse(parsed);
}
