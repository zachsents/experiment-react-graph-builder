import { useState } from "react"


export default function ForeignObject({ children, ...props }) {

    const [width, setWidth] = useState()
    const [height, setHeight] = useState()

    return (
        <foreignObject width={width || 0} height={height || 0} {...props}>
            <div ref={el => {
                if (!el) return
                setWidth(el.scrollWidth)
                setHeight(el.scrollHeight)
            }}>
                {children}
            </div>
        </foreignObject>
    )
}
