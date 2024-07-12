import { Card, Group, Paper, Stack, Text } from "@mantine/core"
import { NodeContext, decodeHandleId, useConvertToGraphScalar, useGraphSetState, useGraphStore, useNode, useNodePropertyValue, useNodeSelection, useSetNodeProperty, useValidateConnection } from "@web/modules/graph-store"
import { getNodeType, getNodeTypeInput, getNodeTypeOutput } from "@web/modules/node-types"
import { useNodeDragging } from "@web/modules/nodes"
import classNames from "classnames"
import { motion, motionValue } from "framer-motion"
import { produce } from "immer"
import { useMemo } from "react"


export default function Node(props) {
    return (
        <NodeContext.Provider value={props.id}>
            <NodeRenderer {...props} />
        </NodeContext.Provider>
    )
}


function NodeRenderer({ type: typeId, fixed, inputs, outputs }) {

    const type = getNodeType(typeId)

    const [isSelected, selectionClickHandler] = useNodeSelection()

    const convertScalar = useConvertToGraphScalar()

    const setWidth = useSetNodeProperty(undefined, "width")
    const setHeight = useSetNodeProperty(undefined, "height")

    const { x, y, startDrag } = useNodeDragging()

    const connectionHappening = useGraphStore(s => s.connectingFrom != null)

    return (<>
        <motion.div
            className="absolute z-[10] top-0 left-0 pointer-events-auto select-none"
            style={{ x, y }}
            onPointerDown={startDrag}
            onClick={ev => {
                ev.stopPropagation()
                selectionClickHandler(ev)
            }}
            ref={el => {
                if (!el) return

                const { width, height } = el.getBoundingClientRect()
                setWidth(convertScalar(width))
                setHeight(convertScalar(height))
            }}
        >
            <Card
                withBorder
                className={classNames(
                    "p-md shadow-xs overflow-visible outline-2 outline-offset-4",
                    isSelected ? "outline outline-primary" : "outline-primary-300",
                    fixed ? "cursor-pointer" : "cursor-grab",
                    {
                        "hover:outline": !connectionHappening,
                    }
                )}
            >
                <Stack>
                    <Group>
                        {type?.icon && <type.icon />}
                        <Text>{type.name}</Text>
                    </Group>

                    <Group noWrap className="gap-10">
                        <Stack className="gap-2 -ml-6">
                            {inputs?.map(input =>
                                <Input key={input.id} {...input} />
                            )}
                        </Stack>
                        <Stack className="gap-2 -mr-6">
                            {outputs?.map(output =>
                                <Output key={output.id} {...output} />
                            )}
                        </Stack>
                    </Group>
                </Stack>
            </Card>
        </motion.div>

        {/* <AnimatePresence>
            {ghostKey && <DragGhost key={ghostKey} />}
        </AnimatePresence> */}
    </>)
}


function Input({ id, type: typeId, source }) {

    const node = useNode()
    const type = getNodeTypeInput(node, typeId)

    const isConnected = source != null
    const connectionHappening = useGraphStore(s => s.connectingFrom != null)
    const isBeingConnectedTo = useGraphStore(s => s.connectingTo === id)

    return (
        <HandleWrapper id={id}>
            <Paper
                withBorder
                className={classNames(
                    "px-xs py-1 transition-[border-radius]",
                    isConnected ? "rounded-l-lg rounded-r-sm" : "rounded-sm",
                    {
                        "hover:bg-gray-100": !connectionHappening,
                        "outline outline-primary outline-offset-4 outline-2": isBeingConnectedTo,
                    }
                )}
            >
                <Group noWrap className="gap-xs">
                    {type.icon && <type.icon />}
                    <Text>
                        {type?.name}
                    </Text>
                </Group>
            </Paper>
        </HandleWrapper>
    )
}

function Output({ id, type: typeId }) {

    const node = useNode()
    const type = getNodeTypeOutput(node, typeId)

    const isConnected = useGraphStore(s => s.nodes.map(n => n.inputs).flat().some(input => input.source === id))
    const connectionHappening = useGraphStore(s => s.connectingFrom != null)
    const isBeingConnectedTo = useGraphStore(s => s.connectingTo === id)

    return (
        <HandleWrapper id={id}>
            <Paper
                withBorder
                className={classNames(
                    "px-xs py-1 transition-[border-radius]",
                    isConnected ? "rounded-r-lg rounded-l-sm" : "rounded-sm",
                    {
                        "hover:bg-gray-100": !connectionHappening,
                        "outline outline-primary outline-offset-4 outline-2": isBeingConnectedTo,
                    }
                )}
            >
                <Group noWrap className="gap-xs flex-row-reverse">
                    {type.icon && <type.icon />}
                    <Text>
                        {type?.name}
                    </Text>
                </Group>
            </Paper>
        </HandleWrapper>
    )
}


function HandleWrapper({ children, id }) {

    const setState = useGraphSetState()
    const connectingFrom = useGraphStore(s => s.connectingFrom)
    const connectingTo = useGraphStore(s => s.connectingTo)
    const validateConnection = useValidateConnection()
    const isConnecting = connectingFrom != null

    const { type } = decodeHandleId(id)

    /**
     * @param {Element} el
     */
    const ref = el => setState(produce(s => {
        if (!el) return

        const xOffset = type === "output" ? el.offsetWidth : 0

        s.relativeHandlePositions[id] ??= { x: motionValue(0), y: motionValue(0) }
        s.relativeHandlePositions[id].x.set(el.offsetLeft + xOffset)
        s.relativeHandlePositions[id].y.set(el.offsetTop + el.offsetHeight / 2)
    }))

    return (
        <div
            className="relative cursor-pointer z-[1]"
            onPointerDown={ev => {
                ev.stopPropagation()
                setState({ connectingFrom: id })
                console.debug("starting connection from", id)
            }}
            onPointerEnter={() => {
                if (!isConnecting) return

                const validation = validateConnection(connectingFrom, id)
                if (!validation) return

                setState({ connectingTo: id })
                console.debug("could connect to", id)
            }}
            onPointerLeave={() => {
                if (!isConnecting) return

                if (connectingTo === id)
                    setState({ connectingTo: null })
            }}
            ref={ref}
        >
            {children}
        </div>
    )
}


// eslint-disable-next-line no-unused-vars
function DragGhost() {

    const width = useNodePropertyValue(undefined, "width")
    const height = useNodePropertyValue(undefined, "height")

    const _x = useNodePropertyValue(undefined, "x")
    const _y = useNodePropertyValue(undefined, "y")

    const [x, y] = useMemo(() => [_x.get(), _y.get()], [])

    return (
        <Card
            withBorder
            className="absolute z-[1] top-0 left-0 pointer-events-none"
            component={motion.div}
            style={{ x, y, width, height }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.1 }}
        />
    )
}