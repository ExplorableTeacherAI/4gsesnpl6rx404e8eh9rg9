import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH2, EditableParagraph, InlineSpotColor, InlineTooltip } from "@/components/atoms";
import { getVariableInfo, spotColorPropsFromDefinition } from "../variables";

export const probabilityConclusionBlocks: ReactElement[] = [
    <StackLayout key="layout-probability-wrap-heading" maxWidth="xl">
        <Block id="probability-wrap-heading" padding="md">
            <EditableH2 id="h2-probability-wrap-heading" blockId="probability-wrap-heading">
                Wrapping Up
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-probability-wrap-summary" maxWidth="xl">
        <Block id="probability-wrap-summary" padding="sm">
            <EditableParagraph id="para-probability-wrap-summary" blockId="probability-wrap-summary">
                A two dice question was never really about dice. It is 36 equally likely
                squares, and every question you can ask,{" "}
                <InlineSpotColor id="spot-probability-wrap-total-seven" varName="targetTotal" {...spotColorPropsFromDefinition(getVariableInfo('targetTotal'))}>
                    a total of 7
                </InlineSpotColor>
                , at least one 6, a{" "}
                <InlineTooltip
                    id="tooltip-probability-wrap-double"
                    tooltip="A roll where both dice show the same number, like 3 and 3."
                    color="#2563EB"
                    bgColor="rgba(37, 99, 235, 0.12)"
                >
                    double
                </InlineTooltip>
                , is simply a count of the squares that fit, written over 36. Keep the
                two dice separate and the grid handles the rest.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-probability-wrap-next" maxWidth="xl">
        <Block id="probability-wrap-next" padding="sm">
            <EditableParagraph id="para-probability-wrap-next" blockId="probability-wrap-next">
                The same grid works for a coin and a spinner, or a spinner and a die,
                whenever an experiment has two stages you can lay out on a page. Next comes
                the tree diagram, which takes over when the second stage depends on the
                first, like drawing two counters from a bag without putting the first one
                back.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
