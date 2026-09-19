import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeInput,
    InlineFeedback,
    InlineFormula,
    InlineLinkedHighlight,
    InlineScrubbleNumber,
    InlineSpotColor,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring } from "@/lib/motion";
import {
    getVariableInfo,
    clozePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
    spotColorPropsFromDefinition,
} from "../variables";
import {
    ALL_CELLS,
    AMBER,
    CELL,
    DIE_FACES,
    GRID_SIZE,
    INDIGO,
    INK,
    INK_QUIET,
    INK_STRUCTURE,
    PAPER_FILL,
    ROSE,
    SKY,
    TEAL,
    VIEW_WIDTH,
    cellCentreX,
    cellCentreY,
    cellPair,
    cellX,
    cellY,
} from "./diceGridGeometry";

const VIEW_HEIGHT = 490;
const ORIGIN_X = 96;
const ORIGIN_Y = 72;
const PANEL_X = 400;

const PAD_WIDTH = 34;
const PAD_STEP = 40;
const PAD_START_X = 63;
const PAD_Y = 406;
const PAD_HEIGHT = 30;

const padX = (position: number) => PAD_START_X + position * PAD_STEP;
const padCentreX = (position: number) => padX(position) + PAD_WIDTH / 2;

/** How many of the 36 squares add up to a given total. */
const countForTotal = (total: number) => 6 - Math.abs(total - 7);

/** Every (teal, indigo) pair that reaches the total. */
const pairsForTotal = (total: number): Array<[number, number]> =>
    DIE_FACES.filter((a) => total - a >= 1 && total - a <= 6).map((a) => [a, total - a]);

function OrderMattersDrawing() {
    const setVar = useSetVar();
    const guess = useVar<number>("sevenGuess", 0);
    const revealed = useVar<boolean>("sevenRevealed", false);
    const target = useVar<number>("targetTotal", 7);
    const highlight = useVar<string>("mirrorHighlight", "");

    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const matches = pairsForTotal(target);
    const matchKeys = new Set(matches.map(([a, b]) => `${a}-${b}`));
    const count = countForTotal(target);

    const mirrorActive = highlight === "mirrorPair";
    const recede = mirrorActive ? 0.35 : 1;

    const handleCentre = useSpring(padCentreX(target - 2), { stiffness: 380, damping: 30 });

    const pointerToPad = (event: React.PointerEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        const position = clamp(Math.round((x - PAD_START_X - PAD_WIDTH / 2) / PAD_STEP), 0, 10);
        setVar("targetTotal", position + 2);
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A six by six grid of two-dice outcomes with the squares giving a chosen total highlighted"
        >
            <defs>
                <filter id="order-matters-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            <g opacity={recede} style={{ transition: "opacity 150ms ease-out" }}>
                {/* Axis titles and die faces */}
                <text x={ORIGIN_X + GRID_SIZE / 2} y={36} fill={INDIGO} fontSize="12" fontWeight={600} textAnchor="middle">
                    Indigo die
                </text>
                {DIE_FACES.map((face) => (
                    <text
                        key={`col-${face}`}
                        x={cellCentreX(face, ORIGIN_X)}
                        y={58}
                        fill={INK_STRUCTURE}
                        fontSize="13"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}
                <text
                    x={44}
                    y={ORIGIN_Y + GRID_SIZE / 2}
                    fill={TEAL}
                    fontSize="12"
                    fontWeight={600}
                    textAnchor="middle"
                    transform={`rotate(-90 44 ${ORIGIN_Y + GRID_SIZE / 2})`}
                >
                    Teal die
                </text>
                {DIE_FACES.map((face) => (
                    <text
                        key={`row-${face}`}
                        x={ORIGIN_X - 12}
                        y={cellCentreY(face, ORIGIN_Y) + 5}
                        fill={INK_STRUCTURE}
                        fontSize="13"
                        textAnchor="end"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}

                {/* The 36 squares */}
                {ALL_CELLS.map((index) => {
                    const [teal, indigo] = cellPair(index);
                    const isMatch = revealed && matchKeys.has(`${teal}-${indigo}`);
                    const isTwinless = isMatch && teal === indigo;
                    return (
                        <g key={index}>
                            <rect
                                x={cellX(indigo, ORIGIN_X)}
                                y={cellY(teal, ORIGIN_Y)}
                                width={CELL}
                                height={CELL}
                                fill={isMatch ? "rgba(248, 160, 205, 0.26)" : "#FFFFFF"}
                                stroke={isTwinless ? AMBER : isMatch ? ROSE : INK_QUIET}
                                strokeWidth={isMatch ? 3 : 1.5}
                                style={{ transition: "fill 150ms ease-out" }}
                            />
                            <text
                                x={cellCentreX(indigo, ORIGIN_X)}
                                y={cellCentreY(teal, ORIGIN_Y) + 5}
                                fill={isMatch ? INK : INK_QUIET}
                                fontSize="13"
                                fontWeight={isMatch ? 700 : 400}
                                textAnchor="middle"
                                style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                                {teal + indigo}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* Mirror links — (a,b) joined to (b,a) */}
            {revealed &&
                matches
                    .filter(([a, b]) => a < b)
                    .map(([a, b]) => (
                        <g key={`mirror-${a}-${b}`}>
                            {mirrorActive && (
                                <line
                                    x1={cellCentreX(b, ORIGIN_X)}
                                    y1={cellCentreY(a, ORIGIN_Y)}
                                    x2={cellCentreX(a, ORIGIN_X)}
                                    y2={cellCentreY(b, ORIGIN_Y)}
                                    stroke={SKY}
                                    strokeWidth="9"
                                    opacity={0.28}
                                    strokeLinecap="round"
                                />
                            )}
                            <line
                                x1={cellCentreX(b, ORIGIN_X)}
                                y1={cellCentreY(a, ORIGIN_Y)}
                                x2={cellCentreX(a, ORIGIN_X)}
                                y2={cellCentreY(b, ORIGIN_Y)}
                                stroke={SKY}
                                strokeWidth={mirrorActive ? 4 : 2}
                                strokeLinecap="round"
                                style={{ transition: "stroke-width 150ms ease-out" }}
                                onPointerEnter={() => setVar("mirrorHighlight", "mirrorPair")}
                                onPointerLeave={() => setVar("mirrorHighlight", "")}
                            />
                        </g>
                    ))}

            {/* Readout panel beside the grid */}
            <g opacity={recede} style={{ transition: "opacity 150ms ease-out" }} fontSize="12">
                <text x={PANEL_X} y={110} fill={INK_STRUCTURE}>Squares giving</text>
                <text x={PANEL_X} y={128} fill={INK_STRUCTURE} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {`a total of ${target}`}
                </text>
                <text x={PANEL_X} y={166} fill={ROSE} fontSize="26" fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {revealed ? count : "?"}
                </text>
                {revealed && guess > 0 && (
                    <>
                        <text x={PANEL_X} y={214} fill={INK_STRUCTURE}>You predicted</text>
                        <text x={PANEL_X} y={244} fill={AMBER} fontSize="20" fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                            {guess}
                        </text>
                    </>
                )}
            </g>

            {/* Prompt above the strip */}
            <text x={280} y={386} fill={INK} fontSize="13" textAnchor="middle">
                {revealed
                    ? "Drag the handle to change the total"
                    : "How many of the 36 squares give a total of 7?"}
            </text>

            {/* The strip: prediction pads before the reveal, totals afterwards */}
            {Array.from({ length: 11 }, (_, position) => {
                const value = revealed ? position + 2 : position + 1;
                const selected = revealed ? value === target : value === guess;
                return (
                    <g key={`pad-${position}`} style={{ cursor: "pointer" }}>
                        <rect
                            x={padX(position)}
                            y={PAD_Y}
                            width={PAD_WIDTH}
                            height={PAD_HEIGHT}
                            rx="6"
                            fill={selected ? "rgba(248, 160, 205, 0.22)" : PAPER_FILL}
                            stroke={selected ? ROSE : INK_QUIET}
                            strokeWidth={selected ? 2.5 : 1.5}
                        />
                        <text
                            x={padCentreX(position)}
                            y={PAD_Y + 20}
                            fill={selected ? INK : INK_STRUCTURE}
                            fontSize="13"
                            fontWeight={selected ? 700 : 400}
                            textAnchor="middle"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                            {value}
                        </text>
                    </g>
                );
            })}

            {/* Draggable handle over the totals strip */}
            {revealed && (
                <circle
                    cx={handleCentre}
                    cy={PAD_Y + PAD_HEIGHT + 16}
                    r="9"
                    fill={ROSE}
                    filter="url(#order-matters-handle-shadow)"
                />
            )}

            {/* Interaction surface over the strip */}
            <rect
                x={PAD_START_X - 6}
                y={PAD_Y - 8}
                width={PAD_STEP * 10 + PAD_WIDTH + 12}
                height={PAD_HEIGHT + 40}
                fill="transparent"
                style={{ cursor: revealed ? (dragging ? "grabbing" : "grab") : "pointer", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const svg = svgRef.current;
                    if (!svg) return;
                    const rect = svg.getBoundingClientRect();
                    const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
                    const position = clamp(Math.round((x - PAD_START_X - PAD_WIDTH / 2) / PAD_STEP), 0, 10);
                    if (!revealed) {
                        setVar("sevenGuess", position + 1);
                        setVar("targetTotal", 7);
                        setVar("sevenRevealed", true);
                        return;
                    }
                    setDragging(true);
                    setVar("targetTotal", position + 2);
                }}
                onPointerMove={(event) => {
                    if (dragging && revealed) pointerToPad(event);
                }}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
            />
        </svg>
    );
}

function OrderMattersFigure() {
    const setVar = useSetVar();
    const revealed = useVar<boolean>("sevenRevealed", false);
    return (
        <Figure
            id="order-matters-sevens"
            onReset={() => {
                setVar("sevenGuess", 0);
                setVar("sevenRevealed", false);
                setVar("targetTotal", 7);
                setVar("mirrorHighlight", "");
            }}
            caption="Commit to a number first. Once you do, the squares that reach the total light up and each pair is joined to its mirror image."
        >
            <OrderMattersDrawing />
            <InteractionHintSequence
                hintKey="order-matters-strip"
                currentStep={revealed ? 1 : 0}
                steps={[
                    {
                        gesture: "click",
                        label: "Click the number you think is right",
                        position: { x: "50%", y: "86%" },
                    },
                    {
                        gesture: "drag-horizontal",
                        label: "Drag the handle to another total",
                        position: { x: "50%", y: "92%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -30, y: 0 },
                            endOffset: { x: 30, y: 0 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

export const orderMattersBlocks: ReactElement[] = [
    <StackLayout key="layout-order-matters-heading" maxWidth="xl">
        <Block id="order-matters-heading" padding="md">
            <EditableH2 id="h2-order-matters-heading" blockId="order-matters-heading">
                (2,5) and (5,2) Are Different Rolls
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-order-matters-setup" maxWidth="xl">
        <Block id="order-matters-setup" padding="sm">
            <EditableParagraph id="para-order-matters-setup" blockId="order-matters-setup">
                Here is where almost everyone slips. Ask how many ways two dice make 7 and
                the quick answer is three: 1 and 6, 2 and 5, 3 and 4. Commit to a number in
                the grid below before it shows you the squares.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-order-matters-figure" maxWidth="xl">
        <Block id="order-matters-figure" padding="sm" hasVisualization>
            <OrderMattersFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-order-matters-reflect" maxWidth="xl">
        <Block id="order-matters-reflect" padding="sm">
            <EditableParagraph id="para-order-matters-reflect" blockId="order-matters-reflect">
                Six squares, not three. The dice are separate objects, so{" "}
                <InlineSpotColor id="spot-order-matters-teal-two" varName="tealDie" {...spotColorPropsFromDefinition(getVariableInfo('tealDie'))}>
                    teal 2
                </InlineSpotColor>{" "}
                with{" "}
                <InlineSpotColor id="spot-order-matters-indigo-five" varName="indigoDie" {...spotColorPropsFromDefinition(getVariableInfo('indigoDie'))}>
                    indigo 5
                </InlineSpotColor>{" "}
                is a different roll from{" "}
                <InlineSpotColor id="spot-order-matters-teal-five" varName="tealDie" {...spotColorPropsFromDefinition(getVariableInfo('tealDie'))}>
                    teal 5
                </InlineSpotColor>{" "}
                with{" "}
                <InlineSpotColor id="spot-order-matters-indigo-two" varName="indigoDie" {...spotColorPropsFromDefinition(getVariableInfo('indigoDie'))}>
                    indigo 2
                </InlineSpotColor>
                , and the grid keeps those{" "}
                <InlineLinkedHighlight
                    id="link-order-matters-mirror"
                    varName="mirrorHighlight"
                    highlightId="mirrorPair"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('mirrorHighlight'))}
                >
                    mirror pairs
                </InlineLinkedHighlight>{" "}
                apart. A total of{" "}
                <InlineScrubbleNumber
                    varName="targetTotal"
                    {...numberPropsFromDefinition(getVariableInfo('targetTotal'))}
                />{" "}
                sits in the fattest part of the grid, and every total either side of it has
                fewer squares to live in.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-order-matters-question-nine" maxWidth="xl">
        <Block id="order-matters-question-nine" padding="sm">
            <EditableParagraph id="para-order-matters-question-nine" blockId="order-matters-question-nine">
                Without touching the grid, a total of 9 lands in{" "}
                <InlineFeedback
                    varName="answerTotalNineCount"
                    correctValue="4"
                    position="mid"
                    failureMessage="✗"
                    hint="If you said 2, you counted 3 with 6 and 4 with 5 but forgot each one comes both ways round"
                    visualizationHint={{
                        blockId: "order-matters-figure",
                        hintKey: "feedback-order-matters-nine",
                        steps: [
                            {
                                gesture: "drag-horizontal",
                                label: "Drag the handle up to a total of 9 and count the lit squares",
                                position: { x: "62%", y: "92%" },
                                dragPath: { type: "line", startOffset: { x: -20, y: 0 }, endOffset: { x: 24, y: 0 } },
                                completionVar: "targetTotal",
                                completionValue: 9,
                                completionTolerance: 0,
                            },
                        ],
                        label: "Discover it yourself",
                        resetVars: { targetTotal: 7 },
                    }}
                >
                    <InlineClozeInput
                        varName="answerTotalNineCount"
                        correctAnswer="4"
                        {...clozePropsFromDefinition(getVariableInfo('answerTotalNineCount'))}
                    />
                </InlineFeedback>{" "}
                of the 36 squares.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-order-matters-question-five" maxWidth="xl">
        <Block id="order-matters-question-five" padding="sm">
            <EditableParagraph id="para-order-matters-question-five" blockId="order-matters-question-five">
                Counting the same way,{" "}
                <InlineFormula
                    id="formula-order-matters-total-five"
                    latex="P(\clr{total}{\text{total of 5}}) ="
                    colorMap={{ total: "#F8A0CD" }}
                />{" "}
                <InlineFeedback
                    varName="answerTotalFiveProbability"
                    correctValue={["4/36", "1/9"]}
                    position="terminal"
                    successMessage="— yes, four squares out of 36, which tidies up to 1/9"
                    failureMessage="— almost."
                    hint="List the pairs both ways round, then put that count over 36"
                    reviewBlockId="order-matters-reflect"
                    reviewLabel="Review mirror pairs"
                >
                    <InlineClozeInput
                        varName="answerTotalFiveProbability"
                        correctAnswer={["4/36", "1/9"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerTotalFiveProbability'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
