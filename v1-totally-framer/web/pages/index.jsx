import GraphContainer from "@web/components/graph/GraphContainer"


export default function IndexPage() {


    return (
        <div className="w-screen h-screen flex flex-col items-stretch">
            {/* <Header fixed={false} /> */}
            <GraphContainer className="flex-1" />
        </div>
    )
}
