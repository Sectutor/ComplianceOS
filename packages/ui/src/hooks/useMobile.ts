import { useEffect, useState } from "react"

export function useIsMobile() {
    const [isMobile, setIsMobile] = useState<boolean>(() => 
        typeof window !== "undefined" ? window.innerWidth < 768 : false
    )

    useEffect(() => {
        const mql = window.matchMedia("(max-width: 768px)")
        const onChange = () => {
            setIsMobile(window.innerWidth < 768)
        }
        mql.addEventListener("change", onChange)
        return () => mql.removeEventListener("change", onChange)
    }, [])

    return isMobile
}
