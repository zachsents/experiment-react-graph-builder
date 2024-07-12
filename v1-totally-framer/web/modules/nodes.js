import { useWindowEvent } from "@mantine/hooks"
import { useTransform } from "framer-motion"
import { useMemo, useState } from "react"
import { decodeHandleId, useConvertToScreenScalar, useGraphStore, useNodePropertyValue } from "./graph-store"


export function useNodeDragging() {

    const fixed = useNodePropertyValue(undefined, "fixed")

    /** @type {import("framer-motion").MotionValue} */
    const _x = useNodePropertyValue(undefined, "x")
    /** @type {import("framer-motion").MotionValue} */
    const _y = useNodePropertyValue(undefined, "y")

    /** @type {import("framer-motion").MotionValue} */
    const dx = useNodePropertyValue(undefined, "_state.dx")
    /** @type {import("framer-motion").MotionValue} */
    const dy = useNodePropertyValue(undefined, "_state.dy")

    const [dragStart, setDragStart] = useState()
    const isDragging = dragStart != null

    const { x, y } = useNodeActualPosition()

    const [ghostKey, setGhostKey] = useState()

    /**
     * @param {PointerEvent} ev
     */
    const startDrag = ev => {
        ev.stopPropagation()
        if (fixed) return

        setDragStart({ x: ev.clientX, y: ev.clientY })
        setGhostKey(Math.random().toString(16).slice(2))
        dx.jump(0)
        dy.jump(0)
    }

    useWindowEvent("pointermove", ev => {
        if (!isDragging) return

        dx.set(ev.clientX - dragStart.x)
        dy.set(ev.clientY - dragStart.y)
    })

    useWindowEvent("pointerup", () => {
        if (!isDragging) return

        _x.set(x.get())
        _y.set(y.get())
        dx.jump(0)
        dy.jump(0)
        setDragStart(null)
        setGhostKey(null)
    })

    return { x, y, startDrag, isDragging, ghostKey }
}


export function useNodeActualPosition(nodeId) {

    const convert = useConvertToScreenScalar()

    /** @type {import("framer-motion").MotionValue} */
    const _x = useNodePropertyValue(nodeId, "x")
    /** @type {import("framer-motion").MotionValue} */
    const _y = useNodePropertyValue(nodeId, "y")

    /** @type {import("framer-motion").MotionValue} */
    const dx = useNodePropertyValue(nodeId, "_state.dx")
    /** @type {import("framer-motion").MotionValue} */
    const dy = useNodePropertyValue(nodeId, "_state.dy")

    const x = useTransform(() => (_x?.get() || 0) + convert(dx?.get() || 0))
    const y = useTransform(() => (_y?.get() || 0) + convert(dy?.get() || 0))

    return { x, y }
}


export function useEdges() {

    const nodes = useGraphStore(s => s.nodes)
    const inputs = nodes.map(node => node.inputs).flat()

    return useMemo(() => inputs.reduce((acc, input) => {
        if (input.source)
            acc.push({ target: input.id, source: input.source })
        return acc
    }, []), [JSON.stringify(inputs)])
}


export function useHandle(handleId, includeNode = false) {

    const decodedHandle = useMemo(() => handleId && decodeHandleId(handleId), [handleId])

    if (includeNode)
        var node = useGraphStore(s => s.node(decodedHandle.nodeId))

    const handle = useGraphStore(s =>
        s.node(decodedHandle.nodeId).inputs.find(input => input.id === decodedHandle.id) ||
        s.node(decodedHandle.nodeId).outputs.find(output => output.id === decodedHandle.id)
    )

    return {
        handle,
        node,
        ...decodedHandle,
    }
}