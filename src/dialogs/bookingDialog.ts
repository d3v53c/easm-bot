// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

import { TimexProperty } from '@microsoft/recognizers-text-data-types-timex-expression';
import { InputHints, MessageFactory } from 'botbuilder';
import {
    ChoiceFactory,
    ChoicePrompt,
    ConfirmPrompt,
    DialogTurnResult,
    TextPrompt,
    WaterfallDialog,
    WaterfallStepContext
} from 'botbuilder-dialogs';
import { BookingDetails } from './bookingDetails';
import { CancelAndHelpDialog } from './cancelAndHelpDialog';

const CONFIRM_PROMPT = 'confirmPrompt';
const DATE_RESOLVER_DIALOG = 'dateResolverDialog';
const TEXT_PROMPT = 'textPrompt';
const CHOICE_PROMPT = 'choicePrompt';
const WATERFALL_DIALOG = 'waterfallDialog';

export class BookingDialog extends CancelAndHelpDialog {
    constructor(id: string) {
        super(id || 'bookingDialog');

        this.addDialog(new TextPrompt(TEXT_PROMPT))
            .addDialog(new ChoicePrompt(CHOICE_PROMPT))
            .addDialog(new ConfirmPrompt(CONFIRM_PROMPT))
            .addDialog(new WaterfallDialog(WATERFALL_DIALOG, [
                this.customerProjectIDStep.bind(this),
                this.requestTypeStep.bind(this),
                this.parseRequestTypeStep.bind(this),
                this.finalStep.bind(this)
            ]));

        this.initialDialogId = WATERFALL_DIALOG;
    }

    /**
     * If a destination city has not been provided, prompt for one.
     */
    private async customerProjectIDStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = stepContext.options as BookingDetails;

        if (!context.destination) {
            const messageText = 'Enter Project ID :';
            const msg = MessageFactory.text(messageText, messageText, InputHints.ExpectingInput);
            return await stepContext.prompt(TEXT_PROMPT, { prompt: msg });
        } else {
            return await stepContext.next(context.destination);
        }
    }

    /**
     * If an origin city has not been provided, prompt for one.
     */
    private async requestTypeStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = stepContext.options as BookingDetails;

        // Capture the response to the previous step's prompt
        context.destination = stepContext.result;
        if (!context.origin) {
            const options = {
                choices: this.getChoices(),
                prompt: 'Please enter your type of request.',
            };
            return await stepContext.prompt(CHOICE_PROMPT, options);
        } else {
            return await stepContext.next(context.origin);
        }
    }

    /**
     * If a travel date has not been provided, prompt for one.
     * This will use the DATE_RESOLVER_DIALOG.
     */
    public async parseRequestTypeStep(stepContext: WaterfallStepContext) {
        const context = stepContext.options as BookingDetails;
        console.log('MainDialog.showCardStep');

        switch (stepContext.result.value) {
            case 'Tracker':
                return await stepContext.context.sendActivity('Testing Tracker');
            default:
                break;
        }
    }

    /**
     * Complete the interaction and end the dialog.
     */
    private async finalStep(stepContext: WaterfallStepContext): Promise<DialogTurnResult> {
        const context = stepContext.options as BookingDetails;
        console.log({ context })
        if (stepContext.result === true) {
            const bookingDetails = stepContext.options as BookingDetails;

            return await stepContext.endDialog(bookingDetails);
        }
        return await stepContext.endDialog();
    }

    /**
     * Create the choices with synonyms to render for the user during the ChoicePrompt.
     * (Indexes and upper/lower-case variants do not need to be added as synonyms)
     */
    public getChoices() {
        const cardOptions = [
            {
                synonyms: ['report', 'access report'],
                value: 'Report'
            },
            {
                synonyms: ['tracker', 'access tracker'],
                value: 'Tracker'
            },
            {
                synonyms: ['request report status', 'report status'],
                value: 'Report Status'
            },
            {
                synonyms: ['tracker status', 'request tracker status'],
                value: 'Tracker Status'
            },
            {
                synonyms: ['revalidation', 'request revalidation', 'access revalidation'],
                value: 'Revalidation'
            },
        ];

        return cardOptions;
    }

}
