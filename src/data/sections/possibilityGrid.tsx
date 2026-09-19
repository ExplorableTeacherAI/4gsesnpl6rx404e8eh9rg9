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
    InlineTooltip,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar, useVariableStore } from "@/stores";
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
    GRID_X,
    GRID_Y,
    INDIGO,
    INK,
    INK_QUIET,
    INK_STRUCTURE,
    PAPER_FILL,
    ROSE,
    TEAL,
    VIEW_WIDTH,
    cellCentreX,
    cellCentreY,
    cellIndex,
    cellPair,
    cellX,
    cellY,
} from "./diceGridGeometry";

const VIEW_HEIGHT = 400;
const PANEL_X = 400;

function PossibilityGridDrawing() {
    const setVar = useSetVar();
    const teal = useVar<number>("tealDie", 3);
    const indigo = useVar<number>("indigoDie", 4);
    const visited = useVar<number[]>("gridVisitedCells", []);
    const highlight = useVar<string>("gridAxisHighlight", "");

    const [dragging, setDragging] = useState(false);
    const svgRef = useRef<SVGSVGElement>(null);

    const total = teal + indigo;
    const visitedSet = new Set(visited);

    // Highlight contract: target pops, everything else recedes.
    const dim = (id: string) => (highlight && highlight !== id ? 0.35 : 1);
    const isRow = highlight === "row";
    const isColumn = highlight === "column";

    const markerCentreX = useSpring(cellCentreX(indigo), { stiffness: 380, damping: 30 });
    const markerCentreY = useSpring(cellCentreY(teal), { stiffness: 380, damping: 30 });

    const pointerToCell = (event: React.PointerEvent) => {
        const svg = svgRef.current;
        if (!svg) return;
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        const y = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
        const nextIndigo = clamp(Math.floor((x - GRID_X) / CELL) + 1, 1, 6);
        const nextTeal = clamp(Math.floor((y - GRID_Y) / CELL) + 1, 1, 6);
        if (nextTeal !== teal) setVar("tealDie", nextTeal);
        if (nextIndigo !== indigo) setVar("indigoDie", nextIndigo);
        const index = cellIndex(nextTeal, nextIndigo);
        const latest = useVariableStore.getState().getVariable<number[]>("gridVisitedCells", []);
        if (!latest.includes(index)) {
            setVar("gridVisitedCells", [...latest, index]);
        }
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A six by six grid of every outcome of rolling two dice, with a draggable marker"
        >
            <defs>
                <filter id="possibility-marker-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="1" stdDeviation="1.5" floodColor="#0F172A" floodOpacity="0.25" />
                </filter>
            </defs>

            {/* Axis titles and die-face labels */}
            <g opacity={dim("column")} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={GRID_X + GRID_SIZE / 2} y={56} fill={isColumn ? INDIGO : INK_STRUCTURE} fontSize="12" textAnchor="middle">
                    Indigo die
                </text>
                {DIE_FACES.map((face) => (
                    <text
                        key={`col-${face}`}
                        x={cellCentreX(face)}
                        y={82}
                        fill={face === indigo ? INDIGO : INK_STRUCTURE}
                        fontSize="13"
                        fontWeight={face === indigo ? 700 : 400}
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}
            </g>

            <g opacity={dim("row")} style={{ transition: "opacity 150ms ease-out" }}>
                <text
                    x={44}
                    y={GRID_Y + GRID_SIZE / 2}
                    fill={isRow ? TEAL : INK_STRUCTURE}
                    fontSize="12"
                    textAnchor="middle"
                    transform={`rotate(-90 44 ${GRID_Y + GRID_SIZE / 2})`}
                >
                    Teal die
                </text>
                {DIE_FACES.map((face) => (
                    <text
                        key={`row-${face}`}
                        x={GRID_X - 12}
                        y={cellCentreY(face) + 5}
                        fill={face === teal ? TEAL : INK_STRUCTURE}
                        fontSize="13"
                        fontWeight={face === teal ? 700 : 400}
                        textAnchor="end"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}
            </g>

            {/* The 36 squares — every outcome of the pair */}
            <g opacity={highlight ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }}>
                {ALL_CELLS.map((index) => {
                    const [cellTeal, cellIndigo] = cellPair(index);
                    const seen = visitedSet.has(index);
                    return (
                        <g key={index}>
                            <rect
                                x={cellX(cellIndigo)}
                                y={cellY(cellTeal)}
                                width={CELL}
                                height={CELL}
                                fill={seen ? PAPER_FILL : "#FFFFFF"}
                                stroke={INK_QUIET}
                                strokeWidth="1.5"
                            />
                            <text
                                x={cellCentreX(cellIndigo)}
                                y={cellCentreY(cellTeal) + 5}
                                fill={seen ? INK : INK_QUIET}
                                fontSize="13"
                                textAnchor="middle"
                                style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                                {cellTeal + cellIndigo}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* Drag surface over the grid */}
            <rect
                x={GRID_X}
                y={GRID_Y}
                width={GRID_SIZE}
                height={GRID_SIZE}
                fill="transparent"
                style={{ cursor: dragging ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging(true);
                    pointerToCell(event);
                }}
                onPointerMove={(event) => {
                    if (dragging) pointerToCell(event);
                }}
                onPointerUp={() => setDragging(false)}
                onPointerCancel={() => setDragging(false)}
            />

            {/* Row guide — which face the teal die shows */}
            {isRow && (
                <line
                    x1={GRID_X}
                    y1={markerCentreY}
                    x2={markerCentreX}
                    y2={markerCentreY}
                    stroke={TEAL}
                    strokeWidth="9"
                    opacity={0.28}
                    strokeLinecap="round"
                />
            )}
            <line
                x1={GRID_X}
                y1={markerCentreY}
                x2={markerCentreX}
                y2={markerCentreY}
                stroke={TEAL}
                strokeWidth={isRow ? 4 : 2.5}
                strokeLinecap="round"
                opacity={isColumn ? 0.35 : 1}
                style={{ transition: "stroke-width 150ms ease-out, opacity 150ms ease-out" }}
                onPointerEnter={() => setVar("gridAxisHighlight", "row")}
                onPointerLeave={() => setVar("gridAxisHighlight", "")}
            />

            {/* Column guide — which face the indigo die shows */}
            {isColumn && (
                <line
                    x1={markerCentreX}
                    y1={GRID_Y}
                    x2={markerCentreX}
                    y2={markerCentreY}
                    stroke={INDIGO}
                    strokeWidth="9"
                    opacity={0.28}
                    strokeLinecap="round"
                />
            )}
            <line
                x1={markerCentreX}
                y1={GRID_Y}
                x2={markerCentreX}
                y2={markerCentreY}
                stroke={INDIGO}
                strokeWidth={isColumn ? 4 : 2.5}
                strokeLinecap="round"
                opacity={isRow ? 0.35 : 1}
                style={{ transition: "stroke-width 150ms ease-out, opacity 150ms ease-out" }}
                onPointerEnter={() => setVar("gridAxisHighlight", "column")}
                onPointerLeave={() => setVar("gridAxisHighlight", "")}
            />

            {/* The draggable marker — one square is one possible roll */}
            <g opacity={highlight ? 0.5 : 1} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                <rect
                    x={markerCentreX - CELL / 2}
                    y={markerCentreY - CELL / 2}
                    width={CELL}
                    height={CELL}
                    rx="6"
                    fill="rgba(248, 160, 205, 0.22)"
                    stroke={ROSE}
                    strokeWidth="3.5"
                    strokeLinejoin="round"
                    filter="url(#possibility-marker-shadow)"
                />
                <text
                    x={markerCentreX}
                    y={markerCentreY + 6}
                    fill={INK}
                    fontSize="16"
                    fontWeight={700}
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {total}
                </text>
            </g>

            {/* Live readout panel — beside the drawing, never over it */}
            <g opacity={highlight ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }} fontSize="12">
                <text x={PANEL_X} y={120} fill={INK_STRUCTURE}>Teal die</text>
                <text x={PANEL_X} y={148} fill={TEAL} fontSize="22" fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {teal}
                </text>
                <text x={PANEL_X} y={190} fill={INK_STRUCTURE}>Indigo die</text>
                <text x={PANEL_X} y={218} fill={INDIGO} fontSize="22" fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {indigo}
                </text>
                <text x={PANEL_X} y={260} fill={INK_STRUCTURE}>Total</text>
                <text x={PANEL_X} y={288} fill={ROSE} fontSize="22" fontWeight={700} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {total}
                </text>
                <text x={PANEL_X} y={330} fill={INK_STRUCTURE}>Squares seen</text>
                <text x={PANEL_X} y={352} fill={visited.length === 36 ? AMBER : INK} fontSize="14" fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                    {`${visited.length} of 36`}
                </text>
            </g>

        </svg>
    );
}

function PossibilityGridFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="possibility-grid-explorer"
            onReset={() => {
                setVar("tealDie", 3);
                setVar("indigoDie", 4);
                setVar("gridVisitedCells", []);
                setVar("gridAxisHighlight", "");
            }}
            caption="Every square is one possible roll of the two dice. Drag the marker across the grid and the squares you land on stay shaded."
        >
            <PossibilityGridDrawing />
            <InteractionHintSequence
                hintKey="possibility-grid-drag"
                steps={[
                    {
                        gesture: "drag",
                        label: "Drag the marker across the squares",
                        position: { x: "46%", y: "53%" },
                        dragPath: {
                            type: "line",
                            startOffset: { x: -20, y: -14 },
                            endOffset: { x: 26, y: 18 },
                        },
                    },
                ]}
            />
        </Figure>
    );
}

export const possibilityGridBlocks: ReactElement[] = [
    <StackLayout key="layout-possibility-grid-heading" maxWidth="xl">
        <Block id="possibility-grid-heading" padding="md">
            <EditableH2 id="h2-possibility-grid-heading" blockId="possibility-grid-heading">
                Every Roll on One Grid
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-possibility-grid-setup" maxWidth="xl">
        <Block id="possibility-grid-setup" padding="sm">
            <EditableParagraph id="para-possibility-grid-setup" blockId="possibility-grid-setup">
                A single die has six outcomes, so two dice pair every{" "}
                <InlineSpotColor varName="tealDie" {...spotColorPropsFromDefinition(getVariableInfo('tealDie'))}>
                    teal
                </InlineSpotColor>{" "}
                result with every{" "}
                <InlineSpotColor varName="indigoDie" {...spotColorPropsFromDefinition(getVariableInfo('indigoDie'))}>
                    indigo
                </InlineSpotColor>{" "}
                one. That makes a grid: the{" "}
                <InlineLinkedHighlight
                    id="link-grid-row"
                    varName="gridAxisHighlight"
                    highlightId="row"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('gridAxisHighlight'))}
                    color="#62D0AD"
                    bgColor="rgba(98, 208, 173, 0.2)"
                >
                    row
                </InlineLinkedHighlight>{" "}
                tells you the teal die, the{" "}
                <InlineLinkedHighlight
                    id="link-grid-column"
                    varName="gridAxisHighlight"
                    highlightId="column"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('gridAxisHighlight'))}
                    color="#8E90F5"
                    bgColor="rgba(142, 144, 245, 0.2)"
                >
                    column
                </InlineLinkedHighlight>{" "}
                tells you the indigo die. Drag the marker around it and watch the total in
                every square you land on.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-possibility-grid-figure" maxWidth="xl">
        <Block id="possibility-grid-figure" padding="sm" hasVisualization>
            <PossibilityGridFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-possibility-grid-reflect" maxWidth="xl">
        <Block id="possibility-grid-reflect" padding="sm">
            <EditableParagraph id="para-possibility-grid-reflect" blockId="possibility-grid-reflect">
                Teal{" "}
                <InlineScrubbleNumber
                    varName="tealDie"
                    {...numberPropsFromDefinition(getVariableInfo('tealDie'))}
                />{" "}
                with indigo{" "}
                <InlineScrubbleNumber
                    varName="indigoDie"
                    {...numberPropsFromDefinition(getVariableInfo('indigoDie'))}
                />{" "}
                is one square out of 36, not out of 12. All 36 are{" "}
                <InlineTooltip
                    id="tooltip-possibility-grid-equally-likely"
                    tooltip="Each outcome has exactly the same chance of happening as every other one."
                    color="#2563EB"
                    bgColor="rgba(37, 99, 235, 0.12)"
                >
                    equally likely
                </InlineTooltip>
                , so any
                event you can describe becomes a matter of counting the squares that match
                it.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-possibility-grid-question" maxWidth="xl">
        <Block id="possibility-grid-question" padding="sm">
            <EditableParagraph id="para-possibility-grid-question" blockId="possibility-grid-question">
                Looking across the grid, a total of 4 turns up in{" "}
                <InlineFeedback
                    varName="answerTotalFourCount"
                    correctValue="3"
                    position="mid"
                    hint="Hunt for the squares showing 4 and count them"
                >
                    <InlineClozeInput
                        varName="answerTotalFourCount"
                        correctAnswer="3"
                        {...clozePropsFromDefinition(getVariableInfo('answerTotalFourCount'))}
                    />
                </InlineFeedback>{" "}
                squares, which makes{" "}
                <InlineFormula
                    id="formula-possibility-grid-total-four"
                    latex="P(\clr{total}{\text{total of 4}}) ="
                    colorMap={{ total: "#F8A0CD" }}
                />{" "}
                <InlineFeedback
                    varName="answerTotalFourProbability"
                    correctValue={["3/36", "1/12"]}
                    position="terminal"
                    successMessage="— exactly, and 3/36 simplifies to 1/12"
                    failureMessage="— not yet."
                    hint="Matching squares over the 36 squares in the whole grid"
                    reviewBlockId="possibility-grid-reflect"
                    reviewLabel="Review counting squares"
                >
                    <InlineClozeInput
                        varName="answerTotalFourProbability"
                        correctAnswer={["3/36", "1/12"]}
                        {...clozePropsFromDefinition(getVariableInfo('answerTotalFourProbability'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
