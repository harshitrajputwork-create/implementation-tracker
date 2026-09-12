'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'

export default function PrintButton({ clientName }: { clientName: string }) {
  const [state, setState] = useState<'idle' | 'loading'>('idle')

  async function download() {
    setState('loading')
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const el = document.getElementById('report-content')
      if (!el) return

      const canvas = await html2canvas(el, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height * pdfW) / canvas.width

      let y = 0
      let remaining = imgH

      pdf.addImage(imgData, 'PNG', 0, y, pdfW, imgH)
      remaining -= pdfH

      while (remaining > 0) {
        y -= pdfH
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, y, pdfW, imgH)
        remaining -= pdfH
      }

      const filename = `${clientName.replace(/[^a-z0-9]/gi, '-').toLowerCase()}-journey-report.pdf`
      pdf.save(filename)
    } finally {
      setState('idle')
    }
  }

  return (
    <button
      onClick={download}
      disabled={state === 'loading'}
      className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60"
    >
      <Download className="w-4 h-4" />
      {state === 'loading' ? 'Generating PDF…' : 'Download PDF'}
    </button>
  )
}
