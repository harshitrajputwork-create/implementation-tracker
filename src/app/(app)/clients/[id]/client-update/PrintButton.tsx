'use client'

export default function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-5 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors"
    >
      Print / Save as PDF
    </button>
  )
}
