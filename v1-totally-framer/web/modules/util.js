
export function round(number, precision = 0) {
    const factor = Math.pow(10, precision)
    return Math.round(number * factor) / factor
}


/**
 * @param {...{ x: number, y: number }} points
 */
export function calculateBoundingBox(...points) {
    const xs = points.map(p => p.x)
    const ys = points.map(p => p.y)

    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)

    return {
        x: minX,
        y: minY,
        width: maxX - minX,
        height: maxY - minY
    }
}

