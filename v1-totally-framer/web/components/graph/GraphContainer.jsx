import { GraphProvider, useEndConnection, useGraphStore, usePanning, useZooming } from "@web/modules/graph-store"
import { useEdges } from "@web/modules/nodes"
import classNames from "classnames"
import { motion } from "framer-motion"
import Edge from "./Edge"
import Node from "./Node"
import { AnimatePresence } from "framer-motion"
import ConnectionLine from "./ConnectionLine"


/**
 * @param {{ className: string  }} props
 */
export default function GraphContainer({ className }) {
    return (
        <GraphProvider>
            <div className={classNames(
                "overflow-hidden",
                className,
            )}>
                <GraphRenderer />
            </div>
        </GraphProvider>
    )
}


function GraphRenderer() {

    let { tx, ty, startPan } = usePanning()

    const { zoom, handleZoom } = useZooming({
        speed: 0.0015,
        min: 0.2,
        max: 3,
    })

    const deselectAll = useGraphStore(s => s.deselectAll)

    const connectingFrom = useGraphStore(s => s.connectingFrom)
    const endConnection = useEndConnection()

    return (
        <motion.div
            className="w-full h-full relative"
            onWheel={handleZoom}
            onClick={ev => {
                if (!ev.shiftKey)
                    deselectAll()
            }}
            onPointerDown={startPan}
            onPointerUp={() => {
                endConnection()
            }}
        >
            <motion.div
                className="relative z-[2] pointer-events-none w-2 h-2 bg-red bg-opacity-50"
                style={{
                    scale: zoom,
                    x: tx,
                    y: ty,
                }}
            >
                <svg width={1000} height={1000} className="absolute">
                    <g>
                        <line x1="0%" y1="0" x2="100%" y2="0" className="stroke-blue-800 stroke-1" strokeDasharray="4" />
                        <line x1="0" y1="0%" x2="0" y2="100%" className="stroke-red-800 stroke-1" strokeDasharray="4" />
                    </g>
                </svg>

                <NodeList />
                <EdgeList />

                {connectingFrom && <ConnectionLine />}
            </motion.div>

            {/* Fixed Background */}
            <motion.div
                className="absolute z-[1] top-0 left-0 w-full h-full bg-dark"
            >
            </motion.div>
        </motion.div>
    )
}


function NodeList() {

    const nodes = useGraphStore(s => s.nodes)

    return nodes.map(node =>
        <Node {...node} key={node.id} />
    )
}


function EdgeList() {

    const edges = useEdges()

    return (
        <AnimatePresence>
            {edges.map(edge =>
                <Edge {...edge} key={`${edge.source}-${edge.target}`} />
            )}
        </AnimatePresence>
    )
}