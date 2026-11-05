/** Blob URL'ni yangi oynada ochish yoki yuklab olish */
export function openBlobUrl(url: string, filename?: string): void {
  if (filename) {
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.open(url, '_blank', 'noopener');
  }
  // Brauzer faylni ochib/yuklab olishga ulgursin
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
