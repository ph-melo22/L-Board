export async function extractContent(file: File): Promise<
  | { kind: 'text'; text: string }
  | { kind: 'image'; base64: string; mimeType: string }
> {
  const mime = file.type.toLowerCase()
  const name = file.name.toLowerCase()

  // ── PDF ──────────────────────────────────────────────────────────────────
  if (mime === 'application/pdf' || name.endsWith('.pdf')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pdfMod = await import('pdf-parse') as any
    const pdfParse = pdfMod.default ?? pdfMod
    try {
      const parsed = await pdfParse(buffer, { max: 0 })
      return { kind: 'text', text: parsed.text?.trim() ?? '' }
    } catch (pdfErr) {
      const msg = pdfErr instanceof Error ? pdfErr.message : ''
      throw new Error(
        `Não foi possível ler este PDF (${msg}). O arquivo pode estar corrompido ou ter sido gerado por software não padrão. Tente converter para imagem (JPG/PNG) ou exportar novamente como PDF.`
      )
    }
  }

  // ── DOCX / DOC ────────────────────────────────────────────────────────────
  if (
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    mime === 'application/msword' ||
    name.endsWith('.docx') || name.endsWith('.doc')
  ) {
    const buffer = Buffer.from(await file.arrayBuffer())
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mammoth = await import('mammoth') as any
    const result = await mammoth.extractRawText({ buffer })
    return { kind: 'text', text: result.value?.trim() ?? '' }
  }

  // ── Images → GPT-4o vision ────────────────────────────────────────────────
  if (mime.startsWith('image/')) {
    const buffer = Buffer.from(await file.arrayBuffer())
    return { kind: 'image', base64: buffer.toString('base64'), mimeType: mime }
  }

  // ── Everything else: try as UTF-8 text (txt, csv, md, json, xml, html…) ──
  const buffer = Buffer.from(await file.arrayBuffer())
  return { kind: 'text', text: buffer.toString('utf-8').trim() }
}
