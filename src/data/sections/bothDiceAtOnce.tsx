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
    InlineTrigger,
    InteractionHintSequence,
} from "@/components/atoms";
import { Figure, FormulaBlock } from "@/components/molecules";
import { useVar, useSetVar } from "@/stores";
import { clamp, useSpring } from "@/lib/motion";
import {
    getVariableInfo,
    clozePropsFromDefinition,
    linkedHighlightPropsFromDefinition,
    numberPropsFromDefinition,
    scrubVarsFromDefinitions,
    spotColorPropsFromDefinition,
} from "../variables";
import { AMBER, DIE_FACES, INDIGO, INK, INK_QUIET, INK_STRUCTURE, TEAL } from "./diceGridGeometry";

const VIEW = 560;

// ── Grid geometry ───────────────────────────────────────────────────────────
const GRID_VIEW_HEIGHT = 440;
const CELL = 46;
const GRID = CELL * 6; // 276
const ORIGIN_X = 110;
const ORIGIN_Y = 110;
const ROW_HANDLE_X = ORIGIN_X - 26; // 84
const COLUMN_HANDLE_Y = ORIGIN_Y - 26; // 84
const HANDLE_RADIUS = 14;
const PANEL_X = 410;

const cellX = (face: number) => ORIGIN_X + (face - 1) * CELL;
const cellY = (face: number) => ORIGIN_Y + (face - 1) * CELL;
const cellCentreX = (face: number) => cellX(face) + CELL / 2;
const cellCentreY = (face: number) => cellY(face) + CELL / 2;

/** The four branch ends of the tree, in the colour each one carries in both views. */
const LEAF_COLOR: Record<string, string> = {
    leafBoth: AMBER,
    leafTealOnly: TEAL,
    leafIndigoOnly: INDIGO,
    leafNeither: INK_STRUCTURE,
};

/** Which of the 36 squares a branch end owns, as [tealFace, indigoFace] pairs. */
function leafCells(leaf: string, teal: number, indigo: number): Array<[number, number]> {
    if (leaf === "leafBoth") return [[teal, indigo]];
    if (leaf === "leafTealOnly") {
        return DIE_FACES.filter((face) => face !== indigo).map((face) => [teal, face] as [number, number]);
    }
    if (leaf === "leafIndigoOnly") {
        return DIE_FACES.filter((face) => face !== teal).map((face) => [face, indigo] as [number, number]);
    }
    if (leaf === "leafNeither") {
        const cells: Array<[number, number]> = [];
        DIE_FACES.forEach((row) => {
            DIE_FACES.forEach((column) => {
                if (row !== teal && column !== indigo) cells.push([row, column]);
            });
        });
        return cells;
    }
    return [];
}

/**
 * One highlight shared by the grid and the tree. Hovering either drawing (or a
 * phrase in the prose) writes `bothHighlight`; clicking a branch end pins it in
 * `bothLeafPinned`, so a student can hold a comparison while their eye travels
 * from one drawing to the other.
 */
function useBothHighlight() {
    const hovered = useVar<string>("bothHighlight", "");
    const pinned = useVar<string>("bothLeafPinned", "");
    const setVar = useSetVar();
    const active = hovered || pinned;
    return {
        active,
        pinned,
        setHover: (id: string) => setVar("bothHighlight", id),
        togglePin: (id: string) => setVar("bothLeafPinned", pinned === id ? "" : id),
        dim: (id: string) => (active && active !== id ? 0.35 : 1),
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Figure 1 — the grid: two bands crossing in exactly one square
// ─────────────────────────────────────────────────────────────────────────────

function BothDiceDrawing() {
    const setVar = useSetVar();
    const tealFace = useVar<number>("bothTealFace", 3);
    const indigoFace = useVar<number>("bothIndigoFace", 5);
    const { active, setHover, dim } = useBothHighlight();

    const [dragging, setDragging] = useState<null | "row" | "column">(null);
    const svgRef = useRef<SVGSVGElement>(null);

    const rowActive = active === "tealRow";
    const columnActive = active === "indigoColumn";
    const squareActive = active === "bothSquare";
    const leafHighlight = active.startsWith("leaf") ? active : "";

    const rowCentre = useSpring(cellCentreY(tealFace), { stiffness: 380, damping: 30 });
    const columnCentre = useSpring(cellCentreX(indigoFace), { stiffness: 380, damping: 30 });

    const svgPoint = (event: React.PointerEvent) => {
        const svg = svgRef.current;
        if (!svg) return null;
        const rect = svg.getBoundingClientRect();
        return {
            x: ((event.clientX - rect.left) / rect.width) * VIEW,
            y: ((event.clientY - rect.top) / rect.height) * GRID_VIEW_HEIGHT,
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
            viewBox={`0 0 ${VIEW} ${GRID_VIEW_HEIGHT}`}
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
            <g opacity={active ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                <text x={ORIGIN_X + GRID / 2} y={58} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                    Indigo die
                </text>
                <text
                    x={40}
                    y={ORIGIN_Y + GRID / 2}
                    fill={INK_STRUCTURE}
                    fontSize="12"
                    textAnchor="middle"
                    transform={`rotate(-90 40 ${ORIGIN_Y + GRID / 2})`}
                >
                    Teal die
                </text>
            </g>

            {/* The 36 outcomes — one quiet dot each */}
            <g opacity={active ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {DIE_FACES.map((row) =>
                    DIE_FACES.map((column) => (
                        <g key={`cell-${row}-${column}`}>
                            <rect
                                x={cellX(column)}
                                y={cellY(row)}
                                width={CELL}
                                height={CELL}
                                fill="#FFFFFF"
                                stroke={INK_QUIET}
                                strokeWidth="1.5"
                            />
                            <circle cx={cellCentreX(column)} cy={cellCentreY(row)} r="2" fill={INK_QUIET} />
                        </g>
                    )),
                )}
            </g>

            {/* The teal band: every roll where the teal die obliges */}
            <g opacity={dim("tealRow")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {rowActive && (
                    <rect
                        x={ORIGIN_X - 3}
                        y={rowCentre - CELL / 2 - 3}
                        width={GRID + 6}
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
                    width={GRID}
                    height={CELL}
                    fill={rowActive ? "rgba(98, 208, 173, 0.35)" : "rgba(98, 208, 173, 0.15)"}
                    stroke={TEAL}
                    strokeWidth={rowActive ? 4 : 2.5}
                    rx="6"
                    style={{ transition: "fill 150ms ease-out, stroke-width 150ms ease-out" }}
                />
            </g>

            {/* The indigo band */}
            <g opacity={dim("indigoColumn")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {columnActive && (
                    <rect
                        x={columnCentre - CELL / 2 - 3}
                        y={ORIGIN_Y - 3}
                        width={CELL + 6}
                        height={GRID + 6}
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
                    height={GRID}
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

            {/* Squares owned by the branch end the reader is pointing at in the tree */}
            {leafHighlight && (
                <g pointerEvents="none">
                    {leafCells(leafHighlight, tealFace, indigoFace).map(([row, column]) => (
                        <rect
                            key={`leaf-${row}-${column}`}
                            x={cellX(column)}
                            y={cellY(row)}
                            width={CELL}
                            height={CELL}
                            fill={LEAF_COLOR[leafHighlight]}
                            fillOpacity={0.32}
                            stroke={LEAF_COLOR[leafHighlight]}
                            strokeWidth="2.5"
                        />
                    ))}
                </g>
            )}

            {/* Draggable face markers on the two edges */}
            <g opacity={dim("tealRow")} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                {DIE_FACES.filter((face) => face !== tealFace).map((face) => (
                    <text
                        key={`row-label-${face}`}
                        x={ROW_HANDLE_X}
                        y={cellCentreY(face) + 5}
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
                        x={cellCentreX(face)}
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
            <g
                opacity={active ? 0.35 : 1}
                style={{ transition: "opacity 150ms ease-out", fontVariantNumeric: "tabular-nums" }}
                pointerEvents="none"
                fontSize="12"
            >
                <text x={PANEL_X} y={150} fill={INK_STRUCTURE}>Teal die alone</text>
                <text x={PANEL_X} y={172} fill={TEAL} fontWeight={600}>6 of 36</text>
                <text x={PANEL_X} y={216} fill={INK_STRUCTURE}>Indigo die alone</text>
                <text x={PANEL_X} y={238} fill={INDIGO} fontWeight={600}>6 of 36</text>
                <text x={PANEL_X} y={286} fill={INK_STRUCTURE}>Both together</text>
                <text x={PANEL_X} y={316} fill={AMBER} fontSize="20" fontWeight={700}>1 of 36</text>
                <text x={PANEL_X} y={342} fill={INK_STRUCTURE} fontSize="13">1/6 of 1/6</text>
            </g>

            <text x={280} y={410} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                Drag either marker to change which faces are required
            </text>

            {/* Drag strip for the teal face */}
            <rect
                x={ORIGIN_X - 44}
                y={ORIGIN_Y}
                width={36}
                height={GRID}
                fill="transparent"
                style={{ cursor: dragging === "row" ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging("row");
                    setHover("");
                    setRowFrom(event);
                }}
                onPointerMove={(event) => {
                    if (dragging === "row") setRowFrom(event);
                }}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onPointerEnter={() => {
                    if (!dragging) setHover("tealRow");
                }}
                onPointerLeave={() => setHover("")}
            />

            {/* Drag strip for the indigo face */}
            <rect
                x={ORIGIN_X}
                y={ORIGIN_Y - 44}
                width={GRID}
                height={36}
                fill="transparent"
                style={{ cursor: dragging === "column" ? "grabbing" : "grab", touchAction: "none" }}
                onPointerDown={(event) => {
                    event.currentTarget.setPointerCapture(event.pointerId);
                    setDragging("column");
                    setHover("");
                    setColumnFrom(event);
                }}
                onPointerMove={(event) => {
                    if (dragging === "column") setColumnFrom(event);
                }}
                onPointerUp={() => setDragging(null)}
                onPointerCancel={() => setDragging(null)}
                onPointerEnter={() => {
                    if (!dragging) setHover("indigoColumn");
                }}
                onPointerLeave={() => setHover("")}
            />

            {/* Clicking straight into the grid sets both faces at once */}
            <rect
                x={ORIGIN_X}
                y={ORIGIN_Y}
                width={GRID}
                height={GRID}
                fill="transparent"
                style={{ cursor: "pointer", touchAction: "none" }}
                onPointerDown={(event) => {
                    setHover("");
                    setRowFrom(event);
                    setColumnFrom(event);
                }}
                onPointerMove={(event) => {
                    const point = svgPoint(event);
                    if (!point) return;
                    const overSquare =
                        clamp(Math.floor((point.y - ORIGIN_Y) / CELL) + 1, 1, 6) === tealFace &&
                        clamp(Math.floor((point.x - ORIGIN_X) / CELL) + 1, 1, 6) === indigoFace;
                    if (overSquare && active !== "bothSquare") setHover("bothSquare");
                    if (!overSquare && active === "bothSquare") setHover("");
                }}
                onPointerLeave={() => {
                    if (active === "bothSquare") setHover("");
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
                setVar("bothLeafPinned", "");
            }}
            caption="Counting the squares. The teal band holds every roll where the teal die obliges, the indigo band does the same for the indigo die, and the two cross in one square."
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

// ─────────────────────────────────────────────────────────────────────────────
// Figure 2 — the tree diagram: branch, branch, multiply along the path
// ─────────────────────────────────────────────────────────────────────────────

const TREE_VIEW_HEIGHT = 432;
const ROOT: [number, number] = [70, 210];
const NODE_TEAL_YES: [number, number] = [210, 110];
const NODE_TEAL_NO: [number, number] = [210, 310];
const LEAF_X = 380;
const LEAF_LABEL_X = 398;

interface TreeLeaf {
    id: string;
    y: number;
    from: [number, number];
    branchId: string;
    stageOneId: string;
    /** Text of the second-stage branch, built from the live indigo face. */
    secondOutcome: (indigo: number) => string;
    secondFraction: string;
    name: string;
    product: string;
    color: string;
}

const TREE_LEAVES: TreeLeaf[] = [
    {
        id: "leafBoth",
        y: 60,
        from: NODE_TEAL_YES,
        branchId: "branchBoth",
        stageOneId: "stageOneYes",
        secondOutcome: (indigo) => `indigo = ${indigo}`,
        secondFraction: "1/6",
        name: "Both oblige",
        product: "1/6 of 1/6 = 1/36",
        color: AMBER,
    },
    {
        id: "leafTealOnly",
        y: 160,
        from: NODE_TEAL_YES,
        branchId: "branchTealOnly",
        stageOneId: "stageOneYes",
        secondOutcome: (indigo) => `indigo not ${indigo}`,
        secondFraction: "5/6",
        name: "Teal only",
        product: "1/6 of 5/6 = 5/36",
        color: TEAL,
    },
    {
        id: "leafIndigoOnly",
        y: 260,
        from: NODE_TEAL_NO,
        branchId: "branchIndigoOnly",
        stageOneId: "stageOneNo",
        secondOutcome: (indigo) => `indigo = ${indigo}`,
        secondFraction: "1/6",
        name: "Indigo only",
        product: "5/6 of 1/6 = 5/36",
        color: INDIGO,
    },
    {
        id: "leafNeither",
        y: 360,
        from: NODE_TEAL_NO,
        branchId: "branchNeither",
        stageOneId: "stageOneNo",
        secondOutcome: (indigo) => `indigo not ${indigo}`,
        secondFraction: "5/6",
        name: "Neither",
        product: "5/6 of 5/6 = 25/36",
        color: INK_STRUCTURE,
    },
];

/** Which branches light up for each thing the reader can point at. */
function poppedParts(active: string): Set<string> {
    if (active === "tealRow") return new Set(["stageOneYes"]);
    if (active === "indigoColumn") return new Set(["branchBoth", "branchIndigoOnly"]);
    const leafId = active === "bothSquare" ? "leafBoth" : active;
    const leaf = TREE_LEAVES.find((candidate) => candidate.id === leafId);
    if (!leaf) return new Set();
    return new Set([leaf.stageOneId, leaf.branchId, leaf.id]);
}

/** Midpoint of a branch, used to anchor its label. */
const midpoint = (from: [number, number], to: [number, number]): [number, number] => [
    (from[0] + to[0]) / 2,
    (from[1] + to[1]) / 2,
];

function BothDiceTreeDrawing() {
    const tealFace = useVar<number>("bothTealFace", 3);
    const indigoFace = useVar<number>("bothIndigoFace", 5);
    const { active, pinned, setHover, togglePin } = useBothHighlight();

    const popped = poppedParts(active);
    const dimFor = (id: string) => (active && !popped.has(id) ? 0.35 : 1);
    const heavy = (id: string) => popped.has(id);

    const branch = (id: string, from: [number, number], to: [number, number], color: string) => (
        <g key={id} opacity={dimFor(id)} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
            {heavy(id) && (
                <line
                    x1={from[0]}
                    y1={from[1]}
                    x2={to[0]}
                    y2={to[1]}
                    stroke={color}
                    strokeWidth="10"
                    opacity={0.28}
                    strokeLinecap="round"
                />
            )}
            <line
                x1={from[0]}
                y1={from[1]}
                x2={to[0]}
                y2={to[1]}
                stroke={color}
                strokeWidth={heavy(id) ? 4.5 : 2.5}
                strokeLinecap="round"
                style={{ transition: "stroke-width 150ms ease-out" }}
            />
        </g>
    );

    return (
        <svg
            viewBox={`0 0 ${VIEW} ${TREE_VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A two stage tree diagram: the teal die branches into two, then the indigo die branches again, giving four branch ends"
        >
            {/* Branches */}
            {branch("stageOneYes", ROOT, NODE_TEAL_YES, TEAL)}
            {branch("stageOneNo", ROOT, NODE_TEAL_NO, INK_STRUCTURE)}
            {TREE_LEAVES.map((leaf) => branch(leaf.branchId, leaf.from, [LEAF_X, leaf.y], leaf.color))}

            {/* First stage: what the teal die does */}
            <g pointerEvents="none" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
                <g opacity={dimFor("stageOneYes")} style={{ transition: "opacity 150ms ease-out" }}>
                    <text x={midpoint(ROOT, NODE_TEAL_YES)[0]} y={134} fill={TEAL} fontSize="12" fontWeight={600}>
                        {`teal = ${tealFace}`}
                    </text>
                    <text x={midpoint(ROOT, NODE_TEAL_YES)[0]} y={150} fill={TEAL} fontSize="13" fontWeight={700}>
                        1/6
                    </text>
                </g>
                <g opacity={dimFor("stageOneNo")} style={{ transition: "opacity 150ms ease-out" }}>
                    <text x={midpoint(ROOT, NODE_TEAL_NO)[0]} y={280} fill={INK_STRUCTURE} fontSize="13" fontWeight={700}>
                        5/6
                    </text>
                    <text x={midpoint(ROOT, NODE_TEAL_NO)[0]} y={298} fill={INK_STRUCTURE} fontSize="12">
                        {`teal not ${tealFace}`}
                    </text>
                </g>
            </g>

            {/* Second stage: what the indigo die does, on each of the four branches */}
            <g pointerEvents="none" textAnchor="middle" style={{ fontVariantNumeric: "tabular-nums" }}>
                {TREE_LEAVES.map((leaf) => {
                    const [midX, midY] = midpoint(leaf.from, [LEAF_X, leaf.y]);
                    const above = leaf.y < leaf.from[1];
                    const fractionY = above ? midY - 11 : midY + 21;
                    const outcomeY = above ? midY - 29 : midY + 39;
                    return (
                        <g
                            key={`stage-two-${leaf.id}`}
                            opacity={dimFor(leaf.branchId)}
                            style={{ transition: "opacity 150ms ease-out" }}
                        >
                            <text x={midX} y={fractionY} fill={leaf.color} fontSize="13" fontWeight={700}>
                                {leaf.secondFraction}
                            </text>
                            <text x={midX} y={outcomeY} fill={leaf.color} fontSize="12">
                                {leaf.secondOutcome(indigoFace)}
                            </text>
                        </g>
                    );
                })}
            </g>

            {/* Nodes */}
            <g pointerEvents="none">
                <circle cx={ROOT[0]} cy={ROOT[1]} r="6" fill={INK_STRUCTURE} opacity={active ? 0.35 : 1} />
                <circle cx={NODE_TEAL_YES[0]} cy={NODE_TEAL_YES[1]} r="6" fill={TEAL} opacity={dimFor("stageOneYes")} />
                <circle cx={NODE_TEAL_NO[0]} cy={NODE_TEAL_NO[1]} r="6" fill={INK_STRUCTURE} opacity={dimFor("stageOneNo")} />
                <text
                    x={ROOT[0]}
                    y={240}
                    fill={INK_STRUCTURE}
                    fontSize="12"
                    textAnchor="middle"
                    opacity={active ? 0.35 : 1}
                >
                    Roll
                </text>
            </g>

            {/* Branch ends — hover or click one to shade its squares on the grid above */}
            {TREE_LEAVES.map((leaf) => (
                <g key={leaf.id}>
                    <g opacity={dimFor(leaf.id)} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                        {heavy(leaf.id) && <circle cx={LEAF_X} cy={leaf.y} r="15" fill={leaf.color} opacity={0.28} />}
                        <circle cx={LEAF_X} cy={leaf.y} r={heavy(leaf.id) ? 9 : 7} fill={leaf.color} />
                        <text
                            x={LEAF_LABEL_X}
                            y={leaf.y - 4}
                            fill={INK}
                            fontSize="13"
                            fontWeight={heavy(leaf.id) ? 700 : 600}
                        >
                            {leaf.name}
                        </text>
                        <text
                            x={LEAF_LABEL_X}
                            y={leaf.y + 14}
                            fill={leaf.color}
                            fontSize="12"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                            {leaf.product}
                        </text>
                        {pinned === leaf.id && (
                            <rect
                                x={392}
                                y={leaf.y - 20}
                                width={140}
                                height={40}
                                rx="8"
                                fill="none"
                                stroke={leaf.color}
                                strokeWidth="2"
                            />
                        )}
                    </g>
                    <rect
                        x={366}
                        y={leaf.y - 22}
                        width={166}
                        height={44}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onPointerEnter={() => setHover(leaf.id)}
                        onPointerLeave={() => setHover("")}
                        onClick={() => togglePin(leaf.id)}
                    />
                </g>
            ))}

            <text x={280} y={404} fill={INK_STRUCTURE} fontSize="12" textAnchor="middle">
                Click a branch end to shade its squares on the grid above
            </text>
        </svg>
    );
}

function BothDiceTreeFigure() {
    const setVar = useSetVar();
    return (
        <Figure
            id="both-dice-tree"
            onReset={() => {
                setVar("bothLeafPinned", "");
                setVar("bothHighlight", "");
            }}
            caption="Multiplying along the branches. The teal die splits the roll in two, the indigo die splits each half again, and the four branch ends account for all 36 squares."
        >
            <BothDiceTreeDrawing />
            <InteractionHintSequence
                hintKey="both-dice-tree-leaves"
                steps={[
                    {
                        gesture: "click",
                        label: "Click a branch end",
                        position: { x: "68%", y: "14%" },
                    },
                ]}
            />
        </Figure>
    );
}

// ─────────────────────────────────────────────────────────────────────────────

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
                a 6 is a far thinner ask. Drag the markers on the grid and watch how many
                squares survive both demands.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-figure" maxWidth="xl">
        <Block id="both-dice-figure" padding="sm" hasVisualization>
            <BothDiceFigure />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-tree-lead" maxWidth="xl">
        <Block id="both-dice-tree-lead" padding="sm">
            <EditableParagraph id="para-both-dice-tree-lead" blockId="both-dice-tree-lead">
                A{" "}
                <InlineTooltip
                    id="tooltip-both-dice-tree-diagram"
                    tooltip="A branching picture of a two stage experiment: each branch is one outcome of a stage, labelled with its probability."
                    color="#2563EB"
                    bgColor="rgba(37, 99, 235, 0.12)"
                >
                    tree diagram
                </InlineTooltip>{" "}
                tells the same story by branching instead of counting. The{" "}
                <InlineSpotColor id="spot-both-dice-tree-teal-die" varName="bothTealFace" {...spotColorPropsFromDefinition(getVariableInfo('bothTealFace'))}>
                    teal die
                </InlineSpotColor>{" "}
                splits the roll into two branches, the{" "}
                <InlineSpotColor id="spot-both-dice-tree-indigo-die" varName="bothIndigoFace" {...spotColorPropsFromDefinition(getVariableInfo('bothIndigoFace'))}>
                    indigo die
                </InlineSpotColor>{" "}
                splits each of those again, and clicking any branch end below shades exactly the squares it
                owns on the grid above.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-tree-figure" maxWidth="xl">
        <Block id="both-dice-tree-figure" padding="sm" hasVisualization>
            <BothDiceTreeFigure />
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
                leaves{" "}
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
                , and indigo{" "}
                <InlineScrubbleNumber
                    varName="bothIndigoFace"
                    {...numberPropsFromDefinition(getVariableInfo('bothIndigoFace'))}
                />{" "}
                cuts that row down to{" "}
                <InlineLinkedHighlight
                    id="link-both-dice-square"
                    varName="bothHighlight"
                    highlightId="bothSquare"
                    {...linkedHighlightPropsFromDefinition(getVariableInfo('bothHighlight'))}
                >
                    one square out of 36
                </InlineLinkedHighlight>
                .{" "}
                <InlineTrigger
                    id="trigger-both-dice-top-path"
                    varName="bothLeafPinned"
                    value="leafBoth"
                    color="#F7B23B"
                    bgColor="rgba(247, 178, 59, 0.18)"
                >
                    The tree reaches it
                </InlineTrigger>{" "}
                by multiplying,{" "}
                <InlineFormula
                    id="formula-both-dice-sixth-of-sixth"
                    latex="\clr{teal}{\tfrac{1}{6}} \text{ of } \clr{indigo}{\tfrac{1}{6}}"
                    colorMap={{ teal: "#62D0AD", indigo: "#8E90F5" }}
                />
                , and the four branch ends add back up to the whole grid.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-product-formula" maxWidth="xl">
        <Block id="both-dice-product-formula" padding="md">
            <FormulaBlock
                latex="P(\clr{teal}{\text{teal}}\ \scrub{bothTealFace} \text{ and } \clr{indigo}{\text{indigo}}\ \scrub{bothIndigoFace}) = \clr{teal}{\frac{1}{6}} \times \clr{indigo}{\frac{1}{6}} = \clr{both}{\frac{1}{36}}"
                colorMap={{ teal: "#62D0AD", indigo: "#8E90F5", both: "#F7B23B" }}
                variables={scrubVarsFromDefinitions(["bothTealFace", "bothIndigoFace"])}
            />
        </Block>
    </StackLayout>,

    <StackLayout key="layout-both-dice-question-double-six" maxWidth="xl">
        <Block id="both-dice-question-double-six" padding="sm">
            <EditableParagraph id="para-both-dice-question-double-six" blockId="both-dice-question-double-six">
                So for the roll every board game player waits for,{" "}
                <InlineFormula
                    id="formula-both-dice-double-six"
                    latex="P(\clr{both}{\text{both dice show a 6}}) ="
                    colorMap={{ both: "#F7B23B" }}
                />{" "}
                <InlineFeedback
                    varName="answerDoubleSix"
                    correctValue="1/36"
                    position="terminal"
                    successMessage="— exactly, one square in the whole grid, and the top path of the tree says the same thing"
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
                Widen each band to two faces instead of one, and{" "}
                <InlineFormula
                    id="formula-both-dice-below-three"
                    latex="P(\clr{both}{\text{both dice show a number below 3}}) ="
                    colorMap={{ both: "#F7B23B" }}
                />{" "}
                <InlineFeedback
                    varName="answerBothBelowThree"
                    correctValue={["4/36", "1/9"]}
                    position="terminal"
                    successMessage="— yes, two rows crossing two columns pen in a block of four squares, and 2/6 of 2/6 agrees"
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
