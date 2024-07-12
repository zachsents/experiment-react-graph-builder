import { TbNumbers, TbTextSize } from "react-icons/tb"
import { createNodeType } from "."


export default [
    createNodeType("basic.text", {
        name: "Text",
        description: "A simple text node.",
        icon: TbTextSize,
    }),
    createNodeType("basic.number", {
        name: "Number",
        description: "A simple number node.",
        icon: TbNumbers,
    })
]