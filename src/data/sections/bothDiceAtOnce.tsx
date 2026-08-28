import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeInput,
    InlineFeedback,
    InlineLinkedHighlight,
    InlineScrubbleNumber,
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
} from "../variables";
import {
    AMBER,
    CELL,
    DIE_FACES,
    GRID_SIZE,
    INDIGO,
    INK,
    INK_QUIET,
    INK_STRUCTURE,
    TEAL,
    VIEW_WIDTH,
    cellCentreX,
    cellCentreY,
    cellX,
    cellY,
} from "./diceGridGeometry";

const VIEW_HEIGHT = 440;
const ORIGIN_X = 110;
const ORIGIN_Y = 110;
const PANEL_X = 410;

const ROW_HANDLE_X = ORIGIN_X - 26; // 84
const COLUMN_HANDLE_Y = ORIGIN_Y - 26; // 84
const HANDLE_RADIUS = 14;

function BothDiceDrawing() {
    const setVar = useSetVar();
    const tealFace = useVar<number>("bothTealFace", 3);
    const indigoFace = useVar<number>("bothIndigoFace", 5);
    const highlight = useVar<string>("bothHighlight", "");

    const [dragging, setDragging] = useState<null | "row" | "column">(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const rowActive = highlight === "tealRow";
    const columnActive = highlight === "indigoColumn";
    const squareActive = highlight === "bothSquare";
    const dim = (id: string) => (highlight && highlight !== id ? 0.35 : 1);

    const rowCentre = useSpring(cellCentreY(tealFace, ORIGIN_Y), { stiffness: 380, damping: 30 });
    const columnCentre = useSpring(cellCentreX(indigoFace, ORIGIN_X), { stiffness: 380, damping: 30 });

    const svgPoint = (event: React.PointerEvent) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH,
            y: ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT,
        };
    };

    const setRowFrom = (event: React.PointerEvent) => {
        const point = svgPoint(event);
        if (!point) return;
        setVar("bothTealFace", clamp(Math.floor((point.y - ORIGIN_Y) / CELL) + 1, 1, 6));
    };

    const setColumnFrom = (event: React.PointerEvent) => {
        const point = svgPoint(event);
        if (!point) return;
        setVar("bothIndigoFace", clamp(Math.floor((point.x - ORIGIN_X) / CELL) + 1, 1, 6));
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A six by six grid where a draggable teal marker picks a row and a draggable indigo marker picks a column"
        >
            <defs>
                <filter id="both-dice-handle-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Axis titles */}
            <g opacity={highlight ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={ORIGIN_X + GRID_SIZE / 2} y={58} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                    Indigo die
                </text>
                <text
                    x={40}
                    y={ORIGIN_Y + GRID_SIZE / 2}
                    fill={INK_STRUCTURE}
                    fontSize="12"
                    textAnchor="middle"
                    transform={`rotate(-90 40 ${ORIGIN_Y + GRID_SIZE / 2})`}
                >
                    Teal die
                </text>
            </g>

            {/* The 36 outcomes — one quiet dot each */}
            <g opacity={highlight ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {DIE_FACES.map((row) =>
                    DIE_FACES.map((column) => (
                        <g key={`cell-${row}-${column}`}>
                            <rect
                                x={cellX(column, ORIGIN_X)}
                                y={cellY(row, ORIGIN_Y)}
                                width={CELL}
                                height={CELL}
                                fill="#FFFFFF"
                                stroke={INK_QUIET}
                                strokeWidth="1.5"
                            />
                            <circle
                                cx={cellCentreX(column, ORIGIN_X)}
                                cy={cellCentreY(row, ORIGIN_Y)}
                                r="2"
                                fill={INK_QUIET}
                            />
                        </g>
                    )),
                )}
            </g>

            {/* The teal band: every roll where the teal die shows the chosen face */}
            <g opacity={dim("tealRow")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {rowActive && (
                    <rect
                        x={ORIGIN_X - 3}
                        y={rowCentre - CELL / 2 - 3}
                        width={GRID_SIZE + 6}
                        height={CELL + 6}
                        fill="none"
                        stroke={TEAL}
                        strokeWidth="9"
                        opacity={0.28}
                        rx="8"
                    />
                )}
                <rect
                    x={ORIGIN_X}
                    y={rowCentre - CELL / 2}
                    width={GRID_SIZE}
                    height={CELL}
                    fill={rowActive ? "rgba(98, 208, 173, 0.35)" : "rgba(98, 208, 173, 0.15)"}
                    stroke={TEAL}
                    strokeWidth={rowActive ? 4 : 2.5}
                    rx="6"
                    style={{ transition: "fill 150ms ease-out, stroke-width 150ms ease-out" }}
                />
            </g>

            {/* The indigo band: every roll where the indigo die shows the chosen face */}
            <g opacity={dim("indigoColumn")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {columnActive && (
                    <rect
                        x={columnCentre - CELL / 2 - 3}
                        y={ORIGIN_Y - 3}
                        width={CELL + 6}
                        height={GRID_SIZE + 6}
                        fill="none"
                        stroke={INDIGO}
                        strokeWidth="9"
                        opacity={0.28}
                        rx="8"
                    />
                )}
                <rect
                    x={columnCentre - CELL / 2}
                    y={ORIGIN_Y}
                    width={CELL}
                    height={GRID_SIZE}
                    fill={columnActive ? "rgba(142, 144, 245, 0.35)" : "rgba(142, 144, 245, 0.15)"}
                    stroke={INDIGO}
                    strokeWidth={columnActive ? 4 : 2.5}
                    rx="6"
                    style={{ transition: "fill 150ms ease-out, stroke-width 150ms ease-out" }}
                />
            </g>

            {/* The one square that satisfies both */}
            <g opacity={dim("bothSquare")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {squareActive && (
                    <rect
                        x={columnCentre - CELL / 2 - 4}
                        y={rowCentre - CELL / 2 - 4}
                        width={CELL + 8}
                        height={CELL + 8}
                        fill="none"
                        stroke={AMBER}
                        strokeWidth="9"
                        opacity={0.28}
                        rx="9"
                    />
                )}
                <rect
                    x={columnCentre - CELL / 2}
                    y={rowCentre - CELL / 2}
                    width={CELL}
                    height={CELL}
                    fill="rgba(247, 178, 59, 0.3)"
                    stroke={AMBER}
                    strokeWidth={squareActive ? 5 : 3}
                    rx="6"
                    style={{ transition: "stroke-width 150ms ease-out" }}
                />
                <text
                    x={columnCentre}
                    y={rowCentre + 5}
                    fill={INK}
                    fontSize="13"
                    fontWeight={700}
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`${tealFace},${indigoFace}`}
                </text>
            </g>

            {/* Draggable face markers on the two edges */}
            <g opacity={dim("tealRow")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {DIE_FACES.filter((face) => face !== tealFace).map((face) => (
                    <text
                        key={`row-label-${face}`}
                        x={ROW_HANDLE_X}
                        y={cellCentreY(face, ORIGIN_Y) + 5}
                        fill={INK_STRUCTURE}
                        fontSize="13"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}
                <circle
                    cx={ROW_HANDLE_X}
                    cy={rowCentre}
                    r={HANDLE_RADIUS}
                    fill={TEAL}
                    filter="url(#both-dice-handle-shadow)"
                />
                <text
                    x={ROW_HANDLE_X}
                    y={rowCentre + 5}
                    fill="#FFFFFF"
                    fontSize="13"
                    fontWeight={700}
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {tealFace}
                </text>
            </g>

            <g opacity={dim("indigoColumn")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {DIE_FACES.filter((face) => face !== indigoFace).map((face) => (
                    <text
                        key={`column-label-${face}`}
                        x={cellCentreX(face, ORIGIN_X)}
                        y={COLUMN_HANDLE_Y + 5}
                        fill={INK_STRUCTURE}
                        fontSize="13"
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}
                <circle
                    cx={columnCentre}
                    cy={COLUMN_HANDLE_Y}
                    r={HANDLE_RADIUS}
                    fill={INDIGO}
                    filter="url(#both-dice-handle-shadow)"
                />
                <text
                    x={columnCentre}
                    y={COLUMN_HANDLE_Y + 5}
                    fill="#FFFFFF"
                    fontSize="13"
                    fontWeight={700}
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {indigoFace}
                </text>
            </g>

            {/* Readout panel beside the drawing */}
            <g opacity={highlight ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }} fontSize="12">
                <text x={PANEL_X} y={150} fill={INK_STRUCTURE}>Teal die alone</text>
                <text x={PANEL_X} y={172} fill={TEAL} fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                    1 of 6 rows
                </text>
                <text x={PANEL_X} y={216} fill={INK_STRUCTURE}>Indigo die alone</text>
                <text x={PANEL_X} y={238} fill={INDIGO} fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                    1 of 6 columns
                </text>
                <text x={PANEL_X} y={286} fill={INK_STRUCTURE}>Both together</text>
                <text x={PANEL_X} y={316} fill={AMBER} fontSize="20" fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                    1 of 36
                </text>
                <text x={PANEL_X} y={342} fill={INK_STRUCTURE} fontSize="13" style={{ fontVariantNumeric: "tabular-nums" }}>
                    1/6 of 1/6
                </text>
            </g>

            <text x={280} y={410} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                Drag either marker to change which faces are required
            </text>

            {/* Drag strip for the teal face */}
            <rect
                x={ORIGIN_X - 44}
                y={ORIGIN_Y}
                width={36}
                height={GRID_SIZE}
                fill="transparent"
                style={{ cursor: dragging === "row" ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging("row");
                    setVar("bothHighlight", "");
                    setRowFrom(event);
                }}
                onPointerMove={(event) => {
                    if (dragging === "row") setRowFrom(event);
                }}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onPointerEnter={() => {
                    if (!dragging) setVar("bothHighlight", "tealRow");
                }}
                onPointerLeave={() => setVar("bothHighlight", "")}
            />

            {/* Drag strip for the indigo face */}
            <rect
                x={ORIGIN_X}
                y={ORIGIN_Y - 44}
                width={GRID_SIZE}
                height={36}
                fill="transparent"
                style={{ cursor: dragging === "column" ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging("column");
                    setVar("bothHighlight", "");
                    setColumnFrom(event);
                }}
                onPointerMove={(event) => {
                    if (dragging === "column") setColumnFrom(event);
                }}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onPointerEnter={() => {
                    if (!dragging) setVar("bothHighlight", "indigoColumn");
                }}
                onPointerLeave={() => setVar("bothHighlight", "")}
            />

            {/* Clicking straight into the grid sets both faces at once */}
            <rect
                x={ORIGIN_X}
                y={ORIGIN_Y}
                width={GRID_SIZE}
                height={GRID_SIZE}
                fill="transparent"
                style={{ cursor: "pointer", touchAction: "none" }}
                onPointerDown={(event) => {
                    setVar("bothHighlight", "");
                    setRowFrom(event);
                    setColumnFrom(event);
                }}
                onPointerMove={(event) => {
                    const point = svgPoint(event);
                    if (!point) return;
                    const overSquare =
                        clamp(Math.floor((point.y - ORIGIN_Y) / CELL) + 1, 1, 6) === tealFace &&
                        clamp(Math.floor((point.x - ORIGIN_X) / CELL) + 1, 1, 6) === indigoFace;
                    if (overSquare && highlight !== "bothSquare") setVar("bothHighlight", "bothSquare");
                    if (!overSquare && highlight === "bothSquare") setVar("bothHighlight", "");
                }}
                onPointerLeave={() => {
                    if (highlight === "bothSquare") setVar("bothHighlight", "");
                }}
            />
        </svg>
    );
}

function BothDiceFigure() {
    const setVar = useSetVar();
    const tealFace = useVar<number>("bothTealFace", 3);
    return (
        <Figure
            id="both-dice-one-square"
            onReset={() => {
                setVar("bothTealFace", 3);
                setVar("bothIndigoFace", 5);
                setVar("bothHighlight", "");
            }}
            caption="The teal band holds every roll where the teal die obliges, the indigo band does the same for the indigo die, and they cross in exactly one square."
        >
            <BothDiceDrawing />
            <InteractionHintSequence
                hintKey="both-dice-handles"
                currentStep={tealFace === 3 ? 0 : 1}
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag the teal marker to another row",
                        position: { x: "15%", y: "51%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: -22 }, endOffset: { x: 0, y: 22 } },
                    },
                    {
                        gesture: "drag-horizontal",
                        label: "Now drag the indigo marker across",
                        position: { x: "57%", y: "19%" },
                        dragPath: { type: "line", startOffset: { x: -24, y: 0 }, endOffset: { x: 24, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

export const bothDiceAtOnceBlocks: ReactElement[] = [
    <StackLayout key="layout-both-dice-heading" maxWidth="xl">
        <Block id="both-dice-heading" padding="md">
            <EditableH2 id="h2-both-dice-heading" blockId="both-dice-heading">
                Both Dice at Once
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-setup" maxWidth="xl">
        <Block id="both-dice-setup" padding="sm">
            <EditableParagraph id="para-both-dice-setup" blockId="both-dice-setup">
                Landing on at least one 6 took eleven squares. Demanding that both dice show
                a 6 is a far thinner ask. Drag the teal marker down the side of the grid and
                the indigo marker across the top, and watch how many squares survive both
                demands at once.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-figure" maxWidth="xl">
        <Block id="both-dice-figure" padding="sm" hasVisualization>
            <BothDiceFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-reflect" maxWidth="xl">
        <Block id="both-dice-reflect" padding="sm">
            <EditableParagraph id="para-both-dice-reflect" blockId="both-dice-reflect">
                Always one. Asking for teal{" "}
                <InlineScrubbleNumber
                    varName="bothTealFace"
                    {...numberPropsFromDefinition(getVariableInfo('bothTealFace'))}
                />{" "}
                cuts the grid down to{" "}
                <InlineLinkedHighlight
                    id="link-both-dice-row"
                    varName="bothHighlight"
                    highlightId="tealRow"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('bothHighlight'))}
                    color="#62D0AD"
                    bgColor="rgba(98, 208, 173, 0.2)"
                >
                    a single row
                </InlineLinkedHighlight>
                , one sixth of everything; asking for indigo{" "}
                <InlineScrubbleNumber
                    varName="bothIndigoFace"
                    {...numberPropsFromDefinition(getVariableInfo('bothIndigoFace'))}
                />{" "}
                leaves{" "}
                <InlineLinkedHighlight
                    id="link-both-dice-square"
                    varName="bothHighlight"
                    highlightId="bothSquare"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('bothHighlight'))}
                >
                    just one square
                </InlineLinkedHighlight>{" "}
                of that row. One sixth of one sixth is 1/36, whichever pair you pick.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-question-double-six" maxWidth="xl">
        <Block id="both-dice-question-double-six" padding="sm">
            <EditableParagraph id="para-both-dice-question-double-six" blockId="both-dice-question-double-six">
                So for the roll every board game player waits for, P(both dice show a 6) ={" "}
                <InlineFeedback
                    varName="answerDoubleSix"
                    correctValue="1/36"
                    position="terminal"
                    successMessage="— exactly, the double six is a single square in the whole grid"
                    failureMessage="— not quite."
                    hint="Count the squares where the teal band and the indigo band cross"
                    visualizationHint={{
                        blockId: "both-dice-figure",
                        hintKey: "feedback-both-dice-double-six",
                        steps: [
                            {
                                gesture: "drag-vertical",
                                label: "Drag the teal marker all the way down to 6",
                                position: { x: "15%", y: "51%" },
                                dragPath: { type: "line", startOffset: { x: 0, y: -20 }, endOffset: { x: 0, y: 24 } },
                                completionVar: "bothTealFace",
                                completionValue: 6,
                                completionTolerance: 0,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Now drag the indigo marker across to 6 and count the crossing squares",
                                position: { x: "57%", y: "19%" },
                                dragPath: { type: "line", startOffset: { x: -20, y: 0 }, endOffset: { x: 24, y: 0 } },
                                completionVar: "bothIndigoFace",
                                completionValue: 6,
                                completionTolerance: 0,
                            },
                        ],
                        label: "Discover it yourself",
                        resetVars: { bothTealFace: 3, bothIndigoFace: 5 },
                    }}
                >
                    <InlineClozeInput
                        varName="answerDoubleSix"
                        correctAnswer="1/36"
                        {...clozePropsFromDefinition(getVariableInfo('answerDoubleSix'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-question-below-three" maxWidth="xl">
        <Block id="both-dice-question-below-three" padding="sm">
            <EditableParagraph id="para-both-dice-question-below-three" blockId="both-dice-question-below-three">
                Widen each band to two faces instead of one, and P(both dice show a number
                below 3) ={" "}
                <InlineFeedback
                    varName="answerBothBelowThree"
                    correctValue={["4/36", "1/9"]}
                    position="terminal"
                    successMessage="— yes, two rows crossing two columns pen in a 2 by 2 block of four squares"
                    failureMessage="— close."
                    hint="Two rows and two columns now qualify, so picture the block where they overlap"
                    reviewBlockId="both-dice-reflect"
                    reviewLabel="Review the crossing bands"
                >
                    <InlineClozeInput
                        varName="answerBothBelowThree"
                        correctAnswer={["4/36", "1/9"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerBothBelowThree'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
