export default function Header() {
  return (
    <header style={{ backgroundColor: '#3C3489' }} className="flex-shrink-0 px-6 py-3 flex items-center gap-3">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
        style={{ backgroundColor: '#7F77DD' }}
        aria-hidden="true"
      >
        OO
      </div>
      <div>
        <h1 className="text-white font-semibold text-base leading-tight">OOP Tutor</h1>
        <p className="text-white/50 text-xs leading-tight">CIS501 · Object-Oriented Programming</p>
      </div>
    </header>
  )
}
