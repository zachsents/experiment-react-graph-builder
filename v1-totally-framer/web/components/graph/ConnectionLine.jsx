import { useWindowEvent } from "@mantine/hooks"
import { decodeHandleId, useConvertToGraphPoint, useGraphStore } from "@web/modules/graph-store"
import { useNodeActualPosition } from "@web/modules/nodes"
import { motion, useMotionTemplate, useMotionValue, useTransform } from "framer-motion"
import { useMemo } from "react"
import { CONTROL_POINT_OFFSET, LINE_PADDING, SVG_PADDING } from "./Edge"
import classNames from "classnames"


export default function ConnectionLine() {

    const fromId = useGraphStore(s => s.connectingFrom)
    const toId = useGraphStore(s => s.connectingTo)
    const isConnecting = fromId != null

    const convertPoint = useConvertToGraphPoint()
    const mouseX = useMotionValue()
    const mouseY = useMotionValue()
    useWindowEvent("pointermove", ev => {
        const { x, y } = convertPoint({ x: ev.clientX, y: ev.clientY })
        mouseX.set(x)
        mouseY.set(y)
    })

    const {
        sourceId,
        source: { nodeId: sourceNodeId },
        targetId,
        target: { nodeId: targetNodeId },
    } = useMemo(() => {
        const from = decodeHandleId(fromId)
        const to = toId ? decodeHandleId(toId) : {}

        const [targetId, target] = from.type === "input" ? [fromId, from] : [toId, to]
        const [sourceId, source] = from.type === "output" ? [fromId, from] : [toId, to]
        return { sourceId, source, targetId, target }
    }, [fromId, toId])

    const canConnect = !!(sourceId && targetId)

    const { x: _sourceNodeX, y: _sourceNodeY } = useNodeActualPosition(sourceNodeId)
    const sourceNodeX = sourceId ? _sourceNodeX : mouseX
    const sourceNodeY = sourceId ? _sourceNodeY : mouseY
    const { x: _targetNodeX, y: _targetNodeY } = useNodeActualPosition(targetNodeId)
    const targetNodeX = targetId ? _targetNodeX : mouseX
    const targetNodeY = targetId ? _targetNodeY : mouseY

    const { x: sourceRelX, y: sourceRelY } = useGraphStore(s => s.relativeHandlePositions[sourceId]) || {}
    const { x: targetRelX, y: targetRelY } = useGraphStore(s => s.relativeHandlePositions[targetId]) || {}

    const sourceX = useTransform(() => sourceNodeX.get() + (sourceRelX?.get() || 0))
    const sourceY = useTransform(() => sourceNodeY.get() + (sourceRelY?.get() || 0))
    const targetX = useTransform(() => targetNodeX.get() + (targetRelX?.get() || 0))
    const targetY = useTransform(() => targetNodeY.get() + (targetRelY?.get() || 0))

    // this fixes weird flickering issue, not sure why
    const calcBoxX = () => Math.min(sourceX.get(), targetX.get()) - SVG_PADDING
    const calcBoxY = () => Math.min(sourceY.get(), targetY.get()) - SVG_PADDING

    const boxWidth = useTransform(() => Math.abs(sourceX.get() - targetX.get()) + SVG_PADDING * 2)
    const boxHeight = useTransform(() => Math.abs(sourceY.get() - targetY.get()) + SVG_PADDING * 2)
    const boxX = useTransform(() => calcBoxX())
    const boxY = useTransform(() => calcBoxY())

    const startX = useTransform(() => sourceX.get() - calcBoxX() + (sourceId ? LINE_PADDING : 0))
    const startY = useTransform(() => sourceY.get() - calcBoxY())
    const endX = useTransform(() => targetX.get() - calcBoxX() - (targetId ? LINE_PADDING : 0))
    const endY = useTransform(() => targetY.get() - calcBoxY())

    const midX = useTransform(() => (startX.get() + endX.get()) / 2)
    const midY = useTransform(() => (startY.get() + endY.get()) / 2)
    const controlPointX = useTransform(() => startX.get() + CONTROL_POINT_OFFSET)

    const lineData = useMotionTemplate`M ${startX} ${startY} Q ${controlPointX} ${startY}, ${midX} ${midY} T ${endX} ${endY}`

    return (
        <motion.svg
            className="absolute z-[5] top-0 left-0 pointer-events-none" style={{
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
            }}
        >
            {isConnecting &&
                <motion.path
                    className={classNames(
                        "stroke-gray-300 stroke-[4px] fill-none",
                        canConnect ? "opacity-100" : "opacity-50",
                    )}
                    d={lineData}
                    strokeLinecap="round"
                    transition={{ duration: 0.1 }}
                />}
        </motion.svg>
    )
}
