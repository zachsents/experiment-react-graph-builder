import _ from "lodash"
import BasicNodeTypes from "./basics.js"
import TextNodeTypes from "./text.js"


const NodeTypes = [
    ...BasicNodeTypes,
    ...TextNodeTypes,
]

const NodeTypesExport = {
    object: _.keyBy(NodeTypes, "id"),
    array: NodeTypes,
}

export default NodeTypesExport


/**
 * @param {string} typeId
 * @param {Omit<NodeType, "id">} properties
 * @return {NodeType} 
 */
export function createNodeType(typeId, properties) {
    // TO DO: use joi or similar to explicitly validate properties
    return {
        id: typeId,
        ...properties,
    }
}


/**
 * @param {string} inputId
 * @param {Omit<NodeTypeInput, "id">} properties
 * @return {NodeTypeInput}
 */
export function createInput(inputId, properties) {
    // TO DO: use joi or similar to explicitly validate properties
    return {
        id: inputId,
        ...properties,
    }
}


/**
 * @param {string} outputId
 * @param {Omit<NodeTypeOutput, "id">} properties
 * @return {NodeTypeOutput}
 */
export function createOutput(outputId, properties) {
    // TO DO: use joi or similar to explicitly validate properties
    return {
        id: outputId,
        ...properties,
    }
}


/**
 * @param {string | { type: string }} nodeArg
 * @return {NodeType}
 */
export function getNodeType(arg) {
    if (typeof arg === "string")
        return NodeTypesExport.object[arg]

    if (typeof arg === "object" && "type" in arg)
        return NodeTypesExport.object[arg.type]
}


/**
 * @param {string | { type: string }} nodeArg
 * @param {string | { type: string }} inputArg
 * @return {NodeTypeInput}
 */
export function getNodeTypeInput(nodeArg, inputArg) {
    const nodeType = getNodeType(nodeArg)

    if (typeof inputArg === "string")
        return nodeType?.inputs.find(i => i.id === inputArg)

    if (typeof inputArg === "object" && "type" in inputArg)
        return nodeType?.inputs.find(i => i.id === inputArg.type)
}


/**
 * @param {string | { type: string }} nodeArg
 * @param {string | { type: string }} outputArg
 * @return {NodeTypeInput}
 */
export function getNodeTypeOutput(nodeArg, outputArg) {
    const nodeType = getNodeType(nodeArg)

    if (typeof outputArg === "string")
        return nodeType?.outputs.find(o => o.id === outputArg)

    if (typeof outputArg === "object" && "type" in outputArg)
        return nodeType?.outputs.find(o => o.id === outputArg.type)
}


/**
 * @typedef {object} NodeType
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {Function} icon
 * @property {string[]} tags
 * 
 * @property {NodeTypeInput[]} inputs
 * @property {NodeTypeOutput[]} outputs
 */


/**
 * @typedef {object} NodeTypeInput
 * @property {string} id
 * @property {string} name
 * @property {Function} icon
 * 
 * @property {string} description
 * @property {Function} renderDescription
 * 
 * @property {InputMode} defaultMode
 * @property {InputMode[]} allowedModes
 * 
 * @property {Function} renderConfiguration
 * @property {Function} validateConfiguration
 * @property {Function} deriveInputs
 * 
 * @property {string} groupName
 * @property {number} groupMin
 * @property {number} groupMax
 * 
 * @property {boolean} nameEditable
 */


/**
 * @typedef {object} NodeTypeOutput
 * @property {string} id
 * @property {string} name
 * @property {Function} icon
 * 
 * @property {string} description
 * @property {Function} renderDescription
 * 
 * @property {string} groupName
 * @property {number} groupMin
 * @property {number} groupMax
 * 
 * @property {boolean} nameEditable
 */


/** @typedef {"config" | "handle"} InputMode */