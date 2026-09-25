"use client"

import { useEffect, useRef, useState } from "react"
import { CalculatorIcon, MoveIcon, XIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface VirtualCalculatorProps {
  isOpen: boolean
  onClose: () => void
}

export function VirtualCalculator({ isOpen, onClose }: VirtualCalculatorProps) {
  const [display, setDisplay] = useState<string>("0")
  const [equation, setEquation] = useState<string>("")
  const [isRad, setIsRad] = useState<boolean>(false)
  const [isScientific, setIsScientific] = useState<boolean>(true)
  const [memory, setMemory] = useState<number>(0)
  const [shouldResetDisplay, setShouldResetDisplay] = useState<boolean>(false)

  // Draggable window state
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null)
  const isDraggingRef = useRef(false)
  const dragStartRef = useRef<{ startX: number; startY: number; posX: number; posY: number }>({
    startX: 0,
    startY: 0,
    posX: 0,
    posY: 0,
  })

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      if (!isDraggingRef.current) return
      const dx = e.clientX - dragStartRef.current.startX
      const dy = e.clientY - dragStartRef.current.startY
      const nextX = Math.max(0, Math.min(window.innerWidth - 380, dragStartRef.current.posX + dx))
      const nextY = Math.max(0, Math.min(window.innerHeight - 200, dragStartRef.current.posY + dy))
      setPosition({ x: nextX, y: nextY })
    }

    function handleMouseUp() {
      isDraggingRef.current = false
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseup", handleMouseUp)
    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseup", handleMouseUp)
    }
  }, [])

  function handleMouseDown(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest("button")) return
    isDraggingRef.current = true
    const initialPos = position ?? {
      x: Math.max(20, window.innerWidth - 420),
      y: Math.max(60, window.innerHeight - 560),
    }
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: initialPos.x,
      posY: initialPos.y,
    }
  }

  if (!isOpen) return null

  function handleNumber(num: string) {
    if (display === "0" || shouldResetDisplay) {
      setDisplay(num)
      setShouldResetDisplay(false)
    } else {
      setDisplay(display + num)
    }
  }

  function handleDecimal() {
    if (shouldResetDisplay) {
      setDisplay("0.")
      setShouldResetDisplay(false)
      return
    }
    if (!display.includes(".")) {
      setDisplay(display + ".")
    }
  }

  function handleOperator(op: string) {
    setEquation(`${display} ${op} `)
    setShouldResetDisplay(true)
  }

  function handleClear() {
    setDisplay("0")
    setEquation("")
    setShouldResetDisplay(false)
  }

  function handleClearEntry() {
    setDisplay("0")
    setShouldResetDisplay(false)
  }

  function handleBackspace() {
    if (shouldResetDisplay) return
    if (display.length === 1 || (display.length === 2 && display.startsWith("-"))) {
      setDisplay("0")
    } else {
      setDisplay(display.slice(0, -1))
    }
  }

  function handleToggleSign() {
    const val = parseFloat(display)
    if (isNaN(val) || val === 0) return
    setDisplay((val * -1).toString())
  }

  function handleEquals() {
    if (!equation) return
    try {
      const parts = equation.trim().split(" ")
      if (parts.length < 2) return
      const prev = parseFloat(parts[0])
      const op = parts[1]
      const current = parseFloat(display)
      let result = 0

      switch (op) {
        case "+":
          result = prev + current
          break
        case "-":
          result = prev - current
          break
        case "×":
        case "*":
          result = prev * current
          break
        case "÷":
        case "/":
          if (current === 0) {
            setDisplay("Cannot divide by zero")
            setShouldResetDisplay(true)
            return
          }
          result = prev / current
          break
        case "^":
        case "xʸ":
          result = Math.pow(prev, current)
          break
        case "mod":
        case "%":
          result = prev % current
          break
        default:
          return
      }

      const formatted = Number.isInteger(result)
        ? result.toString()
        : parseFloat(result.toFixed(8)).toString()
      setEquation(`${equation}${display} =`)
      setDisplay(formatted)
      setShouldResetDisplay(true)
    } catch {
      setDisplay("Error")
      setShouldResetDisplay(true)
    }
  }

  function handleScientific(func: string) {
    const val = parseFloat(display)
    if (isNaN(val)) return
    let result = 0

    const angle = isRad ? val : (val * Math.PI) / 180

    try {
      switch (func) {
        case "sin":
          result = Math.sin(angle)
          break
        case "cos":
          result = Math.cos(angle)
          break
        case "tan":
          if (!isRad && Math.abs(val) % 180 === 90) {
            setDisplay("Undefined")
            setShouldResetDisplay(true)
            return
          }
          result = Math.tan(angle)
          break
        case "asin":
          if (val < -1 || val > 1) {
            setDisplay("Invalid Input")
            setShouldResetDisplay(true)
            return
          }
          result = isRad ? Math.asin(val) : (Math.asin(val) * 180) / Math.PI
          break
        case "acos":
          if (val < -1 || val > 1) {
            setDisplay("Invalid Input")
            setShouldResetDisplay(true)
            return
          }
          result = isRad ? Math.acos(val) : (Math.acos(val) * 180) / Math.PI
          break
        case "atan":
          result = isRad ? Math.atan(val) : (Math.atan(val) * 180) / Math.PI
          break
        case "ln":
          if (val <= 0) {
            setDisplay("Invalid Input")
            setShouldResetDisplay(true)
            return
          }
          result = Math.log(val)
          break
        case "log":
          if (val <= 0) {
            setDisplay("Invalid Input")
            setShouldResetDisplay(true)
            return
          }
          result = Math.log10(val)
          break
        case "sqrt":
          if (val < 0) {
            setDisplay("Invalid Input")
            setShouldResetDisplay(true)
            return
          }
          result = Math.sqrt(val)
          break
        case "cbrt":
          result = Math.cbrt(val)
          break
        case "sqr":
          result = val * val
          break
        case "cube":
          result = val * val * val
          break
        case "inv":
          if (val === 0) {
            setDisplay("Cannot divide by zero")
            setShouldResetDisplay(true)
            return
          }
          result = 1 / val
          break
        case "fact":
          if (val < 0 || !Number.isInteger(val) || val > 170) {
            setDisplay("Invalid Input")
            setShouldResetDisplay(true)
            return
          }
          result = factorial(val)
          break
        case "exp":
          result = Math.exp(val)
          break
        case "10x":
          result = Math.pow(10, val)
          break
        case "abs":
          result = Math.abs(val)
          break
        default:
          return
      }

      const formatted = Number.isInteger(result)
        ? result.toString()
        : parseFloat(result.toFixed(8)).toString()
      setEquation(`${func}(${display}) =`)
      setDisplay(formatted)
      setShouldResetDisplay(true)
    } catch {
      setDisplay("Error")
      setShouldResetDisplay(true)
    }
  }

  function factorial(n: number): number {
    if (n === 0 || n === 1) return 1
    let f = 1
    for (let i = 2; i <= n; i++) f *= i
    return f
  }

  function handleConstant(c: "pi" | "e") {
    const val = c === "pi" ? Math.PI : Math.E
    setDisplay(parseFloat(val.toFixed(8)).toString())
    setShouldResetDisplay(true)
  }

  function handleMemory(action: "MC" | "MR" | "MS" | "M+" | "M-") {
    const val = parseFloat(display) || 0
    switch (action) {
      case "MC":
        setMemory(0)
        break
      case "MR":
        setDisplay(memory.toString())
        setShouldResetDisplay(true)
        break
      case "MS":
        setMemory(val)
        setShouldResetDisplay(true)
        break
      case "M+":
        setMemory(memory + val)
        setShouldResetDisplay(true)
        break
      case "M-":
        setMemory(memory - val)
        setShouldResetDisplay(true)
        break
    }
  }

  const customStyle: React.CSSProperties = position
    ? { left: `${position.x}px`, top: `${position.y}px` }
    : {}

  return (
    <div
      style={customStyle}
      className={cn(
        "fixed z-50 w-80 sm:w-96 rounded-none border border-slate-300 bg-white text-slate-900 shadow-xl select-none",
        !position && "bottom-16 right-6"
      )}
    >
      {/* Draggable Title Header Bar */}
      <div
        onMouseDown={handleMouseDown}
        className="flex items-center justify-between border-b border-slate-300 bg-[#e2e8f0] px-3 py-2 cursor-move font-sans"
      >
        <div className="flex items-center gap-2">
          <MoveIcon className="size-3 text-blue-700 shrink-0" />
          <CalculatorIcon className="size-3.5 text-blue-700" />
          <span className="text-xs font-bold text-slate-900">
            Virtual Calculator
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsScientific(!isScientific)}
            className="rounded-none px-2 py-0.5 text-[10px] font-bold text-slate-700 hover:bg-slate-200 hover:text-slate-900 transition-colors border border-slate-300 bg-white"
          >
            {isScientific ? "Basic" : "Scientific"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="size-6 rounded-none flex items-center justify-center text-slate-500 hover:bg-red-50 hover:text-red-700 transition-colors border border-slate-300 bg-white"
            aria-label="Close Calculator"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Readout */}
      <div className="bg-[#f8fafc] p-3 border-b border-slate-300 text-right space-y-1 font-mono">
        <div className="h-4 text-[11px] text-slate-500 truncate">
          {equation || "\u00A0"}
        </div>
        <div className="text-2xl font-bold tracking-tight text-slate-950 truncate tabular-nums">
          {display}
        </div>
        <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1.5 border-t border-slate-200">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setIsRad(true)}
              className={cn(
                "px-1.5 py-0.5 rounded-none font-bold border transition-colors",
                isRad
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              RAD
            </button>
            <button
              type="button"
              onClick={() => setIsRad(false)}
              className={cn(
                "px-1.5 py-0.5 rounded-none font-bold border transition-colors",
                !isRad
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-900"
              )}
            >
              DEG
            </button>
          </div>
          <span className="font-semibold text-slate-600">{memory !== 0 ? `M = ${memory}` : ""}</span>
        </div>
      </div>

      {/* Memory Bar */}
      <div className="grid grid-cols-5 border-b border-slate-300 text-[11px] font-mono bg-[#f1f5f9]">
        {(["MC", "MR", "M+", "M-", "MS"] as const).map((m, idx) => (
          <button
            key={m}
            type="button"
            onClick={() => handleMemory(m)}
            className={cn(
              "py-1 rounded-none hover:bg-slate-200 font-semibold text-slate-600 hover:text-slate-900 transition-colors",
              idx !== 4 && "border-r border-slate-300"
            )}
          >
            {m}
          </button>
        ))}
      </div>

      {/* Calculator Keypad */}
      <div className="p-3 space-y-2 bg-[#f8fafc]">
        {/* Scientific Functions */}
        {isScientific ? (
          <div className="grid grid-cols-5 gap-1 text-xs font-mono">
            <button type="button" onClick={() => handleScientific("sin")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">sin</button>
            <button type="button" onClick={() => handleScientific("cos")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">cos</button>
            <button type="button" onClick={() => handleScientific("tan")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">tan</button>
            <button type="button" onClick={() => handleScientific("ln")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">ln</button>
            <button type="button" onClick={() => handleScientific("log")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">log</button>

            <button type="button" onClick={() => handleScientific("asin")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">sin⁻¹</button>
            <button type="button" onClick={() => handleScientific("acos")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">cos⁻¹</button>
            <button type="button" onClick={() => handleScientific("atan")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">tan⁻¹</button>
            <button type="button" onClick={() => handleScientific("exp")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">eˣ</button>
            <button type="button" onClick={() => handleScientific("10x")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">10ˣ</button>

            <button type="button" onClick={() => handleScientific("sqrt")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">√x</button>
            <button type="button" onClick={() => handleScientific("sqr")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">x²</button>
            <button type="button" onClick={() => handleOperator("^")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">xʸ</button>
            <button type="button" onClick={() => handleScientific("inv")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">1/x</button>
            <button type="button" onClick={() => handleScientific("fact")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">n!</button>

            <button type="button" onClick={() => handleConstant("pi")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">π</button>
            <button type="button" onClick={() => handleConstant("e")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">e</button>
            <button type="button" onClick={() => handleOperator("mod")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">mod</button>
            <button type="button" onClick={() => handleScientific("abs")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">|x|</button>
            <button type="button" onClick={() => handleScientific("cbrt")} className="h-7 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-medium text-slate-800 transition-colors">∛x</button>
          </div>
        ) : null}

        {/* Standard Keypad */}
        <div className="grid grid-cols-4 gap-1 text-sm font-mono">
          <button type="button" onClick={handleClear} className="h-9 rounded-none border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 font-bold transition-colors">C</button>
          <button type="button" onClick={handleClearEntry} className="h-9 rounded-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold transition-colors">CE</button>
          <button type="button" onClick={handleBackspace} className="h-9 rounded-none border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 font-semibold transition-colors">⌫</button>
          <button type="button" onClick={() => handleOperator("÷")} className="h-9 rounded-none border border-slate-300 bg-slate-100 hover:bg-slate-200 font-bold text-blue-700 transition-colors">÷</button>

          <button type="button" onClick={() => handleNumber("7")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">7</button>
          <button type="button" onClick={() => handleNumber("8")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">8</button>
          <button type="button" onClick={() => handleNumber("9")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">9</button>
          <button type="button" onClick={() => handleOperator("×")} className="h-9 rounded-none border border-slate-300 bg-slate-100 hover:bg-slate-200 font-bold text-blue-700 transition-colors">×</button>

          <button type="button" onClick={() => handleNumber("4")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">4</button>
          <button type="button" onClick={() => handleNumber("5")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">5</button>
          <button type="button" onClick={() => handleNumber("6")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">6</button>
          <button type="button" onClick={() => handleOperator("-")} className="h-9 rounded-none border border-slate-300 bg-slate-100 hover:bg-slate-200 font-bold text-blue-700 transition-colors">−</button>

          <button type="button" onClick={() => handleNumber("1")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">1</button>
          <button type="button" onClick={() => handleNumber("2")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">2</button>
          <button type="button" onClick={() => handleNumber("3")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">3</button>
          <button type="button" onClick={() => handleOperator("+")} className="h-9 rounded-none border border-slate-300 bg-slate-100 hover:bg-slate-200 font-bold text-blue-700 transition-colors">+</button>

          <button type="button" onClick={handleToggleSign} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">±</button>
          <button type="button" onClick={() => handleNumber("0")} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">0</button>
          <button type="button" onClick={handleDecimal} className="h-9 rounded-none border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-900 transition-colors">.</button>
          <button type="button" onClick={handleEquals} className="h-9 rounded-none border border-blue-600 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base transition-colors">=</button>
        </div>
      </div>
    </div>
  )
}

