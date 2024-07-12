import { ActionIcon } from "@mantine/core"
import { useHover } from "@mantine/hooks"
import { decodeHandleId, useGraphSetState, useGraphStore } from "@web/modules/graph-store"
import { useNodeActualPosition } from "@web/modules/nodes"
import { motion, useMotionTemplate, useTransform } from "framer-motion"
import { produce } from "immer"
import { TbX } from "react-icons/tb"


export default function Edge({ source, target }) {

    const { nodeId: sourceNodeId } = decodeHandleId(source)
    const { nodeId: targetNodeId } = decodeHandleId(target)

    const { x: sourceNodeX, y: sourceNodeY } = useNodeActualPosition(sourceNodeId)
    const { x: targetNodeX, y: targetNodeY } = useNodeActualPosition(targetNodeId)

    const { x: sourceRelX, y: sourceRelY } = useGraphStore(s => s.relativeHandlePositions[source]) || {}
    const { x: targetRelX, y: targetRelY } = useGraphStore(s => s.relativeHandlePositions[target]) || {}

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

    const startX = useTransform(() => sourceX.get() - calcBoxX() + LINE_PADDING)
    const startY = useTransform(() => sourceY.get() - calcBoxY())
    const endX = useTransform(() => targetX.get() - calcBoxX() - LINE_PADDING)
    const endY = useTransform(() => targetY.get() - calcBoxY())

    const midX = useTransform(() => (startX.get() + endX.get()) / 2)
    const midY = useTransform(() => (startY.get() + endY.get()) / 2)
    const controlPointX = useTransform(() => startX.get() + CONTROL_POINT_OFFSET)

    // const lineData = useMotionTemplate`M ${startX} ${startY} L ${endX} ${endY}`
    const lineData = useMotionTemplate`M ${startX} ${startY} Q ${controlPointX} ${startY}, ${midX} ${midY} T ${endX} ${endY}`

    const { hovered, ref } = useHover()

    const setState = useGraphSetState()
    const deleteEdge = () => {
        setState(produce(s => {
            delete s.nodes.find(node => node.id === targetNodeId).inputs.find(input => input.id === target).source
        }))
    }

    return (
        <motion.div
            className="absolute top-0 left-0 pointer-events-none" style={{
                x: boxX,
                y: boxY,
                width: boxWidth,
                height: boxHeight,
                zIndex: hovered ? 4 : 3,
            }}
            ref={ref}
        >
            <svg className="w-full h-full">
                <motion.path
                    className="stroke-dark stroke-[10px] fill-none"
                    d={lineData}
                    strokeLinecap="round"
                />
                <motion.path
                    className="stroke-transparent stroke-[30px] fill-none pointer-events-auto"
                    d={lineData}
                    strokeLinecap="round"
                />
                <motion.path
                    className="stroke-gray-300 fill-none"
                    d={lineData}
                    strokeLinecap="round"
                    initial={{
                        strokeWidth: 6,
                    }}
                    exit={{
                        strokeWidth: 0,
                    }}
                    transition={{ duration: 0.1 }}
                />
            </svg>

            <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-auto p-8"
            >
                <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: hovered ? 1 : 0 }}
                >
                    <ActionIcon
                        color="red" variant="filled" size="xl" className="rounded-full"
                        onClick={deleteEdge}
                    >
                        <TbX />
                    </ActionIcon>
                </motion.div>
            </div>
        </motion.div>
    )
}


export const CONTROL_POINT_OFFSET = 100
export const LINE_PADDING = -10
export const SVG_PADDING = 100