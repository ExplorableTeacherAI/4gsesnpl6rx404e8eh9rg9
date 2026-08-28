import React, { useRef, useState, type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import {
    EditableH2,
    EditableParagraph,
    InlineClozeChoice,
    InlineClozeInput,
    InlineFeedback,
    InlineLinkedHighlight,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure } from "@/components/molecules";
import { useVar, useSetVar, useVariableStore } from "@/stores";
import { clamp } from "@/lib/motion";
import {
    getVariableInfo,
    choicePropsFromDefinition,
    clozePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
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
    TEAL,
    VIEW_WIDTH,
    cellCentreX,
    cellCentreY,
    cellIndex,
    cellPair,
    cellX,
    cellY,
} from "./diceGridGeometry";

const VIEW_HEIGHT = 450;
const ORIGIN_X = 96;
const ORIGIN_Y = 76;
const PANEL_X = 400;

/** The 11 squares where at least one die shows a 6. */
const CORRECT_CELLS = ALL_CELLS.filter((index) => {
    const [teal, indigo] = cellPair(index);
    return teal === 6 || indigo === 6;
});
const CORRECT_SET = new Set(CORRECT_CELLS);
const OVERLAP_CELL = cellIndex(6, 6);

function statusFor(shaded: number[]): string {
    if (shaded.length === 0) return "pending";
    const stray = shaded.some((index) => !CORRECT_SET.has(index));
    if (stray) return "stray";
    if (shaded.length === CORRECT_CELLS.length) return "correct";
    return "partial";
}

const STATUS_TEXT: Record<string, string> = {
    pending: "Start shading",
    partial: "Keep going",
    stray: "One does not fit",
    correct: "All of them",
};

function CountNotAddDrawing() {
    const setVar = useSetVar();
    const shaded = useVar<number[]>("sixShadedCells", []);
    const highlight = useVar<string>("sixOverlapHighlight", "");

    const [painting, setPainting] = useState<null | "add" | "remove">(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const shadedSet = new Set(shaded);
    const status = statusFor(shaded);
    const showStrips = status === "correct" || shaded.length >= CORRECT_CELLS.length;

    const overlapActive = highlight === "overlap";
    const recede = overlapActive ? 0.35 : 1;

    const cellFromPointer = (event: React.PointerEvent): number | null => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        const x = ((event.clientX - rect.left) / rect.width) * VIEW_WIDTH;
        const y = ((event.clientY - rect.top) / rect.height) * VIEW_HEIGHT;
        const indigo = clamp(Math.floor((x - ORIGIN_X) / CELL) + 1, 1, 6);
        const teal = clamp(Math.floor((y - ORIGIN_Y) / CELL) + 1, 1, 6);
        return cellIndex(teal, indigo);
    };

    const applyPaint = (index: number, mode: "add" | "remove") => {
        const latest = useVariableStore.getState().getVariable<number[]>("sixShadedCells", []);
        const has = latest.includes(index);
        if (mode === "add" && !has) {
            const next = [...latest, index];
            setVar("sixShadedCells", next);
            setVar("sixTaskStatus", statusFor(next));
        } else if (mode === "remove" && has) {
            const next = latest.filter((cell) => cell !== index);
            setVar("sixShadedCells", next);
            setVar("sixTaskStatus", statusFor(next));
        }
    };

    return (
        <svg
            ref={svgRef}
            viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A six by six grid of two-dice outcomes where squares can be shaded by clicking"
        >
            <g opacity={recede} style={{ transition: "opacity 150ms ease-out" }}>
                <text x={ORIGIN_X + GRID_SIZE / 2} y={36} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                    Indigo die
                </text>
                {DIE_FACES.map((face) => (
                    <text
                        key={`col-${face}`}
                        x={cellCentreX(face, ORIGIN_X)}
                        y={62}
                        fill={face === 6 ? INDIGO : INK_STRUCTURE}
                        fontSize="13"
                        fontWeight={face === 6 ? 700 : 400}
                        textAnchor="middle"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}
                <text
                    x={44}
                    y={ORIGIN_Y + GRID_SIZE / 2}
                    fill={INK_STRUCTURE}
                    fontSize="12"
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
                        fill={face === 6 ? TEAL : INK_STRUCTURE}
                        fontSize="13"
                        fontWeight={face === 6 ? 700 : 400}
                        textAnchor="end"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                        {face}
                    </text>
                ))}

                {ALL_CELLS.map((index) => {
                    const [teal, indigo] = cellPair(index);
                    const isShaded = shadedSet.has(index);
                    const isStray = isShaded && !CORRECT_SET.has(index);
                    return (
                        <g key={index}>
                            <rect
                                x={cellX(indigo, ORIGIN_X)}
                                y={cellY(teal, ORIGIN_Y)}
                                width={CELL}
                                height={CELL}
                                fill={
                                    isStray
                                        ? "rgba(239, 68, 68, 0.16)"
                                        : isShaded
                                          ? "rgba(98, 208, 173, 0.24)"
                                          : "#FFFFFF"
                                }
                                stroke={isStray ? "#ef4444" : isShaded ? TEAL : INK_QUIET}
                                strokeWidth={isShaded ? 2.5 : 1.5}
                                style={{ transition: "fill 150ms ease-out" }}
                            />
                            <text
                                x={cellCentreX(indigo, ORIGIN_X)}
                                y={cellCentreY(teal, ORIGIN_Y) + 5}
                                fill={isShaded ? INK : INK_QUIET}
                                fontSize="12"
                                textAnchor="middle"
                                style={{ fontVariantNumeric: "tabular-nums" }}
                            >
                                {`${teal},${indigo}`}
                            </text>
                        </g>
                    );
                })}

                {/* The reveal: the teal strip and the indigo strip cross in one square */}
                {showStrips && (
                    <>
                        <rect
                            x={ORIGIN_X}
                            y={cellY(6, ORIGIN_Y)}
                            width={GRID_SIZE}
                            height={CELL}
                            fill="none"
                            stroke={TEAL}
                            strokeWidth="3"
                            rx="6"
                        />
                        <rect
                            x={cellX(6, ORIGIN_X)}
                            y={ORIGIN_Y}
                            width={CELL}
                            height={GRID_SIZE}
                            fill="none"
                            stroke={INDIGO}
                            strokeWidth="3"
                            rx="6"
                        />
                    </>
                )}
            </g>

            {/* The double-counted square */}
            {overlapActive && (
                <rect
                    x={cellX(6, ORIGIN_X) - 3}
                    y={cellY(6, ORIGIN_Y) - 3}
                    width={CELL + 6}
                    height={CELL + 6}
                    fill="none"
                    stroke={AMBER}
                    strokeWidth="9"
                    opacity={0.28}
                    rx="8"
                />
            )}
            <rect
                x={cellX(6, ORIGIN_X)}
                y={cellY(6, ORIGIN_Y)}
                width={CELL}
                height={CELL}
                fill="none"
                stroke={AMBER}
                strokeWidth={overlapActive ? 4 : showStrips ? 3 : 0}
                rx="6"
                style={{ transition: "stroke-width 150ms ease-out" }}
                pointerEvents="none"
            />
            {(showStrips || overlapActive) && (
                <>
                    <line
                        x1={cellX(6, ORIGIN_X) + CELL}
                        y1={cellCentreY(6, ORIGIN_Y)}
                        x2={378}
                        y2={cellCentreY(6, ORIGIN_Y)}
                        stroke={AMBER}
                        strokeWidth="2"
                        strokeLinecap="round"
                    />
                    <text
                        x={384}
                        y={cellCentreY(6, ORIGIN_Y) + 4}
                        fill={AMBER}
                        fontSize="12"
                        fontWeight={700}
                        textAnchor="start"
                    >
                        counted twice
                    </text>
                </>
            )}

            {/* Readout panel beside the grid */}
            <g opacity={recede} style={{ transition: "opacity 150ms ease-out" }} fontSize="12">
                <text x={PANEL_X} y={110} fill={INK_STRUCTURE}>Adding chances</text>
                <text x={PANEL_X} y={136} fill={INK_STRUCTURE} fontSize="16" fontWeight={600} style={{ fontVariantNumeric: "tabular-nums" }}>
                    6 + 6 = 12
                </text>
                <text x={PANEL_X} y={176} fill={INK_STRUCTURE}>You shaded</text>
                <text
                    x={PANEL_X}
                    y={206}
                    fill={status === "correct" ? TEAL : status === "stray" ? "#ef4444" : INK}
                    fontSize="24"
                    fontWeight={700}
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {shaded.length}
                </text>
                <text x={PANEL_X} y={240} fill={status === "correct" ? TEAL : INK_STRUCTURE} fontSize="12">
                    {STATUS_TEXT[status]}
                </text>
            </g>

            <text x={280} y={396} fill={INK} fontSize="13" textAnchor="middle">
                Shade every square where at least one die shows a 6
            </text>
            <text x={280} y={418} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                Click a square to shade it, click again to clear it
            </text>

            {/* Painting surface */}
            <rect
                x={ORIGIN_X}
                y={ORIGIN_Y}
                width={GRID_SIZE}
                height={GRID_SIZE}
                fill="transparent"
                style={{ cursor: "pointer", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    const index = cellFromPointer(event);
                    if (index === null) return;
                    const mode = shadedSet.has(index) ? "remove" : "add";
                    setPainting(mode);
                    applyPaint(index, mode);
                }}
                onPointerMove={(event) => {
                    const index = cellFromPointer(event);
                    if (index === null) return;
                    if (painting) {
                        applyPaint(index, painting);
                        return;
                    }
                    // Hovering the drawing lights the matching phrase in the prose.
                    const overOverlap = index === OVERLAP_CELL;
                    if (overOverlap && highlight !== "overlap") setVar("sixOverlapHighlight", "overlap");
                    if (!overOverlap && highlight === "overlap") setVar("sixOverlapHighlight", "");
                }}
                onPointerUp={() => setPainting(null)}
                onPointerCancel={() => setPainting(null)}
                onPointerLeave={() => {
                    setPainting(null);
                    if (highlight) setVar("sixOverlapHighlight", "");
                }}
            />
        </svg>
    );
}

function CountNotAddFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="count-not-add-shading"
            onReset={() => {
                setVar("sixShadedCells", []);
                setVar("sixTaskStatus", "pending");
                setVar("sixOverlapHighlight", "");
            }}
            caption="Shade the squares yourself. The running count sits next to the answer that adding the two chances predicts."
        >
            <CountNotAddDrawing />
            <InteractionHintSequence
                hintKey="count-not-add-shade"
                steps={[
                    {
                        gesture: "click",
                        label: "Click the squares that qualify",
                        position: { x: "38%", y: "73%" },
                    },
                ]}
            />
        </Figure>
    );
}

export const countNotAddBlocks: ReactElement[] = [
    <StackLayout key="layout-count-not-add-heading" maxWidth="xl">
        <Block id="count-not-add-heading" padding="md">
            <EditableH2 id="h2-count-not-add-heading" blockId="count-not-add-heading">
                Count Squares, Don't Add Chances
            </EditableH2>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-count-not-add-setup" maxWidth="xl">
        <Block id="count-not-add-setup" padding="sm">
            <EditableParagraph id="para-count-not-add-setup" blockId="count-not-add-setup">
                Each die shows a 6 one time in six, so the chance that at least one of them
                does looks like 1/6 + 1/6, which is 12 squares out of 36. Shade every square
                on the grid where at least one die shows a 6, and count what you actually
                get.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-count-not-add-figure" maxWidth="xl">
        <Block id="count-not-add-figure" padding="sm" hasVisualization>
            <CountNotAddFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-count-not-add-reflect" maxWidth="xl">
        <Block id="count-not-add-reflect" padding="sm">
            <EditableParagraph id="para-count-not-add-reflect" blockId="count-not-add-reflect">
                Eleven, not twelve. The{" "}
                <InlineLinkedHighlight
                    id="link-count-not-add-overlap"
                    varName="sixOverlapHighlight"
                    highlightId="overlap"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('sixOverlapHighlight'))}
                >
                    square where both dice show 6
                </InlineLinkedHighlight>{" "}
                belongs to the teal strip and the indigo strip at once, so adding the two
                chances counts it twice. Counting squares never makes that mistake.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-count-not-add-question-reason" maxWidth="xl">
        <Block id="count-not-add-question-reason" padding="sm">
            <EditableParagraph id="para-count-not-add-question-reason" blockId="count-not-add-question-reason">
                Adding 1/6 and 1/6 overshoots by exactly one square, because the roll where
                both dice show 6 has been{" "}
                <InlineFeedback
                    varName="answerDoubleCountReason"
                    correctValue="counted twice"
                    position="terminal"
                    successMessage="— right, it sits in both strips, so adding picks it up once for each die"
                    failureMessage="— have another look."
                    hint="That roll really can happen, and it really does show a 6, so ask how many times the adding picks it up"
                    reviewBlockId="count-not-add-reflect"
                    reviewLabel="Review the overlap"
                >
                    <InlineClozeChoice
                        varName="answerDoubleCountReason"
                        correctAnswer="counted twice"
                        options={["counted twice", "impossible to roll", "worth double", "missing from the grid"]}
                        {...choicePropsFromDefinition(getVariableInfo('answerDoubleCountReason'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-count-not-add-question-five" maxWidth="xl">
        <Block id="count-not-add-question-five" padding="sm">
            <EditableParagraph id="para-count-not-add-question-five" blockId="count-not-add-question-five">
                Same grid, different face: P(at least one die shows a 5) ={" "}
                <InlineFeedback
                    varName="answerAtLeastOneFive"
                    correctValue="11/36"
                    position="terminal"
                    successMessage="— exactly, one whole row plus one whole column, minus the square they share"
                    failureMessage="— close."
                    hint="Six squares in the row, six in the column, and one square sitting in both"
                    reviewBlockId="count-not-add-figure"
                    reviewLabel="Review the shaded strips"
                >
                    <InlineClozeInput
                        varName="answerAtLeastOneFive"
                        correctAnswer="11/36"
                        {...clozePropsFromDefinition(getVariableInfo('answerAtLeastOneFive'))}
                    />
                </InlineFeedback>.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
