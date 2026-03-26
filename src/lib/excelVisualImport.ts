const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer)
  const chunkSize = 0x8000
  let binary = ''

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

export const importExactSpreadsheetVisual = async (file: File) => {
  try {
    const response = await fetch('/__local/excel-visual-import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filename: file.name,
        base64: arrayBufferToBase64(await file.arrayBuffer()),
      }),
    })

    if (!response.ok) {
      return null
    }

    const payload = (await response.json()) as { ok?: boolean; dataUrl?: string }
    return payload.ok && payload.dataUrl ? payload.dataUrl : null
  } catch {
    return null
  }
}
