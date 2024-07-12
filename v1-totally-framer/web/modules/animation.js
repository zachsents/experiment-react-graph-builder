import { useMotionValue } from "framer-motion"
import { useEffect, useMemo, useState } from "react"
import { debounceTime, fromEventPattern } from "rxjs"


export const TRANSLATION_SPRING = { damping: 100, stiffness: 1500 }


export function useSyncedMotionValue(value) {
    const motionValue = useMotionValue(value)

    useEffect(() => {
        motionValue.set(value)
    }, [value])

    return motionValue
}


/**
 * @export
 * @param {import("framer-motion").MotionValue} motionValue
 * @param {object} [options]
 * @param {number} [options.debounce]
 */
export function useMotionValueState(motionValue, {
    debounce,
} = {}) {

    const [value, setValue] = useState(motionValue.get())

    const motionValue$ = useMemo(
        () => fromEventPattern(
            handler => motionValue.on("change", handler),
            (_, unsub) => unsub(),
        ).pipe(
            debounce ? debounceTime(debounce) : x => x,
        ),
        [motionValue, debounce]
    )

    useEffect(() => {
        const sub = motionValue$.subscribe(([val]) => setValue(val))
        return sub.unsubscribe.bind(sub)
    }, [motionValue$])

    return value
}


