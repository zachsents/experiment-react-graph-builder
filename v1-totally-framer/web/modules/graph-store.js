import { useWindowEvent } from "@mantine/hooks"
import { motionValue, useTransform } from "framer-motion"
import { produce } from "immer"
import _ from "lodash"
import { createContext, useContext, useMemo, useRef, useState } from "react"
import { createStore, useStore } from "zustand"
import { useMotionValueState } from "./animation"
import { round } from "./util"


const createInitialState = (set, get) => ({
    translation: {
        x: motionValue(0),
        y: motionValue(0),
    },

    panning: false,
    pan: {
        x: motionValue(0),
        y: motionValue(0),
    },

    zoom: motionValue(1),

    nodes: [
        {
            id: "1",
            x: motionValue(100),
            y: motionValue(100),
            type: "text.template",
            inputs: [
                { id: "input:1.pwe34ui", type: "template" },
                { id: "input:1.2ooi43", type: "substitution" },
            ],
            outputs: [
                { id: "output:1.iui34ur", type: "result" },
            ],
            _state: {
                dx: motionValue(0),
                dy: motionValue(0),
            },
        },
        {
            id: "2",
            x: motionValue(200),
            y: motionValue(300),
            type: "text.template",
            inputs: [
                { id: "input:2.k343udjk", type: "template" },
                { id: "input:2.34j9d8f", type: "substitution", source: "output:1.iui34ur" },
            ],
            outputs: [
                { id: "output:2.j3j98f3", type: "result" },
            ],
            _state: {
                dx: motionValue(0),
                dy: motionValue(0),
            },
        },
    ],
    node: (nodeId) => get().nodes.find(n => n.id === nodeId),

    selection: [],
    select: (id, only = true) => set(
        only ?
            { selection: [id] } :
            s => ({ selection: [...new Set([...s.selection, id])] })
    ),
    deselect: (id) => set(s => ({ selection: s.selection.filter(x => x !== id) })),
    deselectAll: () => set({ selection: [] }),

    connectingFrom: null,
    connectingTo: null,
    startConnection: handleId => {
        console.debug("starting connection from", handleId)
        set({ connectingFrom: handleId })
    },
    updateConnection: handleId => {
        const connectingFrom = get().connectingFrom

        if (!connectingFrom)
            return

        if (connectingFrom === handleId)
            return

        set({ connectingTo: handleId })
    },
    cancelConnection: () => {
        if (!get().connectingFrom)
            return

        console.debug("cancelled connection")
        set({
            connectingFrom: null,
            connectingTo: null,
        })
    },
    completeConnection: handleId => {
        const connectingFrom = get().connectingFrom
        if (!connectingFrom)
            return

        if (connectingFrom === handleId)
            return get().cancelConnection()

        const decodedStart = decodeHandleId(connectingFrom)
        const decodedEnd = decodeHandleId(handleId)

        const hasBothInputAndOutput = decodedStart.type === "input" && decodedEnd.type === "output" ||
            decodedStart.type === "output" && decodedEnd.type === "input"
        if (!hasBothInputAndOutput)
            return get().cancelConnection()

        const hasSameNode = decodedStart.nodeId === decodedEnd.nodeId
        if (hasSameNode)
            return get().cancelConnection()

        const [inputId, outputId] = decodedStart.type === "input" ?
            [connectingFrom, handleId] :
            [handleId, connectingFrom]

        // const hasConnectionAlready = get().nodes.find(n => n.id === decodedEnd.nodeId).inputs.find()
        // TO DO: check if there's already a connection between these two handles

        console.debug("created connection from", connectingFrom, "to", handleId)

        set(produce(s => {
            const node = s.nodes.find(n => n.inputs.find(i => i.id === inputId))
            node.inputs.find(i => i.id === inputId).source = outputId

            s.connectingFrom = null
        }))
    },

    relativeHandlePositions: {},
})


const GraphContext = createContext()


export function GraphProvider({ children }) {
    const storeRef = useRef()

    if (!storeRef.current) {
        storeRef.current = createStore(createInitialState)
    }

    return (
        <GraphContext.Provider value={storeRef.current}>
            {children}
        </GraphContext.Provider>
    )
}


/**
 * @template T
 * @param {(state: GraphState) => T} selector
 * @returns {T}
 */
export function useGraphStore(selector) {
    const store = useContext(GraphContext)

    if (!store)
        throw new Error("Missing GraphProvider")

    return useStore(store, s => {
        if (typeof selector === "string" || Array.isArray(selector))
            return _.get(s, selector)

        return selector(s)
    })
}


export function useGraphSetState() {
    const store = useContext(GraphContext)
    if (!store) {
        throw new Error("Missing GraphProvider")
    }
    return store.setState
}


export function usePanning() {

    const set = useGraphSetState()

    const [panStart, setPanStart] = useState()

    const isPanning = useGraphStore(s => s.panning)
    const _tx = useGraphStore(s => s.translation.x)
    const _ty = useGraphStore(s => s.translation.y)
    const _px = useGraphStore(s => s.pan.x)
    const _py = useGraphStore(s => s.pan.y)
    const tx = useTransform(() => _tx.get() + _px.get())
    const ty = useTransform(() => _ty.get() + _py.get())

    /**
     * @param {MouseEvent} ev
     */
    const startPan = ev => {
        setPanStart({
            x: ev.clientX,
            y: ev.clientY,
        })
        set({ panning: true })
        _px.jump(0)
        _py.jump(0)
    }

    useWindowEvent("pointermove", ev => {
        if (!isPanning)
            return

        _px.set(ev.clientX - panStart.x)
        _py.set(ev.clientY - panStart.y)
    })

    useWindowEvent("pointerup", () => {
        if (!isPanning)
            return

        set({ panning: false })
        _tx.set(tx.get())
        _ty.set(ty.get())
        _px.jump(0)
        _py.jump(0)
    })

    return { tx, ty, startPan }
}


export function useZooming({ speed = 0.001, min = 0.1, max = 2 } = {}) {

    const convertToScreenPoint = useConvertToScreenPoint()

    const tx = useGraphStore(s => s.translation.x)
    const ty = useGraphStore(s => s.translation.y)
    const zoom = useGraphStore(s => s.zoom)

    /**
     * @param {WheelEvent} ev
     */
    const handleZoom = ev => {

        const origin = convertToScreenPoint({ x: 0, y: 0 })

        const newZoom = Math.max(min, Math.min(max,
            zoom.get() + ev.deltaY * -speed
        ))

        tx.set(tx.get() + (ev.clientX - origin.x) * (1 - newZoom / zoom.get()))
        ty.set(ty.get() + (ev.clientY - origin.y) * (1 - newZoom / zoom.get()))
        zoom.set(newZoom)
    }

    return { zoom, handleZoom }
}


/**
 * @param {{ x: number, y: number }} screenPoint
 * @param {object} options
 * @param {{ x: number, y: number }} [options.translation]
 * @param {{ x: number, y: number }} [options.pan]
 * @param {number} [options.zoom]
 * @param {number | false} [options.rounding]
 */
export function convertToGraphPoint(screenPoint, { translation, zoom, pan, rounding = 1 } = {}) {
    const graphX = (screenPoint?.x - (translation?.x || 0) - (pan?.x || 0)) / (zoom || 1)
    const graphY = (screenPoint?.y - (translation?.y || 0) - (pan?.y || 0)) / (zoom || 1)

    return {
        x: isNaN(graphX) ? null : rounding === false ? graphX : round(graphX, rounding),
        y: isNaN(graphY) ? null : rounding === false ? graphY : round(graphY, rounding),
    }
}


/**
 * @param {number} screenScalar
 * @param {object} options
 * @param {number} [options.zoom]
 * @param {number | false} [options.rounding]
 */
export function convertToGraphScalar(screenScalar, { zoom, rounding = 1 } = {}) {
    const graphScalar = screenScalar * (zoom || 1)
    return isNaN(graphScalar) ? null : rounding === false ? graphScalar : round(graphScalar, rounding)
}


/**
 * @param {{ x: number, y: number }} graphPoint
 * @param {object} options
 * @param {{ x: number, y: number }} [options.translation]
 * @param {{ x: number, y: number }} [options.pan]
 * @param {number} [options.zoom]
 * @param {number | false} [options.rounding]
 */
export function convertToScreenPoint(graphPoint, { translation, zoom, pan, rounding = 1 } = {}) {
    const screenX = graphPoint?.x * (zoom || 1) + (translation?.x || 0) + (pan?.x || 0)
    const screenY = graphPoint?.y * (zoom || 1) + (translation?.y || 0) + (pan?.y || 0)

    return {
        x: isNaN(screenX) ? null : rounding === false ? screenX : round(screenX, rounding),
        y: isNaN(screenY) ? null : rounding === false ? screenY : round(screenY, rounding),
    }
}


/**
 * @param {number} graphScalar
 * @param {object} options
 * @param {number} [options.zoom]
 * @param {number | false} [options.rounding]
 */
export function convertToScreenScalar(graphScalar, { zoom, rounding = 1 } = {}) {
    const screenScalar = graphScalar / (zoom || 1)
    return isNaN(screenScalar) ? null : rounding === false ? screenScalar : round(screenScalar, rounding)
}


export function useConvertToGraphPoint({ includePan = true, includeTranslation = true, rounding = 1 } = {}) {
    const tx = useGraphStore(s => s.translation.x)
    const ty = useGraphStore(s => s.translation.y)
    const px = useGraphStore(s => s.pan.x)
    const py = useGraphStore(s => s.pan.y)
    const zoom = useGraphStore(s => s.zoom)

    return (screenPoint) => convertToGraphPoint(screenPoint, {
        translation: includeTranslation ?
            { x: tx.get(), y: ty.get() } :
            null,
        pan: includePan ?
            { x: px.get(), y: py.get() } :
            null,
        zoom: zoom.get(),
        rounding,
    })
}


export function useConvertToGraphScalar({ rounding = 1 } = {}) {
    const zoom = useGraphStore(s => s.zoom)

    return (screenScalar) => convertToGraphScalar(screenScalar, {
        zoom: zoom.get(),
        rounding,
    })
}


export function useConvertToScreenScalar({ rounding = 1 } = {}) {
    const zoom = useGraphStore(s => s.zoom)

    return (screenScalar) => convertToScreenScalar(screenScalar, {
        zoom: zoom.get(),
        rounding,
    })
}


export function useConvertToScreenPoint({ includePan = true, includeTranslation = true, rounding = 1 } = {}) {
    const tx = useGraphStore(s => s.translation.x)
    const ty = useGraphStore(s => s.translation.y)
    const px = useGraphStore(s => s.pan.x)
    const py = useGraphStore(s => s.pan.y)
    const zoom = useGraphStore(s => s.zoom)

    return (graphPoint) => convertToScreenPoint(graphPoint, {
        translation: includeTranslation ?
            { x: tx.get(), y: ty.get() } :
            null,
        pan: includePan ?
            { x: px.get(), y: py.get() } :
            null,
        zoom: zoom.get(),
        rounding,
    })
}


export function useGraphPoint(screenPoint, { includePan = true, includeTranslation = true, rounding = 1 } = {}) {

    const translation = includeTranslation ? {
        x: useMotionValueState(useGraphStore(s => s.translation.x)),
        y: useMotionValueState(useGraphStore(s => s.translation.y)),
    } : null

    const pan = includePan ? {
        x: useMotionValueState(useGraphStore(s => s.pan.x)),
        y: useMotionValueState(useGraphStore(s => s.pan.y)),
    } : null

    const zoom = useMotionValueState(useGraphStore(s => s.zoom))

    return useMemo(
        () => convertToGraphPoint(screenPoint, {
            translation,
            pan,
            zoom,
            rounding,
        }),
        [screenPoint?.x, screenPoint?.y, includePan, includeTranslation, rounding, translation?.x, translation?.y, pan?.x, pan?.y]
    )
}


export function useScreenPoint(graphPoint, { includePan = true, includeTranslation = true, rounding = 1 } = {}) {
    const translation = includeTranslation ? {
        x: useMotionValueState(useGraphStore(s => s.translation.x)),
        y: useMotionValueState(useGraphStore(s => s.translation.y)),
    } : null

    const pan = includePan ? {
        x: useMotionValueState(useGraphStore(s => s.pan.x)),
        y: useMotionValueState(useGraphStore(s => s.pan.y)),
    } : null

    const zoom = useMotionValueState(useGraphStore(s => s.zoom))

    return useMemo(
        () => convertToScreenPoint(graphPoint, {
            translation,
            pan,
            zoom,
            rounding,
        }),
        [graphPoint?.x, graphPoint?.y, includePan, includeTranslation, rounding, translation?.x, translation?.y, pan?.x, pan?.y]
    )
}


export const NodeContext = createContext()


export function useContextualNodeId() {
    return useContext(NodeContext)
}


export function useNode(nodeId = useContextualNodeId()) {
    return useGraphStore(s => s.node(nodeId))
}


/**
 * @param {string} property Uses lodash path syntax
 */
export function useNodePropertyValue(nodeId = useContextualNodeId(), property, selector = x => x) {
    return useGraphStore(s => selector(_.get(s.node(nodeId), property)))
}


/**
 * @param {string} property Uses lodash path syntax
 */
export function useSetNodeProperty(nodeId = useContextualNodeId(), property) {
    const set = useGraphSetState()

    return (value) => set(produce(s => {
        const node = s.nodes.find(n => n.id === nodeId)

        if (typeof value === "function")
            value = value(_.get(node, property), node)

        _.set(node, property, value)
    }))
}


/**
 * @param {string} property Uses lodash path syntax
 */
export function useNodeProperty(nodeId = useContextualNodeId(), property) {
    return [useNodePropertyValue(nodeId, property), useSetNodeProperty(nodeId, property)]
}


/**
 * @return {[boolean, (ev: MouseEvent) => void]}
 */
export function useNodeSelection(nodeId = useContextualNodeId()) {

    const select = useGraphStore(s => s.select)
    const deselect = useGraphStore(s => s.deselect)

    /** @type {boolean} */
    const isSelected = useGraphStore(s => s.selection.includes(nodeId))

    /** @type {(ev: MouseEvent) => void} */
    const handleClick = ev => {
        if (ev.shiftKey) {
            if (isSelected) deselect(nodeId)
            else select(nodeId, false)
        }
        else {
            select(nodeId)
        }
    }

    return [isSelected, handleClick]
}


export function validateConnection(fromId, toId, state) {
    if (!fromId || !toId)
        return false

    if (fromId === toId)
        return false

    const from = decodeHandleId(fromId)
    const to = decodeHandleId(toId)

    const hasBothInputAndOutput = from.type === "input" && to.type === "output" ||
        from.type === "output" && to.type === "input"
    if (!hasBothInputAndOutput)
        return false

    if (from.nodeId === to.nodeId)
        return false

    const [inputId, input] = from.type === "input" ? [fromId, from] : [toId, to]
    const [outputId, output] = from.type === "output" ? [fromId, from] : [toId, to]

    const inputHasSource = !!state.nodes.find(n => n.id === input.nodeId)
        .inputs.find(i => i.id === inputId).source
    if (inputHasSource)
        return false

    return {
        inputId,
        input,
        outputId,
        output,
    }
}


export function useValidateConnection() {
    const store = useContext(GraphContext)
    return (fromId, toId) => validateConnection(fromId, toId, store.getState())
}


export function useEndConnection() {
    const validateConnection = useValidateConnection()
    const setState = useGraphSetState()
    const connectingFrom = useGraphStore(s => s.connectingFrom)
    const connectingTo = useGraphStore(s => s.connectingTo)
    const isConnecting = connectingFrom != null

    return () => {
        if (!isConnecting) return

        const validation = validateConnection(connectingFrom, connectingTo)

        setState(produce(s => {
            if (validation) {
                s.nodes.find(node => node.id === validation.input.nodeId)
                    .inputs.find(input => input.id === validation.inputId).source = validation.outputId
            }

            s.connectingFrom = null
            s.connectingTo = null
        }))

        console.debug(validation ? "connected" : "cancelled connection")
    }
}


/**
 * @param {string} handleId
 * @return {{ type: "input" | "output", nodeId: string, id: string }} 
 */
export function decodeHandleId(handleId) {
    const [type, rest] = handleId.split(":")
    const [nodeId, id] = rest.split(".")
    return { type, nodeId, id }
}


export function isHandleInput(handleId) {
    return decodeHandleId(handleId).type === "input"
}


export function isHandleOutput(handleId) {
    return decodeHandleId(handleId).type === "output"
}


/** @typedef {import("framer-motion").MotionValue} MotionValue */

/** 
 * @typedef {object} GraphState 
 * @property {{ x: MotionValue, y: MotionValue }} translation
 * @property {boolean} panning
 * @property {{ x: MotionValue, y: MotionValue }} pan
 * @property {MotionValue} zoom
 * @property {Node[]} nodes
 * @property {(nodeId: string) => Node} node
 */


/**
 * @typedef {object} Node
 * @property {string} id
 * @property {MotionValue} x
 * @property {MotionValue} y
 * @property {string} type
 * @property {InputHandle[]} inputs
 * @property {OutputHandle[]} outputs
 */

/**
 * @typedef {object} InputHandle
 * @property {string} id
 * @property {string} type
 * @property {string} source
 */

/**
 * @typedef {object} OutputHandle
 * @property {string} id
 * @property {string} type
 */
