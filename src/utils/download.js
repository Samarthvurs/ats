// mailto: links cannot carry attachments (a browser/URI-scheme limitation,
// not something any app can work around) — this lets the recruiter download
// the real file first and attach it manually in their mail client.
export function downloadFile(file, filename) {
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || file.name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
