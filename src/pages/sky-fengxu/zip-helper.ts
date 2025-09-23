import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import { TextEncoder } from 'text-encoding'

declare global {
  interface Window {
    _utf16Encoder: TextEncoder
  }
}

export class ZipHelper {
  private zip: JSZip = new JSZip()

  addAsUTF8(path: string, text: string) {
    this.zip.file(path, text)
  }

  addAsUTF16LE(path: string, text: string) {
    if (!window._utf16Encoder) {
      window._utf16Encoder = new TextEncoder('utf-16le', { NONSTANDARD_allowLegacyEncoding: true })
    }
    const utf16Data = window._utf16Encoder.encode('\uFEFF' + text)
    this.zip.file(path, utf16Data, {
      binary: true,
      compression: 'DEFLATE'
    })
  }

  download() {
    this.zip.generateAsync({ type: 'blob' }).then(function (content) {
      saveAs(content, 'archive.zip')
    })
  }
}
