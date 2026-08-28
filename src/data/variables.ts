/**
 * Variables Configuration
 * =======================
 * 
 * CENTRAL PLACE TO DEFINE ALL SHARED VARIABLES
 * 
 * This file defines all variables that can be shared across sections.
 * AI agents should read this file to understand what variables are available.
 * 
 * USAGE:
 * 1. Define variables here with their default values and metadata
 * 2. Use them in any section with: const x = useVar('variableName', defaultValue)
 * 3. Update them with: setVar('variableName', newValue)
 */

import { type VarValue } from '@/stores';

/**
 * Variable definition with metadata
 */
export interface VariableDefinition {
    /** Default value */
    defaultValue: VarValue;
    /** Human-readable label */
    label?: string;
    /** Description for AI agents */
    description?: string;
    /** Variable type hint */
    type?: 'number' | 'text' | 'boolean' | 'select' | 'array' | 'object' | 'spotColor' | 'linkedHighlight';
    /** Unit (e.g., 'Hz', '°', 'm/s') - for numbers */
    unit?: string;
    /** Minimum value (for number sliders) */
    min?: number;
    /** Maximum value (for number sliders) */
    max?: number;
    /** Step increment (for number sliders) */
    step?: number;
    /** Display color for InlineScrubbleNumber / InlineSpotColor (e.g. '#D81B60') */
    color?: string;
    /** Options for 'select' type variables */
    options?: string[];
    /** Placeholder text for text inputs */
    placeholder?: string;
    /**
     * Correct answer for cloze input validation.
     * Accepts a single string, pipe-separated alternates (e.g. "first | 1 | 1st"),
     * or an array of accepted answers (e.g. ["first", "1", "1st"]).
     */
    correctAnswer?: string | string[];
    /** Whether cloze matching is case sensitive */
    caseSensitive?: boolean;
    /** Background color for inline components */
    bgColor?: string;
    /** Schema hint for object types (for AI agents) */
    schema?: string;
}

/**
 * =====================================================
 * 🎯 DEFINE YOUR VARIABLES HERE
 * =====================================================
 * 
 * SUPPORTED TYPES:
 * 
 * 1. NUMBER (slider):
 *    { defaultValue: 5, type: 'number', min: 0, max: 10, step: 1 }
 * 
 * 2. TEXT (free text):
 *    { defaultValue: 'Hello', type: 'text', placeholder: 'Enter text...' }
 * 
 * 3. SELECT (dropdown):
 *    { defaultValue: 'sine', type: 'select', options: ['sine', 'cosine', 'tangent'] }
 * 
 * 4. BOOLEAN (toggle):
 *    { defaultValue: true, type: 'boolean' }
 * 
 * 5. ARRAY (list of numbers):
 *    { defaultValue: [1, 2, 3], type: 'array' }
 * 
 * 6. OBJECT (complex data):
 *    { defaultValue: { x: 5, y: 10 }, type: 'object', schema: '{ x: number, y: number }' }
 */
export const variableDefinitions: Record<string, VariableDefinition> = {
    // ========================================
    // SECTION 2 — Every Roll on One Grid
    // ========================================
    tealDie: {
        defaultValue: 3,
        type: 'number',
        label: 'Teal die',
        description: 'Value shown by the teal die (the row of the possibility grid)',
        min: 1,
        max: 6,
        step: 1,
        color: '#62D0AD',
    },
    indigoDie: {
        defaultValue: 4,
        type: 'number',
        label: 'Indigo die',
        description: 'Value shown by the indigo die (the column of the possibility grid)',
        min: 1,
        max: 6,
        step: 1,
        color: '#8E90F5',
    },
    gridVisitedCells: {
        defaultValue: [],
        type: 'array',
        label: 'Visited grid squares',
        description: 'Indices of the possibility-grid squares the student has landed on',
    },
    gridAxisHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Grid axis highlight',
        description: 'Which guide of the possibility grid the prose is pointing at',
        color: '#334155',
        bgColor: 'rgba(51, 65, 85, 0.15)',
    },
    answerTotalFourCount: {
        defaultValue: '',
        type: 'text',
        label: 'Squares giving a total of four',
        description: 'Student answer for how many squares give a total of 4',
        placeholder: '???',
        correctAnswer: '3',
        color: '#62D0AD',
    },
    answerTotalFourProbability: {
        defaultValue: '',
        type: 'text',
        label: 'Probability of a total of four',
        description: 'Student answer for P(total of 4)',
        placeholder: '???',
        correctAnswer: ['3/36', '1/12'],
        color: '#62D0AD',
    },

    // ========================================
    // SECTION 3 — (2,5) and (5,2) Are Different Rolls
    // ========================================
    sevenGuess: {
        defaultValue: 0,
        type: 'number',
        label: 'Guess for sevens',
        description: 'How many squares the student predicts give a total of 7 (0 means not guessed yet)',
        min: 0,
        max: 11,
        step: 1,
        color: '#F7B23B',
    },
    sevenRevealed: {
        defaultValue: false,
        type: 'boolean',
        label: 'Sevens revealed',
        description: 'Whether the student has committed to a guess and seen the matching squares',
    },
    targetTotal: {
        defaultValue: 7,
        type: 'number',
        label: 'Target total',
        description: 'The two-dice total whose squares are highlighted on the grid',
        min: 2,
        max: 12,
        step: 1,
        color: '#62D0AD',
    },
    mirrorHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Mirror pair highlight',
        description: 'Which mirror pair of the grid the prose is pointing at',
        color: '#8E90F5',
        bgColor: 'rgba(142, 144, 245, 0.2)',
    },
    answerTotalNineCount: {
        defaultValue: '',
        type: 'text',
        label: 'Squares giving a total of nine',
        description: 'Student answer for how many squares give a total of 9',
        placeholder: '???',
        correctAnswer: '4',
        color: '#62D0AD',
    },
    answerTotalFiveProbability: {
        defaultValue: '',
        type: 'text',
        label: 'Probability of a total of five',
        description: 'Student answer for P(total of 5)',
        placeholder: '???',
        correctAnswer: ['4/36', '1/9'],
        color: '#62D0AD',
    },

    // ========================================
    // SECTION 5 — Both Dice at Once
    // ========================================
    bothTealFace: {
        defaultValue: 3,
        type: 'number',
        label: 'Required teal face',
        description: 'The face the teal die must show for the both-dice event',
        min: 1,
        max: 6,
        step: 1,
        color: '#62D0AD',
    },
    bothIndigoFace: {
        defaultValue: 5,
        type: 'number',
        label: 'Required indigo face',
        description: 'The face the indigo die must show for the both-dice event',
        min: 1,
        max: 6,
        step: 1,
        color: '#8E90F5',
    },
    bothHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Both-dice highlight',
        description: 'Which band or square of the both-dice grid the prose is pointing at',
        color: '#F7B23B',
        bgColor: 'rgba(247, 178, 59, 0.2)',
    },
    answerDoubleSix: {
        defaultValue: '',
        type: 'text',
        label: 'Probability of a double six',
        description: 'Student answer for P(both dice show a 6)',
        placeholder: '???',
        correctAnswer: ['1/36'],
        color: '#62D0AD',
    },
    answerBothBelowThree: {
        defaultValue: '',
        type: 'text',
        label: 'Probability both dice are below three',
        description: 'Student answer for P(both dice show a number below 3)',
        placeholder: '???',
        correctAnswer: ['4/36', '1/9'],
        color: '#62D0AD',
    },

    // ========================================
    // SECTION 4 — Count Squares, Don't Add Chances
    // ========================================
    sixShadedCells: {
        defaultValue: [],
        type: 'array',
        label: 'Shaded squares',
        description: 'Indices of the grid squares the student has shaded for the at-least-one-six task',
    },
    sixTaskStatus: {
        defaultValue: 'pending',
        type: 'text',
        label: 'Shading task status',
        description: 'pending, partial, over or correct for the at-least-one-six shading task',
    },
    sixOverlapHighlight: {
        defaultValue: '',
        type: 'linkedHighlight',
        label: 'Overlap square highlight',
        description: 'Points the prose at the square where both dice show a six',
        color: '#F7B23B',
        bgColor: 'rgba(247, 178, 59, 0.2)',
    },
    answerDoubleCountReason: {
        defaultValue: '',
        type: 'select',
        label: 'Why adding overshoots',
        description: 'Student answer for why 1/6 + 1/6 gives one square too many',
        placeholder: '???',
        correctAnswer: 'counted twice',
        options: ['counted twice', 'impossible to roll', 'worth double', 'missing from the grid'],
        color: '#8E90F5',
    },
    answerAtLeastOneFive: {
        defaultValue: '',
        type: 'text',
        label: 'Probability of at least one five',
        description: 'Student answer for P(at least one die shows a 5)',
        placeholder: '???',
        correctAnswer: ['11/36'],
        color: '#62D0AD',
    },

    // Uncomment and modify these examples for your lesson:

    /*
    // ─────────────────────────────────────────
    // NUMBER - Use with sliders
    // ─────────────────────────────────────────
    myValue: {
        defaultValue: 5,
        type: 'number',
        label: 'My Value',
        description: 'A number that controls something',
        unit: 'm',           // optional unit display
        min: 0,
        max: 10,
        step: 0.5,
    },

    // ─────────────────────────────────────────
    // TEXT - Free text input
    // ─────────────────────────────────────────
    lessonTitle: {
        defaultValue: 'My Lesson',
        type: 'text',
        label: 'Lesson Title',
        description: 'The title of your lesson',
        placeholder: 'Enter a title...',
    },

    // ─────────────────────────────────────────
    // SELECT - Dropdown with options
    // ─────────────────────────────────────────
    difficulty: {
        defaultValue: 'medium',
        type: 'select',
        label: 'Difficulty',
        description: 'The difficulty level of the lesson',
        options: ['easy', 'medium', 'hard', 'expert'],
    },

    // ─────────────────────────────────────────
    // BOOLEAN - Toggle switch
    // ─────────────────────────────────────────
    showHints: {
        defaultValue: true,
        type: 'boolean',
        label: 'Show Hints',
        description: 'Toggle to show or hide hints',
    },

    // ─────────────────────────────────────────
    // ARRAY - List of numbers
    // ─────────────────────────────────────────
    dataPoints: {
        defaultValue: [1, 4, 9, 16, 25],
        type: 'array',
        label: 'Data Points',
        description: 'Y-values for plotting a graph',
    },

    // ─────────────────────────────────────────
    // OBJECT - Complex structured data
    // ─────────────────────────────────────────
    graphSettings: {
        defaultValue: { 
            xMin: -10, 
            xMax: 10, 
            showGrid: true 
        },
        type: 'object',
        label: 'Graph Settings',
        description: 'Configuration for the graph display',
        schema: '{ xMin: number, xMax: number, showGrid: boolean }',
    },
    */
};

/**
 * Get all variable names (for AI agents to discover)
 */
export const getVariableNames = (): string[] => {
    return Object.keys(variableDefinitions);
};

/**
 * Get a variable's default value
 */
export const getDefaultValue = (name: string): VarValue => {
    return variableDefinitions[name]?.defaultValue ?? 0;
};

/**
 * Get a variable's metadata
 */
export const getVariableInfo = (name: string): VariableDefinition | undefined => {
    return variableDefinitions[name];
};

/**
 * Get all default values as a record (for initialization)
 */
export const getDefaultValues = (): Record<string, VarValue> => {
    const defaults: Record<string, VarValue> = {};
    for (const [name, def] of Object.entries(variableDefinitions)) {
        defaults[name] = def.defaultValue;
    }
    return defaults;
};

/**
 * Get number props for InlineScrubbleNumber from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
export function numberPropsFromDefinition(def: VariableDefinition | undefined): {
    defaultValue?: number;
    min?: number;
    max?: number;
    step?: number;
    color?: string;
} {
    if (!def || def.type !== 'number') return {};
    return {
        defaultValue: def.defaultValue as number,
        min: def.min,
        max: def.max,
        step: def.step,
        ...(def.color ? { color: def.color } : {}),
    };
}

/**
 * Get cloze input props for InlineClozeInput from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx, or getExampleVariableInfo(name) in exampleBlocks.tsx.
 */
/**
 * Get cloze choice props for InlineClozeChoice from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function choicePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Get toggle props for InlineToggle from a variable definition.
 * Use with getVariableInfo(name) in blocks.tsx.
 */
export function togglePropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    if (!def || def.type !== 'select') return {};
    return {
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

export function clozePropsFromDefinition(def: VariableDefinition | undefined): {
    placeholder?: string;
    color?: string;
    bgColor?: string;
    caseSensitive?: boolean;
} {
    if (!def || def.type !== 'text') return {};
    return {
        ...(def.placeholder ? { placeholder: def.placeholder } : {}),
        ...(def.color ? { color: def.color } : {}),
        ...(def.bgColor ? { bgColor: def.bgColor } : {}),
        ...(def.caseSensitive !== undefined ? { caseSensitive: def.caseSensitive } : {}),
    };
}

/**
 * Get spot-color props for InlineSpotColor from a variable definition.
 * Extracts the `color` field.
 *
 * @example
 * <InlineSpotColor
 *     varName="radius"
 *     {...spotColorPropsFromDefinition(getVariableInfo('radius'))}
 * >
 *     radius
 * </InlineSpotColor>
 */
export function spotColorPropsFromDefinition(def: VariableDefinition | undefined): {
    color: string;
} {
    return {
        color: def?.color ?? '#8B5CF6',
    };
}

/**
 * Get linked-highlight props for InlineLinkedHighlight from a variable definition.
 * Extracts the `color` and `bgColor` fields.
 *
 * @example
 * <InlineLinkedHighlight
 *     varName="activeHighlight"
 *     highlightId="radius"
 *     {...linkedHighlightPropsFromDefinition(getVariableInfo('activeHighlight'))}
 * >
 *     radius
 * </InlineLinkedHighlight>
 */
export function linkedHighlightPropsFromDefinition(def: VariableDefinition | undefined): {
    color?: string;
    bgColor?: string;
} {
    return {
        ...(def?.color ? { color: def.color } : {}),
        ...(def?.bgColor ? { bgColor: def.bgColor } : {}),
    };
}

/**
 * Build the `variables` prop for FormulaBlock from variable definitions.
 *
 * Takes an array of variable names and returns the config map expected by
 * `<FormulaBlock variables={...} />`.
 *
 * @example
 * import { scrubVarsFromDefinitions } from './variables';
 *
 * <FormulaBlock
 *     latex="\scrub{mass} \times \scrub{accel}"
 *     variables={scrubVarsFromDefinitions(['mass', 'accel'])}
 * />
 */
export function scrubVarsFromDefinitions(
    varNames: string[],
): Record<string, { min?: number; max?: number; step?: number; color?: string }> {
    const result: Record<string, { min?: number; max?: number; step?: number; color?: string }> = {};
    for (const name of varNames) {
        const def = variableDefinitions[name];
        if (!def) continue;
        result[name] = {
            ...(def.min !== undefined ? { min: def.min } : {}),
            ...(def.max !== undefined ? { max: def.max } : {}),
            ...(def.step !== undefined ? { step: def.step } : {}),
            ...(def.color ? { color: def.color } : {}),
        };
    }
    return result;
}
