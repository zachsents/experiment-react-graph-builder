import { Button } from "@web/components/ui/button"
import { Card } from "@web/components/ui/card"
import { cn } from "@web/lib/utils"
import { createRandomId, IdNamespace } from "core/ids"
import React, { createContext, useContext, useEffect, useMemo, useState } from "react"
import { create } from "zustand"
import { motion } from "framer-motion"


export default function EditTest() {
    return (
        <GraphContainer className="w-screen h-screen">
            <div className="absolute z-50 top-0 left-0 w-full p-2 border-b bg-gray-100/50">
                <Button onClick={() => void addNode({
                    position: {
                        x: Math.floor(Math.random() * 600),
                        y: Math.floor(Math.random() * 600),
                    }
                })}>
                    Add Node
                </Button>
            </div>
        </GraphContainer>
    )
}

interface GraphContainerProps extends React.ComponentProps<"div"> { }

function GraphContainer({ children, ...props }: GraphContainerProps) {

    const nodes = useNodes()

    return (
        <div {...props} className={cn("relative w-full h-full", props.className)}>
            <Viewport>
                {nodes.map(n =>
                    <NodeContainer key={n.id} node={n}>
                        <Node {...n} />
                    </NodeContainer>
                )}
            </Viewport>
            {children}
        </div>
    )
}


function Viewport({ children }: { children: React.ReactNode }) {

    const pan = useGraphStore(s => s.pan)
    const pendingPan = useGraphStore(s => s.pendingPan)
    const isPanning = !!pendingPan

    const zoom = useGraphStore(s => s.zoom)

    const [ctrlKeyDown, setCtrlKeyDown] = useState(false)
    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Control") setCtrlKeyDown(true)
        }
        const onKeyUp = (e: KeyboardEvent) => {
            if (e.key === "Control") setCtrlKeyDown(false)
        }
        window.addEventListener("keydown", onKeyDown)
        window.addEventListener("keyup", onKeyUp)
        return () => {
            window.removeEventListener("keydown", onKeyDown)
            window.removeEventListener("keyup", onKeyUp)
        }
    }, [])

    return (
        // Interaction Container
        <motion.div
            className={cn(
                "relative w-full h-full overflow-hidden bg-dots",
                ctrlKeyDown
                    ? "cursor-crosshair"
                    : isPanning ? "cursor-grabbing" : "cursor-grab",
            )}
            onPointerDown={e => {
                // WILO: working on selection box
                if (isPanning || e.ctrlKey) return

                useGraphStore.setState(s => ({
                    pendingPan: {
                        startingPan: { ...s.pan },
                        click: { x: e.clientX, y: e.clientY },
                    }
                }))

                const onPointerMove = (e: PointerEvent) => {
                    useGraphStore.setState(s => ({
                        pan: {
                            x: s.pendingPan!.startingPan.x + e.clientX - s.pendingPan!.click.x,
                            y: s.pendingPan!.startingPan.y + e.clientY - s.pendingPan!.click.y,
                        },
                    }))
                }
                window.addEventListener("pointermove", onPointerMove)

                window.addEventListener("pointerup", e => {
                    window.removeEventListener("pointermove", onPointerMove)
                    useGraphStore.setState(s => ({
                        pendingPan: null,
                        ...!wasADrag(e, s.pendingPan!.click) && {
                            selection: new Set<string>()
                        },
                    }))
                }, { once: true })
            }}
            onWheel={(e) => {
                e.preventDefault()
                useGraphStore.setState((s) => {
                    const newZoom = Math.min(5, Math.max(0.2,
                        s.zoom * (1 + e.deltaY * -0.001)
                    ))
                    const zoomRatio = newZoom / s.zoom

                    const rect = e.currentTarget.getBoundingClientRect()
                    // only works if transform origin is top left -- if it was center
                    // we'd need to calculate the mouse position relative to the center
                    const mouseX = e.clientX - rect.x
                    const mouseY = e.clientY - rect.y

                    const pan = {
                        x: mouseX + zoomRatio * (s.pan.x - mouseX),
                        y: mouseY + zoomRatio * (s.pan.y - mouseY),
                    }

                    return { zoom: newZoom, pan }
                })
            }}
        >
            {/* Background */}
            <div
                className="absolute top-0 left-0 w-full h-full z-0 bg-dots bg-gray-400"
                style={{
                    backgroundPosition: `${pan.x}px ${pan.y}px`,
                    backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
                }}
            />

            {/* Content */}
            <div
                className="relative z-10 w-full h-full"
                style={{
                    transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                    transformOrigin: "top left",
                }}
            >
                {children}
            </div>

            {/* Debug */}
            <Card className="absolute z-[60] top-10 right-10 p-4 select-none">
                <p>Zoom: {zoom}</p>
                <p>Pan: {pan.x}, {pan.y}</p>
            </Card>
        </motion.div>
    )
}

const NodeContext = createContext<string | null>(null)

function NodeContainer({ node: n, children }: { node: Node, children: React.ReactNode }) {

    const isDragging = useGraphStore(s => !!s.pendingNodeDrag?.startingPositions.has(n.id))

    return (
        <NodeContext.Provider value={n.id}>
            <div
                className={cn(
                    "absolute",
                    isDragging ? "cursor-grabbing" : "cursor-grab",
                )}
                style={{
                    top: n.position.y,
                    left: n.position.x,
                }}
                onPointerDown={e => {
                    e.stopPropagation()
                    if (isDragging) return
                    useGraphStore.setState(s => ({
                        pendingNodeDrag: {
                            click: { x: e.clientX, y: e.clientY },
                            startingPositions: new Map(
                                s.selection.has(n.id)
                                    ? [...s.selection].map(id => [id, s.nodes.get(id)!.position] as const)
                                    : [[n.id, n.position] as const]
                            ),
                        }
                    }))

                    const onPointerMove = (e: PointerEvent) => {
                        useGraphStore.setState(s => {
                            const drag = s.pendingNodeDrag!
                            return {
                                nodes: new Map([
                                    ...s.nodes,
                                    ...[...drag.startingPositions].map(([id, pos]) => [id, {
                                        ...s.nodes.get(id)!,
                                        position: {
                                            x: pos.x + (e.clientX - drag.click.x) / s.zoom,
                                            y: pos.y + (e.clientY - drag.click.y) / s.zoom,
                                        },
                                    }] as const),
                                ])
                            }
                        })
                    }
                    window.addEventListener("pointermove", onPointerMove)

                    window.addEventListener("pointerup", e => {
                        window.removeEventListener("pointermove", onPointerMove)
                        useGraphStore.setState(s => ({
                            pendingNodeDrag: null,
                            ...!wasADrag(e, s.pendingNodeDrag!.click) && {
                                selection: new Set(
                                    e.shiftKey
                                        ? s.selection.has(n.id)
                                            ? [...s.selection].filter(id => id !== n.id)
                                            : [...s.selection, n.id]
                                        : [n.id]
                                ),
                            },
                        }))
                    }, { once: true })
                }}
            >
                {children}
            </div>
        </NodeContext.Provider>
    )
}



function Node({ id }: Node) {

    const isSelected = useIsSelected()

    return (
        <Card className={cn(
            "grid place-items-center text-center p-4 select-none outline-primary outline-2 outline-offset-2",
            isSelected
                ? "outline"
                : "hover:outline-dashed"
        )}>
            <p className="font-mono">{id}</p>
        </Card>
    )
}


function useNodeId() {
    return useContext(NodeContext)!
}

function useNodes() {
    const nodesMap = useGraphStore(s => s.nodes)
    return useMemo(() => Array.from(nodesMap.values()), [nodesMap])
}

function addNode(node?: Partial<Node>): Node {
    const newNode: Node = {
        id: createRandomId(IdNamespace.ActionNode),
        position: { x: 0, y: 0 },
        ...node,
    }
    useGraphStore.setState(s => ({
        nodes: new Map([...s.nodes, [newNode.id, newNode]]),
    }))
    return newNode
}

function useIsSelected(id: string = useNodeId()) {
    return useGraphStore(s => s.selection.has(id))
}


const useGraphStore = create<GraphStoreState>(() => ({
    nodes: new Map(),
    edges: new Map(),

    selection: new Set(),

    /** screen coords */
    pan: { x: 0, y: 0 },
    pendingPan: null,

    zoom: 1,

    pendingNodeDrag: null,
}))


type GraphStoreState = {
    nodes: Map<string, Node>
    edges: Map<string, Edge>

    selection: Set<string>

    pan: CoordPair
    pendingPan: {
        startingPan: CoordPair
        click: CoordPair
    } | null
    zoom: number

    pendingNodeDrag: {
        startingPositions: Map<string, CoordPair>
        click: CoordPair
    } | null
}

type Node = {
    id: string
    position: CoordPair
}

type Edge = {
    id: string
    /** Source node ID */
    s: string
    /** Source handle ID */
    sh: string
    /** Target node ID */
    t: string
    /** Target handle ID */
    th: string
}

type CoordPair = {
    x: number
    y: number
}

function wasADrag(e: PointerEvent, mouseStart: CoordPair) {
    return Math.sqrt(
        (e.clientX - mouseStart.x) ** 2
        + (e.clientY - mouseStart.y) ** 2
    ) > 3
}
