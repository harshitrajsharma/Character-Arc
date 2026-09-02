"use client"

import { useState } from "react"
import { CalculatorIcon, XIcon } from "lucide-react"
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

  return (
    <div className="fixed bottom-20 right-4 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 select-none">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between border-b border-border bg-muted/60 px-3 py-2">
        <div className="flex items-center gap-2">
          <CalculatorIcon className="size-4 text-brand-violet-ink" />
          <span className="text-xs font-bold text-foreground">CBT Virtual Calculator</span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setIsScientific(!isScientific)}
            className="rounded px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground hover:bg-background hover:text-foreground transition-colors border border-border"
          >
            {isScientific ? "Basic" : "Scientific"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="size-6 rounded-md flex items-center justify-center text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            aria-label="Close Calculator"
          >
            <XIcon className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Screen Readout */}
      <div className="bg-background/90 p-3 border-b border-border text-right space-y-1">
        <div className="h-4 text-[11px] font-mono text-muted-foreground truncate">
          {equation || " "}
        </div>
        <div className="text-2xl font-mono font-bold tracking-tight text-foreground truncate">
          {display}
        </div>
        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/40">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsRad(!isRad)}
              className={cn(
                "px-1.5 py-0.5 rounded font-bold transition-colors",
                isRad ? "bg-brand-violet text-brand-violet-foreground" : "text-muted-foreground"
              )}
            >
              RAD
            </button>
            <button
              type="button"
              onClick={() => setIsRad(!isRad)}
              className={cn(
                "px-1.5 py-0.5 rounded font-bold transition-colors",
                !isRad ? "bg-brand-violet text-brand-violet-foreground" : "text-muted-foreground"
              )}
            >
              DEG
            </button>
          </div>
          <span className="font-semibold">{memory !== 0 ? `M = ${memory}` : ""}</span>
        </div>
      </div>

      {/* Memory Bar */}
      <div className="grid grid-cols-5 gap-1 p-1.5 bg-muted/30 border-b border-border text-[11px] font-mono">
        <button type="button" onClick={() => handleMemory("MC")} className="py-1 rounded hover:bg-muted font-semibold text-muted-foreground hover:text-foreground transition-colors">MC</button>
        <button type="button" onClick={() => handleMemory("MR")} className="py-1 rounded hover:bg-muted font-semibold text-muted-foreground hover:text-foreground transition-colors">MR</button>
        <button type="button" onClick={() => handleMemory("M+")} className="py-1 rounded hover:bg-muted font-semibold text-muted-foreground hover:text-foreground transition-colors">M+</button>
        <button type="button" onClick={() => handleMemory("M-")} className="py-1 rounded hover:bg-muted font-semibold text-muted-foreground hover:text-foreground transition-colors">M-</button>
        <button type="button" onClick={() => handleMemory("MS")} className="py-1 rounded hover:bg-muted font-semibold text-muted-foreground hover:text-foreground transition-colors">MS</button>
      </div>

      {/* Calculator Keypad */}
      <div className="p-2.5 space-y-1.5">
        {/* Scientific Functions */}
        {isScientific ? (
          <div className="grid grid-cols-5 gap-1 text-xs font-mono">
            <button type="button" onClick={() => handleScientific("sin")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">sin</button>
            <button type="button" onClick={() => handleScientific("cos")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">cos</button>
            <button type="button" onClick={() => handleScientific("tan")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">tan</button>
            <button type="button" onClick={() => handleScientific("ln")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">ln</button>
            <button type="button" onClick={() => handleScientific("log")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">log</button>

            <button type="button" onClick={() => handleScientific("asin")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">sin⁻¹</button>
            <button type="button" onClick={() => handleScientific("acos")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">cos⁻¹</button>
            <button type="button" onClick={() => handleScientific("atan")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">tan⁻¹</button>
            <button type="button" onClick={() => handleScientific("exp")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">eˣ</button>
            <button type="button" onClick={() => handleScientific("10x")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">10ˣ</button>

            <button type="button" onClick={() => handleScientific("sqrt")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">√x</button>
            <button type="button" onClick={() => handleScientific("sqr")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">x²</button>
            <button type="button" onClick={() => handleOperator("^")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">xʸ</button>
            <button type="button" onClick={() => handleScientific("inv")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">1/x</button>
            <button type="button" onClick={() => handleScientific("fact")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">n!</button>

            <button type="button" onClick={() => handleConstant("pi")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">π</button>
            <button type="button" onClick={() => handleConstant("e")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">e</button>
            <button type="button" onClick={() => handleOperator("mod")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">mod</button>
            <button type="button" onClick={() => handleScientific("abs")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">|x|</button>
            <button type="button" onClick={() => handleScientific("cbrt")} className="h-7 rounded border border-border/80 bg-muted/40 hover:bg-muted font-medium text-foreground transition-colors">∛x</button>
          </div>
        ) : null}

        {/* Standard Keypad */}
        <div className="grid grid-cols-4 gap-1.5 text-sm font-mono">
          <button type="button" onClick={handleClear} className="h-9 rounded-lg border border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold transition-colors">C</button>
          <button type="button" onClick={handleClearEntry} className="h-9 rounded-lg border border-border bg-muted/60 text-muted-foreground hover:bg-muted font-semibold transition-colors">CE</button>
          <button type="button" onClick={handleBackspace} className="h-9 rounded-lg border border-border bg-muted/60 text-muted-foreground hover:bg-muted font-semibold transition-colors">⌫</button>
          <button type="button" onClick={() => handleOperator("÷")} className="h-9 rounded-lg border border-border/80 bg-muted hover:bg-muted/80 font-bold text-foreground transition-colors">÷</button>

          <button type="button" onClick={() => handleNumber("7")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">7</button>
          <button type="button" onClick={() => handleNumber("8")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">8</button>
          <button type="button" onClick={() => handleNumber("9")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">9</button>
          <button type="button" onClick={() => handleOperator("×")} className="h-9 rounded-lg border border-border/80 bg-muted hover:bg-muted/80 font-bold text-foreground transition-colors">×</button>

          <button type="button" onClick={() => handleNumber("4")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">4</button>
          <button type="button" onClick={() => handleNumber("5")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">5</button>
          <button type="button" onClick={() => handleNumber("6")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">6</button>
          <button type="button" onClick={() => handleOperator("-")} className="h-9 rounded-lg border border-border/80 bg-muted hover:bg-muted/80 font-bold text-foreground transition-colors">−</button>

          <button type="button" onClick={() => handleNumber("1")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">1</button>
          <button type="button" onClick={() => handleNumber("2")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">2</button>
          <button type="button" onClick={() => handleNumber("3")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">3</button>
          <button type="button" onClick={() => handleOperator("+")} className="h-9 rounded-lg border border-border/80 bg-muted hover:bg-muted/80 font-bold text-foreground transition-colors">+</button>

          <button type="button" onClick={handleToggleSign} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">±</button>
          <button type="button" onClick={() => handleNumber("0")} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">0</button>
          <button type="button" onClick={handleDecimal} className="h-9 rounded-lg border border-border bg-card hover:bg-muted font-semibold text-foreground transition-colors">.</button>
          <button type="button" onClick={handleEquals} className="h-9 rounded-lg bg-brand-violet text-brand-violet-foreground hover:bg-brand-violet/90 font-bold text-base transition-colors">=</button>
        </div>
      </div>
    </div>
  )
}
