/**
 * Extração de texto de PDFs (RF-25).
 *
 * O import de pdfjs-dist é dinâmico, para que ambientes de teste
 * (jsdom) não carreguem o parser nem o worker antes de o usuário
 * escolher um arquivo.
 */

export async function lerTextoPdf(file) {
  if (!file) return '';
  const pdfjs = await import('pdfjs-dist');
  const workerMod = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = workerMod.default;

  const buffer = await file.arrayBuffer();
  const doc = await pdfjs.getDocument({ data: buffer }).promise;
  const partes = [];

  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const texto = content.items
      .map((item) => ('str' in item ? item.str : ''))
      .join(' ');
    partes.push(texto);
  }

  return partes.join('\n');
}
