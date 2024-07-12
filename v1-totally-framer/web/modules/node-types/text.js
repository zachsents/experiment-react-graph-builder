import { TbReplace, TbTemplate, TbTextPlus } from "react-icons/tb"
import { createInput, createNodeType, createOutput } from "."

export default [
    createNodeType("text.template", {
        name: "Template",
        description: "A template node.",
        icon: TbReplace,
        tags: ["Text"],

        inputs: [
            createInput("template", {
                name: "Template",
                description: "The template to insert values into. Use {SubstitutionName} to insert a value.",
                icon: TbTemplate,
                defaultMode: "config",
                allowedModes: ["config", "handle"],
            }),
            createInput("substitution", {
                name: "Substitution",
                icon: TbTemplate,
                defaultMode: "config",
                allowedModes: ["config", "handle"],

                description: "The template to insert values into. Use {SubstitutionName} to insert a value.",
                renderDescription: ({ input }) => `This is the value that will replace {${input.name}} in the template.`,

                groupName: "Substitutions",
                groupMin: 2,

                nameEditable: true,
            }),
        ],

        outputs: [
            createOutput("result", {
                name: "Result",
                description: "The result of the template with all substitutions inserted.",
                icon: TbTextPlus,
            })
        ],
    }),
]