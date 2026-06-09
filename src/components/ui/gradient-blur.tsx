"use client"

import { useEffect, useRef } from "react"

interface GradientBlurProps {
  radius?: number
  opacityDecay?: number 
  backgroundColor?: string
  color?: [number, number, number]  
  colorGenerator?: () => [number, number, number]
}

export function GradientBlur({
  radius = 120,
  opacityDecay = 0.015, 
  backgroundColor = "transparent",
  color,
  colorGenerator,
}: GradientBlurProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -9999, y: -9999 })
  const lastMouseRef = useRef({ x: -9999, y: -9999 })
  const circsRef = useRef<
    Array<{
      col: [number, number, number]
      x: number
      y: number
      grdblur: CanvasGradient
      alpha: number
    }>
  >([])

  // Light-mode optimized: Generates bright, elegant pastel colors
  const defaultColorGenerator = () => {
    const brandColors: Array<[number, number, number]> = [
      [184, 104, 232], // Scope Purple
      [156, 132, 239], // Scope Violet
      [115, 182, 252], // Scope Blue
      [252, 119, 164], // Scope Pink
      [252, 163, 119], // Scope Orange
    ]
    // Return one of the brand colors randomly, or generate a random bright pastel
    const randomIndex = Math.floor(Math.random() * brandColors.length)
    return brandColors[randomIndex]
  }

  const getColor = () => color || colorGenerator?.() || defaultColorGenerator()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()

    const draw = () => {
      ctx.globalCompositeOperation = "source-over"
      if (backgroundColor === "transparent") {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      } else {
        ctx.fillStyle = backgroundColor
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      // Light mode: Use 'source-over' instead of 'lighter' for alpha-based overlaying
      ctx.globalCompositeOperation = "source-over"

      // Only push new gradient circles if the mouse position has actually changed (cursor is moving)
      const mouseMoved =
        mouseRef.current.x !== lastMouseRef.current.x ||
        mouseRef.current.y !== lastMouseRef.current.y

      if (mouseMoved && mouseRef.current.x !== -9999) {
        const obj = {
          col: getColor(),
          x: mouseRef.current.x,
          y: mouseRef.current.y,
          grdblur: ctx.createRadialGradient(
            mouseRef.current.x,
            mouseRef.current.y,
            0,
            mouseRef.current.x,
            mouseRef.current.y,
            radius
          ),
          alpha: 0.6, // Start with a softer alpha for light-mode pastels
        }
        circsRef.current.push(obj)
        // Update the last position tracker
        lastMouseRef.current = { x: mouseRef.current.x, y: mouseRef.current.y }
      }

      const toRemove: number[] = []
      for (let i = 0; i < circsRef.current.length; i++) {
        const circ = circsRef.current[i]

        circ.grdblur.addColorStop(0, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.4)`)
        circ.grdblur.addColorStop(0.3, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.2)`)
        circ.grdblur.addColorStop(0.6, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0.05)`)
        circ.grdblur.addColorStop(1, `rgba(${circ.col[0]},${circ.col[1]},${circ.col[2]},0)`)

        ctx.beginPath()
        ctx.fillStyle = circ.grdblur
        ctx.globalAlpha = circ.alpha
        ctx.arc(circ.x, circ.y, radius, 0, Math.PI * 2)
        ctx.fill()

        circ.alpha -= opacityDecay
        if (circ.alpha <= 0) toRemove.push(i)
      }

      for (let i = toRemove.length - 1; i >= 0; i--) {
        circsRef.current.splice(toRemove[i], 1)
      }

      ctx.globalAlpha = 1
      requestAnimationFrame(draw)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX
      mouseRef.current.y = e.clientY
    }

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault()
      mouseRef.current.x = e.touches[0].clientX
      mouseRef.current.y = e.touches[0].clientY
    }

    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("touchmove", handleTouchMove, { passive: false })
    window.addEventListener("resize", resizeCanvas)

    draw()

    return () => {
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("resize", resizeCanvas)
    }
  }, [radius, opacityDecay, backgroundColor, color, colorGenerator])

  return (
    <div className="relative w-full h-full overflow-hidden">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 pointer-events-none"
        style={{ background: "transparent" }}
      />
    </div>
  )
}
