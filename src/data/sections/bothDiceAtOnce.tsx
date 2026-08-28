import React, { useRef, useState, type ReactElement } from "react";
import { SplitLayout, StackLayout } from "@/components/layouts";
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
import { AMBER, DIE_FACES, INDIGO, INK, INK_QUIET, INK_STRUCTURE, TEAL } from "./diceGridGeometry";

/**
 * The grid and the tree sit side by side in half-width columns, so both use
 * their own compact 360-wide canvas rather than the full-width geometry of the
 * earlier sections. Everything they share travels through the variable store.
 */
const VIEW = 360;
const VIEW_HEIGHT = 476;

// ── Grid geometry (compact) ─────────────────────────────────────────────────
const CELL = 40;
const GRID = CELL * 6; // 240
const ORIGIN_X = 90;
const ORIGIN_Y = 100;
const ROW_HANDLE_X = ORIGIN_X - 24; // 66
const COLUMN_HANDLE_Y = ORIGIN_Y - 24; // 76
const HANDLE_RADIUS = 12;

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
// The grid: two bands crossing in exactly one square
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
            viewBox={`0 0 ${VIEW} ${VIEW_HEIGHT}`}
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
                <text x={ORIGIN_X + GRID / 2} y={44} fill={INK_STRUCTURE} fontSize="11" textAnchor="middle">
                    Indigo die
                </text>
                <text
                    x={32}
                    y={ORIGIN_Y + GRID / 2}
                    fill={INK_STRUCTURE}
                    fontSize="11"
                    textAnchor="middle"
                    transform={`rotate(-90 32 ${ORIGIN_Y + GRID / 2})`}
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
                    y={rowCentre + 4}
                    fill={INK}
                    fontSize="12"
                    fontWeight={700}
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {`${tealFace},${indigoFace}`}
                </text>
            </g>

            {/* Squares owned by the branch end the reader is pointing at */}
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
                        y={cellCentreY(face) + 4}
                        fill={INK_STRUCTURE}
                        fontSize="12"
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
                    y={rowCentre + 4}
                    fill="#FFFFFF"
                    fontSize="12"
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
                        y={COLUMN_HANDLE_Y + 4}
                        fill={INK_STRUCTURE}
                        fontSize="12"
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
                    y={COLUMN_HANDLE_Y + 4}
                    fill="#FFFFFF"
                    fontSize="12"
                    fontWeight={700}
                    textAnchor="middle"
                    style={{ fontVariantNumeric: "tabular-nums" }}
                >
                    {indigoFace}
                </text>
            </g>

            {/* Readout below the drawing */}
            <g
                opacity={active ? 0.35 : 1}
                style={{ transition: "opacity 150ms ease-out", fontVariantNumeric: "tabular-nums" }}
                pointerEvents="none"
                textAnchor="middle"
            >
                <text x={180} y={374} fill={TEAL} fontSize="11">
                    Teal alone: 6 of 36
                </text>
                <text x={180} y={394} fill={INDIGO} fontSize="11">
                    Indigo alone: 6 of 36
                </text>
                <text x={180} y={424} fill={AMBER} fontSize="15" fontWeight={700}>
                    Both: 1 of 36
                </text>
                <text x={180} y={448} fill={INK_STRUCTURE} fontSize="11">
                    1/6 of 1/6 = 1/36
                </text>
            </g>

            {/* Drag strip for the teal face */}
            <rect
                x={ORIGIN_X - 40}
                y={ORIGIN_Y}
                width={34}
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
                y={ORIGIN_Y - 40}
                width={GRID}
                height={34}
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
            caption="Counting. The teal band holds every roll where the teal die obliges, the indigo band does the same for the indigo die, and the two cross in one square."
        >
            <BothDiceDrawing />
            <InteractionHintSequence
                hintKey="both-dice-handles"
                currentStep={tealFace === 3 ? 0 : 1}
                steps={[
                    {
                        gesture: "drag-vertical",
                        label: "Drag the teal marker to another row",
                        position: { x: "18%", y: "42%" },
                        dragPath: { type: "line", startOffset: { x: 0, y: -22 }, endOffset: { x: 0, y: 22 } },
                    },
                    {
                        gesture: "drag-horizontal",
                        label: "Now drag the indigo marker across",
                        position: { x: "75%", y: "16%" },
                        dragPath: { type: "line", startOffset: { x: -22, y: 0 }, endOffset: { x: 22, y: 0 } },
                    },
                ]}
            />
        </Figure>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// The tree: the same fact told by multiplying instead of counting
// ─────────────────────────────────────────────────────────────────────────────

const ROOT: [number, number] = [44, 220];
const NODE_TEAL_YES: [number, number] = [150, 120];
const NODE_TEAL_NO: [number, number] = [150, 320];
const LEAF_X = 236;
const LEAF_LABEL_X = 248;

interface TreeLeaf {
    id: string;
    y: number;
    from: [number, number];
    branchId: string;
    name: string;
    value: string;
    color: string;
}

const TREE_LEAVES: TreeLeaf[] = [
    { id: "leafBoth", y: 70, from: NODE_TEAL_YES, branchId: "branchBoth", name: "Both", value: "1/36", color: AMBER },
    { id: "leafTealOnly", y: 170, from: NODE_TEAL_YES, branchId: "branchTealOnly", name: "Teal only", value: "5/36", color: TEAL },
    { id: "leafIndigoOnly", y: 270, from: NODE_TEAL_NO, branchId: "branchIndigoOnly", name: "Indigo only", value: "5/36", color: INDIGO },
    { id: "leafNeither", y: 370, from: NODE_TEAL_NO, branchId: "branchNeither", name: "Neither", value: "25/36", color: INK_STRUCTURE },
];

/** Which branches light up for each thing the reader can point at. */
function poppedParts(active: string): Set<string> {
    if (active === "tealRow") return new Set(["stageOneYes"]);
    if (active === "indigoColumn") return new Set(["branchBoth", "branchIndigoOnly"]);
    const leafId = active === "bothSquare" ? "leafBoth" : active;
    const leaf = TREE_LEAVES.find((candidate) => candidate.id === leafId);
    if (!leaf) return new Set();
    const stageOne = leaf.from === NODE_TEAL_YES ? "stageOneYes" : "stageOneNo";
    return new Set([stageOne, leaf.branchId, leaf.id]);
}

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
                    strokeWidth="9"
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
                strokeWidth={heavy(id) ? 4 : 2}
                strokeLinecap="round"
                style={{ transition: "stroke-width 150ms ease-out" }}
            />
        </g>
    );

    return (
        <svg
            viewBox={`0 0 ${VIEW} ${VIEW_HEIGHT}`}
            className="block w-full"
            role="img"
            aria-label="A two stage tree diagram for the teal die and then the indigo die, with four branch ends"
        >
            <g opacity={active ? 0.35 : 1} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none" fontSize="11">
                <text x={150} y={44} fill={INK_STRUCTURE} textAnchor="middle">Teal die</text>
                <text x={LEAF_X} y={44} fill={INK_STRUCTURE} textAnchor="middle">Indigo die</text>
                <text x={ROOT[0]} y={250} fill={INK_STRUCTURE} textAnchor="middle">Start</text>
            </g>

            {branch("stageOneYes", ROOT, NODE_TEAL_YES, TEAL)}
            {branch("stageOneNo", ROOT, NODE_TEAL_NO, INK_STRUCTURE)}
            {TREE_LEAVES.map((leaf) => branch(leaf.branchId, leaf.from, [LEAF_X, leaf.y], leaf.color))}

            {/* Branch probabilities, each with the outcome it stands for */}
            <g style={{ fontVariantNumeric: "tabular-nums" }} pointerEvents="none" textAnchor="middle">
                <text x={97} y={160} fill={TEAL} fontSize="11" fontWeight={600} opacity={dimFor("stageOneYes")}>1/6</text>
                <text x={97} y={288} fill={INK_STRUCTURE} fontSize="11" opacity={dimFor("stageOneNo")}>5/6</text>

                <text x={193} y={84} fill={INDIGO} fontSize="11" fontWeight={600} opacity={dimFor("branchBoth")}>1/6</text>
                <text x={193} y={68} fill={INDIGO} fontSize="9" opacity={dimFor("branchBoth")}>
                    {`indigo = ${indigoFace}`}
                </text>

                <text x={193} y={164} fill={INK_STRUCTURE} fontSize="11" opacity={dimFor("branchTealOnly")}>5/6</text>
                <text x={193} y={180} fill={INK_STRUCTURE} fontSize="9" opacity={dimFor("branchTealOnly")}>
                    {`indigo not ${indigoFace}`}
                </text>

                <text x={193} y={284} fill={INDIGO} fontSize="11" opacity={dimFor("branchIndigoOnly")}>1/6</text>
                <text x={193} y={268} fill={INDIGO} fontSize="9" opacity={dimFor("branchIndigoOnly")}>
                    {`indigo = ${indigoFace}`}
                </text>

                <text x={193} y={364} fill={INK_STRUCTURE} fontSize="11" opacity={dimFor("branchNeither")}>5/6</text>
                <text x={193} y={380} fill={INK_STRUCTURE} fontSize="9" opacity={dimFor("branchNeither")}>
                    {`indigo not ${indigoFace}`}
                </text>
            </g>

            {/* Stage one nodes */}
            <g style={{ fontVariantNumeric: "tabular-nums" }} pointerEvents="none" textAnchor="middle">
                <text x={150} y={104} fill={TEAL} fontSize="11" fontWeight={600} opacity={dimFor("stageOneYes")}>
                    {`teal = ${tealFace}`}
                </text>
                <text x={150} y={344} fill={INK_STRUCTURE} fontSize="11" opacity={dimFor("stageOneNo")}>
                    {`teal not ${tealFace}`}
                </text>
                <circle cx={NODE_TEAL_YES[0]} cy={NODE_TEAL_YES[1]} r="5" fill={TEAL} opacity={dimFor("stageOneYes")} />
                <circle cx={NODE_TEAL_NO[0]} cy={NODE_TEAL_NO[1]} r="5" fill={INK_STRUCTURE} opacity={dimFor("stageOneNo")} />
                <circle cx={ROOT[0]} cy={ROOT[1]} r="5" fill={INK_STRUCTURE} opacity={active ? 0.35 : 1} />
            </g>

            {/* Branch ends — click one to hold its squares on the grid */}
            {TREE_LEAVES.map((leaf) => (
                <g key={leaf.id}>
                    <g opacity={dimFor(leaf.id)} style={{ transition: "opacity 150ms ease-out" }} pointerEvents="none">
                        {heavy(leaf.id) && <circle cx={LEAF_X} cy={leaf.y} r="13" fill={leaf.color} opacity={0.28} />}
                        <circle cx={LEAF_X} cy={leaf.y} r={heavy(leaf.id) ? 8 : 6} fill={leaf.color} />
                        <text x={LEAF_LABEL_X} y={leaf.y - 4} fill={INK} fontSize="12" fontWeight={heavy(leaf.id) ? 700 : 600}>
                            {leaf.name}
                        </text>
                        <text
                            x={LEAF_LABEL_X}
                            y={leaf.y + 13}
                            fill={leaf.color}
                            fontSize="11"
                            style={{ fontVariantNumeric: "tabular-nums" }}
                        >
                            {leaf.value}
                        </text>
                        {pinned === leaf.id && (
                            <rect
                                x={242}
                                y={leaf.y - 19}
                                width={92}
                                height={38}
                                rx="8"
                                fill="none"
                                stroke={leaf.color}
                                strokeWidth="2"
                            />
                        )}
                    </g>
                    <rect
                        x={224}
                        y={leaf.y - 20}
                        width={112}
                        height={40}
                        fill="transparent"
                        style={{ cursor: "pointer" }}
                        onPointerEnter={() => setHover(leaf.id)}
                        onPointerLeave={() => setHover("")}
                        onClick={() => togglePin(leaf.id)}
                    />
                </g>
            ))}

            <text x={180} y={424} fill={INK_STRUCTURE} fontSize="11" textAnchor="middle">
                Click a branch end to hold its squares
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
            caption="Multiplying. The same two rolls as a tree, where the fractions along a path multiply to the share of the 36 squares that path owns."
        >
            <BothDiceTreeDrawing />
            <InteractionHintSequence
                hintKey="both-dice-tree-leaves"
                steps={[
                    {
                        gesture: "click",
                        label: "Click a branch end",
                        position: { x: "78%", y: "15%" },
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
                a 6 is a far thinner ask. Drag the markers on the grid to choose the two
                faces, then click a branch end on the tree beside it to see which squares
                that outcome owns.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <SplitLayout key="layout-both-dice-pair" ratio="1:1" gap="lg" align="start">
        <Block id="both-dice-figure" padding="sm" hasVisualization>
            <BothDiceFigure />
        </Block>
        <Block id="both-dice-tree-figure" padding="sm" hasVisualization>
            <BothDiceTreeFigure />
        </Block>
    </SplitLayout>,

    <StackLayout key="layout-both-dice-reflect" maxWidth="xl">
        <Block id="both-dice-reflect" padding="sm">
            <EditableParagraph id="para-both-dice-reflect" blockId="both-dice-reflect">
                Always one. The grid counts: asking for teal{" "}
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
                . The tree gets there by multiplying instead, 1/6 along the first branch and
                1/6 along the second, and 1/6 of 1/6 is that very same 1/36.
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
                                position: { x: "18%", y: "42%" },
                                dragPath: { type: "line", startOffset: { x: 0, y: -20 }, endOffset: { x: 0, y: 24 } },
                                completionVar: "bothTealFace",
                                completionValue: 6,
                                completionTolerance: 0,
                            },
                            {
                                gesture: "drag-horizontal",
                                label: "Now drag the indigo marker across to 6 and count the crossing squares",
                                position: { x: "75%", y: "16%" },
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
