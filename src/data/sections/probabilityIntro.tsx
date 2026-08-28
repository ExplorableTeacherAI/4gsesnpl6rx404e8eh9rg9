import { type ReactElement } from "react";
import { StackLayout } from "@/components/layouts";
import { Block } from "@/components/templates";
import { EditableH1, EditableParagraph } from "@/components/atoms";

export const probabilityIntroBlocks: ReactElement[] = [
    <StackLayout key="layout-two-dice-title" maxWidth="xl">
        <Block id="two-dice-title" padding="md">
            <EditableH1 id="h1-two-dice-title" blockId="two-dice-title">
                Two Dice, One Total
            </EditableH1>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-two-dice-hook" maxWidth="xl">
        <Block id="two-dice-hook" padding="sm">
            <EditableParagraph id="para-two-dice-hook" blockId="two-dice-hook">
                Board game night always ends the same way. Someone needs a total of 7 to
                reach the last square, shakes both dice, and the whole table goes quiet.
                Nobody at that table wants a total of 2, and everybody knows it, but ask
                them why and the answers get vague fast.
            </EditableParagraph>
        </Block>
    </StackLayout>,

    <StackLayout key="layout-two-dice-promise" maxWidth="xl">
        <Block id="two-dice-promise" padding="sm">
            <EditableParagraph id="para-two-dice-promise" blockId="two-dice-promise">
                You can already work out the chance of one die landing on a 4, and you can
                already list every outcome of a single roll. Two dice feel harder only
                because there are two things to keep track of at once. In the next few
                minutes you will draw one grid, count squares on it, and read off the
                probability of any total you want.
            </EditableParagraph>
        </Block>
    </StackLayout>,
];
